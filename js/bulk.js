/* ════════════════════════════════
   bulk.js — お店の一括登録（管理者専用）
   カンマ区切り（CSV）テキストを貼り付けて複数のお店をまとめて登録する。
   ・列の区切り: 半角カンマ ,
   ・タグの区切り: セミコロン ;（例: ラーメン;塩）
   ・カンマを含む値は "…" で囲む（例: "塩がうまい、また行きたい"）
════════════════════════════════ */

// 列の順番: 店名 / エリア / 駐車場 / タグ / SNS / メモ
const _BULK_PARKING_OK = ['あり', 'なし', '近隣にあり'];

// プレビュー済みで登録できる行（エラーのない行だけ）
let _bulkValidRows = [];

// ─── モーダル ─────────────────────

function openBulkModal() {
  if (!isAdmin()) return;
  document.getElementById('bulk-input').value = '';
  document.getElementById('bulk-preview').innerHTML = '';
  document.getElementById('bulk-submit').disabled = true;
  _bulkValidRows = [];
  document.getElementById('bulk-overlay').classList.add('open');
  setTimeout(() => document.getElementById('bulk-input').focus(), 200);
}

function closeBulkModal() {
  document.getElementById('bulk-overlay').classList.remove('open');
  _bulkValidRows = [];
}

function handleBulkOverlayClick(e) {
  if (e.target === document.getElementById('bulk-overlay')) closeBulkModal();
}

// ─── 解析 ─────────────────────────

/**
 * CSVの1行を列に分解する。
 * 半角カンマ , を区切りとし、"…" で囲んだ値の中のカンマは区切りにしない。
 * "" は引用符内のエスケープされた " として扱う。
 */
function _parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }  // "" → "
        else inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * 貼り付けテキスト（カンマ区切り）を行ごとに解析する。
 * 各行は { name, area, parking, tags, sns, memo, errors } を持つ。
 */
function parseBulkText(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const rows = [];

  lines.forEach((line, idx) => {
    const cols = _parseCsvLine(line);

    // 1行目が見出し（「店名」を含む）なら飛ばす
    if (idx === 0 && /店名/.test(cols[0] || '')) return;

    const name    = (cols[0] || '').trim();
    const area    = (cols[1] || '').trim();
    let   parking = (cols[2] || '').trim();
    const tagsRaw = (cols[3] || '').trim();
    const sns     = (cols[4] || '').trim();
    const memo    = (cols[5] || '').trim();

    const errors = [];
    if (!name) errors.push('店名が空');
    if (!area) errors.push('エリアが空');

    // 駐車場は規定値以外なら空にする
    if (parking && !_BULK_PARKING_OK.includes(parking)) parking = '';

    // タグはセミコロン区切り（読点・全角セミコロンも許容）
    const tags = tagsRaw
      ? tagsRaw.split(/[;；、]/).map(t => t.trim()).filter(Boolean)
      : [];

    rows.push({ name, area, parking, tags, sns, memo, errors });
  });

  return rows;
}

// ─── プレビュー ───────────────────

function previewBulk() {
  const parsed = parseBulkText(document.getElementById('bulk-input').value);
  const valid  = parsed.filter(r => r.errors.length === 0);
  _bulkValidRows = valid;

  const preview = document.getElementById('bulk-preview');

  if (parsed.length === 0) {
    preview.innerHTML = '<div style="padding:12px;color:var(--sub);font-size:13px;">登録できるデータがありません。</div>';
    document.getElementById('bulk-submit').disabled = true;
    return;
  }

  const ngCount = parsed.length - valid.length;
  const summary = `登録できる行: <strong>${valid.length}</strong> 件`
    + (ngCount > 0 ? ` ／ エラーで除外: <strong style="color:#c0392b">${ngCount}</strong> 件` : '');

  const rowsHtml = parsed.map((r, i) => {
    const ng = r.errors.length > 0;
    const cell = (v) => v ? esc(v) : '<span style="color:#c0392b">（空）</span>';
    return `
      <tr style="${ng ? 'background:#fdeaea;' : ''}border-bottom:1px solid var(--border);">
        <td style="padding:6px 8px;color:var(--sub);">${i + 1}</td>
        <td style="padding:6px 8px;">${cell(r.name)}</td>
        <td style="padding:6px 8px;">${cell(r.area)}</td>
        <td style="padding:6px 8px;">${esc(r.parking)}</td>
        <td style="padding:6px 8px;">${r.tags.map(esc).join(', ')}</td>
        <td style="padding:6px 8px;font-size:12px;${ng ? 'color:#c0392b;' : 'color:var(--sub);'}">
          ${ng ? esc(r.errors.join('・')) : 'OK'}
        </td>
      </tr>`;
  }).join('');

  preview.innerHTML = `
    <div style="font-size:13px;margin:12px 0 8px;">${summary}</div>
    <div style="max-height:260px;overflow:auto;border:1px solid var(--border);border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:var(--tag-bg);text-align:left;">
            <th style="padding:6px 8px;">#</th>
            <th style="padding:6px 8px;">店名</th>
            <th style="padding:6px 8px;">エリア</th>
            <th style="padding:6px 8px;">駐車場</th>
            <th style="padding:6px 8px;">タグ</th>
            <th style="padding:6px 8px;">状態</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;

  document.getElementById('bulk-submit').disabled = valid.length === 0;
  document.getElementById('bulk-submit').textContent = valid.length > 0
    ? `${valid.length}件を登録する`
    : '登録する';
}

// ─── 登録 ─────────────────────────

async function submitBulk() {
  if (!isAdmin()) return;
  if (_bulkValidRows.length === 0) return;

  const payload = _bulkValidRows.map(r => ({
    id:         genId(),
    name:       r.name,
    area:       r.area,
    parking:    r.parking,
    tags:       r.tags,
    sns:        r.sns || null,
    memo:       r.memo || null,
    created_at: new Date().toISOString(),
    // user_id は auth.uid() のデフォルトで自動。緯度経度は後から各店の編集で設定。
  }));

  const { error } = await db.from('stores').insert(payload);
  if (error) { console.error('submitBulk error:', error); showToast('エラーが発生しました'); return; }

  closeBulkModal();
  showToast(`${payload.length}件のお店を登録しました 🎉`);
  renderCards();
}
