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

/** Company sheet: first 時間|排班|狀態 block is July 3, not July 1. */
const SCHEDULE_DAY_OFFSET = 2;

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

export const buildDayColumnMap = (
  headerRows: string[][],
  _expectedMonth: number
): DayColumns[] => {
  if (headerRows.length === 0) return [];

  let triplets: Omit<DayColumns, 'day'>[] = [];
  for (const row of headerRows) {
    const found = collectScheduleTriplets(row);
    if (found.length > triplets.length) triplets = found;
  }

  if (triplets.length === 0) return [];

  const result: DayColumns[] = [];

  triplets.forEach(({ timeCol, shiftCol, statusCol }, index) => {
    const day = index + 1 + SCHEDULE_DAY_OFFSET;
    if (day < 1 || day > 31) return;

    result.push({ day, timeCol, shiftCol, statusCol });
  });

  return result;
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
