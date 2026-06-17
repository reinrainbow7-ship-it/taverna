/* ════════════════════════════════
   map.js — Leaflet 地図機能（表示・ピン設置）
   店舗ピン（赤）と駐車場ピン（青）の2種類を扱う。
   ピン設置マップは「店舗を置く / 駐車場を置く」モードを切り替えて使う。
════════════════════════════════ */

// ─── 函館近郊（道南エリア）に表示範囲を限定する設定 ──
const DONAN_CENTER   = [41.7687, 140.7291];        // 函館駅周辺
const DONAN_BOUNDS   = L.latLngBounds(
  [41.20, 139.70],   // 南西端（おおよそ松前・江差の南西）
  [42.40, 141.55]    // 北東端（おおよそ長万部・室蘭の手前）
);
const DONAN_MIN_ZOOM = 9;

// ─── ピンの色アイコン（divIcon でSVGを自作・外部画像なし）──
const STORE_COLOR   = '#E24B4A';  // 店舗ピン: 赤
const PARKING_COLOR = '#378ADD';  // 駐車場ピン: 青

function _pinIcon(color) {
  return L.divIcon({
    className: 'pin-divicon',
    html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 26 14 26s14-16.5 14-26C28 6.27 21.73 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="5.5" fill="#fff"/>
    </svg>`,
    iconSize:   [28, 40],
    iconAnchor: [14, 40],
    popupAnchor:[0, -36],
  });
}

const _tileLayer = () => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// ─── 地図表示モーダル（詳細ページ）─────────────

let _viewMap     = null;
let _viewMarkers = [];

function openMapModal(store) {
  document.getElementById('map-modal-title').textContent = store.name;
  document.getElementById('map-overlay').classList.add('open');

  const hasStore   = store.latitude     && store.longitude;
  const hasParking = store.parking_lat  && store.parking_lng;
  const hasAny     = hasStore || hasParking;

  document.getElementById('view-map').style.display        = hasAny ? 'block' : 'none';
  document.getElementById('map-no-location').style.display = hasAny ? 'none'  : 'flex';
  if (!hasAny) return;

  setTimeout(() => {
    if (!_viewMap) {
      _viewMap = L.map('view-map', {
        maxBounds: DONAN_BOUNDS,
        maxBoundsViscosity: 1.0,
        minZoom: DONAN_MIN_ZOOM,
      });
      _tileLayer().addTo(_viewMap);
    }

    // 既存マーカーを消す
    _viewMarkers.forEach(m => m.remove());
    _viewMarkers = [];

    const pts = [];

    if (hasStore) {
      const lat = parseFloat(store.latitude);
      const lng = parseFloat(store.longitude);
      const m = L.marker([lat, lng], { icon: _pinIcon(STORE_COLOR) })
        .addTo(_viewMap)
        .bindPopup(`<strong>${esc(store.name)}</strong>${store.area ? '<br>' + esc(store.area) : ''}`);
      _viewMarkers.push(m);
      pts.push([lat, lng]);
    }

    if (hasParking) {
      const lat = parseFloat(store.parking_lat);
      const lng = parseFloat(store.parking_lng);
      const note = store.parking_note ? '<br>' + esc(store.parking_note) : '';
      const m = L.marker([lat, lng], { icon: _pinIcon(PARKING_COLOR) })
        .addTo(_viewMap)
        .bindPopup(`<strong>🅿 駐車場</strong>${note}`);
      _viewMarkers.push(m);
      pts.push([lat, lng]);
    }

    if (pts.length === 1) {
      _viewMap.setView(pts[0], 16);
    } else {
      _viewMap.fitBounds(pts, { padding: [40, 40], maxZoom: 17 });
    }
    if (hasStore) _viewMarkers[0].openPopup();
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
  if (_pinMaps[mapId]) {
    _pinMaps[mapId].map.remove();
    delete _pinMaps[mapId];
  }

  const map = L.map(mapId, {
    maxBounds: DONAN_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: DONAN_MIN_ZOOM,
  }).setView(DONAN_CENTER, 12);
  _tileLayer().addTo(map);

  const entry = {
    map, coordsId,
    mode: 'store',            // 'store' | 'parking'
    parkingEnabled: false,    // 駐車場が「あり/近隣にあり」のときだけ true
    store:   { lat: null, lng: null, marker: null },
    parking: { lat: null, lng: null, marker: null },
  };

  map.on('click', e => {
    const kind = (entry.mode === 'parking' && entry.parkingEnabled) ? 'parking' : 'store';
    _setPinMarker(mapId, kind, e.latlng.lat, e.latlng.lng);
    _renderPinModeUI(mapId);
    _updatePinCoords(mapId);
  });

  _pinMaps[mapId] = entry;
  _renderPinModeUI(mapId);
  _updatePinCoords(mapId);
}

function _setPinMarker(mapId, kind, lat, lng) {
  const entry = _pinMaps[mapId];
  if (!entry) return;
  const s = entry[kind];
  s.lat = lat;
  s.lng = lng;
  if (s.marker) {
    s.marker.setLatLng([lat, lng]);
  } else {
    const color = kind === 'parking' ? PARKING_COLOR : STORE_COLOR;
    s.marker = L.marker([lat, lng], { icon: _pinIcon(color) })
      .addTo(entry.map)
      .bindPopup(kind === 'parking' ? '🅿 駐車場' : '📍 店舗');
  }
}

/** 店舗ピンの位置を設定して地図を移動する（既存座標の復元用）*/
function setPinLocation(mapId, coordsId, lat, lng) {
  const entry = _pinMaps[mapId];
  if (!entry || lat == null || lng == null) return;
  _setPinMarker(mapId, 'store', lat, lng);
  entry.map.setView([lat, lng], 15);
  _updatePinCoords(mapId);
}

/** 駐車場ピンの位置を設定する（既存座標の復元用）*/
function setParkingPin(mapId, lat, lng) {
  const entry = _pinMaps[mapId];
  if (!entry || lat == null || lng == null) return;
  _setPinMarker(mapId, 'parking', lat, lng);
  _renderPinModeUI(mapId);
  _updatePinCoords(mapId);
}

/** 駐車場ピンを置けるかどうかを切り替える（select の「あり/近隣にあり」連動）*/
function setPinParkingEnabled(mapId, enabled) {
  const entry = _pinMaps[mapId];
  if (!entry) return;
  entry.parkingEnabled = !!enabled;
  if (!enabled) {
    _clearParking(mapId);     // 「なし」になったら駐車場ピンは消す
    entry.mode = 'store';
  }
  _renderPinModeUI(mapId);
  _updatePinCoords(mapId);
}

/** モード切り替え（ボタンから呼ばれる）*/
function setPinMode(mapId, mode) {
  const entry = _pinMaps[mapId];
  if (!entry) return;
  if (mode === 'parking' && !entry.parkingEnabled) return;
  entry.mode = mode;
  _renderPinModeUI(mapId);
}

/** 駐車場ピンを消す（ボタンから呼ばれる）*/
function clearParkingPin(mapId) {
  _clearParking(mapId);
  _renderPinModeUI(mapId);
  _updatePinCoords(mapId);
}

function _clearParking(mapId) {
  const entry = _pinMaps[mapId];
  if (!entry) return;
  if (entry.parking.marker) entry.parking.marker.remove();
  entry.parking = { lat: null, lng: null, marker: null };
}

/** 店舗ピンの座標を取得する */
function getPinLatLng(mapId) {
  const entry = _pinMaps[mapId];
  if (!entry) return { lat: null, lng: null };
  return { lat: entry.store.lat, lng: entry.store.lng };
}

/** 駐車場ピンの座標を取得する（駐車場が無効なら null）*/
function getParkingLatLng(mapId) {
  const entry = _pinMaps[mapId];
  if (!entry || !entry.parkingEnabled) return { lat: null, lng: null };
  return { lat: entry.parking.lat, lng: entry.parking.lng };
}

function destroyPinMap(mapId) {
  if (_pinMaps[mapId]) {
    _pinMaps[mapId].map.remove();
    delete _pinMaps[mapId];
  }
}

// モード切り替えバー・クリアボタンの表示を更新する。
// ボタンの id は「<mapId>-mode」「<mapId>-mode-store」「<mapId>-mode-parking」「<mapId>-clear」の規約。
function _renderPinModeUI(mapId) {
  const entry = _pinMaps[mapId];
  if (!entry) return;

  if (!entry.parkingEnabled && entry.mode === 'parking') entry.mode = 'store';

  const bar      = document.getElementById(`${mapId}-mode`);
  const storeBtn = document.getElementById(`${mapId}-mode-store`);
  const parkBtn  = document.getElementById(`${mapId}-mode-parking`);
  const clearBtn = document.getElementById(`${mapId}-clear`);

  // 駐車場が無効なときはモードバー自体を隠す（クリックは常に店舗ピン）
  if (bar) bar.style.display = entry.parkingEnabled ? '' : 'none';
  if (storeBtn) storeBtn.classList.toggle('active', entry.mode === 'store');
  if (parkBtn)  parkBtn.classList.toggle('active', entry.mode === 'parking');
  if (clearBtn) clearBtn.style.display = entry.parking.marker ? '' : 'none';
}

function _updatePinCoords(mapId) {
  const entry = _pinMaps[mapId];
  if (!entry) return;
  const el = document.getElementById(entry.coordsId);
  if (!el) return;

  const fmt = p => (p.lat != null && p.lng != null)
    ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`
    : '未設定';

  let html = `📍 店舗：${fmt(entry.store)}`;
  if (entry.parkingEnabled) html += `<br>🅿 駐車場：${fmt(entry.parking)}`;
  el.innerHTML = html;
}
