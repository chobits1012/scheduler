/**
 * Validate 開溜製造所班表 parsing across all available month exports.
 * Run: npx tsx scripts/test-all-month-import.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  buildDayColumnMap,
  detectSheetLayoutKind,
  findUserBlock,
  parseMonthFromSheetName,
  parseUserBlockToShifts,
} from '../utils/sheetImport.ts';

const SHEET_DIR = '/Users/jameswang/Desktop/開溜製造所_班表';
const USER_NAME = '王捷仟';
const YEAR = 2026;

const EXPECTED_FIRST_DAY = {
  6: 12, // 6/12 起才有 時間|排班|狀態
  7: 3,  // 7/3 起
  8: 1,  // 8/1 起
};

function parseHtmlTable(html) {
  const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  return rowMatches.map((tr) => {
    const cells = tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g) || [];
    return cells.map((c) => c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
  });
}

function toSheetRows(htmlRows) {
  return htmlRows.map((row) => row.slice(1));
}

function loadSheet(sheetName) {
  const htmlPath = path.join(SHEET_DIR, `${sheetName}.html`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const sheetRows = toSheetRows(parseHtmlTable(html));
  const month = parseMonthFromSheetName(sheetName);
  const headerRows = sheetRows.slice(0, 5);
  const dayColumns = buildDayColumnMap(headerRows, month);
  const columnA = sheetRows.map((row) => [row[0] || '']);
  const userBlock = findUserBlock(columnA, USER_NAME);
  if (!userBlock) throw new Error(`user block not found in ${sheetName}`);

  const blockRows = sheetRows.slice(userBlock.startRow, userBlock.endRow + 1);
  const shifts = parseUserBlockToShifts(blockRows, dayColumns, month, YEAR, 'job-b');
  return { sheetName, month, headerRows, dayColumns, shifts };
}

const EXPECTED_LAYOUT = {
  6: 'june',
  7: 'july',
  8: 'august',
};

function getTriplets(headerRows) {
  let best = [];
  for (const row of headerRows) {
    const found = [];
    for (let col = 0; col < row.length - 2; col++) {
      if (
        (row[col] || '').trim() === '時間' &&
        (row[col + 1] || '').trim() === '排班' &&
        (row[col + 2] || '').trim() === '狀態'
      ) {
        found.push({ timeCol: col, shiftCol: col + 1, statusCol: col + 2 });
      }
    }
    if (found.length > best.length) best = found;
  }
  return best;
}

function validateSheet({ sheetName, month, headerRows, dayColumns, shifts }) {
  const errors = [];

  if (dayColumns.length === 0) {
    errors.push('no day columns');
    return errors;
  }

  const triplets = getTriplets(headerRows);
  const layout = detectSheetLayoutKind(headerRows, triplets[0]?.timeCol ?? 0);
  const expectedLayout = EXPECTED_LAYOUT[month];
  if (expectedLayout && layout !== expectedLayout) {
    errors.push(`layout ${layout}, expected ${expectedLayout}`);
  }

  const firstDay = dayColumns[0].day;
  const expectedFirst = EXPECTED_FIRST_DAY[month];
  if (expectedFirst && firstDay !== expectedFirst) {
    errors.push(`first day ${firstDay}, expected ${expectedFirst}`);
  }

  for (let i = 1; i < dayColumns.length; i++) {
    if (dayColumns[i].day !== dayColumns[i - 1].day + 1) {
      errors.push(`day sequence break at index ${i}: ${dayColumns[i - 1].day} -> ${dayColumns[i].day}`);
      break;
    }
  }

  const lastDay = dayColumns.at(-1).day;
  if (lastDay > 31) errors.push(`last day out of range: ${lastDay}`);

  if (shifts.length === 0) {
    errors.push('no shifts parsed (may be empty month)');
  }

  for (const s of shifts) {
    const d = Number(s.dateStr.slice(8));
    if (d < firstDay || d > lastDay) {
      errors.push(`shift ${s.dateStr} outside mapped range ${firstDay}-${lastDay}`);
      break;
    }
  }

  return errors;
}

let failed = 0;
const sheets = fs
  .readdirSync(SHEET_DIR)
  .filter((f) => /^\d+演員\.html$/.test(f))
  .map((f) => f.replace('.html', ''))
  .sort((a, b) => parseMonthFromSheetName(a) - parseMonthFromSheetName(b));

console.log('Testing sheets:', sheets.join(', '));

for (const sheetName of sheets) {
  try {
    const data = loadSheet(sheetName);
    const errors = validateSheet(data);
    if (errors.length) {
      console.error(`FAIL ${sheetName}:`, errors.join('; '));
      failed++;
    } else {
      const triplets = getTriplets(data.headerRows);
      const layout = detectSheetLayoutKind(data.headerRows, triplets[0]?.timeCol ?? 0);
      const days = data.dayColumns.map((d) => d.day);
      const shiftDays = [...new Set(data.shifts.map((s) => s.dateStr.slice(8)))].sort();
      console.log(
        `OK ${sheetName}: layout=${layout}, days ${days[0]}-${days.at(-1)} (${days.length} cols), ${data.shifts.length} shifts, on days ${shiftDays.join(',')}`
      );
    }
  } catch (e) {
    console.error(`FAIL ${sheetName}:`, e.message);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} sheet(s) failed`);
  process.exit(1);
}

// Live 8月 API 表頭（含 col13 幽靈 時間 欄）：8/3 應對 col22，非 8/4
const liveAugustHeader = [
  [
    '灰底 =  X',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '8/1 週六',
    '',
    '',
    '8/2 週日',
    '',
    '',
    '8/3 週一',
    '',
    '',
    '8/4 週二',
  ],
  [
    '',
    '給班',
    '排班',
    '狀態',
    '給班',
    '排班',
    '狀態',
    '給班',
    '排班',
    '狀態',
    '給班',
    '排班',
    '狀態',
    '時間',
    '排班',
    '狀態',
    '時間',
    '排班',
    '狀態',
    '時間',
    '排班',
    '狀態',
    '時間',
    '排班',
    '狀態',
    '時間',
    '排班',
    '狀態',
  ],
];
const liveDayColumns = buildDayColumnMap(liveAugustHeader, 8);
const liveFirstSix = liveDayColumns.slice(0, 4).map((d) => `${d.day}@${d.timeCol}`);
if (liveFirstSix.join(',') !== '1@16,2@19,3@22,4@25') {
  console.error('FAIL live 8月 header:', liveFirstSix.join(', '), 'expected 1@16,2@19,3@22,4@25');
  process.exit(1);
}
console.log('OK live 8月 API header: days', liveFirstSix.join(', '));

console.log('\nALL MONTHS PASS');
