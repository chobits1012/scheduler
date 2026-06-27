import React, { useState, useEffect } from 'react';
import { X, Download, RefreshCw, AlertCircle, CheckCircle, Eye, LogIn, LogOut, Copy } from 'lucide-react';
import { Shift, SyncConfig, STORAGE_KEYS, JOB_A_ID, ShiftImportPreview, Job } from '../types';
import { formatSheetDiagnostics, getDefaultSyncConfig, SheetDiagnostics } from '../hooks/useGoogleSheets';

interface SyncConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreview: (config: SyncConfig) => Promise<Shift[]>;
  onImport: (config: SyncConfig, items: ShiftImportPreview[]) => void;
  isLoading: boolean;
  error: string | null;
  previewShifts: Shift[];
  previewDetails: ShiftImportPreview[];
  diagnostics: SheetDiagnostics | null;
  jobs: Job[];
  jobId: string;
  jobName: string;
  year: number;
  defaultMonth: number;
  onClearPreview: () => void;
  isGoogleLoggedIn: boolean;
  googleEmail: string | null;
  onGoogleLogin: () => Promise<void>;
  onGoogleLogout: () => void;
  googleAuthLoading: boolean;
  googleAuthError: string | null;
}

export const SyncConfigModal: React.FC<SyncConfigModalProps> = ({
  isOpen,
  onClose,
  onPreview,
  onImport,
  isLoading,
  error,
  previewShifts,
  previewDetails,
  diagnostics,
  jobs,
  jobId,
  jobName,
  year,
  defaultMonth,
  onClearPreview,
  isGoogleLoggedIn,
  googleEmail,
  onGoogleLogin,
  onGoogleLogout,
  googleAuthLoading,
  googleAuthError,
}) => {
  const isDabei = jobId === JOB_A_ID;
  const defaults = getDefaultSyncConfig(jobId, defaultMonth);

  const [url, setUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [targetUserName, setTargetUserName] = useState('');
  const [importMonth, setImportMonth] = useState(defaultMonth);
  const [step, setStep] = useState<'config' | 'preview'>('config');
  const [importSuccess, setImportSuccess] = useState(false);
  const [copiedDiag, setCopiedDiag] = useState(false);
  const [rowJobIds, setRowJobIds] = useState<Record<string, string>>({});

  const previewRowKey = (row: ShiftImportPreview) =>
    `${row.dateStr}|${row.startTime}|${row.rawCell}`;

  useEffect(() => {
    if (previewDetails.length === 0) {
      setRowJobIds({});
      return;
    }
    setRowJobIds(
      Object.fromEntries(
        previewDetails.map((row) => [previewRowKey(row), row.selectedJobId ?? row.suggestedJobId ?? ''])
      )
    );
  }, [previewDetails]);

  const storageKey = `${STORAGE_KEYS.SYNC_CONFIG}_${jobId}`;

  useEffect(() => {
    if (!isOpen) return;
    setStep('config');
    setImportSuccess(false);
    onClearPreview();

    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const config = JSON.parse(stored) as SyncConfig;
      setUrl(`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`);
      setSheetName(config.sheetName);
      setTargetUserName(config.targetUserName || '');
      if (config.importMonth) setImportMonth(config.importMonth);
      else setImportMonth(defaultMonth);
    } else {
      setUrl(defaults.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${defaults.spreadsheetId}` : '');
      setSheetName(defaults.sheetName || '');
      setTargetUserName(defaults.targetUserName || '');
      setImportMonth(defaults.importMonth ?? defaultMonth);
    }
  }, [isOpen, storageKey, onClearPreview, defaults.spreadsheetId, defaults.sheetName, defaults.targetUserName, defaults.importMonth, defaultMonth]);

  if (!isOpen) return null;

  const parseSpreadsheetId = (inputUrl: string) => {
    const matches = inputUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return matches ? matches[1] : null;
  };

  const buildConfig = (): SyncConfig | null => {
    const spreadsheetId = parseSpreadsheetId(url);
    if (!spreadsheetId) {
      alert('網址格式不正確，無法讀取試算表 ID');
      return null;
    }
    if (!sheetName.trim()) {
      alert('請輸入分頁名稱');
      return null;
    }
    if (!targetUserName.trim()) {
      alert('請輸入您的名稱');
      return null;
    }
    if (isDabei && (importMonth < 1 || importMonth > 12)) {
      alert('請選擇 1–12 月');
      return null;
    }
    return {
      spreadsheetId,
      sheetName: sheetName.trim(),
      targetUserName: targetUserName.trim(),
      ...(isDabei ? { importMonth } : {}),
    };
  };

  const handlePreview = async () => {
    const config = buildConfig();
    if (!config) return;
    localStorage.setItem(storageKey, JSON.stringify(config));
    setImportSuccess(false);
    try {
      if (!isGoogleLoggedIn) {
        await onGoogleLogin();
      }
      const shifts = await onPreview(config);
      if (shifts.length > 0) {
        setStep('preview');
      }
    } catch {
      // error message is shown via the error prop from useGoogleSheets
    }
  };

  const handleImport = () => {
    const config = buildConfig();
    if (!config || previewDetails.length === 0) return;

    const missing = previewDetails.filter((row) => !rowJobIds[previewRowKey(row)]);
    if (missing.length > 0) {
      alert(`還有 ${missing.length} 筆未選擇工作表，請在預覽中指定匯入目標。`);
      return;
    }

    const items = previewDetails.map((row) => ({
      ...row,
      selectedJobId: rowJobIds[previewRowKey(row)],
    }));
    onImport(config, items);
    setImportSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleBack = () => {
    setStep('config');
    onClearPreview();
    setImportSuccess(false);
  };

  const handleCopyDiagnostics = async () => {
    if (!diagnostics) return;
    const text = formatSheetDiagnostics(diagnostics);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDiag(true);
      setTimeout(() => setCopiedDiag(false), 2000);
    } catch {
      window.prompt('請複製以下診斷資訊：', text);
    }
  };

  const validationHint =
    diagnostics && 'format' in diagnostics && diagnostics.format === 'dabei'
      ? `驗證：表上有內容 ${diagnostics.filledCellCount} 格 → 成功解析 ${diagnostics.parsedCellCount} 筆`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 flex justify-between items-center bg-stone-50 border-b border-stone-100 shrink-0">
          <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            <Download size={20} className="text-emerald-600" />
            {step === 'config' ? '匯入公司班表' : '預覽匯入'}
          </h2>
          <button onClick={onClose} className="bg-white hover:bg-stone-100 p-2 rounded-full transition text-stone-500 shadow-sm border border-stone-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {step === 'config' && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                <strong>唯讀模式</strong>：只會讀取班表，不會修改公司試算表。與 Firebase 雲端備份無關。
              </div>

              <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50">
                <div className="text-xs text-stone-600 min-w-0">
                  {isGoogleLoggedIn ? (
                    <span className="truncate block">已登入：<strong>{googleEmail || 'Google'}</strong></span>
                  ) : (
                    <span>讀取班表需登入 Google 帳號</span>
                  )}
                </div>
                {isGoogleLoggedIn ? (
                  <button
                    onClick={onGoogleLogout}
                    className="shrink-0 text-xs text-stone-500 hover:text-red-500 flex items-center gap-1"
                  >
                    <LogOut size={14} /> 登出
                  </button>
                ) : (
                  <button
                    onClick={onGoogleLogin}
                    disabled={googleAuthLoading}
                    className="shrink-0 text-xs bg-white border border-stone-200 px-3 py-1.5 rounded-lg font-bold text-stone-700 hover:bg-stone-100 flex items-center gap-1 disabled:opacity-50"
                  >
                    {googleAuthLoading ? <RefreshCw size={14} className="animate-spin" /> : <LogIn size={14} />}
                    登入
                  </button>
                )}
              </div>

              {googleAuthError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs">{googleAuthError}</div>
              )}

              <div className="text-xs text-stone-500">
                資料來源：{isDabei ? '大台北班表' : '開溜班表'}（{year} 年{isDabei ? ` ${importMonth} 月` : ''}）
                <br />
                匯入後會依你選擇的工作表，<strong>各自覆蓋該工作表同月份</strong>的舊班表。
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Google Sheet URL</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-stone-50 rounded-xl p-3 text-sm border border-stone-200 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                />
              </div>

              {isDabei && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">匯入月份</label>
                  <select
                    value={importMonth}
                    onChange={(e) => setImportMonth(Number(e.target.value))}
                    className="w-full bg-stone-50 rounded-xl p-3 text-sm border border-stone-200 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{m} 月</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-stone-400 mt-1 ml-1">大台北班表一個分頁含多個月，請選擇要匯入的月份</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">分頁名稱</label>
                <input
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder={isDabei ? '例如：2026' : '例如：7演員'}
                  className="w-full bg-stone-50 rounded-xl p-3 text-sm border border-stone-200 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                />
                <p className="text-[10px] text-stone-400 mt-1 ml-1">
                  {isDabei ? '大台北預排分頁，如 2026' : '數字代表月份，如 7演員 = 7 月'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">您的姓名</label>
                <input
                  value={targetUserName}
                  onChange={(e) => setTargetUserName(e.target.value)}
                  placeholder={isDabei ? '例如：捷仟' : '例如：王捷仟'}
                  className="w-full bg-stone-50 rounded-xl p-3 text-sm border border-stone-200 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                />
                <p className="text-[10px] text-stone-400 mt-1 ml-1">
                  {isDabei ? '系統會搜尋 PT 列，如 PT 捷仟' : '系統會在 A 欄自動搜尋此名稱'}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {diagnostics && (
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-stone-50 border-b border-stone-100">
                    <span className="text-xs font-bold text-stone-600">診斷資訊（可貼給開發者）</span>
                    <button
                      type="button"
                      onClick={handleCopyDiagnostics}
                      className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-bold"
                    >
                      <Copy size={12} />
                      {copiedDiag ? '已複製' : '複製'}
                    </button>
                  </div>
                  <pre className="p-3 text-[10px] leading-relaxed text-stone-600 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                    {formatSheetDiagnostics(diagnostics)}
                  </pre>
                </div>
              )}

              <button
                onClick={handlePreview}
                disabled={isLoading}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Eye size={18} />}
                {isLoading ? '讀取中...' : '讀取並預覽'}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <div className="text-sm text-stone-600 space-y-1">
                <p>找到 <strong>{previewDetails.length || previewShifts.length}</strong> 筆排班。系統已依關鍵字建議工作表，可逐筆修改後匯入。</p>
                {validationHint && (
                  <p className="text-xs text-emerald-700 font-medium">{validationHint} ✓</p>
                )}
                {previewDetails.some((row) => !row.suggestedJobId) && (
                  <p className="text-xs text-amber-700">
                    部分班表無法自動對應工作表，請手動選擇（工作表名稱需包含關鍵字，如「寂屋」「黃衣」「排練」）。
                  </p>
                )}
              </div>

              <div className="border border-stone-200 rounded-xl max-h-64 overflow-y-auto divide-y divide-stone-100">
                {(previewDetails.length > 0 ? previewDetails : previewShifts.map((s) => ({
                  dateStr: s.dateStr,
                  startTime: s.startTime,
                  endTime: s.endTime,
                  note: s.note,
                  rawCell: s.note || '—',
                }))).map((row) => {
                  const rowKey = previewRowKey(row);
                  const selected = rowJobIds[rowKey] ?? '';
                  const needsManual = !row.suggestedJobId;
                  return (
                    <div key={rowKey} className="px-3 py-2 text-sm space-y-1.5">
                      <div className="flex justify-between gap-2">
                        <span className="font-mono text-stone-800">{row.dateStr.slice(5)}</span>
                        <span className="font-mono text-stone-600">{row.startTime}–{row.endTime}</span>
                      </div>
                      <div className="text-[10px] text-stone-400 truncate">
                        原始：{row.rawCell}{row.note && row.rawCell !== row.note ? ` → ${row.note}` : ''}
                      </div>
                      <select
                        value={selected}
                        onChange={(e) =>
                          setRowJobIds((prev) => ({ ...prev, [rowKey]: e.target.value }))
                        }
                        className={`w-full text-xs rounded-lg border px-2 py-1.5 bg-white ${
                          needsManual && !selected
                            ? 'border-amber-300 ring-1 ring-amber-100'
                            : 'border-stone-200'
                        }`}
                      >
                        <option value="">— 請選擇工作表 —</option>
                        {jobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.name}
                            {row.suggestedJobId === job.id ? '（建議）' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {importSuccess && (
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>匯入成功！可至總覽匯出 .ics 行事曆。</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  disabled={isLoading || importSuccess}
                  className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 transition"
                >
                  返回
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading || importSuccess || previewDetails.some((row) => !rowJobIds[previewRowKey(row)])}
                  className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  確認匯入
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
