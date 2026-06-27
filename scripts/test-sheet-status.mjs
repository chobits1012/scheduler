/**
 * Ensure 狀態欄註解不會自成班表。
 * Run: npx tsx scripts/test-sheet-status.mjs
 */
import { parseShiftCell, parseEventCell, resolveRowEvent, isStatusAnnotation, parseUserBlockToShifts } from '../utils/sheetImport.ts';

let failed = 0;
const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('OK:', msg);
  }
};

assert(isStatusAnnotation('確認'), '確認 is annotation');
assert(isStatusAnnotation('✅ 確認'), 'emoji 確認 is annotation');
assert(isStatusAnnotation('指定'), '指定 is annotation');
assert(!isStatusAnnotation('鬼混排練'), '鬼混排練 is event');

const themed = parseShiftCell('20:30 寂', '✅ 確認', '20:30');
assert(themed?.startTime === '20:30' && themed?.note?.includes('寂'), 'themed shift parses');
assert(themed?.note?.includes('確認'), 'status appends as note');

const statusOnly = parseShiftCell('確認', '確認', '20:00');
assert(statusOnly === null, 'status-only cell does not parse as shift');

const plain = parseEventCell('鬼混排練', '', '13:00');
assert(plain?.note === '鬼混排練' && plain?.startTime === '13:00', 'plain rehearsal parses');

const statusRehearsal = resolveRowEvent('', '鬼混排練', '13:00');
assert(statusRehearsal?.parsed.note === '鬼混排練', 'status-column rehearsal resolves');

const statusThemed = resolveRowEvent('20:00', '20:30 寂', '');
assert(statusThemed?.parsed.startTime === '20:30' && statusThemed?.parsed.note === '寂', 'themed shift in status column');

// 7/6 真實結構：鬼混排練在狀態欄
const july6RealRows = [
  ['', '13:00', '', '鬼混排練'],
  ['', '14:00', '', ''],
  ['', '15:00', '', ''],
  ['', '16:00', '16:00 寂', ''],
  ['', '18:00', '18:15 寂', ''],
  ['', '', '20:00', '20:30 寂'],
];

const blockRows = [
  ['', '10:00', '', ''],
  ['', '13:00', '鬼混排練', ''],
  ['', '14:00', '', ''],
  ['', '15:00', '', ''],
  ['', '16:00', '16:00 寂', ''],
];
const dayColumns = [{ day: 6, timeCol: 1, shiftCol: 2, statusCol: 3 }];
const shifts = parseUserBlockToShifts(blockRows, dayColumns, 7, 2026, 'job-b');
assert(shifts.length === 2, `expected 2 shifts, got ${shifts.length}`);
assert(
  !shifts.some((s) => isStatusAnnotation(s.note || '') && !/寂|黃|排練/.test(s.note || '')),
  'no annotation-only shifts'
);
assert(shifts.some((s) => s.note === '鬼混排練'), 'rehearsal block included');

// 7/6 情境：鬼混排練 + 多筆寂 同一天應全部出現
const july6Shifts = parseUserBlockToShifts(july6RealRows, dayColumns, 7, 2026, 'job-b');
assert(july6Shifts.length === 4, `7/6 real layout expected 4 shifts, got ${july6Shifts.length}`);
assert(july6Shifts.some((s) => s.note === '鬼混排練' && s.startTime === '13:00'), '7/6 real rehearsal');
assert(july6Shifts.filter((s) => s.note?.includes('寂')).length === 3, '7/6 real three 寂 shifts');

process.exit(failed > 0 ? 1 : 0);
