/* ════════════════════════════════
   tags.js — タグ選択UI（登録/編集モーダル共通）
   登録/編集モーダルが2か所（index.html と store-detail.html）あるため、
   prefix（'f' = index, 'e' = detail）で使い分ける。
   要素id規約: <prefix>-tagPresets / <prefix>-tagSelected / <prefix>-customTagInput
════════════════════════════════ */

const PRESET_TAGS = ['ラーメン', 'カフェ', '海鮮', '焼肉', 'カレー', '居酒屋', 'スイーツ', 'テイクアウト可'];

// prefix ごとの選択中タグ
const _tagStates = {};

/**
 * タグエディタを初期化する。
 * @param {string} prefix  'f'（index）/ 'e'（detail）
 * @param {object} store   既存データ（新規なら null）
 */
function initTagEditor(prefix, store) {
  _tagStates[prefix] = (store && store.tags) ? [...store.tags] : [];
  renderTagEditor(prefix);
}

function renderTagEditor(prefix) {
  const sel       = _tagStates[prefix] || [];
  const presetEl  = document.getElementById(`${prefix}-tagPresets`);
  const selectedEl = document.getElementById(`${prefix}-tagSelected`);

  if (presetEl) presetEl.innerHTML = PRESET_TAGS.map((t, i) =>
    `<button type="button" class="tag-preset-chip${sel.includes(t) ? ' selected' : ''}" onclick="toggleTagPreset('${prefix}',${i})">${esc(t)}</button>`
  ).join('');

  if (selectedEl) selectedEl.innerHTML = sel.map((t, i) =>
    `<span class="tag-selected-chip">${esc(t)}<button type="button" onclick="removeTag('${prefix}',${i})">×</button></span>`
  ).join('');
}

function toggleTagPreset(prefix, index) {
  const tag = PRESET_TAGS[index];
  const sel = _tagStates[prefix] || (_tagStates[prefix] = []);
  _tagStates[prefix] = sel.includes(tag) ? sel.filter(t => t !== tag) : [...sel, tag];
  renderTagEditor(prefix);
}

function removeTag(prefix, index) {
  (_tagStates[prefix] || []).splice(index, 1);
  renderTagEditor(prefix);
}

/** カスタムタグ入力欄から追加する（追加ボタン / Enter から呼ばれる）*/
function addTagFromInput(prefix) {
  const input = document.getElementById(`${prefix}-customTagInput`);
  if (!input) return;
  const tag = input.value.trim();
  if (!tag) return;
  const sel = _tagStates[prefix] || (_tagStates[prefix] = []);
  if (!sel.includes(tag)) sel.push(tag);
  input.value = '';
  renderTagEditor(prefix);
}

/** 保存用のタグ配列を取り出す */
function getTagValues(prefix) {
  return [...(_tagStates[prefix] || [])];
}
