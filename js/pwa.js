/* ════════════════════════════════
   pwa.js — PWA（Service Worker の登録・オフライン表示）
   全ページで読み込む。他の js には依存しない。
   キャッシュの方針は sw.js の先頭コメントを参照。
════════════════════════════════ */

// Service Worker を登録する（file:// で開いたときは登録できないので何もしない）
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .catch(err => console.error('Service Worker の登録に失敗:', err));
  });
}

/**
 * オフライン中は画面上部に「前回の内容を表示中」のバッジを出す。
 * body に offline クラスも付ける（CSS で書き込みボタンを薄くする用）。
 */
function updateOfflineBadge() {
  const offline = navigator.onLine === false;
  document.body.classList.toggle('offline', offline);

  let badge = document.getElementById('offline-badge');
  if (offline && !badge) {
    badge = document.createElement('div');
    badge.id = 'offline-badge';
    badge.className = 'offline-badge';
    badge.textContent = '📡 オフライン：前回の内容を表示中（変更はできません）';
    document.body.appendChild(badge);
  } else if (!offline && badge) {
    badge.remove();
  }
}

window.addEventListener('online',  updateOfflineBadge);
window.addEventListener('offline', updateOfflineBadge);
document.addEventListener('DOMContentLoaded', updateOfflineBadge);
