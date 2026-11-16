/* ════════════════════════════════
   winter.js — 冬モード（冬の行きやすさ）
   函館の冬（積雪・凍結）に、車で行きやすい店かどうかを記録・表示する。
   ・winter_parking: 冬の駐車 1=厳しい / 2=台数が減る / 3=問題なし / null=未評価
       駐車場が「あり/近隣にあり」のときだけ入力できる（なし/未設定なら null で保存）
   ・slope: 坂道あり true / null=なし・未確認（駐車場の有無とは無関係）
   ・冬季（12〜3月）は一覧カードにもバッジを出す。詳細ページには通年で出す。
   前半は tests.html で検証する純粋ロジック。入力UIは prefix 方式（parking.js と同じ）。
════════════════════════════════ */

const WINTER_LEVELS = [
  { v: 1, label: '厳しい',     badge: '❄ 冬は厳しい',   cls: 'pk-1' },
  { v: 2, label: '台数が減る', badge: '❄ 冬は台数減',   cls: 'pk-2' },
  { v: 3, label: '問題なし',   badge: '❄ 冬も駐めやすい', cls: 'pk-3' },
];

// 冬季として扱う月（函館の根雪〜雪解けの目安）
const WINTER_MONTHS = [12, 1, 2, 3];

// ─── 純粋ロジック ─────────────────

/** その日が冬季（12〜3月）か */
function isWinterSeason(date) {
  return WINTER_MONTHS.includes((date || new Date()).getMonth() + 1);
}

/**
 * 一覧カードに冬バッジを出すか。
 * 基本は季節で決まるが、URL に ?winter=1 / ?winter=0 を付けると強制できる（季節外の確認用）。
 * @param {string} search  location.search
 * @param {Date}   date
 */
function winterModeActive(search, date) {
  const m = /[?&]winter=([01])(?:&|$)/.exec(search || '');
  if (m) return m[1] === '1';
  return isWinterSeason(date);
}

/**
 * 「冬でも行きやすい」の判定（条件フィルター用）。
 * 冬の駐車が「問題なし」と確認済みで、坂道ありの印が付いていないお店。
 * 未評価のお店は含めない（確認できた店だけを出す）。
 */
function isWinterEasy(store) {
  return store.winter_parking === 3 && store.slope !== true;
}

/**
 * 冬のバッジHTMLを返す。情報がなければ空文字。
 * @param {object} store
 * @param {'detail'|'card'} mode  detail=枠付き / card=一覧用の1行
 */
function renderWinterBadges(store, mode) {
  const lvl = WINTER_LEVELS.find(r => r.v === store.winter_parking);
  let html = '';
  if (lvl) html += `<span class="park-badge ${lvl.cls}">${lvl.badge}</span>`;
  if (store.slope === true) html += '<span class="park-badge pk-slope">⛰ 坂道あり</span>';
  if (!html) return '';
  return mode === 'card'
    ? `<div class="winter-card-row">${html}</div>`
    : `<div class="park-section"><div class="park-badges">${html}</div></div>`;
}

// ─── 入力UI（store-edit.html）──────

// prefix ごとの編集状態
const _winterStates = {};

// 冬の駐車を入力できる駐車場の値（parking.js の _PARKING_ACTIVE と同じ）
const _WINTER_PARKING_ACTIVE = ['あり', '近隣にあり'];

function _winterParkingActive(prefix) {
  const sel = document.getElementById(`${prefix}-parking`);
  return !!(sel && _WINTER_PARKING_ACTIVE.includes(sel.value));
}

/**
 * 冬エディタを初期化する。
 * @param {string} prefix  'f'
 * @param {object} store   既存データ（新規なら null）
 */
function initWinterEditor(prefix, store) {
  store = store || {};
  _winterStates[prefix] = {
    parking: [1, 2, 3].includes(store.winter_parking) ? store.winter_parking : null,
    slope:   store.slope === true,
  };
  renderWinterEditor(prefix);
}

function renderWinterEditor(prefix) {
  const st = _winterStates[prefix];
  if (!st) return;

  const pkEl = document.getElementById(`${prefix}-winter-parking`);
  if (pkEl) {
    pkEl.innerHTML = WINTER_LEVELS.map(r =>
      `<button type="button" class="car-rating-btn ${r.cls}${st.parking === r.v ? ' selected' : ''}"
               onclick="setWinterParking('${prefix}',${r.v})">${r.label}</button>`
    ).join('');
  }

  const slEl = document.getElementById(`${prefix}-slope`);
  if (slEl) {
    slEl.innerHTML =
      `<button type="button" class="car-rating-btn pk-2${st.slope ? ' selected' : ''}"
               onclick="toggleSlope('${prefix}')">⛰ 坂道あり</button>`;
  }

  updateWinterVisibility(prefix);
}

function setWinterParking(prefix, val) {
  const st = _winterStates[prefix];
  if (!st) return;
  st.parking = st.parking === val ? null : val;  // 同じものを再度押すと未評価に戻す
  renderWinterEditor(prefix);
}

function toggleSlope(prefix) {
  const st = _winterStates[prefix];
  if (!st) return;
  st.slope = !st.slope;
  renderWinterEditor(prefix);
}

/** 駐車場の有無に応じて「冬の駐車」欄の表示/非表示を切り替える（坂道は常に表示） */
function updateWinterVisibility(prefix) {
  const active = _winterParkingActive(prefix);
  const row  = document.getElementById(`${prefix}-winter-parking-row`);
  const hint = document.getElementById(`${prefix}-winter-parking-hint`);
  if (row)  row.style.display  = active ? '' : 'none';
  if (hint) hint.style.display = active ? 'none' : '';
}

/**
 * 保存用の値を取り出す。
 * 駐車場が「なし/未設定」のときは winter_parking を null にして整合性を保つ。
 */
function getWinterValues(prefix) {
  const st = _winterStates[prefix] || { parking: null, slope: false };
  return {
    winter_parking: _winterParkingActive(prefix) ? (st.parking ?? null) : null,
    slope:          st.slope ? true : null,
  };
}
