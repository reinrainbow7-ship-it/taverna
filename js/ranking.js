/* ════════════════════════════════
   ranking.js — ランキング（評価順・訪問回数順・マイベスト）
   前半は tests.html で検証する純粋ロジック。
   index.html でもカードの評価集計（calcVisitStats）に使う。
════════════════════════════════ */

// ─── 純粋ロジック ─────────────────

/**
 * 訪問ログから店ごとの集計を作る。
 * 戻り値: { [store_id]: { count: 訪問回数, avg: 平均評価（小数1桁） } }
 */
function calcVisitStats(visits) {
  const stats = {};
  (visits || []).forEach(v => {
    const s = stats[v.store_id] || (stats[v.store_id] = { count: 0, sum: 0 });
    s.count += 1;
    s.sum   += v.rating || 0;
  });
  Object.values(stats).forEach(s => {
    s.avg = Math.round((s.sum / s.count) * 10) / 10;
    delete s.sum;
  });
  return stats;
}

/** 平均評価順（同点は訪問回数が多い方が上）。訪問記録のない店は含めない */
function rankByRating(stores, stats) {
  return (stores || [])
    .filter(s => stats[s.id])
    .sort((a, b) =>
      (stats[b.id].avg   - stats[a.id].avg) ||
      (stats[b.id].count - stats[a.id].count));
}

/** 訪問回数順（同点は平均評価が高い方が上）。訪問記録のない店は含めない */
function rankByVisits(stores, stats) {
  return (stores || [])
    .filter(s => stats[s.id])
    .sort((a, b) =>
      (stats[b.id].count - stats[a.id].count) ||
      (stats[b.id].avg   - stats[a.id].avg));
}

/** マイベスト（my_rank の昇順。未登録の店は含めない） */
function rankByMyRank(stores) {
  return (stores || [])
    .filter(s => s.my_rank != null)
    .sort((a, b) => a.my_rank - b.my_rank);
}

/** 順位の表示文字（1〜3位はメダル、それ以外は数字） */
function rankMark(i) {
  return ['🥇', '🥈', '🥉'][i] || String(i + 1);
}

// ─── データ取得（index / ranking 共用）───

/** 全訪問ログの集計用データを取得する */
async function loadAllVisits() {
  const { data, error } = await db.from('visits').select('store_id, rating');
  if (error) { console.error('loadAllVisits error:', error); return []; }
  return data || [];
}

// ─── ランキングページ（ranking.html）───

let _rankStores = [];
let _rankStats  = {};
let _rankTab    = 'rating';

async function initRanking() {
  const [stores, visits] = await Promise.all([loadStores(), loadAllVisits()]);
  _rankStores = stores;
  _rankStats  = calcVisitStats(visits);
  renderRanking();
}

function switchRankTab(tab) {
  _rankTab = tab;
  document.querySelectorAll('.rank-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  renderRanking();
}

function renderRanking() {
  if (_rankTab === 'mybest') { renderMyBest(); return; }
  document.getElementById('mybest-controls').style.display = 'none';
  document.getElementById('rank-note').textContent =
    '訪問記録のあるお店だけが並びます';

  const ranked = _rankTab === 'rating'
    ? rankByRating(_rankStores, _rankStats)
    : rankByVisits(_rankStores, _rankStats);

  const list = document.getElementById('rank-list');
  if (ranked.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🏆</div>
        <p>まだ訪問記録がありません。<br>お店の詳細ページから「訪問を記録」するとここに並びます。</p>
      </div>`;
    return;
  }

  list.innerHTML = ranked.map((s, i) => {
    const st = _rankStats[s.id];
    return `
    <div class="rank-row" onclick="location.href='store-detail.html?id=${s.id}'">
      <div class="rank-num${i < 3 ? ' medal' : ''}">${rankMark(i)}</div>
      ${s.thumbnail_url
        ? `<img class="rank-thumb" src="${esc(s.thumbnail_url)}" alt="" />`
        : `<div class="rank-thumb rank-thumb-empty">🍽</div>`}
      <div class="rank-info">
        <div class="rank-name">${esc(s.name)}</div>
        <div class="rank-sub">${esc(s.area)}</div>
      </div>
      <div class="rank-stats">
        <span class="rank-stars">★ ${st.avg}</span>
        <span class="rank-count">${st.count}回訪問</span>
      </div>
    </div>`;
  }).join('');
}

// ─── マイベスト（自分で決める殿堂入り）───

function renderMyBest() {
  document.getElementById('rank-note').textContent =
    '自分で決める殿堂入り。評価とは関係なく、好きな順に並べられます';

  const ranked = rankByMyRank(_rankStores);
  document.getElementById('mybest-controls').style.display = '';
  renderMyBestSelect(ranked);

  const list = document.getElementById('rank-list');
  if (ranked.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">👑</div>
        <p>まだマイベストがありません。<br>下の「お店を追加」からお気に入りを登録しましょう。</p>
      </div>`;
    return;
  }

  list.innerHTML = ranked.map((s, i) => {
    const st = _rankStats[s.id];
    return `
    <div class="rank-row" onclick="location.href='store-detail.html?id=${s.id}'">
      <div class="rank-num${i < 3 ? ' medal' : ''}">${rankMark(i)}</div>
      ${s.thumbnail_url
        ? `<img class="rank-thumb" src="${esc(s.thumbnail_url)}" alt="" />`
        : `<div class="rank-thumb rank-thumb-empty">🍽</div>`}
      <div class="rank-info">
        <div class="rank-name">${esc(s.name)}</div>
        <div class="rank-sub">${esc(s.area)}</div>
      </div>
      <div class="rank-stats">
        ${st ? `<span class="rank-stars">★ ${st.avg}</span>` : ''}
      </div>
      <div class="rank-move-btns" onclick="event.stopPropagation()">
        <button ${i === 0 ? 'disabled' : ''} onclick="moveMyBest('${s.id}', -1)" title="上へ">▲</button>
        <button ${i === ranked.length - 1 ? 'disabled' : ''} onclick="moveMyBest('${s.id}', 1)" title="下へ">▼</button>
        <button class="danger" onclick="removeFromMyBest('${s.id}')" title="マイベストから外す">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderMyBestSelect(ranked) {
  const sel = document.getElementById('mybest-select');
  const rankedIds = ranked.map(s => s.id);
  const candidates = _rankStores.filter(s => !rankedIds.includes(s.id));
  sel.innerHTML = candidates.length
    ? candidates.map(s => `<option value="${s.id}">${esc(s.name)}（${esc(s.area)}）</option>`).join('')
    : '<option value="">追加できるお店がありません</option>';
  sel.disabled = candidates.length === 0;
  document.getElementById('mybest-add-btn').disabled = candidates.length === 0;
}

async function addToMyBest() {
  if (blockIfDemo()) return;
  const id = document.getElementById('mybest-select').value;
  if (!id) return;
  const ids = rankByMyRank(_rankStores).map(s => s.id);
  ids.push(id);
  if (await saveMyRanks(ids)) showToast('マイベストに追加しました');
}

async function moveMyBest(id, dir) {
  if (blockIfDemo()) return;
  const ids = rankByMyRank(_rankStores).map(s => s.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await saveMyRanks(ids);
}

async function removeFromMyBest(id) {
  if (blockIfDemo()) return;
  const { error } = await db.from('stores').update({ my_rank: null }).eq('id', id);
  if (error) { console.error(error); showToast('エラーが発生しました'); return; }
  const ids = rankByMyRank(_rankStores).map(s => s.id).filter(x => x !== id);
  if (await saveMyRanks(ids)) showToast('マイベストから外しました');
}

/**
 * マイベストの順位を保存する（配列の並び＝順位で振り直す）。
 * stores テーブルに my_rank 列（integer）が必要（PROJECT.md 参照）。
 */
async function saveMyRanks(ids) {
  const results = await Promise.all(
    ids.map((id, i) => db.from('stores').update({ my_rank: i + 1 }).eq('id', id)));
  const failed = results.find(r => r.error);
  if (failed) {
    console.error('saveMyRanks error:', failed.error);
    showToast('保存できませんでした（my_rank 列が未追加かもしれません）');
    return false;
  }
  // ローカルキャッシュにも反映して再描画
  const rankOf = {};
  ids.forEach((id, i) => { rankOf[id] = i + 1; });
  _rankStores.forEach(s => { s.my_rank = rankOf[s.id] ?? null; });
  renderRanking();
  return true;
}
