/* ════════════════════════════════
   menu.js — メニュー記録の管理・表示（Supabase版）
════════════════════════════════ */

// ─── データ管理 ───────────────────

async function loadMenuItems() {
  const { data, error } = await db
    .from('menu_items')
    .select('*')
    .eq('store_id', currentStoreId)
    .order('created_at', { ascending: false });

  if (error) { console.error('loadMenuItems error:', error); return []; }
  return data || [];
}

// ─── 描画 ─────────────────────────

async function renderMenuList() {
  const items = await loadMenuItems();
  const el = document.getElementById('menu-list');

  if (items.length === 0) {
    el.innerHTML = '<div class="menu-empty">まだメニューが登録されていません</div>';
    return;
  }

  el.innerHTML = items.map(item => `
    <div class="menu-card">
      ${item.photo_url ? `
      <div class="menu-photo-wrap">
        <img class="menu-photo" src="${esc(item.photo_url)}" alt="${esc(item.name)}" onclick="openPhotoModal('${esc(item.photo_url)}')" />
      </div>` : ''}
      <div class="menu-card-main">
        <div class="menu-name">${esc(item.name)}</div>
        ${item.price !== null && item.price !== undefined
          ? `<div class="menu-price">¥${Number(item.price).toLocaleString()}</div>`
          : ''}
        ${item.memo ? `<div class="menu-memo">${esc(item.memo)}</div>` : ''}
        <div class="menu-recommend">
          <span class="menu-recommend-label">おすすめ</span>
          ${[1,2,3,4,5].map(n =>
            `<span class="star${n <= (item.recommend_rating || 0) ? ' filled' : ''}">★</span>`
          ).join('')}
        </div>
        <div class="menu-order-row">
          <span class="menu-order-label">注文回数</span>
          <button class="order-count-btn" onclick="updateOrderCount('${item.id}', ${item.order_count || 0}, -1)">－</button>
          <span class="order-count-num">${item.order_count || 0}回</span>
          <button class="order-count-btn" onclick="updateOrderCount('${item.id}', ${item.order_count || 0}, 1)">＋</button>
        </div>
        ${item.photo_url ? `
        <button class="btn-set-thumbnail" onclick="setThumbnail('${esc(item.photo_url)}')">
          ⭐ サムネイルに設定
        </button>` : ''}
      </div>
      <div class="menu-card-btns">
        <button class="menu-edit-btn" onclick="openMenuEditModal('${item.id}')" title="編集">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="menu-delete-btn" onclick="deleteMenuItem('${item.id}')" title="削除">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

async function deleteMenuItem(id) {
  if (blockIfDemo()) return;
  if (!confirm('このメニューを削除しますか？')) return;

  // 先に Storage 上の写真を削除する（オーファン防止・ベストエフォート）
  const { data: item } = await db
    .from('menu_items')
    .select('photo_url')
    .eq('id', id)
    .single();
  if (item?.photo_url) await removeMenuPhoto(item.photo_url);

  const { error } = await db.from('menu_items').delete().eq('id', id);
  if (error) { console.error(error); showToast('エラーが発生しました'); return; }
  renderMenuList();
  showToast('メニューを削除しました');
}

/** menu の写真URLから Storage 上のファイルを削除する（ベストエフォート）*/
async function removeMenuPhoto(photoUrl) {
  try {
    const path = photoUrl.split('/taverna-photos/')[1];
    if (path) await db.storage.from('taverna-photos').remove([path]);
  } catch (e) {
    console.error('removeMenuPhoto error:', e);
  }
}

// ─── 注文回数更新 ─────────────────

async function updateOrderCount(id, currentCount, delta) {
  if (blockIfDemo()) return;
  const newCount = Math.max(0, currentCount + delta);
  const { error } = await db
    .from('menu_items')
    .update({ order_count: newCount })
    .eq('id', id);
  if (error) { console.error(error); showToast('エラーが発生しました'); return; }
  renderMenuList();
}

// ─── サムネイル設定 ───────────────

async function setThumbnail(photoUrl) {
  if (blockIfDemo()) return;
  const { error } = await db
    .from('stores')
    .update({ thumbnail_url: photoUrl })
    .eq('id', currentStoreId);
  if (error) { showToast('エラーが発生しました'); return; }
  showToast('サムネイルを設定しました ✅');
}

// ─── 写真拡大モーダル ─────────────

function openPhotoModal(url) {
  document.getElementById('photo-modal-img').src = url;
  document.getElementById('photo-overlay').classList.add('open');
}

function closePhotoModal() {
  document.getElementById('photo-overlay').classList.remove('open');
}

// ─── 追加モーダル ─────────────────

function openMenuModal() {
  if (isDemo()) return;
  document.getElementById('menu-overlay').classList.add('open');
  setTimeout(() => document.getElementById('m-name').focus(), 200);
}

function closeMenuModal() {
  document.getElementById('menu-overlay').classList.remove('open');
  document.getElementById('menuForm').reset();
}

function handleMenuOverlayClick(e) {
  if (e.target === document.getElementById('menu-overlay')) closeMenuModal();
}

// ─── 編集モーダル ─────────────────

let editingMenuId  = null;
let editMenuRating = 0;

async function openMenuEditModal(id) {
  if (isDemo()) return;
  const { data: item, error } = await db
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !item) return;

  editingMenuId  = id;
  editMenuRating = item.recommend_rating || 0;

  document.getElementById('me-name').value  = item.name  || '';
  document.getElementById('me-price').value = item.price !== null && item.price !== undefined ? item.price : '';
  document.getElementById('me-memo').value  = item.memo  || '';

  const preview = document.getElementById('me-photo-preview');
  preview.innerHTML = item.photo_url
    ? `<img src="${esc(item.photo_url)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" />`
    : '';

  updateMenuEditStarUI(editMenuRating);
  document.getElementById('menu-edit-overlay').classList.add('open');
  setTimeout(() => document.getElementById('me-name').focus(), 200);
}

function closeMenuEditModal() {
  document.getElementById('menu-edit-overlay').classList.remove('open');
  document.getElementById('menuEditForm').reset();
  document.getElementById('me-photo-preview').innerHTML = '';
  editingMenuId  = null;
  editMenuRating = 0;
  updateMenuEditStarUI(0);
}

function handleMenuEditOverlayClick(e) {
  if (e.target === document.getElementById('menu-edit-overlay')) closeMenuEditModal();
}

function setMenuEditRating(value) {
  editMenuRating = value;
  updateMenuEditStarUI(value);
}

function updateMenuEditStarUI(value) {
  document.querySelectorAll('#me-star-row .star-input').forEach(btn => {
    const n = parseInt(btn.dataset.value);
    btn.classList.toggle('active', n <= value);
    btn.textContent = n <= value ? '★' : '☆';
  });
}

async function handleMenuEditSubmit(e) {
  e.preventDefault();
  if (blockIfDemo()) return;

  const priceVal = document.getElementById('me-price').value;
  const file     = document.getElementById('me-photo').files[0];

  const { data: current } = await db
    .from('menu_items')
    .select('photo_url')
    .eq('id', editingMenuId)
    .single();

  let photoUrl = current?.photo_url || null;

  if (file) {
    if (photoUrl) await removeMenuPhoto(photoUrl);  // 旧写真を消す
    const ext      = file.name.split('.').pop();
    const filePath = `${currentStoreId}/${editingMenuId}.${ext}`;
    const { error: upErr } = await db.storage
      .from('taverna-photos')
      .upload(filePath, file, { upsert: true });
    if (upErr) { console.error(upErr); showToast('写真のアップロードに失敗しました'); return; }
    const { data: urlData } = db.storage.from('taverna-photos').getPublicUrl(filePath);
    photoUrl = urlData.publicUrl;
  }

  const { error } = await db.from('menu_items').update({
    name:             document.getElementById('me-name').value.trim(),
    price:            priceVal !== '' ? parseInt(priceVal, 10) : null,
    memo:             document.getElementById('me-memo').value.trim() || null,
    recommend_rating: editMenuRating,
    photo_url:        photoUrl,
  }).eq('id', editingMenuId);

  if (error) { console.error(error); showToast('エラーが発生しました'); return; }

  closeMenuEditModal();
  renderMenuList();
  showToast('メニューを更新しました');
}

// ─── 追加フォーム送信 ─────────────

async function handleMenuSubmit(e) {
  e.preventDefault();
  if (blockIfDemo()) return;

  const menuId   = genId();
  const priceVal = document.getElementById('m-price').value;
  const file     = document.getElementById('m-photo').files[0];

  let photoUrl = null;

  if (file) {
    const ext      = file.name.split('.').pop();
    const filePath = `${currentStoreId}/${menuId}.${ext}`;
    const { error: upErr } = await db.storage
      .from('taverna-photos')
      .upload(filePath, file, { upsert: true });
    if (upErr) { console.error(upErr); showToast('写真のアップロードに失敗しました'); return; }
    const { data: urlData } = db.storage
      .from('taverna-photos')
      .getPublicUrl(filePath);
    photoUrl = urlData.publicUrl;
  }

  const { error } = await db.from('menu_items').insert({
    id:        menuId,
    store_id:  currentStoreId,
    name:      document.getElementById('m-name').value.trim(),
    price:     priceVal !== '' ? parseInt(priceVal, 10) : null,
    memo:      document.getElementById('m-memo').value.trim() || null,
    photo_url: photoUrl,
  });

  if (error) { console.error(error); showToast('エラーが発生しました'); return; }

  closeMenuModal();
  renderMenuList();
  showToast('メニューを追加しました');
}
