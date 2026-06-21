/* ════════════════════════════════
   seating.js — 座席・喫煙情報（入力UI・表示バッジの共通処理）
   prefix（'f' = 登録/編集ページ）で使い分ける。
   ・席タイプ: 選択=true / 非選択=null（false は使わない）
   ・席数: seat_*_num（任意の整数）。数字を入れるとその席タイプは自動で「あり」になる
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

function initSeatingEditor(prefix, store) {
  store = store || {};
  const seats = {}, counts = {};
  SEAT_TYPES.forEach(t => {
    seats[t.key] = store[t.key] === true ? true : null;
    const n = store[t.key + '_num'];
    counts[t.key] = (Number.isInteger(n) && n > 0) ? n : null;
  });

  _seatStates[prefix] = {
    seats,
    counts,
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
    seatEl.innerHTML = SEAT_TYPES.map(t => {
      const on  = st.seats[t.key];
      const cnt = st.counts[t.key];
      return `
        <div class="seat-row">
          <button type="button" id="${prefix}-seatchip-${t.key}"
                  class="seat-chip${on ? ' selected' : ''}"
                  onclick="toggleSeatType('${prefix}','${t.key}')">
            <span class="seat-chip-icon">${t.icon}</span>${t.label}
          </button>
          <span class="seat-count-wrap">
            <input type="number" min="1" inputmode="numeric" class="seat-count-input"
                   value="${cnt ?? ''}" placeholder="席数"
                   oninput="onSeatCountInput('${prefix}','${t.key}',this.value)" />
            <span class="seat-count-unit">席</span>
          </span>
        </div>`;
    }).join('');
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
  if (st.seats[key]) {
    st.seats[key] = null;     // あり → 未確認
    st.counts[key] = null;    // 席数もクリア
  } else {
    st.seats[key] = true;     // 未確認 → あり
  }
  renderSeatingEditor(prefix);
}

// 席数入力。数字（1以上）を入れたらその席タイプを自動で「あり」にする。
// 全体を再描画すると入力中にフォーカスが外れるため、状態とチップの見た目だけ更新する。
function onSeatCountInput(prefix, key, value) {
  const st = _seatStates[prefix];
  if (!st) return;
  const n = parseInt(value, 10);
  if (Number.isInteger(n) && n > 0) {
    st.counts[key] = n;
    if (!st.seats[key]) {
      st.seats[key] = true;
      const chip = document.getElementById(`${prefix}-seatchip-${key}`);
      if (chip) chip.classList.add('selected');
    }
  } else {
    st.counts[key] = null;
  }
}

function setSmoking(prefix, key) {
  const st = _seatStates[prefix];
  if (!st) return;
  st.smoking = st.smoking === key ? null : key;
  renderSeatingEditor(prefix);
}

/**
 * 保存用の値を取り出す。
 * @param {string} prefix
 */
function getSeatingValues(prefix) {
  const st = _seatStates[prefix] || { seats: {}, counts: {}, smoking: null };
  const noteEl = document.getElementById(`${prefix}-seat-note`);
  const note = noteEl ? noteEl.value.trim() : '';

  const out = {
    smoking:   st.smoking ?? null,
    seat_note: note || null,
  };
  SEAT_TYPES.forEach(t => {
    out[t.key] = st.seats[t.key] ?? null;
    out[t.key + '_num'] = st.seats[t.key] ? (st.counts[t.key] ?? null) : null;
  });
  return out;
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

  // ── 詳細ページ: フル表示（席数があれば付ける）──
  const seatBadges = SEAT_TYPES.filter(t => store[t.key]).map(t => {
    const n   = store[t.key + '_num'];
    const cnt = (Number.isInteger(n) && n > 0) ? ` ${n}席` : '';
    return `<span class="seat-badge">${t.icon} ${t.label}${cnt}</span>`;
  }).join('');

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
