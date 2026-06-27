/**
 * Offline validation against 7演員.html export.
 * Run: node scripts/test-sheet-import.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDayColumnMap,
  findUserBlock,
  parseMonthFromSheetName,
  parseUserBlockToShifts,
} from '../utils/sheetImport.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = '/Users/jameswang/Desktop/開溜製造所_班表/7演員.html';

function parseHtmlTable(html) {
  const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  return rowMatches.map((tr) => {
    const cells = tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g) || [];
    return cells.map((c) =>
      c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
    );
  });
}

/** HTML export has a leading row-number column; strip it for API-like rows. */
function toSheetRows(htmlRows) {
  return htmlRows.map((row) => row.slice(1));
}

const html = fs.readFileSync(htmlPath, 'utf8');
const htmlRows = parseHtmlTable(html);
const sheetRows = toSheetRows(htmlRows);

const headerRows = sheetRows.slice(0, 3);
const columnA = sheetRows.map((row) => [row[0] || '']);
const month = parseMonthFromSheetName('7演員');
const dayColumns = buildDayColumnMap(headerRows, month);

console.log('month:', month);
console.log('dayColumns:', dayColumns.length, 'first:', dayColumns[0], 'last:', dayColumns.at(-1));

const userBlock = findUserBlock(columnA, '王捷仟');
if (!userBlock) {
  console.error('FAIL: user block not found');
  process.exit(1);
}
console.log('userBlock rows:', userBlock.startRow + 1, '-', userBlock.endRow + 1);

const blockRows = sheetRows.slice(userBlock.startRow, userBlock.endRow + 1);
const shifts = parseUserBlockToShifts(blockRows, dayColumns, month, 2026, 'job-b');

console.log('shifts found:', shifts.length);
console.log('sample:');
for (const s of shifts.slice(0, 15)) {
  console.log(`  ${s.dateStr} ${s.startTime}-${s.endTime} ${s.note || ''}`);
}

if (shifts.length === 0) {
  console.error('FAIL: expected shifts for 王捷仟');
  process.exit(1);
}

const hasThemedShift = shifts.some((s) => s.note && /寂|黃|卦|洋/.test(s.note));
if (!hasThemedShift) {
  console.error('FAIL: no themed shifts parsed');
  process.exit(1);
}

console.log('PASS');
