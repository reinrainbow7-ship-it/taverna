/* ════════════════════════════════
   visits.js — 訪問ログの管理・表示（Supabase版）
════════════════════════════════ */

// URLパラメータからお店IDを取得（menu.js・store-detail.html でも共用）
const currentStoreId = new URLSearchParams(location.search).get('id');

// ─── データ管理 ───────────────────

async function loadVisits() {
  const { data, error } = await db
    .from('visits')
    .select('*')
    .eq('store_id', currentStoreId)
    .order('date', { ascending: false });

  if (error) { console.error('loadVisits error:', error); return []; }
  return data || [];
}

// ─── 描画 ─────────────────────────

async function renderVisitList() {
  const visits = await loadVisits();
  const el = document.getElementById('visit-list');

  if (visits.length === 0) {
    el.innerHTML = '<div class="visit-empty">まだ訪問記録がありません</div>';
    return;
  }

  el.innerHTML = visits.map(v => `
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

async function deleteVisit(id) {
  if (!confirm('この訪問記録を削除しますか？')) return;
  const { error } = await db.from('visits').delete().eq('id', id);
  if (error) { console.error(error); showToast('エラーが発生しました'); return; }
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

async function handleVisitSubmit(e) {
  e.preventDefault();

  if (currentRating === 0) {
    alert('評価を選択してください');
    return;
  }

  const { error } = await db.from('visits').insert({
    id:       genId(),
    store_id: currentStoreId,
    date:     document.getElementById('v-date').value,
    rating:   currentRating,
  });

  if (error) { console.error(error); showToast('エラーが発生しました'); return; }

  closeVisitModal();
  renderVisitList();
  showToast('訪問を記録しました');
}

// ─── 初期化 ───────────────────────
// store-detail.html のインラインスクリプト末尾から呼ばれる
