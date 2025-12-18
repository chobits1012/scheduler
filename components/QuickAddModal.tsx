
import React, { useState } from 'react';
import { Shift, Job } from '../types';
import { X, Play, AlertCircle, CheckCircle } from 'lucide-react';

interface QuickAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBatchAddShifts: (shifts: Shift[]) => void;
    currentYear: number;
    currentMonth: number;
    jobs: Job[];
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
    isOpen,
    onClose,
    onBatchAddShifts,
    currentYear,
    currentMonth,
    jobs
}) => {
    const [inputText, setInputText] = useState('');
    const [parsedShifts, setParsedShifts] = useState<Shift[]>([]);
    const [defaultJobId, setDefaultJobId] = useState(jobs[0]?.id || '');

    // Parse logic
    const parseInput = () => {
        const lines = inputText.trim().split('\n');
        const shifts: Shift[] = [];

        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) return;

            const dayPart = parseInt(parts[0]);
            if (isNaN(dayPart)) return;

            const timeRange = parts[1]; // Format: 0900-1800 or 9-18 or 09:00-18:00
            let startStr = '09:00';
            let endStr = '17:00';

            try {
                const [rawStart, rawEnd] = timeRange.split('-');

                const normalizeTime = (t: string) => {
                    if (!t) return '09:00';
                    if (t.includes(':')) return t; // Already 09:00
                    if (t.length === 4) return `${t.slice(0, 2)}:${t.slice(2)}`; // 0900 -> 09:00
                    if (t.length <= 2) return `${t.padStart(2, '0')}:00`; // 9 -> 09:00
                    return '09:00';
                };

                startStr = normalizeTime(rawStart);
                endStr = normalizeTime(rawEnd);
            } catch (e) {
                console.warn('Parse time error', e);
            }

            // Optional note
            const note = parts.slice(2).join(' ');

            // Create Shift
            const d = new Date(currentYear, currentMonth, dayPart);
            // Adjust date to local string
            const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            shifts.push({
                id: crypto.randomUUID(),
                jobId: defaultJobId,
                dateStr: localDateStr,
                startTime: startStr,
                endTime: endStr,
                note: note || undefined
            });
        });

        setParsedShifts(shifts);
    };

    const handleApply = () => {
        if (parsedShifts.length > 0) {
            onBatchAddShifts(parsedShifts);
            onClose();
            setInputText('');
            setParsedShifts([]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">

                <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                    <div>
                        <h2 className="text-lg font-black text-stone-800 flex items-center gap-2">
                            <span className="text-amber-500">⚡</span> Quick Re-entry
                        </h2>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">批量快速補單工具</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition"><X size={20} /></button>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
                        <div className="font-bold mb-1 flex items-center gap-1"><AlertCircle size={12} /> 如何使用：</div>
                        每一行輸入：<strong>日期 時間範圍 備註(選填)</strong><br />
                        例如：<code className="bg-amber-100 px-1 rounded">5 09-17 早班</code> (意思是 5號 09:00到17:00)
                    </div>

                    <div>
                        <label className="text-xs font-bold text-stone-500 mb-1 block">預設工作</label>
                        <div className="flex gap-2">
                            {jobs.map(j => (
                                <button
                                    key={j.id}
                                    onClick={() => setDefaultJobId(j.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${defaultJobId === j.id ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200'}`}
                                >
                                    {j.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1">
                        <textarea
                            className="w-full h-48 bg-stone-50 border border-stone-200 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-stone-400 outline-none resize-none"
                            placeholder={`1 0900-1800\n2 10-19 Meeting\n3 12:00-20:00`}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={parseInput}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"
                        >
                            <Play size={14} /> 解析預覽
                        </button>
                    </div>

                    {parsedShifts.length > 0 && (
                        <div className="border-t border-stone-100 pt-4">
                            <div className="text-xs font-bold text-stone-400 mb-2 uppercase tracking-wider">即將新增 {parsedShifts.length} 筆班表</div>
                            <div className="max-h-32 overflow-y-auto space-y-2 bg-stone-50 p-2 rounded-lg">
                                {parsedShifts.map((s, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-stone-600 bg-white p-2 rounded border border-stone-100 shadow-sm">
                                        <CheckCircle size={14} className="text-green-500" />
                                        <span className="font-mono font-bold w-24">{s.dateStr}</span>
                                        <span className="font-bold">{s.startTime}-{s.endTime}</span>
                                        {s.note && <span className="text-stone-400 text-xs">({s.note})</span>}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleApply}
                                className="w-full mt-4 bg-stone-800 hover:bg-stone-700 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95"
                            >
                                確認新增
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
