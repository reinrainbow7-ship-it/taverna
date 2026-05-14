/* ════════════════════════════════
   stores.js — お店のデータ管理・表示（Supabase版）
════════════════════════════════ */

const PRESET_TAGS = ['ラーメン', 'カフェ', '海鮮', '焼肉', 'カレー', '居酒屋', 'スイーツ', 'テイクアウト可'];

// ─── キャッシュ ───────────────────
// Supabase から取得したお店データを一時保存する
let _stores = [];

// ─── データ管理 ───────────────────

async function loadStores() {
  const { data, error } = await db
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('loadStores error:', error); return []; }
  return data || [];
}

// ─── タグフィルター ───────────────

let activeTagFilters  = [];
let _tagFilterOptions = [];

function getAllUsedTags(stores) {
  const all = new Set();
  stores.forEach(s => (s.tags || []).forEach(t => all.add(t)));
  return [...all];
}

function toggleTagFilter(index) {
  const tag = _tagFilterOptions[index];
  if (!tag) return;
  activeTagFilters = activeTagFilters.includes(tag)
    ? activeTagFilters.filter(t => t !== tag)
    : [...activeTagFilters, tag];
  renderTagFilters(_stores);
  applyFiltersAndRender(_stores);
}

function clearTagFilters() {
  activeTagFilters = [];
  renderTagFilters(_stores);
  applyFiltersAndRender(_stores);
}

function renderTagFilters(stores) {
  const bar = document.getElementById('tagFilterBar');
  _tagFilterOptions = getAllUsedTags(stores);
  activeTagFilters   = activeTagFilters.filter(t => _tagFilterOptions.includes(t));

  if (_tagFilterOptions.length === 0) { bar.innerHTML = ''; return; }

  bar.innerHTML =
    `<button class="tag-filter-chip${activeTagFilters.length === 0 ? ' active' : ''}" onclick="clearTagFilters()">すべて</button>` +
    _tagFilterOptions.map((t, i) =>
      `<button class="tag-filter-chip${activeTagFilters.includes(t) ? ' active' : ''}" onclick="toggleTagFilter(${i})">${esc(t)}</button>`
    ).join('');
}

// ─── カード描画 ───────────────────

async function renderCards() {
  _stores = await loadStores();
  renderTagFilters(_stores);
  applyFiltersAndRender(_stores);
}

function applyFiltersAndRender(stores) {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  let filtered = stores;

  if (q) {
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.area.toLowerCase().includes(q));
  }

  if (activeTagFilters.length > 0) {
    filtered = filtered.filter(s =>
      activeTagFilters.every(t => (s.tags || []).includes(t)));
  }

  document.getElementById('count').textContent = stores.length;
  const grid = document.getElementById('grid');

  if (filtered.length === 0) {
    const msg = activeTagFilters.length > 0
      ? '選択したタグに一致するお店が見つかりません'
      : q ? `"${q}" に一致するお店が見つかりません`
      : 'まだお店が登録されていません';
    grid.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🍽️</div>
        <p>${msg}</p>
        ${!q && activeTagFilters.length === 0
          ? `<button class="btn-primary" onclick="openModal()" style="margin:0 auto">最初のお店を追加する</button>`
          : ''}
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(s => `
    <div class="card" onclick="handleCardClick(event, '${s.id}')">
      <div class="card-header">
        <div class="card-name">${esc(s.name)}</div>
        <button class="card-menu-btn" onclick="openCtxMenu(event, '${s.id}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </div>
      <div>
        <span class="card-tag">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          ${esc(s.area)}
        </span>
        ${s.parking ? `<span class="card-tag">🅿 ${esc(s.parking)}</span>` : ''}
      </div>
      ${(s.tags || []).length > 0 ? `
      <div class="store-tags">
        ${s.tags.map(t => `<span class="store-tag-chip">${esc(t)}</span>`).join('')}
      </div>` : ''}
      ${s.sns ? `
      <div class="card-sns">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <a href="${esc(s.sns)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
          ${esc(s.sns.replace(/^https?:\/\/(www\.)?/, ''))}
        </a>
      </div>` : ''}
    </div>
  `).join('');
}

// ─── モーダル ─────────────────────

let editingId    = null;
let selectedTags = [];

function openModal(id = null) {
  editingId = id;
  const store = id ? _stores.find(s => s.id === id) : null;

  selectedTags = store?.tags ? [...store.tags] : [];

  document.getElementById('modalTitle').textContent  = id ? 'お店を編集する' : 'お店を登録する';
  document.getElementById('submitBtn').textContent   = id ? '更新する' : '登録する';
  document.getElementById('editId').value            = id || '';
  document.getElementById('f-name').value            = store?.name    || '';
  document.getElementById('f-area').value            = store?.area    || '';
  document.getElementById('f-parking').value         = store?.parking || '';
  document.getElementById('f-sns').value             = store?.sns     || '';

  renderTagSelector();
  document.getElementById('overlay').classList.add('open');
  setTimeout(() => document.getElementById('f-name').focus(), 200);
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('storeForm').reset();
  editingId    = null;
  selectedTags = [];
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('overlay')) closeModal();
}

// ─── タグセレクター（モーダル内） ─────

function renderTagSelector() {
  document.getElementById('tagPresets').innerHTML = PRESET_TAGS.map((t, i) =>
    `<button type="button" class="tag-preset-chip${selectedTags.includes(t) ? ' selected' : ''}" onclick="togglePresetTag(${i})">${esc(t)}</button>`
  ).join('');

  document.getElementById('tagSelected').innerHTML = selectedTags.map((t, i) =>
    `<span class="tag-selected-chip">${esc(t)}<button type="button" onclick="removeSelectedTag(${i})">×</button></span>`
  ).join('');
}

function togglePresetTag(index) {
  const tag = PRESET_TAGS[index];
  selectedTags = selectedTags.includes(tag)
    ? selectedTags.filter(t => t !== tag)
    : [...selectedTags, tag];
  renderTagSelector();
}

function removeSelectedTag(index) {
  selectedTags.splice(index, 1);
  renderTagSelector();
}

function addCustomTag() {
  const input = document.getElementById('customTagInput');
  const tag   = input.value.trim();
  if (!tag) return;
  if (!selectedTags.includes(tag)) selectedTags.push(tag);
  input.value = '';
  renderTagSelector();
}

// ─── フォーム送信 ─────────────────

async function handleSubmit(e) {
  e.preventDefault();

  const data = {
    name:    document.getElementById('f-name').value.trim(),
    area:    document.getElementById('f-area').value.trim(),
    parking: document.getElementById('f-parking').value,
    sns:     document.getElementById('f-sns').value.trim(),
    tags:    [...selectedTags],
  };

  if (editingId) {
    // 既存お店を更新
    const { error } = await db.from('stores').update(data).eq('id', editingId);
    if (error) { console.error(error); showToast('エラーが発生しました'); return; }
    showToast('お店情報を更新しました');
  } else {
    // 新規登録
    const { error } = await db.from('stores').insert({
      id: genId(), ...data, created_at: new Date().toISOString()
    });
    if (error) { console.error(error); showToast('エラーが発生しました'); return; }
    showToast('お店を登録しました 🎉');
  }

  closeModal();
  renderCards();
}

// ─── コンテキストメニュー ──────────

let ctxTargetId = null;

function openCtxMenu(e, id) {
  e.stopPropagation();
  ctxTargetId = id;
  const menu = document.getElementById('ctxMenu');
  menu.classList.add('open');
  const x = Math.min(e.clientX, window.innerWidth  - 160);
  const y = Math.min(e.clientY, window.innerHeight - 100);
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';
}

function closeCtxMenu() {
  document.getElementById('ctxMenu').classList.remove('open');
  ctxTargetId = null;
}

function editStore() {
  const id = ctxTargetId;
  closeCtxMenu();
  openModal(id);
}

async function deleteStore() {
  if (!ctxTargetId) return;
  const store = _stores.find(s => s.id === ctxTargetId);
  if (!store) return;
  if (!confirm(`「${store.name}」を削除しますか？`)) { closeCtxMenu(); return; }

  // お店を削除（visits・menu_items は ON DELETE CASCADE で自動削除）
  const { error } = await db.from('stores').delete().eq('id', ctxTargetId);
  if (error) { console.error(error); showToast('エラーが発生しました'); return; }

  closeCtxMenu();
  showToast('削除しました');
  renderCards();
}

function handleCardClick(e, id) {
  location.href = `store-detail.html?id=${id}`;
}
