/* ════════════════════════════════
   seating.js — 座席・喫煙情報（入力UI・表示バッジの共通処理）
   登録/編集モーダルが2か所（index.html と store-detail.html）あるため、
   prefix（'f' = index, 'e' = detail）で使い分ける。
   ・席タイプ: 選択=true / 非選択=null（false は使わない）
   ・喫煙: 'no'/'yes'/'sep'、未選択=null
════════════════════════════════ */

const SEAT_TYPES = [
  { key: 'seat_counter', icon: '🪑', label: 'カウンター' },
  { key: 'seat_table',   icon: '🍽️', label: 'テーブル' },
  { key: 'seat_zashiki', icon: '🏮', label: '座敷' },
  { key: 'seat_private', icon: '🚪', label: '個室' },
];

const SMOKING_OPTIONS = [
  { key: 'no',  icon: '🚭', label: '禁煙',   cls: 'smk-no'  },
  { key: 'yes', icon: '🚬', label: '喫煙可', cls: 'smk-yes' },
  { key: 'sep', icon: '↔',  label: '分煙',   cls: 'smk-sep' },
];

// prefix ごとの編集状態
const _seatStates = {};

// ─── 入力UI ───────────────────────

/**
 * 座席エディタを初期化する。
 * @param {string} prefix  'f'（index）または 'e'（detail）
 * @param {object} store   既存のお店データ（新規なら null）
 */
function initSeatingEditor(prefix, store) {
  store = store || {};
  _seatStates[prefix] = {
    seats: {
      seat_counter: store.seat_counter === true ? true : null,
      seat_table:   store.seat_table   === true ? true : null,
      seat_zashiki: store.seat_zashiki === true ? true : null,
      seat_private: store.seat_private === true ? true : null,
    },
    smoking: ['no', 'yes', 'sep'].includes(store.smoking) ? store.smoking : null,
  };

  const noteEl = document.getElementById(`${prefix}-seat-note`);
  if (noteEl) noteEl.value = store.seat_note || '';

  renderSeatingEditor(prefix);
}

function renderSeatingEditor(prefix) {
  const st = _seatStates[prefix];
  if (!st) return;

  const seatEl = document.getElementById(`${prefix}-seat-types`);
  if (seatEl) {
    seatEl.innerHTML = SEAT_TYPES.map(t =>
      `<button type="button" class="seat-chip${st.seats[t.key] ? ' selected' : ''}"
               onclick="toggleSeatType('${prefix}','${t.key}')">
         <span class="seat-chip-icon">${t.icon}</span>${t.label}
       </button>`
    ).join('');
  }

  const smkEl = document.getElementById(`${prefix}-smoking`);
  if (smkEl) {
    smkEl.innerHTML = SMOKING_OPTIONS.map(o =>
      `<button type="button" class="smoke-chip ${o.cls}${st.smoking === o.key ? ' selected' : ''}"
               onclick="setSmoking('${prefix}','${o.key}')">
         ${o.icon} ${o.label}
       </button>`
    ).join('');
  }
}

function toggleSeatType(prefix, key) {
  const st = _seatStates[prefix];
  if (!st) return;
  st.seats[key] = st.seats[key] ? null : true;   // あり ⇔ 未確認
  renderSeatingEditor(prefix);
}

function setSmoking(prefix, key) {
  const st = _seatStates[prefix];
  if (!st) return;
  st.smoking = st.smoking === key ? null : key;   // もう一度押すと未選択に戻る
  renderSeatingEditor(prefix);
}

/**
 * 保存用の値を取り出す。
 * @param {string} prefix
 * @returns {object} stores テーブルに渡せる座席カラム
 */
function getSeatingValues(prefix) {
  const st = _seatStates[prefix] || { seats: {}, smoking: null };
  const noteEl = document.getElementById(`${prefix}-seat-note`);
  const note = noteEl ? noteEl.value.trim() : '';
  return {
    seat_counter: st.seats.seat_counter ?? null,
    seat_table:   st.seats.seat_table   ?? null,
    seat_zashiki: st.seats.seat_zashiki ?? null,
    seat_private: st.seats.seat_private ?? null,
    smoking:      st.smoking ?? null,
    seat_note:    note || null,
  };
}

// ─── 表示バッジ ───────────────────

/**
 * 座席・喫煙情報のバッジHTMLを返す。
 * @param {object} store
 * @param {'detail'|'card'} mode  detail=フル表示 / card=要点のみ
 */
function renderSeatingBadges(store, mode) {
  const hints = [];
  if (store.seat_counter) hints.push('<span class="seat-hint">🙋 ひとり◎</span>');
  if (store.seat_zashiki) hints.push('<span class="seat-hint">👨‍👩‍👧 子連れ◎</span>');

  // ── カード（一覧）: 要点のみ ──
  if (mode === 'card') {
    let html = hints.join('');
    if (store.smoking === 'no') html += '<span class="smoke-badge smk-no">🚭 禁煙</span>';
    return html ? `<div class="seat-card-row">${html}</div>` : '';
  }

  // ── 詳細ページ: フル表示 ──
  const seatBadges = SEAT_TYPES.filter(t => store[t.key])
    .map(t => `<span class="seat-badge">${t.icon} ${t.label}</span>`)
    .join('');

  const smk = SMOKING_OPTIONS.find(o => o.key === store.smoking);
  const smkBadge = smk ? `<span class="smoke-badge ${smk.cls}">${smk.icon} ${smk.label}</span>` : '';

  if (!seatBadges && !smkBadge && hints.length === 0 && !store.seat_note) return '';

  return `
    <div class="seat-section">
      ${hints.length ? `<div class="seat-hints">${hints.join('')}</div>` : ''}
      ${(seatBadges || smkBadge) ? `<div class="seat-badges">${seatBadges}${smkBadge}</div>` : ''}
      ${store.seat_note ? `<div class="seat-note">🪑 ${esc(store.seat_note)}</div>` : ''}
    </div>`;
}
