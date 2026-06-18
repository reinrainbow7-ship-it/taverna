/* ════════════════════════════════
   utils.js — 共通ユーティリティ
════════════════════════════════ */

/**
 * ユニークIDを生成する（file://でも動作）
 */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/**
 * HTMLエスケープ（XSS対策）
 */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * リンク用に安全なURLだけを通す（javascript: などのスキームを弾く）。
 * 不正なら空文字を返す。href へ入れる前に通すこと。
 */
function safeUrl(s) {
  const url = String(s ?? '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : '';
}

/**
 * 画面下部にトースト通知を表示する
 */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}
