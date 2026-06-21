/* ════════════════════════════════
   store-edit.js — お店の登録・編集ページ（store-edit.html）
   ?id があれば編集、なければ新規登録。新規時のみ初回訪問ログ欄を出す。
   座席=seating.js / 駐車場=parking.js / 地図=map.js を共通利用（prefix 'f' / mapId 'pin-map'）。
════════════════════════════════ */

// タグUIは tags.js（initTagEditor / getTagValues / addTagFromInput, prefix 'f'）を利用。

let editingId        = null;
let firstVisitRating = 0;

// ─── 駐車場 select（ページ用ラッパー）─
function onParkingChangePage() {
  onParkingChange('f');   // parking.js: 詳細欄の表示 + 地図の駐車場ピン可否
  syncParkingHint();
}
function syncParkingHint() {
  const active = ['あり', '近隣にあり'].includes(document.getElementById('f-parking').value);
  const detail = document.getElementById('f-parking-detail');
  const hint   = document.getElementById('f-parking-hint');
  if (detail) detail.style.display = active ? '' : 'none';
  if (hint)   hint.style.display   = active ? 'none' : '';
}

// ─── 初回訪問ログの星評価 ──────────
function setFirstVisitRating(value) {
  firstVisitRating = (firstVisitRating === value) ? 0 : value;   // 同じ星を再度押すと解除
  updateFirstVisitStars(firstVisitRating);
}
function updateFirstVisitStars(value) {
  document.querySelectorAll('#sv-star-row .star-input').forEach(btn => {
    const n = parseInt(btn.dataset.value);
    btn.classList.toggle('active', n <= value);
    btn.textContent = n <= value ? '★' : '☆';
  });
}

// ─── 保存 ─────────────────────────
async function handleStoreSave(e) {
  e.preventDefault();
  if (isDemo()) return;

  const { lat, lng } = getPinLatLng('pin-map');

  const data = {
    name:      document.getElementById('f-name').value.trim(),
    area:      document.getElementById('f-area').value.trim(),
    parking:   document.getElementById('f-parking').value,
    sns:       document.getElementById('f-sns').value.trim() || null,
    tags:      getTagValues('f'),
    latitude:  lat,
    longitude: lng,
    ...getSeatingValues('f'),
    ...getParkingValues('f'),
  };
  const park = getParkingLatLng('pin-map');
  data.parking_lat = park.lat;
  data.parking_lng = park.lng;

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;

  let storeId;
  if (editingId) {
    const { error } = await db.from('stores').update(data).eq('id', editingId);
    if (error) { console.error(error); showToast('エラーが発生しました'); btn.disabled = false; return; }
    storeId = editingId;
  } else {
    storeId = genId();
    const { error } = await db.from('stores').insert({ id: storeId, ...data, created_at: new Date().toISOString() });
    if (error) { console.error(error); showToast('エラーが発生しました'); btn.disabled = false; return; }

    // 初回訪問ログ（評価が入っていれば記録。失敗しても登録自体は成功扱い）
    if (firstVisitRating > 0) {
      const { error: vErr } = await db.from('visits').insert({
        id:       genId(),
        store_id: storeId,
        date:     document.getElementById('sv-date').value || new Date().toISOString().slice(0, 10),
        rating:   firstVisitRating,
        memo:     document.getElementById('sv-memo').value.trim() || null,
      });
      if (vErr) console.error('first visit insert error:', vErr);
    }
  }

  showToast(editingId ? '更新しました' : '登録しました 🎉');
  location.href = `store-detail.html?id=${storeId}`;
}

// ─── 初期化 ───────────────────────
async function setupForm() {
  editingId = new URLSearchParams(location.search).get('id');
  let store = null;

  if (editingId) {
    const { data, error } = await db.from('stores').select('*').eq('id', editingId).single();
    if (error || !data) {
      showToast('お店が見つかりませんでした');
      setTimeout(() => location.href = 'index.html', 1200);
      return;
    }
    store = data;
    document.getElementById('pageTitle').textContent = 'お店を編集する';
    document.title = 'お店を編集 - Taverna';
    document.getElementById('saveBtn').textContent  = '更新する';
    document.getElementById('firstVisitSection').style.display = 'none';
  } else {
    document.getElementById('firstVisitSection').style.display = '';
    document.getElementById('sv-date').value = new Date().toISOString().slice(0, 10);
  }

  document.getElementById('f-name').value    = store?.name    || '';
  document.getElementById('f-area').value    = store?.area    || '';
  document.getElementById('f-parking').value = store?.parking || '';
  document.getElementById('f-sns').value     = store?.sns     || '';
  initTagEditor('f', store);

  initSeatingEditor('f', store);
  initParkingEditor('f', store);
  syncParkingHint();

  // 地図のピン
  setPinParkingEnabled('pin-map', ['あり', '近隣にあり'].includes(store?.parking || ''));
  if (store?.latitude && store?.longitude) {
    setPinLocation('pin-map', 'pin-coords', store.latitude, store.longitude);
  }
  if (store?.parking_lat && store?.parking_lng) {
    setParkingPin('pin-map', store.parking_lat, store.parking_lng);
  }
  // レイアウト確定後に地図サイズを再計算
  setTimeout(() => { if (_pinMaps['pin-map']) _pinMaps['pin-map'].map.invalidateSize(); }, 200);
}

checkAuth().then(() => {
  if (isDemo()) { location.href = 'index.html'; return; }  // デモは閲覧専用
  initPinMap('pin-map', 'pin-coords');
  setupForm();
});
