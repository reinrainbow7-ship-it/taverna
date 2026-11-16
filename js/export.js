/* ════════════════════════════════
   export.js — CSVエクスポート（管理者専用・バックアップ兼用）
   お店 / 訪問ログ / メニュー を1種類ずつCSVファイルでダウンロードする。
   ・文字コード: UTF-8（BOM付き。Excelでそのまま開ける）
   ・お店CSVの先頭6列は一括登録（bulk.js）と同じ並びなので、そのまま貼り付けて再登録できる
   前半は tests.html で検証する純粋ロジック。
════════════════════════════════ */

// ─── 純粋ロジック ─────────────────

/** CSVの1セル。カンマ・引用符・改行を含むときだけ "…" で囲む（" は "" に） */
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 見出し + 行の配列 → CSV文字列（行区切りは CRLF） */
function toCsv(header, rows) {
  return [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
}

const _EXPORT_SMOKING = { no: '禁煙', yes: '喫煙可', sep: '分煙' };

/** 席の列: 席数があれば数字、「あり」だけなら あり、未確認は空 */
function _seatCell(has, num) {
  if (num != null) return num;
  return has ? 'あり' : '';
}

/** id → 店名 の対応表 */
function _storeNameMap(stores) {
  const map = {};
  (stores || []).forEach(s => { map[s.id] = s.name; });
  return map;
}

/**
 * お店CSV。先頭6列（店名〜メモ）は一括登録と同じ並び。
 * 7列目以降は一括登録では読まれない追加情報（バックアップ用）。
 */
function storesToCsv(stores) {
  const header = [
    '店名', 'エリア', '駐車場', 'タグ', 'SNS', 'メモ',
    '緯度', '経度', '駐車場緯度', '駐車場経度',
    '駐車台数', '軽(1-3)', '普通車(1-3)', '大きめ(1-3)', '駐車場メモ',
    'カウンター', 'テーブル', '座敷', '個室', '喫煙', '席メモ',
    '冬の駐車(1-3)', '坂道',
    'マイベスト順位', 'サムネイルURL', '登録日時', 'ID',
  ];
  const rows = (stores || []).map(s => [
    s.name, s.area, s.parking, (s.tags || []).join(';'), s.sns, s.memo,
    s.latitude, s.longitude, s.parking_lat, s.parking_lng,
    s.parking_capacity, s.parking_kei, s.parking_futsuu, s.parking_family, s.parking_note,
    _seatCell(s.seat_counter, s.seat_counter_num),
    _seatCell(s.seat_table,   s.seat_table_num),
    _seatCell(s.seat_zashiki, s.seat_zashiki_num),
    _seatCell(s.seat_private, s.seat_private_num),
    _EXPORT_SMOKING[s.smoking] || '', s.seat_note,
    s.winter_parking, s.slope === true ? 'あり' : '',
    s.my_rank, s.thumbnail_url, s.created_at, s.id,
  ]);
  return toCsv(header, rows);
}

/** 訪問ログCSV（店名は stores から引く） */
function visitsToCsv(visits, stores) {
  const nameOf = _storeNameMap(stores);
  const header = ['店名', '来店日', '評価', 'メモ', '記録日時', '店ID', 'ID'];
  const rows = (visits || []).map(v => [
    nameOf[v.store_id], v.date, v.rating, v.memo, v.created_at, v.store_id, v.id,
  ]);
  return toCsv(header, rows);
}

/** メニューCSV（店名は stores から引く） */
function menusToCsv(menus, stores) {
  const nameOf = _storeNameMap(stores);
  const header = ['店名', 'メニュー名', '価格', 'おすすめ度', '注文回数', 'メモ', '写真URL', '登録日時', '店ID', 'ID'];
  const rows = (menus || []).map(m => [
    nameOf[m.store_id], m.name, m.price, m.recommend_rating, m.order_count, m.memo,
    m.photo_url, m.created_at, m.store_id, m.id,
  ]);
  return toCsv(header, rows);
}

/** ファイル名（例: taverna-stores-2026-11-16.csv） */
function exportFileName(kind, date) {
  const d = date || new Date();
  const p = n => String(n).padStart(2, '0');
  return `taverna-${kind}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.csv`;
}

// ─── データ取得 ───────────────────

/**
 * テーブルの全行を取得する。
 * Supabase は1回の取得が既定で1000行までなので、ページ送りで最後まで読む
 * （バックアップが黙って途中で切れないように）。失敗時は null。
 */
async function _fetchAllRows(table, orderCol) {
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select('*')
      .order(orderCol, { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) { console.error(`export ${table} error:`, error); return null; }
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}

// ─── ダウンロード ─────────────────

function _downloadCsv(filename, csv) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** kind: 'stores' | 'visits' | 'menus' */
async function exportCsv(kind) {
  if (!isAdmin()) return;

  const stores = await _fetchAllRows('stores', 'created_at');
  if (!stores) { showToast('エクスポートに失敗しました'); return; }

  let csv, count;
  if (kind === 'stores') {
    csv = storesToCsv(stores); count = stores.length;
  } else {
    const rows = kind === 'visits'
      ? await _fetchAllRows('visits', 'date')
      : await _fetchAllRows('menu_items', 'created_at');
    if (!rows) { showToast('エクスポートに失敗しました'); return; }
    csv = kind === 'visits' ? visitsToCsv(rows, stores) : menusToCsv(rows, stores);
    count = rows.length;
  }

  _downloadCsv(exportFileName(kind), csv);
  showToast(`${count}件をCSVに書き出しました`);
}

// ─── モーダル ─────────────────────

function openExportModal() {
  if (!isAdmin()) return;
  document.getElementById('export-overlay').classList.add('open');
}

function closeExportModal() {
  document.getElementById('export-overlay').classList.remove('open');
}

function handleExportOverlayClick(e) {
  if (e.target === document.getElementById('export-overlay')) closeExportModal();
}
