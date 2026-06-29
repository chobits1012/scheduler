import { Shift } from '../types';

export interface SheetImportConfig {
  spreadsheetId: string;
  sheetName: string;
  targetUserName: string;
  jobId: string;
  year: number;
}

const TIME_RE = /^(\d{1,2}):(\d{2})$/;
const CELL_TIME_THEME_RE = /^(\d{1,2}:\d{2})\s*(.*)$/;
const DATE_HEADER_RE = /(?:\d{4}\/)?(\d{1,2})\/(\d{1,2})/;

const normalizeHeaderCell = (cell: string | undefined): string =>
  (cell || '').trim().replace(/\u00a0/g, '');

const isScheduleTriplet = (row: string[], col: number): boolean =>
  normalizeHeaderCell(row[col]) === '時間' &&
  normalizeHeaderCell(row[col + 1]) === '排班' &&
  normalizeHeaderCell(row[col + 2]) === '狀態';

export const parseMonthFromSheetName = (sheetName: string): number | null => {
  const match = sheetName.match(/^(\d{1,2})/);
  if (!match) return null;
  const month = Number(match[1]);
  return month >= 1 && month <= 12 ? month : null;
};

export const padTime = (time: string): string => {
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
};

const addMinutes = (time: string, minutes: number): string => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
};

/** @deprecated kept for tests; prefer buildDayColumnMap */
export const findScheduleStartCol = (headerRows: string[][]): number => {
  for (let r = headerRows.length - 1; r >= 0; r--) {
    const row = headerRows[r] || [];
    for (let c = 0; c < row.length - 2; c++) {
      if (isScheduleTriplet(row, c)) return c;
    }
  }
  return 7;
};

export interface DayColumns {
  day: number;
  timeCol: number;
  shiftCol: number;
  statusCol: number;
}

const collectScheduleTriplets = (row: string[]): Omit<DayColumns, 'day'>[] => {
  const result: Omit<DayColumns, 'day'>[] = [];
  for (let col = 0; col < row.length - 2; col++) {
    if (!isScheduleTriplet(row, col)) continue;
    result.push({
      timeCol: col,
      shiftCol: col + 1,
      statusCol: col + 2,
    });
  }
  return result;
};

const parseDateHeaders = (
  headerRows: string[][],
  expectedMonth: number
): { col: number; day: number }[] => {
  const byDay = new Map<number, number>();

  for (const row of headerRows) {
    row.forEach((cell, col) => {
      const match = normalizeHeaderCell(cell).match(DATE_HEADER_RE);
      if (!match) return;
      const month = Number(match[1]);
      const day = Number(match[2]);
      if (month !== expectedMonth || day < 1 || day > 31) return;
      if (!byDay.has(day)) byDay.set(day, col);
    });
  }

  return [...byDay.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([day, col]) => ({ day, col }));
};

const MAX_ALIGNMENT_SCORE = 4;
/** Live / API 表頭常見：日期欄每隔 3 欄一個（8/1 col16, 8/2 col19…） */
const VISUAL_DATE_STRIDE = 3;

/** Score how well a 時間|排班|狀態 block lines up with a date header cell. Lower is better. */
export const scoreTripletDateAlignment = (
  triplet: Omit<DayColumns, 'day'>,
  date: { col: number; day: number }
): number => {
  const { timeCol, shiftCol } = triplet;
  const dc = date.col;
  if (timeCol === dc) return 0;
  if (timeCol === dc - 1) return 1;
  // 日期標題在 時間 右側 +3（幽靈 時間 欄：col13 對 8/1 col16）
  if (timeCol + 3 === dc) return 2;
  // 日期標題在 時間 左側 +3
  if (timeCol === dc + 3) return 3;
  if (shiftCol === dc) return 4;
  return 10 + Math.min(Math.abs(shiftCol - dc), Math.abs(timeCol - dc));
};

type Triplet = Omit<DayColumns, 'day'>;
type DateHeader = { col: number; day: number };

/** 表頭日期欄的常見間距（HTML 匯出多為 1，Sheets API 多為 3）。 */
export const inferDateHeaderStride = (dates: DateHeader[]): number => {
  if (dates.length < 2) return 1;
  const strides: number[] = [];
  for (let i = 1; i < Math.min(dates.length, 8); i++) {
    strides.push(dates[i].col - dates[i - 1].col);
  }
  strides.sort((a, b) => a - b);
  return strides[Math.floor(strides.length / 2)];
};

const isDominatedTripletAnchor = (
  triplets: Triplet[],
  dates: DateHeader[],
  tripletStart: number,
  dateStart: number
): boolean => {
  if (tripletStart + 1 >= triplets.length) return false;
  const anchor = dates[dateStart];
  const scoreHere = scoreTripletDateAlignment(triplets[tripletStart], anchor);
  const scoreNext = scoreTripletDateAlignment(triplets[tripletStart + 1], anchor);
  return scoreNext < scoreHere && scoreNext <= MAX_ALIGNMENT_SCORE;
};

/**
 * 視覺配對（像眼睛看表）：每個日期找「彼此最佳」的 時間 欄。
 * 幽靈欄（如 col13）會被略過，因為該日的最佳 triplet 是別欄。
 */
const matchTripletsByMutualBest = (
  triplets: Triplet[],
  dates: DateHeader[]
): DayColumns[] => {
  const tripletBest = new Map<number, { dateIndex: number; score: number }>();
  for (let ti = 0; ti < triplets.length; ti++) {
    let best = { dateIndex: -1, score: Infinity };
    for (let di = 0; di < dates.length; di++) {
      const score = scoreTripletDateAlignment(triplets[ti], dates[di]);
      if (score < best.score) best = { dateIndex: di, score };
    }
    tripletBest.set(ti, best);
  }

  const dateBest = new Map<number, { tripletIndex: number; score: number }>();
  for (let di = 0; di < dates.length; di++) {
    let best = { tripletIndex: -1, score: Infinity };
    for (let ti = 0; ti < triplets.length; ti++) {
      const score = scoreTripletDateAlignment(triplets[ti], dates[di]);
      if (score < best.score) best = { tripletIndex: ti, score };
    }
    dateBest.set(di, best);
  }

  const result: DayColumns[] = [];
  for (let di = 0; di < dates.length; di++) {
    const fromDate = dateBest.get(di);
    if (!fromDate || fromDate.tripletIndex < 0 || fromDate.score > MAX_ALIGNMENT_SCORE) continue;

    const fromTriplet = tripletBest.get(fromDate.tripletIndex);
    if (!fromTriplet || fromTriplet.dateIndex !== di || fromTriplet.score > MAX_ALIGNMENT_SCORE) continue;

    const { timeCol, shiftCol, statusCol } = triplets[fromDate.tripletIndex];
    result.push({ day: dates[di].day, timeCol, shiftCol, statusCol });
  }

  return result.sort((a, b) => a.day - b.day);
};

const resolveSequentialTripletStart = (
  triplets: Triplet[],
  dates: DateHeader[],
  dateStart: number
): number => {
  if (triplets.length < 2 || !dates[dateStart]) return 0;
  const anchor = dates[dateStart];
  const firstViaDatePlus3 = triplets[0].timeCol + 3 === anchor.col;
  const secondExactOnAnchor = triplets[1].timeCol === anchor.col;
  if (firstViaDatePlus3 && secondExactOnAnchor) return 1;
  if (isDominatedTripletAnchor(triplets, dates, 0, dateStart)) return 1;
  return 0;
};

const matchTripletsBySequentialZip = (
  triplets: Triplet[],
  dates: DateHeader[],
  dateStart: number,
  tripletStart: number
): DayColumns[] => {
  const result: DayColumns[] = [];
  for (let i = tripletStart; i < triplets.length; i++) {
    const dateEntry = dates[dateStart + (i - tripletStart)];
    if (!dateEntry) break;
    const { timeCol, shiftCol, statusCol } = triplets[i];
    result.push({ day: dateEntry.day, timeCol, shiftCol, statusCol });
  }
  return result;
};

export type DayColumnMapMode = 'visual' | 'sequential';

export type DayColumnMapConfidence = {
  mode: DayColumnMapMode;
  dateHeaderStride: number;
  dayCount: number;
  firstDay: number | null;
  lastDay: number | null;
  warnings: string[];
};

/** 匯入後自檢：日期是否連續、欄位是否合理。 */
export const validateDayColumnMap = (
  dayColumns: DayColumns[],
  dates: DateHeader[]
): DayColumnMapConfidence => {
  const warnings: string[] = [];
  const dateHeaderStride = inferDateHeaderStride(dates);

  if (dayColumns.length === 0) {
    warnings.push('未對應到任何日期欄');
  }

  for (let i = 1; i < dayColumns.length; i++) {
    if (dayColumns[i].day !== dayColumns[i - 1].day + 1) {
      warnings.push(`日期不連續：${dayColumns[i - 1].day} 日後接 ${dayColumns[i].day} 日`);
      break;
    }
  }

  const tripletStride =
    dayColumns.length >= 2 ? dayColumns[1].timeCol - dayColumns[0].timeCol : null;
  if (tripletStride !== null && tripletStride !== 3) {
    warnings.push(`時間欄間距為 ${tripletStride}（預期 3）`);
  }

  return {
    mode: dateHeaderStride >= VISUAL_DATE_STRIDE ? 'visual' : 'sequential',
    dateHeaderStride,
    dayCount: dayColumns.length,
    firstDay: dayColumns[0]?.day ?? null,
    lastDay: dayColumns.at(-1)?.day ?? null,
    warnings,
  };
};

const countGeibanBlocksBeforeFirstSchedule = (row: string[]): number => {
  let count = 0;
  for (let col = 0; col < row.length - 2; col++) {
    const a = normalizeHeaderCell(row[col]);
    const b = normalizeHeaderCell(row[col + 1]);
    const c = normalizeHeaderCell(row[col + 2]);
    if (a === '給班' && b === '排班' && c === '狀態') {
      count++;
      continue;
    }
    if (a === '時間' && b === '排班' && c === '狀態') break;
  }
  return count;
};

const findScheduleHeaderRow = (headerRows: string[][]): string[] => {
  let bestRow: string[] = headerRows[0] || [];
  let bestCount = 0;
  for (const row of headerRows) {
    const count = collectScheduleTriplets(row).length;
    if (count > bestCount) {
      bestCount = count;
      bestRow = row;
    }
  }
  return bestRow;
};

type FirstTripletMatchRule = {
  name: string;
  test: (triplet: Omit<DayColumns, 'day'>, date: { col: number }) => boolean;
};

const FIRST_TRIPLET_RULES: FirstTripletMatchRule[] = [
  { name: 'exact', test: (t, d) => t.timeCol === d.col },
  { name: 'datePlus3', test: (t, d) => t.timeCol + 3 === d.col },
  { name: 'plus3', test: (t, d) => t.timeCol === d.col + 3 },
  { name: 'minus1', test: (t, d) => t.timeCol === d.col - 1 },
  { name: 'shift', test: (t, d) => t.shiftCol === d.col },
];

const firstTripletRuleOrder = (
  headerRows: string[][],
  firstTimeCol: number
): FirstTripletMatchRule['name'][] => {
  const scheduleRow = findScheduleHeaderRow(headerRows);
  const geibanBefore = countGeibanBlocksBeforeFirstSchedule(scheduleRow);

  // 多個給班後 時間 常從 col 13 起：先試 exact，再試 datePlus3（live API 幽靈欄）
  if (geibanBefore >= 3) return ['exact', 'datePlus3', 'plus3', 'minus1', 'shift'];
  // 少數給班區塊後，時間欄常在日期欄右側 +3
  if (geibanBefore > 0) return ['plus3', 'exact', 'minus1', 'shift'];
  // 無給班、從第 1 欄起排，時間欄常在日期欄左側 -1
  if (firstTimeCol <= 5) return ['minus1', 'exact', 'plus3', 'shift'];
  return ['plus3', 'exact', 'minus1', 'shift'];
};

/** Find where the first schedule block starts on the month timeline. */
export const findStartDateIndex = (
  triplets: Omit<DayColumns, 'day'>[],
  dates: { col: number; day: number }[],
  headerRows: string[][]
): number => {
  if (dates.length === 0 || triplets.length === 0) return 0;

  const firstTriplet = triplets[0];
  const ruleOrder = firstTripletRuleOrder(headerRows, firstTriplet.timeCol);

  for (const ruleName of ruleOrder) {
    const rule = FIRST_TRIPLET_RULES.find((r) => r.name === ruleName);
    if (!rule) continue;
    const index = dates.findIndex((date) => rule.test(firstTriplet, date));
    if (index >= 0) return index;
  }

  let bestIndex = 0;
  let bestScore = Infinity;
  for (let i = 0; i < dates.length; i++) {
    const score = scoreTripletDateAlignment(firstTriplet, dates[i]);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
};

export type SheetLayoutKind = 'june' | 'july' | 'august';

/** 依表頭判斷版面（診斷用；解析不再依賴此值）。 */
export const detectSheetLayoutKind = (
  headerRows: string[][],
  firstTimeCol: number
): SheetLayoutKind => {
  const scheduleRow = findScheduleHeaderRow(headerRows);
  const geibanBefore = countGeibanBlocksBeforeFirstSchedule(scheduleRow);
  if (geibanBefore >= 3) return 'june';
  if (geibanBefore > 0) return 'july';
  if (firstTimeCol <= 5) return 'august';
  return 'july';
};

export const buildDayColumnMap = (
  headerRows: string[][],
  expectedMonth: number
): DayColumns[] => {
  if (headerRows.length === 0) return [];

  let triplets: Triplet[] = [];
  for (const row of headerRows) {
    const found = collectScheduleTriplets(row);
    if (found.length > triplets.length) triplets = found;
  }

  if (triplets.length === 0) return [];

  const dates = parseDateHeaders(headerRows, expectedMonth);
  if (dates.length === 0) {
    return triplets.map(({ timeCol, shiftCol, statusCol }, index) => ({
      day: index + 1,
      timeCol,
      shiftCol,
      statusCol,
    }));
  }

  const dateStride = inferDateHeaderStride(dates);

  // Sheets API：日期欄 stride=3 → 每個日期獨立對齊下方 時間 欄（不需知道是幾月）
  if (dateStride >= VISUAL_DATE_STRIDE) {
    return matchTripletsByMutualBest(triplets, dates);
  }

  // HTML 匯出：日期欄 stride=1 → 日曆索引與 triplet 序列對齊
  const dateStart = findStartDateIndex(triplets, dates, headerRows);
  const tripletStart = resolveSequentialTripletStart(triplets, dates, dateStart);
  return matchTripletsBySequentialZip(triplets, dates, dateStart, tripletStart);
};

export interface SheetImportDiagnostics {
  at: string;
  spreadsheetId: string;
  sheetName: string;
  targetUserName: string;
  month: number | null;
  year: number;
  headerRowCount: number;
  headerRows: string[][];
  columnARowCount: number;
  columnAMatches: { row: number; value: string }[];
  userBlock: { startRow: number; endRow: number } | null;
  dayColumnCount: number;
  dayColumnsSample: DayColumns[];
  blockRowCount: number | null;
  shiftCount: number | null;
}

const truncateRows = (rows: string[][], maxRows: number, maxCols: number): string[][] =>
  rows.slice(0, maxRows).map((row) => row.slice(0, maxCols));

export const buildSheetImportDiagnostics = (input: {
  spreadsheetId: string;
  sheetName: string;
  targetUserName: string;
  year: number;
  month: number | null;
  headerRows: string[][];
  columnA: string[][];
  userBlock: { startRow: number; endRow: number } | null;
  dayColumns: DayColumns[];
  blockRowCount?: number;
  shiftCount?: number;
}): SheetImportDiagnostics => {
  const columnAMatches = input.columnA
    .map((row, index) => ({ row: index + 1, value: (row[0] || '').trim() }))
    .filter(({ value }) => value && value.includes(input.targetUserName));

  return {
    at: new Date().toISOString(),
    spreadsheetId: input.spreadsheetId,
    sheetName: input.sheetName,
    targetUserName: input.targetUserName,
    month: input.month,
    year: input.year,
    headerRowCount: input.headerRows.length,
    headerRows: truncateRows(input.headerRows, 10, 20),
    columnARowCount: input.columnA.length,
    columnAMatches,
    userBlock: input.userBlock,
    dayColumnCount: input.dayColumns.length,
    dayColumnsSample: input.dayColumns.slice(0, 3),
    blockRowCount: input.blockRowCount ?? null,
    shiftCount: input.shiftCount ?? null,
  };
};

export const formatSheetImportDiagnostics = (d: SheetImportDiagnostics): string =>
  JSON.stringify(d, null, 2);

export const findUserBlock = (
  columnA: string[][],
  userName: string
): { startRow: number; endRow: number } | null => {
  const startRow = columnA.findIndex(
    (row) => row[0] && row[0].includes(userName)
  );
  if (startRow === -1) return null;

  let endRow = startRow;
  while (endRow + 1 < columnA.length) {
    const next = columnA[endRow + 1]?.[0]?.trim();
    if (next) break;
    endRow++;
  }
  return { startRow, endRow };
};

const appendNote = (base: string | undefined, extra: string): string =>
  base ? `${base} · ${extra}` : extra;

/** 狀態欄常見註解，不應自成一筆班表。 */
const STATUS_ANNOTATION_KEYWORDS = ['確認', '指定', '推廣'] as const;

export const isStatusAnnotation = (text: string): boolean => {
  const cleaned = text.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (!cleaned) return true;
  return STATUS_ANNOTATION_KEYWORDS.some((kw) => cleaned === kw || cleaned.includes(kw));
};

const isPlainTextEvent = (shift: string): boolean =>
  Boolean(shift) && !CELL_TIME_THEME_RE.test(shift) && !isStatusAnnotation(shift);

const isThemedEventCell = (text: string): boolean => {
  const match = text.match(CELL_TIME_THEME_RE);
  return Boolean(match?.[2]?.trim());
};

/** 排班欄只有時間、沒有主題時視為無效。 */
const isShiftColumnNoise = (shift: string, time: string): boolean =>
  !shift ||
  shift === 'X' ||
  shift === time ||
  (CELL_TIME_THEME_RE.test(shift) && !isThemedEventCell(shift));

export const parseEventCell = (
  eventCell: string,
  annotationCell: string,
  timeCell: string
): { startTime: string; endTime: string; note?: string } | null => {
  const event = (eventCell || '').trim();
  const annotation = (annotationCell || '').trim();
  const time = (timeCell || '').trim();

  if (!event || event === 'X') return null;

  let startTime: string | undefined;
  let endTime: string | undefined;
  let note: string | undefined;

  const eventMatch = event.match(CELL_TIME_THEME_RE);
  if (eventMatch && eventMatch[2].trim()) {
    startTime = padTime(eventMatch[1]);
    note = eventMatch[2].trim();
  } else if (isPlainTextEvent(event)) {
    const timeFromEvent = eventMatch?.[1];
    const rowTime = TIME_RE.test(time) ? time : timeFromEvent;
    if (!rowTime || !TIME_RE.test(rowTime)) return null;
    startTime = padTime(rowTime);
    note = event;
  } else {
    return null;
  }

  const annotationTimeMatch = annotation.match(CELL_TIME_THEME_RE);
  if (annotationTimeMatch) {
    endTime = padTime(annotationTimeMatch[1]);
    if (!note && annotationTimeMatch[2].trim()) note = annotationTimeMatch[2].trim();
  }

  if (!startTime && TIME_RE.test(time)) {
    startTime = padTime(time);
  }

  if (!startTime) return null;

  if (annotation.includes('確認')) note = appendNote(note, '確認');
  if (annotation.includes('指定')) note = appendNote(note, '指定');
  if (annotation.includes('推廣')) note = appendNote(note, '推廣');

  if (!endTime) {
    endTime = addMinutes(startTime, 60);
  } else if (endTime <= startTime) {
    endTime = addMinutes(startTime, 60);
  }

  return { startTime, endTime, note };
};

/** @deprecated use parseEventCell */
export const parseShiftCell = (
  shiftCell: string,
  statusCell: string,
  timeCell: string
): { startTime: string; endTime: string; note?: string } | null =>
  parseEventCell(shiftCell, statusCell, timeCell);

export type RowEventSource = 'shift' | 'status';

export const resolveRowEvent = (
  shiftCell: string,
  statusCell: string,
  timeCell: string
): { parsed: { startTime: string; endTime: string; note?: string }; source: RowEventSource; eventText: string } | null => {
  const shift = shiftCell.trim();
  const status = statusCell.trim();
  const time = timeCell.trim();

  if (shift && shift !== 'X' && (isThemedEventCell(shift) || isPlainTextEvent(shift))) {
    const parsed = parseEventCell(shift, status, time);
    if (parsed) return { parsed, source: 'shift', eventText: shift };
  }

  if (isShiftColumnNoise(shift, time) && status && !isStatusAnnotation(status)) {
    if (isThemedEventCell(status) || isPlainTextEvent(status)) {
      const statusTime = status.match(CELL_TIME_THEME_RE)?.[1];
      const effectiveTime = TIME_RE.test(time) ? time : statusTime || '';
      const parsed = parseEventCell(status, '', effectiveTime);
      if (parsed) return { parsed, source: 'status', eventText: status };
    }
  }

  return null;
};

/** Extend plain-text merged blocks downward while 排班/狀態 stay empty. */
const extendPlainTextBlockEnd = (
  blockRows: string[][],
  startRowIndex: number,
  timeCol: number,
  shiftCol: number,
  statusCol: number,
  startTime: string
): string => {
  let endRowIndex = startRowIndex;
  while (endRowIndex + 1 < blockRows.length) {
    const nextRow = blockRows[endRowIndex + 1] || [];
    const nextShift = (nextRow[shiftCol] || '').trim();
    const nextStatus = (nextRow[statusCol] || '').trim();
    if (nextShift) break;
    if (nextStatus && !isStatusAnnotation(nextStatus)) break;
    const nextTime = (nextRow[timeCol] || '').trim();
    if (!TIME_RE.test(nextTime)) break;
    endRowIndex++;
  }

  const lastTime = (blockRows[endRowIndex]?.[timeCol] || '').trim();
  const endBase = TIME_RE.test(lastTime) ? padTime(lastTime) : startTime;
  return addMinutes(endBase, 60);
};

export const parseUserBlockToShifts = (
  blockRows: string[][],
  dayColumns: DayColumns[],
  month: number,
  year: number,
  jobId: string
): Shift[] => {
  const shifts: Shift[] = [];
  const seen = new Set<string>();
  const consumedRows = new Set<string>();

  for (const { day, timeCol, shiftCol, statusCol } of dayColumns) {
    for (let rowIndex = 0; rowIndex < blockRows.length; rowIndex++) {
      const row = blockRows[rowIndex] || [];
      const consumeKey = `${day}|${rowIndex}`;
      if (consumedRows.has(consumeKey)) continue;

      const shiftCell = row[shiftCol] || '';
      const statusCell = row[statusCol] || '';
      const timeCell = row[timeCol] || '';
      const resolved = resolveRowEvent(shiftCell, statusCell, timeCell);
      if (!resolved) continue;

      const { parsed, eventText } = resolved;
      const isPlainBlock = isPlainTextEvent(eventText);
      if (isPlainBlock) {
        parsed.endTime = extendPlainTextBlockEnd(
          blockRows,
          rowIndex,
          timeCol,
          shiftCol,
          statusCol,
          parsed.startTime
        );
        for (let r = rowIndex; r < blockRows.length; r++) {
          const probe = blockRows[r] || [];
          const probeTime = (probe[timeCol] || '').trim();
          if (r > rowIndex) {
            const probeShift = (probe[shiftCol] || '').trim();
            const probeStatus = (probe[statusCol] || '').trim();
            if (probeShift) break;
            if (probeStatus && !isStatusAnnotation(probeStatus)) break;
            if (!TIME_RE.test(probeTime)) break;
          }
          consumedRows.add(`${day}|${r}`);
          if (r > rowIndex && probeTime && addMinutes(padTime(probeTime), 60) >= parsed.endTime) break;
        }
      }

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const key = `${dateStr}|${parsed.startTime}|${parsed.note || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);

      shifts.push({
        id: crypto.randomUUID(),
        jobId,
        dateStr,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        note: parsed.note,
      });
    }
  }

  return shifts.sort((a, b) =>
    a.dateStr.localeCompare(b.dateStr) || a.startTime.localeCompare(b.startTime)
  );
};
