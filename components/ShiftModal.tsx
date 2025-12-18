
import React, { useState, useEffect } from 'react';
import { Job, Shift, ClipboardShift } from '../types';
import { parseLocalISO } from '../utils/dateUtils';
import { getColorClass } from '../utils/theme';
import { Trash2, X, Plus, Clock, DollarSign, Copy, Clipboard, CheckSquare, Square } from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  jobs: Job[];
  initialJobId: string;
  dayShifts: Shift[];
  onSave: (shift: Shift) => void;
  onBatchAddShifts: (shifts: Shift[]) => void;
  onDelete: (shiftId: string) => void;
  clipboardShifts: ClipboardShift[];
  onCopyShifts: (shifts: ClipboardShift[]) => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  jobs,
  initialJobId,
  dayShifts,
  onSave,
  onBatchAddShifts,
  onDelete,
  clipboardShifts,
  onCopyShifts
}) => {
  const [activeTabJobId, setActiveTabJobId] = useState(initialJobId);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());

  // Form State for NEW shift
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState('');
  const [isDoublePay, setIsDoublePay] = useState(false);

  // Determine active job safely (handle case where job might have been deleted)
  const activeJob = jobs.find(j => j.id === activeTabJobId) || jobs[0] || { id: 'temp', name: 'Loading', color: 'stone' } as Job;

  // Filter shifts specifically for the ACTIVE job tab
  const activeJobShifts = dayShifts.filter(s => s.jobId === activeTabJobId);

  useEffect(() => {
    if (isOpen) {
      setStartTime('09:00');
      setEndTime('13:00'); // Default to a 4-hour block for split shifts
      setNote('');
      setIsDoublePay(false);
      setSelectedShiftIds(new Set()); // Reset selection
    }
  }, [isOpen, activeTabJobId]);

  useEffect(() => {
    if (isOpen) {
      // If initialJobId is valid, use it. Otherwise default to first job.
      const isValid = jobs.some(j => j.id === initialJobId);
      setActiveTabJobId(isValid ? initialJobId : (jobs[0]?.id || ''));
    }
  }, [isOpen, initialJobId, jobs]);

  if (!isOpen) return null;
  if (!activeJob) return null;

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: crypto.randomUUID(),
      jobId: activeTabJobId,
      dateStr,
      startTime,
      endTime,
      note,
      isDoublePay
    });
    // Reset form for next entry
    setNote('');
    setIsDoublePay(false);
  };

  const handlePaste = () => {
    if (clipboardShifts.length > 0) {
      const newShifts = clipboardShifts.map(cs => ({
        id: crypto.randomUUID(),
        jobId: activeTabJobId, // Force pasted shifts to current job tab
        dateStr: dateStr,
        startTime: cs.startTime,
        endTime: cs.endTime,
        note: cs.note,
        isDoublePay: cs.isDoublePay
      }));
      onBatchAddShifts(newShifts);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedShiftIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedShiftIds(newSet);
  };

  const handleBatchCopy = () => {
    const shiftsToCopy = activeJobShifts
      .filter(s => selectedShiftIds.has(s.id))
      .map(s => ({
        startTime: s.startTime,
        endTime: s.endTime,
        note: s.note,
        isDoublePay: s.isDoublePay,
        jobId: s.jobId
      }));

    if (shiftsToCopy.length > 0) {
      onCopyShifts(shiftsToCopy);
      setSelectedShiftIds(new Set()); // Clear selection after copy
    }
  };

  // Improved Duration Calculation
  const calculateDuration = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let duration = (endH + endM / 60) - (startH + startM / 60);
    if (duration < 0) duration += 24; // Handle overnight
    return duration;
  };

  const totalHours = activeJobShifts.reduce((acc, s) => acc + calculateDuration(s.startTime, s.endTime), 0);

  // Income Calculation Logic based on Pay Type
  let estimatedPay = 0;
  let wageText = "";

  if (activeJob.payType === 'perShift') {
    estimatedPay = activeJobShifts.length * (activeJob.hourlyRate || 0);
    wageText = `共 ${activeJobShifts.length} 段班 · 約 $${estimatedPay.toLocaleString()}`;
  } else {
    estimatedPay = Math.floor(totalHours * (activeJob.hourlyRate || 0));
    wageText = `共 ${totalHours.toFixed(1)} 小時 · 約 $${estimatedPay.toLocaleString()}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-[#333333]/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-white w-full md:w-[480px] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">

        <div className="md:hidden w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-stone-200 rounded-full"></div>
        </div>

        <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-[#F9F7F2]">
          <div>
            <h2 className="text-xl font-black text-[#333333] flex items-center gap-2 tracking-tight uppercase">
              {parseLocalISO(dateStr).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
              <span className="text-xs font-black text-[#8E8679] opacity-60 tracking-[0.2em]">
                {parseLocalISO(dateStr).toLocaleDateString('zh-TW', { weekday: 'long' })}
              </span>
            </h2>
          </div>
          <button onClick={onClose} className="bg-[#F9F7F2] hover:bg-[#8E8679]/20 p-2 rounded-full transition text-[#8E8679]">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-3 flex gap-3 overflow-x-auto no-scrollbar bg-stone-50/50">
          {jobs.map(job => {
            const isActive = activeTabJobId === job.id;
            const shiftCount = dayShifts.filter(s => s.jobId === job.id).length;
            const jobColorBg = getColorClass(job.color, 'bg', 100);
            const jobColorText = getColorClass(job.color, 'text', 700);
            const jobColorRing = getColorClass(job.color, 'ring', 100);
            const jobColorBorder = getColorClass(job.color, 'border', 200);

            return (
              <button
                key={job.id}
                onClick={() => setActiveTabJobId(job.id)}
                className={`flex-none py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 relative border flex items-center justify-center gap-2
                  ${isActive
                    ? `bg-white ${jobColorBorder} ${jobColorText} shadow-sm ring-1 ${jobColorRing}`
                    : 'bg-transparent border-transparent text-stone-400 hover:text-stone-600'
                  }
                `}
              >
                <span className="truncate max-w-[100px]">{job.name}</span>
                {shiftCount > 0 && (
                  <span className={`text-[10px] min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full ${isActive ? jobColorBg : 'bg-stone-200 text-stone-500'}`}>
                    {shiftCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6 overflow-y-auto flex-1">

          {activeJobShifts.length > 0 ? (
            <div className="mb-8 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wide px-1">
                <span>已排時段</span>
                {activeJob.hourlyRate ? (
                  <span className="flex items-center gap-1 text-stone-500 normal-case">
                    <DollarSign size={12} /> {wageText}
                  </span>
                ) : null}
              </div>

              {activeJobShifts.map((shift, idx) => {
                const isSelected = selectedShiftIds.has(shift.id);
                const themeBgSelected = getColorClass(activeJob.color, 'bg', 100);
                const themeTextSelected = getColorClass(activeJob.color, 'text', 600);
                const themeRingSelected = getColorClass(activeJob.color, 'ring', 200);
                const themeBgDot = getColorClass(activeJob.color, 'bg', 400);

                return (
                  <div key={shift.id} className="flex gap-3 items-stretch group">
                    <button
                      onClick={() => toggleSelection(shift.id)}
                      className={`w-10 flex items-center justify-center rounded-2xl transition-colors
                        ${isSelected ? `${themeBgSelected} ${themeTextSelected}` : 'bg-stone-50 text-stone-300 hover:bg-stone-100'}
                      `}
                    >
                      {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>

                    <div className={`flex-1 bg-white border border-stone-100 rounded-2xl p-3 shadow-sm flex justify-between items-center ${isSelected ? `ring-1 ${themeRingSelected}` : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-8 rounded-full ${themeBgDot}`}></div>
                        <div>
                          <div className="text-lg font-bold text-stone-700 flex items-center gap-2">
                            {shift.startTime} <span className="text-stone-300 text-sm">至</span> {shift.endTime}
                          </div>
                          <div className="flex gap-1">
                            {shift.isDoublePay && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">x2</span>
                            )}
                            {shift.note && <div className="text-xs text-stone-400 mt-0.5">{shift.note}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => onDelete(shift.id)}
                        className="flex-1 w-10 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                        title="刪除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {selectedShiftIds.size > 0 && (
                <button
                  onClick={handleBatchCopy}
                  className={`w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 animate-fade-in
                     ${getColorClass(activeJob.color, 'bg', 50)} ${getColorClass(activeJob.color, 'text', 600)}
                   `}
                >
                  <Copy size={16} /> 複製已選取的 {selectedShiftIds.size} 個時段
                </button>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-2xl bg-stone-50 border border-stone-100 text-center text-stone-400 text-sm flex flex-col items-center gap-2">
              <Clock size={24} className="opacity-20" />
              今天還沒有排 {activeJob.name} 的班喔
            </div>
          )}

          <form onSubmit={handleAddShift} className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wide px-1">
              <span className="flex items-center gap-1"><Plus size={14} /> 新增時段</span>

              {clipboardShifts.length > 0 && (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="flex items-center gap-1.5 text-stone-600 bg-stone-100 hover:bg-stone-200 hover:text-stone-800 px-3 py-1.5 rounded-lg transition-colors animate-fade-in font-medium"
                >
                  <Clipboard size={14} />
                  <span className="text-xs">直接貼上 {clipboardShifts.length} 筆班表</span>
                </button>
              )}
            </div>

            {/* Smart Presets */}
            <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { label: '早班 (09-18)', start: '09:00', end: '18:00' },
                { label: '晚班 (18-22)', start: '18:00', end: '22:00' },
                { label: '全天 (10-22)', start: '10:00', end: '22:00' },
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setStartTime(preset.start);
                    setEndTime(preset.end);
                  }}
                  className="flex-none px-3 py-1.5 rounded-lg bg-[#F9F7F2] text-[#8E8679] text-xs font-bold border border-[#8E8679]/20 hover:bg-[#DCC7A1] hover:text-[#333333] hover:border-[#DCC7A1] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-[#F9F7F2] border border-[#8E8679]/20 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-[10px] font-black text-[#8E8679] uppercase tracking-wider mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-white rounded-xl py-3 px-3 text-base font-black text-[#333333] focus:ring-1 focus:ring-[#DCC7A1] border border-transparent focus:border-[#DCC7A1] outline-none transition shadow-sm text-center tracking-widest"
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-[#8E8679] uppercase tracking-wider mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-white rounded-xl py-3 px-3 text-base font-black text-[#333333] focus:ring-1 focus:ring-[#DCC7A1] border border-transparent focus:border-[#DCC7A1] outline-none transition shadow-sm text-center tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 p-2 bg-white/50 rounded-xl cursor-pointer hover:bg-white transition border border-transparent hover:border-[#8E8679]/10">
                  <input
                    type="checkbox"
                    checked={isDoublePay}
                    onChange={(e) => setIsDoublePay(e.target.checked)}
                    className="w-4 h-4 rounded text-[#333333] focus:ring-[#DCC7A1]"
                  />
                  <span className="text-xs font-bold text-[#8E8679]">Double Pay (雙倍薪)</span>
                </label>
              </div>

              <div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="備註 (選填)"
                  className="w-full bg-white rounded-xl p-3 text-sm font-medium text-[#333333] focus:ring-1 focus:ring-[#DCC7A1] border border-transparent focus:border-[#DCC7A1] outline-none shadow-sm placeholder-[#8E8679]/50"
                />
              </div>

              <button
                type="submit"
                className={`w-full rounded-xl text-white font-bold shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
                    ${getColorClass(activeJob.color, 'bg', 500)} py-3 mt-2
                  `}
              >
                <Plus size={18} strokeWidth={3} /> 加入此時段
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
