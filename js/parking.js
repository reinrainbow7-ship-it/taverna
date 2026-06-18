/* ════════════════════════════════
   parking.js — 駐車場の詳細情報（フェーズ1：車サイズ評価・台数・メモ）
   登録/編集モーダルが2か所あるため prefix（'f'=index, 'e'=detail）で使い分ける。
   ・車サイズ評価: 1=厳しい / 2=なんとか / 3=余裕 / null=未評価
   ・parking_lat / parking_lng はフェーズ2（地図マーク）で扱うため、ここでは触らない
════════════════════════════════ */

const CAR_TYPES = [
  { key: 'parking_kei',    icon: '🚗', label: '軽' },
  { key: 'parking_futsuu', icon: '🚙', label: '普通車' },
  { key: 'parking_family', icon: '🚐', label: '大きめ/RV' },
];

const PARK_LEVELS = [
  { v: 1, label: '厳しい',   cls: 'pk-1' },
  { v: 2, label: 'なんとか', cls: 'pk-2' },
  { v: 3, label: '余裕',     cls: 'pk-3' },
];

// 「あり/近隣にあり」のときだけ詳細欄を表示する
const _PARKING_ACTIVE = ['あり', '近隣にあり'];

// prefix ごとの編集状態
const _parkStates = {};

// ─── 入力UI ───────────────────────

/**
 * 駐車場エディタを初期化する。
 * @param {string} prefix  'f'（index）/ 'e'（detail）
 * @param {object} store   既存データ（新規なら null）
 */
function initParkingEditor(prefix, store) {
  store = store || {};
  _parkStates[prefix] = {
    ratings: {
      parking_kei:    [1, 2, 3].includes(store.parking_kei)    ? store.parking_kei    : null,
      parking_futsuu: [1, 2, 3].includes(store.parking_futsuu) ? store.parking_futsuu : null,
      parking_family: [1, 2, 3].includes(store.parking_family) ? store.parking_family : null,
    },
  };

  const capEl  = document.getElementById(`${prefix}-parking-capacity`);
  const noteEl = document.getElementById(`${prefix}-parking-note`);
  if (capEl)  capEl.value  = (store.parking_capacity ?? '') === '' ? '' : store.parking_capacity;
  if (noteEl) noteEl.value = store.parking_note || '';

  renderParkingEditor(prefix);
  updateParkingVisibility(prefix);
}

function renderParkingEditor(prefix) {
  const st = _parkStates[prefix];
  const el = document.getElementById(`${prefix}-car-ratings`);
  if (!st || !el) return;

  el.innerHTML = CAR_TYPES.map(c => `
    <div class="car-rating-row">
      <span class="car-rating-label">${c.icon} ${c.label}</span>
      <div class="car-rating-btns">
        ${PARK_LEVELS.map(r =>
          `<button type="button" class="car-rating-btn ${r.cls}${st.ratings[c.key] === r.v ? ' selected' : ''}"
                   onclick="setCarRating('${prefix}','${c.key}',${r.v})">${r.label}</button>`
        ).join('')}
      </div>
    </div>`
  ).join('');
}

function setCarRating(prefix, key, val) {
  const st = _parkStates[prefix];
  if (!st) return;
  st.ratings[key] = st.ratings[key] === val ? null : val;  // 同じものを再度押すと未評価に戻す
  renderParkingEditor(prefix);
}

/** 駐車場の有無（select）に応じて詳細欄の表示/非表示を切り替える */
function updateParkingVisibility(prefix) {
  const sel = document.getElementById(`${prefix}-parking`);
  const box = document.getElementById(`${prefix}-parking-detail`);
  if (!sel || !box) return;
  box.style.display = _PARKING_ACTIVE.includes(sel.value) ? '' : 'none';
}

/** select の onchange から呼ばれる */
function onParkingChange(prefix) {
  updateParkingVisibility(prefix);
  // 地図側の「駐車場ピン」設置可否も連動させる（map.js）
  if (typeof setPinParkingEnabled === 'function') {
    const sel   = document.getElementById(`${prefix}-parking`);
    const mapId = prefix === 'e' ? 'edit-pin-map' : 'pin-map';
    setPinParkingEnabled(mapId, !!(sel && _PARKING_ACTIVE.includes(sel.value)));
  }
}

/**
 * 保存用の値を取り出す。「なし/未設定」のときは全項目 null にして整合性を保つ。
 * （parking_lat / parking_lng はフェーズ2管理なので含めない＝既存値を消さない）
 */
function getParkingValues(prefix) {
  const sel = document.getElementById(`${prefix}-parking`);
  const active = sel && _PARKING_ACTIVE.includes(sel.value);
  if (!active) {
    return {
      parking_kei: null, parking_futsuu: null, parking_family: null,
      parking_capacity: null, parking_note: null,
    };
  }

  const st     = _parkStates[prefix] || { ratings: {} };
  const capEl  = document.getElementById(`${prefix}-parking-capacity`);
  const noteEl = document.getElementById(`${prefix}-parking-note`);
  const capNum = capEl && capEl.value !== '' ? parseInt(capEl.value, 10) : null;
  const note   = noteEl ? noteEl.value.trim() : '';

  return {
    parking_kei:      st.ratings.parking_kei      ?? null,
    parking_futsuu:   st.ratings.parking_futsuu   ?? null,
    parking_family:   st.ratings.parking_family   ?? null,
    parking_capacity: Number.isFinite(capNum) ? capNum : null,
    parking_note:     note || null,
  };
}

// ─── 表示（詳細ページ）─────────────

/** 詳細ページ用の駐車場バッジ・メモHTMLを返す */
function renderParkingDetail(store) {
  const badges = CAR_TYPES.filter(c => store[c.key]).map(c => {
    const lvl = PARK_LEVELS.find(r => r.v === store[c.key]);
    return `<span class="park-badge ${lvl.cls}">${c.icon} ${c.label}：${lvl.label}</span>`;
  }).join('');

  const cap = store.parking_capacity
    ? `<span class="park-cap">🅿 約${esc(String(store.parking_capacity))}台</span>`
    : '';

  if (!badges && !cap && !store.parking_note) return '';

  return `
    <div class="park-section">
      ${(badges || cap) ? `<div class="park-badges">${cap}${badges}</div>` : ''}
      ${store.parking_note ? `<div class="park-note">🅿 ${esc(store.parking_note)}</div>` : ''}
    </div>`;
}
