/* ════════════════════════════════
   menu.js — メニュー記録の管理・表示
   (未実装 — スタブ)
════════════════════════════════ */

function openMenuModal() {}
function closeMenuModal() {}
function handleMenuSubmit(e) { e.preventDefault(); }
function handleMenuOverlayClick(e) {}

function renderMenuList() {
  const el = document.getElementById('menu-list');
  if (el) el.innerHTML = '<div class="menu-empty">メニュー記録機能は近日公開予定です</div>';
}
