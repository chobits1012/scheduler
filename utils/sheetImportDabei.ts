import { Shift } from '../types';
import { padTime } from './sheetImport';

const normalizeCell = (cell: string | undefined): string =>
  (cell || '').trim().replace(/\u00a0/g, '');

const MONTH_HEADER_RE = /^(\d{1,2})月$/;
const DATE_CELL_RE = /^(\d{1,2})\/(\d{1,2})$/;
const HOUR_TOTAL_RE = /^\d{2,3}(\+\d+)?$/;

export interface DabeiDateColumn {
  day: number;
  col: number;
}

export interface DabeiMonthBlock {
  headerRow: number;
  endRow: number;
  /** Column index of the cell containing e.g. "7月" */
  monthLabelCol: number;
  dateColumns: DabeiDateColumn[];
}

export interface DabeiParseResult {
  shifts: Shift[];
  monthBlock: DabeiMonthBlock;
  userRow: number;
  nameCol: number;
  filledCellCount: number;
  parsedCellCount: number;
  samples: { dateStr: string; rawCell: string; startTime: string; endTime: string; note?: string }[];
}

export const findMonthBlock = (
  rows: string[][],
  targetMonth: number
): DabeiMonthBlock | null => {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < Math.min(row.length, 3); c++) {
      const headerMatch = normalizeCell(row[c]).match(MONTH_HEADER_RE);
      if (!headerMatch || Number(headerMatch[1]) !== targetMonth) continue;

      const dateColumns: DabeiDateColumn[] = [];
      for (let col = c + 1; col < row.length; col++) {
        const dateMatch = normalizeCell(row[col]).match(DATE_CELL_RE);
        if (!dateMatch) continue;
        const cellMonth = Number(dateMatch[1]);
        const day = Number(dateMatch[2]);
        if (cellMonth !== targetMonth || day < 1 || day > 31) continue;
        dateColumns.push({ day, col });
      }

      if (dateColumns.length === 0) continue;

      let endRow = rows.length - 1;
      for (let nr = r + 1; nr < rows.length; nr++) {
        const next = rows[nr] || [];
        for (let nc = 0; nc < Math.min(next.length, 3); nc++) {
          if (MONTH_HEADER_RE.test(normalizeCell(next[nc]))) {
            endRow = nr - 1;
            break;
          }
        }
        if (endRow !== rows.length - 1) break;
      }

      return { headerRow: r, endRow, monthLabelCol: c, dateColumns };
    }
  }
  return null;
};

export const findUserRowInBlock = (
  rows: string[][],
  block: DabeiMonthBlock,
  userName: string
): { row: number; nameCol: number } | null => {
  const needle = userName.trim();
  if (!needle) return null;

  for (let r = block.headerRow + 1; r <= block.endRow; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < Math.min(row.length, 4); c++) {
      const cell = normalizeCell(row[c]);
      if (cell && cell.includes(needle)) return { row: r, nameCol: c };
    }
  }
  return null;
};

const toHourTime = (hour: string, minute = '00'): string =>
  padTime(`${Number(hour)}:${minute}`);

/** Parse 大台北 PT 格子，如 FRS 13-20、RL 12/-19/、14-21 */
export const parseDabeiShiftCell = (
  cell: string
): { startTime: string; endTime: string; note?: string } | null => {
  const raw = normalizeCell(cell);
  if (!raw || raw === 'X' || HOUR_TOTAL_RE.test(raw)) return null;

  const tagMatch = raw.match(/^(FRS|RL|EGG|A11|PT)\s*/i);
  const note = tagMatch ? tagMatch[1].toUpperCase() : undefined;
  const rest = tagMatch ? raw.slice(tagMatch[0].length).trim() : raw;

  const rangeDash = rest.match(/^(\d{1,2})-(\d{1,2})$/);
  if (rangeDash) {
    return {
      startTime: toHourTime(rangeDash[1]),
      endTime: toHourTime(rangeDash[2]),
      note,
    };
  }

  const rangeSlash = rest.match(/^(\d{1,2})\/-(\d{1,2})\/?$/);
  if (rangeSlash) {
    return {
      startTime: toHourTime(rangeSlash[1]),
      endTime: toHourTime(rangeSlash[2]),
      note,
    };
  }

  return null;
};

export const parseDabeiUserRowToShifts = (
  rows: string[][],
  block: DabeiMonthBlock,
  userRow: number,
  nameCol: number,
  month: number,
  year: number,
  jobId: string
): DabeiParseResult => {
  const row = rows[userRow] || [];
  const shifts: Shift[] = [];
  const samples: DabeiParseResult['samples'] = [];
  let filledCellCount = 0;
  let parsedCellCount = 0;

  // PT 列：姓名與「7月」同欄（B 欄）→ offset 0；正職：A 備註、B 姓名 → offset 1
  const dataOffset = nameCol - block.monthLabelCol;

  for (const { day, col } of block.dateColumns) {
    const rawCell = normalizeCell(row[col + dataOffset]);
    if (!rawCell) continue;
    filledCellCount++;

    const parsed = parseDabeiShiftCell(rawCell);
    if (!parsed) continue;
    parsedCellCount++;

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    shifts.push({
      id: crypto.randomUUID(),
      jobId,
      dateStr,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      note: parsed.note,
    });
    samples.push({
      dateStr,
      rawCell,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      note: parsed.note,
    });
  }

  return {
    shifts: shifts.sort(
      (a, b) => a.dateStr.localeCompare(b.dateStr) || a.startTime.localeCompare(b.startTime)
    ),
    monthBlock: block,
    userRow,
    nameCol,
    filledCellCount,
    parsedCellCount,
    samples,
  };
};

export interface DabeiImportDiagnostics {
  format: 'dabei';
  at: string;
  spreadsheetId: string;
  sheetName: string;
  targetUserName: string;
  month: number;
  year: number;
  monthBlock: DabeiMonthBlock | null;
  userRow: number | null;
  nameCol: number | null;
  filledCellCount: number;
  parsedCellCount: number;
  shiftCount: number;
  samples: DabeiParseResult['samples'];
}

export const buildDabeiDiagnostics = (input: {
  spreadsheetId: string;
  sheetName: string;
  targetUserName: string;
  month: number;
  year: number;
  monthBlock: DabeiMonthBlock | null;
  userRow: number | null;
  nameCol: number | null;
  filledCellCount: number;
  parsedCellCount: number;
  shiftCount: number;
  samples: DabeiParseResult['samples'];
}): DabeiImportDiagnostics => ({
  format: 'dabei',
  at: new Date().toISOString(),
  ...input,
});

export const formatDabeiDiagnostics = (d: DabeiImportDiagnostics): string =>
  JSON.stringify(d, null, 2);
