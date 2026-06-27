import { useState, useCallback } from 'react';
import { Shift, SyncConfig, JOB_A_ID, ShiftImportPreview, Job } from '../types';
import { ensureGoogleAccessToken } from '../services/googleAuth';
import { suggestJobId } from '../utils/jobRouting';
import {
  buildDayColumnMap,
  buildSheetImportDiagnostics,
  findUserBlock,
  parseMonthFromSheetName,
  parseUserBlockToShifts,
  SheetImportDiagnostics,
} from '../utils/sheetImport';
import {
  buildDabeiDiagnostics,
  findMonthBlock,
  findUserRowInBlock,
  formatDabeiDiagnostics,
  parseDabeiUserRowToShifts,
  DabeiImportDiagnostics,
} from '../utils/sheetImportDabei';

export type SheetDiagnostics = SheetImportDiagnostics | DabeiImportDiagnostics;

export const formatSheetDiagnostics = (d: SheetDiagnostics): string =>
  'format' in d && d.format === 'dabei' ? formatDabeiDiagnostics(d) : JSON.stringify(d, null, 2);

const DEFAULT_DABEI_SPREADSHEET_ID = '1eN1ny9P3VSLLBqvHTkQb6FmLuZMLUa7vBDrfOjmvATs';

const buildImportPreview = (
  rows: { dateStr: string; startTime: string; endTime: string; note?: string; rawCell: string }[],
  jobs: Job[]
): ShiftImportPreview[] =>
  rows.map((row) => {
    const suggestedJobId = suggestJobId(row.note, jobs);
    return {
      ...row,
      suggestedJobId,
      selectedJobId: suggestedJobId ?? undefined,
    };
  });

export const getDefaultSyncConfig = (jobId: string, importMonth: number): Partial<SyncConfig> => {
  if (jobId === JOB_A_ID) {
    return {
      spreadsheetId: DEFAULT_DABEI_SPREADSHEET_ID,
      sheetName: '2026',
      targetUserName: '捷仟',
      importMonth,
    };
  }
  return {
    spreadsheetId: '1ms4h5iJwgIhW2et2jA3e9Xynm4mf3RrGA3kAbr5Fok4',
    sheetName: `${importMonth}演員`,
    targetUserName: '王捷仟',
  };
};

export const useGoogleSheets = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewShifts, setPreviewShifts] = useState<Shift[]>([]);
  const [previewDetails, setPreviewDetails] = useState<ShiftImportPreview[]>([]);
  const [diagnostics, setDiagnostics] = useState<SheetDiagnostics | null>(null);

  const fetchValues = async (spreadsheetId: string, range: string): Promise<string[][]> => {
    const token = await ensureGoogleAccessToken();

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      if (response.status === 401) throw new Error('登入已過期，請重新登入 Google。');
      if (response.status === 403) throw new Error('沒有讀取試算表權限，請確認帳號可檢視此班表。');
      throw new Error('讀取試算表失敗。');
    }

    const data = await response.json();
    return data.values || [];
  };

  const loadKailiuShifts = async (
    config: SyncConfig,
    jobId: string,
    year: number,
    jobs: Job[]
  ): Promise<Shift[]> => {
    const { spreadsheetId, sheetName, targetUserName } = config;
    const month = parseMonthFromSheetName(sheetName);
    let columnA: string[][] = [];
    let headerRows: string[][] = [];
    let userBlock: { startRow: number; endRow: number } | null = null;
    let dayColumns: ReturnType<typeof buildDayColumnMap> = [];
    let blockRowCount: number | undefined;

    let savedDiagnostics: SheetImportDiagnostics | null = null;

    const saveDiagnostics = (shiftCount?: number) => {
      const report = buildSheetImportDiagnostics({
        spreadsheetId,
        sheetName,
        targetUserName,
        year,
        month,
        headerRows,
        columnA,
        userBlock,
        dayColumns,
        blockRowCount,
        shiftCount,
      });
      savedDiagnostics = report;
      setDiagnostics(report);
      console.info('[ShiftSync] 班表讀取診斷', report);
      return report;
    };

    if (!month) {
      throw new Error(`無法從分頁名稱「${sheetName}」解析月份，請使用如「7演員」格式。`);
    }

    [columnA, headerRows] = await Promise.all([
      fetchValues(spreadsheetId, `${sheetName}!A1:A1000`),
      fetchValues(spreadsheetId, `${sheetName}!A1:DA10`),
    ]);

    userBlock = findUserBlock(columnA, targetUserName);
    if (!userBlock) {
      saveDiagnostics();
      throw new Error(`在 A 欄找不到「${targetUserName}」，請確認名字與分頁是否正確。`);
    }

    dayColumns = buildDayColumnMap(headerRows, month);
    if (dayColumns.length === 0) {
      saveDiagnostics();
      throw new Error(
        '無法解析班表表頭（找不到「時間｜排班｜狀態」欄位）。請展開下方「診斷資訊」並複製貼給開發者。'
      );
    }

    const startRow1 = userBlock.startRow + 1;
    const endRow1 = userBlock.endRow + 1;

    const blockRows = await fetchValues(
      spreadsheetId,
      `${sheetName}!A${startRow1}:CZ${endRow1}`
    );
    blockRowCount = blockRows.length;

    const shifts = parseUserBlockToShifts(blockRows, dayColumns, month, year, jobId);

    saveDiagnostics(shifts.length);

    if (shifts.length === 0) {
      throw new Error('讀取成功，但沒有找到可匯入的排班（排班欄皆為空或不可排）。');
    }

    setPreviewDetails(
      buildImportPreview(
        shifts.map((s) => ({
          dateStr: s.dateStr,
          startTime: s.startTime,
          endTime: s.endTime,
          note: s.note,
          rawCell: s.note || '—',
        })),
        jobs
      )
    );
    setPreviewShifts(shifts);
    return shifts;
  };

  const loadDabeiShifts = async (
    config: SyncConfig,
    jobId: string,
    year: number,
    jobs: Job[]
  ): Promise<Shift[]> => {
    const { spreadsheetId, sheetName, targetUserName } = config;
    const month = config.importMonth;
    if (!month || month < 1 || month > 12) {
      throw new Error('請選擇要匯入的月份（1–12 月）。');
    }

    const sheetRows = await fetchValues(spreadsheetId, `${sheetName}!A1:AF500`);

    const monthBlock = findMonthBlock(sheetRows, month);
    if (!monthBlock) {
      const report = buildDabeiDiagnostics({
        spreadsheetId,
        sheetName,
        targetUserName,
        month,
        year,
        monthBlock: null,
        userRow: null,
        nameCol: null,
        filledCellCount: 0,
        parsedCellCount: 0,
        shiftCount: 0,
        samples: [],
      });
      setDiagnostics(report);
      throw new Error(`在分頁「${sheetName}」找不到 ${month} 月的班表區塊。`);
    }

    const userMatch = findUserRowInBlock(sheetRows, monthBlock, targetUserName);
    if (!userMatch) {
      const report = buildDabeiDiagnostics({
        spreadsheetId,
        sheetName,
        targetUserName,
        month,
        year,
        monthBlock,
        userRow: null,
        nameCol: null,
        filledCellCount: 0,
        parsedCellCount: 0,
        shiftCount: 0,
        samples: [],
      });
      setDiagnostics(report);
      throw new Error(`在 ${month} 月區塊找不到「${targetUserName}」，請試試「PT 捷仟」或「捷仟」。`);
    }

    const result = parseDabeiUserRowToShifts(
      sheetRows,
      monthBlock,
      userMatch.row,
      userMatch.nameCol,
      month,
      year,
      jobId
    );

    const report = buildDabeiDiagnostics({
      spreadsheetId,
      sheetName,
      targetUserName,
      month,
      year,
      monthBlock,
      userRow: userMatch.row,
      nameCol: userMatch.nameCol,
      filledCellCount: result.filledCellCount,
      parsedCellCount: result.parsedCellCount,
      shiftCount: result.shifts.length,
      samples: result.samples,
    });
    setDiagnostics(report);
    console.info('[ShiftSync] 大台北班表讀取診斷', report);

    if (result.filledCellCount > 0 && result.parsedCellCount < result.filledCellCount) {
      console.warn(
        `[ShiftSync] ${result.filledCellCount - result.parsedCellCount} 格有內容但無法解析時間`
      );
    }

    if (result.shifts.length === 0) {
      throw new Error(
        result.filledCellCount > 0
          ? `找到 ${result.filledCellCount} 個有內容的格子，但無法解析成班表時間格式。`
          : '讀取成功，但這個月沒有找到可匯入的排班。'
      );
    }

    setPreviewDetails(
      buildImportPreview(
        result.samples.map((s) => ({
          dateStr: s.dateStr,
          startTime: s.startTime,
          endTime: s.endTime,
          note: s.note,
          rawCell: s.rawCell,
        })),
        jobs
      )
    );
    setPreviewShifts(result.shifts);
    return result.shifts;
  };

  const loadShiftsFromSheet = async (
    config: SyncConfig,
    jobId: string,
    year: number,
    jobs: Job[]
  ): Promise<Shift[]> => {
    setIsLoading(true);
    setError(null);
    setPreviewShifts([]);
    setPreviewDetails([]);
    setDiagnostics(null);

    try {
      if (jobId === JOB_A_ID) {
        return await loadDabeiShifts(config, jobId, year, jobs);
      }
      return await loadKailiuShifts(config, jobId, year, jobs);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '讀取失敗';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const clearPreview = useCallback(() => {
    setPreviewShifts([]);
    setPreviewDetails([]);
    setError(null);
    setDiagnostics(null);
  }, []);

  return {
    loadShiftsFromSheet,
    isLoading,
    error,
    previewShifts,
    previewDetails,
    diagnostics,
    clearPreview,
  };
};
