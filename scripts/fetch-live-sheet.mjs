/**
 * Fetch live 開溜班表 via Google Sheets API (same as the app) and diagnose date mapping.
 *
 * 1. Log in on https://scheduler-three-tau.vercel.app (or localhost)
 * 2. Browser console: copy(localStorage.getItem('google_access_token'))
 * 3. Run:
 *    GOOGLE_ACCESS_TOKEN='paste-token' npx tsx scripts/fetch-live-sheet.mjs 8演員
 */
import {
  buildDayColumnMap,
  findUserBlock,
  parseMonthFromSheetName,
  parseUserBlockToShifts,
  detectSheetLayoutKind,
} from '../utils/sheetImport.ts';

const SPREADSHEET_ID = '1ms4h5iJwgIhW2et2jA3e9Xynm4mf3RrGA3kAbr5Fok4';
const USER_NAME = '王捷仟';
const YEAR = 2026;

const token = process.env.GOOGLE_ACCESS_TOKEN;
const sheetName = process.argv[2] || '8演員';

if (!token) {
  console.error('Missing GOOGLE_ACCESS_TOKEN env var.');
  console.error("Get it from browser console after Google login:");
  console.error("  copy(localStorage.getItem('google_access_token'))");
  process.exit(1);
}

const fetchValues = async (range) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.values || [];
};

const padRow = (row, len) => {
  const out = [...(row || [])];
  while (out.length < len) out.push('');
  return out;
};

const normalizeRows = (rows) => {
  const maxLen = Math.max(...rows.map((r) => r.length), 0);
  return rows.map((r) => padRow(r, maxLen));
};

const month = parseMonthFromSheetName(sheetName);
if (!month) {
  console.error(`Cannot parse month from sheet name: ${sheetName}`);
  process.exit(1);
}

const [columnA, headerRowsRaw] = await Promise.all([
  fetchValues(`${sheetName}!A1:A1000`),
  fetchValues(`${sheetName}!A1:DA10`),
]);

const headerRows = normalizeRows(headerRowsRaw);

console.log('=== LIVE API FETCH ===');
console.log('sheet:', sheetName, 'month:', month);
console.log('header row count:', headerRows.length);
console.log('max cols in header:', Math.max(...headerRows.map((r) => r.length)));

// Show schedule header row (row with most 時間|排班|狀態)
let bestRowIdx = 0;
let bestTriplets = 0;
for (let ri = 0; ri < headerRows.length; ri++) {
  const row = headerRows[ri];
  let n = 0;
  for (let c = 0; c < row.length - 2; c++) {
    if (row[c] === '時間' && row[c + 1] === '排班' && row[c + 2] === '狀態') n++;
  }
  if (n > bestTriplets) {
    bestTriplets = n;
    bestRowIdx = ri;
  }
}

const schedRow = headerRows[bestRowIdx] || [];
console.log('\nSchedule header row index:', bestRowIdx, '(1-based:', bestRowIdx + 1, ')');
console.log('cols 0-12:', schedRow.slice(0, 13).map((c, i) => `${i}:${JSON.stringify(c || '')}`).join(' | '));

console.log('\nAll header rows (cols with 時間/給班/8/):');
for (let ri = 0; ri < headerRows.length; ri++) {
  const row = headerRows[ri];
  const sn = [];
  for (let c = 0; c < Math.min(35, row.length); c++) {
    const v = (row[c] || '').trim();
    if (v && (/時間|排班|狀態|給班|8\//.test(v) || v.includes('灰底'))) {
      sn.push(`${c}:${v.slice(0, 18)}`);
    }
  }
  if (sn.length) console.log(` row[${ri}]`, sn.join(' | '));
}

const dayColumns = buildDayColumnMap(headerRows, month);
const layout = detectSheetLayoutKind(headerRows, dayColumns[0]?.timeCol ?? 0);

console.log('\n=== PARSE RESULT ===');
console.log('layout:', layout);
console.log('first triplet timeCol:', dayColumns[0]?.timeCol);
console.log('day map first 6:', dayColumns.slice(0, 6).map((d) => d.day).join(', '));

const userBlock = findUserBlock(columnA, USER_NAME);
if (!userBlock) {
  console.error(`User "${USER_NAME}" not found in column A`);
  process.exit(1);
}

const startRow1 = userBlock.startRow + 1;
const endRow1 = userBlock.endRow + 1;
const blockRowsRaw = await fetchValues(`${sheetName}!A${startRow1}:CZ${endRow1}`);
const blockRows = normalizeRows(blockRowsRaw);

const shifts = parseUserBlockToShifts(blockRows, dayColumns, month, YEAR, 'job-b');

console.log('shift count:', shifts.length);
console.log('first 5 shifts:');
for (const s of shifts.slice(0, 5)) {
  console.log(`  ${s.dateStr} ${s.startTime}-${s.endTime} ${s.note || ''}`);
}

const guiHun = shifts.filter((s) => s.note?.includes('鬼混'));
console.log('\n鬼混 shifts:', guiHun.length);
if (guiHun[0]) {
  console.log('first 鬼混:', guiHun[0].dateStr, guiHun[0].startTime + '-' + guiHun[0].endTime);
}

console.log('\n=== DAY 1-6 RAW CELLS (王捷仟) ===');
for (const dc of dayColumns.slice(0, 6)) {
  const parts = [];
  for (let ri = 0; ri < Math.min(8, blockRows.length); ri++) {
    const row = blockRows[ri] || [];
    const t = (row[dc.timeCol] || '').trim();
    const s = (row[dc.shiftCol] || '').trim();
    const st = (row[dc.statusCol] || '').trim();
    if (t || s || st) parts.push(`r${ri}:t=${t || '-'} st=${st || '-'} s=${s || '-'}`);
  }
  console.log(
    `8/${dc.day} cols ${dc.timeCol}/${dc.shiftCol}/${dc.statusCol}:`,
    parts.length ? parts.join(' | ') : '(empty)'
  );
}
