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
        ${item.memo
          ? `<div class="menu-memo">${esc(item.memo)}</div>`
          : ''}
        ${item.photo_url ? `
        <button class="btn-set-thumbnail" onclick="setThumbnail('${esc(item.photo_url)}')">
          ⭐ サムネイルに設定
        </button>` : ''}
      </div>
      <button class="menu-delete-btn" onclick="deleteMenuItem('${item.id}')" title="削除">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>
    </div>
  `).join('');
}

async function deleteMenuItem(id) {
  if (!confirm('このメニューを削除しますか？')) return;
  const { error } = await db.from('menu_items').delete().eq('id', id);
  if (error) { console.error(error); showToast('エラーが発生しました'); return; }
  renderMenuList();
  showToast('メニューを削除しました');
}

// ─── サムネイル設定 ───────────────

async function setThumbnail(photoUrl) {
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

// ─── モーダル ─────────────────────

function openMenuModal() {
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

// ─── フォーム送信 ─────────────────

async function handleMenuSubmit(e) {
  e.preventDefault();

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
    price:     priceVal !== '' ? parseInt(priceVal) : null,
    memo:      document.getElementById('m-memo').value.trim(),
    photo_url: photoUrl,
  });

  if (error) { console.error(error); showToast('エラーが発生しました'); return; }

  closeMenuModal();
  renderMenuList();
  showToast('メニューを追加しました');
}
