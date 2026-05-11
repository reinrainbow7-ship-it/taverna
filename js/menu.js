/* ════════════════════════════════
   menu.js — メニュー記録の管理・表示
════════════════════════════════ */

// ─── データ管理 ───────────────────

function loadMenuItems() {
  const stores = JSON.parse(localStorage.getItem('taverna_stores') || '[]');
  const store = stores.find(s => s.id === currentStoreId);
  return store?.menuItems || [];
}

function saveMenuItems(items) {
  const stores = JSON.parse(localStorage.getItem('taverna_stores') || '[]');
  const updated = stores.map(s =>
    s.id === currentStoreId ? { ...s, menuItems: items } : s
  );
  localStorage.setItem('taverna_stores', JSON.stringify(updated));
}

// ─── 描画 ─────────────────────────

function renderMenuList() {
  const items = loadMenuItems();
  const el = document.getElementById('menu-list');

  if (items.length === 0) {
    el.innerHTML = '<div class="menu-empty">まだメニューが登録されていません</div>';
    return;
  }

  el.innerHTML = items.map(item => `
    <div class="menu-card">
      <div class="menu-card-main">
        <div class="menu-name">${esc(item.name)}</div>
        ${item.price !== '' && item.price !== null && item.price !== undefined
          ? `<div class="menu-price">¥${Number(item.price).toLocaleString()}</div>`
          : ''}
        ${item.memo
          ? `<div class="menu-memo">${esc(item.memo)}</div>`
          : ''}
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

function deleteMenuItem(id) {
  if (!confirm('このメニューを削除しますか？')) return;
  const items = loadMenuItems().filter(item => item.id !== id);
  saveMenuItems(items);
  renderMenuList();
  showToast('メニューを削除しました');
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

function handleMenuSubmit(e) {
  e.preventDefault();

  const item = {
    id:    genId(),
    name:  document.getElementById('m-name').value.trim(),
    price: document.getElementById('m-price').value,
    memo:  document.getElementById('m-memo').value.trim(),
  };

  const items = loadMenuItems();
  items.push(item);
  saveMenuItems(items);

  renderMenuList();
  closeMenuModal();
  showToast('メニューを追加しました');
}
