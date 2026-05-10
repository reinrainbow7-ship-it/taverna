/* ════════════════════════════════
   visits.js — 訪問ログの管理・表示
════════════════════════════════ */

const currentStoreId = new URLSearchParams(location.search).get('id');

// ─── データ管理 ───────────────────

function loadVisits() {
  const stores = JSON.parse(localStorage.getItem('taverna_stores') || '[]');
  const store = stores.find(s => s.id === currentStoreId);
  return store?.visits || [];
}

function saveVisits(visits) {
  const stores = JSON.parse(localStorage.getItem('taverna_stores') || '[]');
  const updated = stores.map(s =>
    s.id === currentStoreId ? { ...s, visits } : s
  );
  localStorage.setItem('taverna_stores', JSON.stringify(updated));
}

// ─── 描画 ─────────────────────────

function renderVisitList() {
  const visits = loadVisits();
  const el = document.getElementById('visit-list');

  if (visits.length === 0) {
    el.innerHTML = '<div class="visit-empty">まだ訪問記録がありません</div>';
    return;
  }

  const sorted = [...visits].sort((a, b) => b.date.localeCompare(a.date));

  el.innerHTML = sorted.map(v => `
    <div class="visit-card">
      <div class="visit-card-left">
        <div class="visit-date">${esc(v.date)}</div>
        <div class="visit-rating">
          ${[1,2,3,4,5].map(n =>
            `<span class="star${n <= v.rating ? ' filled' : ''}">★</span>`
          ).join('')}
        </div>
      </div>
      <button class="visit-delete-btn" onclick="deleteVisit('${v.id}')" title="削除">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </button>
    </div>
  `).join('');
}

function deleteVisit(id) {
  if (!confirm('この訪問記録を削除しますか？')) return;
  const visits = loadVisits().filter(v => v.id !== id);
  saveVisits(visits);
  renderVisitList();
  showToast('訪問記録を削除しました');
}

// ─── モーダル ─────────────────────

let currentRating = 0;

function openVisitModal() {
  currentRating = 0;
  document.getElementById('v-date').value = new Date().toISOString().slice(0, 10);
  updateStarUI(0);
  document.getElementById('visit-overlay').classList.add('open');
  setTimeout(() => document.getElementById('v-date').focus(), 200);
}

function closeVisitModal() {
  document.getElementById('visit-overlay').classList.remove('open');
  document.getElementById('visitForm').reset();
  currentRating = 0;
  updateStarUI(0);
}

// ─── 星評価 ───────────────────────

function setRating(value) {
  currentRating = value;
  updateStarUI(value);
}

function updateStarUI(value) {
  document.querySelectorAll('#star-input-row .star-input').forEach(btn => {
    const n = parseInt(btn.dataset.value);
    btn.classList.toggle('active', n <= value);
    btn.textContent = n <= value ? '★' : '☆';
  });
}

// ─── フォーム送信 ─────────────────

function handleVisitSubmit(e) {
  e.preventDefault();

  if (currentRating === 0) {
    alert('評価を選択してください');
    return;
  }

  const visit = {
    id:     genId(),
    date:   document.getElementById('v-date').value,
    rating: currentRating,
  };

  const visits = loadVisits();
  visits.push(visit);
  saveVisits(visits);

  renderVisitList();
  closeVisitModal();
  showToast('訪問を記録しました');
}

// ─── 初期化 ───────────────────────
// store-detail.html のインラインスクリプト末尾から呼ばれる
