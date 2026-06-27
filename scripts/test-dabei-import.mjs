/**
 * Offline validation for 大台北 dabei parser.
 * Run: npm run test:dabei-import
 */
import {
  findMonthBlock,
  findUserRowInBlock,
  parseDabeiShiftCell,
  parseDabeiUserRowToShifts,
} from '../utils/sheetImportDabei.ts';

// July block — column A is often empty; month label in B (matches live sheet)
const julyHeader = ['', '7月', '7/1', '7/2', '7/3', '7/4', '7/5', '7/6', '7/7', '7/8', '7/9', '7/10', '7/11', '7/12', '7/13', '7/14', '7/15', '7/16', '7/17', '7/18', '7/19', '7/20', '7/21', '7/22', '7/23', '7/24'];
const julyStaff = ['', '人員', '三', '四', '五', '六', '日', '一', '二', '三', '四', '五', '六', '日', '一', '二', '三', '四', '五', '六', '日', '一', '二', '三', '四', '五'];
const julyJieqian = ['', 'PT 捷仟', 'FRS 13-20', '', '', '', '', '', '', '', '', 'FRS 13-20', '', '', '', '', '', '', '', '', '', '', '', '', '', 'FRS 13-20'];

const sheetRows = [
  ...Array(174).fill(null).map(() => []),
  julyHeader,
  julyStaff,
  ['芸瑄', 'FRS教', 'FRS'],
  julyJieqian,
];

const block = findMonthBlock(sheetRows, 7);
if (!block) {
  console.error('FAIL: month block not found');
  process.exit(1);
}
console.log('block dates:', block.dateColumns.length);

const user = findUserRowInBlock(sheetRows, block, '捷仟');
if (!user) {
  console.error('FAIL: user not found');
  process.exit(1);
}
console.log('user row:', user.row + 1, 'name col:', user.nameCol);

const result = parseDabeiUserRowToShifts(sheetRows, block, user.row, user.nameCol, 7, 2026, 'job-a');
console.log('shifts:', result.shifts.length);
for (const s of result.shifts) {
  console.log(`  ${s.dateStr} ${s.startTime}-${s.endTime} ${s.note || ''}`);
}

const dates = result.shifts.map((s) => s.dateStr);
const expected = ['2026-07-01', '2026-07-10', '2026-07-24'];
if (JSON.stringify(dates) !== JSON.stringify(expected)) {
  console.error('FAIL: expected', expected, 'got', dates);
  process.exit(1);
}

const cellTests = [
  ['FRS 13-20', '13:00', '20:00', 'FRS'],
  ['RL 12/-19/', '12:00', '19:00', 'RL'],
  ['14-21', '14:00', '21:00', undefined],
  ['40', null],
];
for (const [cell, start, end, note] of cellTests) {
  const p = parseDabeiShiftCell(cell);
  if (start === null) {
    if (p !== null) {
      console.error('FAIL: expected null for', cell);
      process.exit(1);
    }
    continue;
  }
  if (!p || p.startTime !== start || p.endTime !== end || p.note !== note) {
    console.error('FAIL parse', cell, p);
    process.exit(1);
  }
}

console.log('PASS');

// June — column A empty, PT 捷仟 in column B
const juneHeader = ['', '6月', '6/1', '6/2', '6/3', '6/4', '6/5', '6/6', '6/7', '6/8', '6/9', '6/10', '6/11', '6/12', '6/13', '6/14', '6/15', '6/16', '6/17', '6/18', '6/19', '6/20', '6/21', '6/22', '6/23', '6/24', '6/25', '6/26', '6/27'];
const juneJieqian = ['', 'PT 捷仟', '', '', '', 'FRS 14-21', '', '', '', '', '', '', '14-21', '', '', '', '', '', '', '-19/', '', '', '', '', '', '', '', 'RL 12/-19/'];
const juneRows = [...Array(145).fill(null).map(() => []), juneHeader, juneJieqian];
const juneBlock = findMonthBlock(juneRows, 6);
const juneUser = findUserRowInBlock(juneRows, juneBlock, '捷仟');
const juneResult = parseDabeiUserRowToShifts(juneRows, juneBlock, juneUser.row, juneUser.nameCol, 6, 2026, 'job-a');
const juneDates = juneResult.shifts.map((s) => s.dateStr);
const juneExpected = ['2026-06-04', '2026-06-11', '2026-06-26'];
if (JSON.stringify(juneDates) !== JSON.stringify(juneExpected)) {
  console.error('FAIL june: expected', juneExpected, 'got', juneDates);
  process.exit(1);
}
console.log('June PASS:', juneDates);
