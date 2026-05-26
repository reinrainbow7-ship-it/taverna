/* ════════════════════════════════
   map.js — Leaflet 地図機能（表示・ピン設置）
════════════════════════════════ */

// ─── 地図表示モーダル ─────────────

let _viewMap    = null;
let _viewMarker = null;

function openMapModal(store) {
  document.getElementById('map-modal-title').textContent = store.name;
  document.getElementById('map-overlay').classList.add('open');

  const hasLocation = store.latitude && store.longitude;
  document.getElementById('view-map').style.display        = hasLocation ? 'block' : 'none';
  document.getElementById('map-no-location').style.display = hasLocation ? 'none'  : 'flex';

  if (!hasLocation) return;

  const lat = parseFloat(store.latitude);
  const lng = parseFloat(store.longitude);

  setTimeout(() => {
    if (!_viewMap) {
      _viewMap = L.map('view-map').setView([lat, lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(_viewMap);
    } else {
      _viewMap.setView([lat, lng], 16);
      if (_viewMarker) { _viewMarker.remove(); _viewMarker = null; }
    }
    _viewMarker = L.marker([lat, lng])
      .addTo(_viewMap)
      .bindPopup(`<strong>${store.name}</strong>${store.area ? '<br>' + store.area : ''}`)
      .openPopup();
    _viewMap.invalidateSize();
  }, 100);
}

function closeMapModal() {
  document.getElementById('map-overlay').classList.remove('open');
}

function handleMapOverlayClick(e) {
  if (e.target === document.getElementById('map-overlay')) closeMapModal();
}

// ─── ピン設置マップ（登録・編集モーダル内）──

const _pinMaps = {};

/**
 * ピン設置マップを初期化する
 * @param {string} mapId    地図を描画する要素の id
 * @param {string} coordsId 座標を表示する要素の id
 */
function initPinMap(mapId, coordsId) {
  // 既存マップを破棄してから作り直す
  if (_pinMaps[mapId]) {
    _pinMaps[mapId].map.remove();
    delete _pinMaps[mapId];
  }

  const state = { lat: null, lng: null, marker: null };

  const map = L.map(mapId).setView([36.5, 137.0], 5); // 初期表示: 日本全体
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  map.on('click', e => {
    state.lat = e.latlng.lat;
    state.lng = e.latlng.lng;
    if (state.marker) {
      state.marker.setLatLng(e.latlng);
    } else {
      state.marker = L.marker(e.latlng).addTo(map);
    }
    _updatePinCoords(coordsId, state.lat, state.lng);
  });

  _pinMaps[mapId] = { map, state };
  _updatePinCoords(coordsId, null, null);
}

/**
 * 既存の座標にピンをセットして地図を移動する
 * @param {string} mapId
 * @param {string} coordsId
 * @param {number} lat
 * @param {number} lng
 */
function setPinLocation(mapId, coordsId, lat, lng) {
  if (!_pinMaps[mapId] || lat == null || lng == null) return;
  const { map, state } = _pinMaps[mapId];
  state.lat = lat;
  state.lng = lng;
  map.setView([lat, lng], 15);
  if (state.marker) {
    state.marker.setLatLng([lat, lng]);
  } else {
    state.marker = L.marker([lat, lng]).addTo(map);
  }
  _updatePinCoords(coordsId, lat, lng);
}

/**
 * 現在のピン座標を取得する
 * @param {string} mapId
 * @returns {{ lat: number|null, lng: number|null }}
 */
function getPinLatLng(mapId) {
  if (!_pinMaps[mapId]) return { lat: null, lng: null };
  const { lat, lng } = _pinMaps[mapId].state;
  return { lat, lng };
}

/**
 * ピン設置マップを破棄する（モーダルを閉じるとき）
 * @param {string} mapId
 */
function destroyPinMap(mapId) {
  if (_pinMaps[mapId]) {
    _pinMaps[mapId].map.remove();
    delete _pinMaps[mapId];
  }
}

function _updatePinCoords(coordsId, lat, lng) {
  const el = document.getElementById(coordsId);
  if (!el) return;
  el.textContent = (lat != null && lng != null)
    ? `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`
    : '地図をクリックして場所を設定してください';
}
