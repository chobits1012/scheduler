
import React from 'react';
import { X, BookOpen, Layers, Briefcase, Calendar, Cloud, Zap, HelpCircle } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center bg-stone-50 border-b border-stone-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-stone-800 uppercase tracking-wider">使用說明</h2>
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">User Manual</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-white hover:bg-stone-100 p-2 rounded-full transition text-stone-500 shadow-sm border border-stone-200"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 text-stone-600 leading-relaxed">

                    {/* Intro */}
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                            <HelpCircle size={20} className="text-amber-500" />
                            歡迎使用 ShiftSync
                        </h3>
                        <p className="text-sm">
                            這是一款採用 Japandi 極簡美學設計的雙工作排班助手，協助您優雅地管理多份工作的班表。
                        </p>
                    </div>

                    <div className="h-px bg-stone-100 w-full"></div>

                    {/* Section 1: Workspaces */}
                    <section className="space-y-3">
                        <h4 className="text-base font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                            <Layers size={16} className="text-stone-400" /> 核心概念
                        </h4>
                        <ul className="space-y-2 text-sm pl-2 border-l-2 border-stone-200">
                            <li><strong className="text-stone-800">工作區 (Workspaces)</strong>：此 App 支援同時管理兩份以上的工作。每份工作有獨立的顏色與時薪設定。</li>
                            <li><strong className="text-stone-800">檢視模式</strong>：
                                <ul className="list-disc list-inside pl-2 mt-1 text-stone-500">
                                    <li><strong>總覽</strong>：一次看所有工作的班表。</li>
                                    <li><strong>單一工作</strong>：專注於一份工作，並可使用「快速塗抹」功能。</li>
                                </ul>
                            </li>
                        </ul>
                    </section>

                    {/* Section 2: Scheduling */}
                    <section className="space-y-3">
                        <h4 className="text-base font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={16} className="text-stone-400" /> 排班方式
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                                <div className="font-bold text-stone-800 mb-1">A. 單日點擊 (精準)</div>
                                <p className="text-xs">點擊行事曆上的日期，開啟詳細視窗來設定時間與備註。</p>
                            </div>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                                <div className="font-bold text-stone-800 mb-1">B. 快速塗抹 (極速)</div>
                                <p className="text-xs">切換至單一工作模式，打開下方工具列 (Toggle)，選擇班別後直接點擊日期。</p>
                            </div>
                            <div className="col-span-1 md:col-span-2 bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <div className="font-bold text-amber-900 mb-1 flex items-center gap-2"><Zap size={14} /> C. 快速補單 (批量)</div>
                                <p className="text-xs text-amber-800">使用純文字批量輸入，例如 <code>5 09-17</code>。</p>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Cloud */}
                    <section className="space-y-3">
                        <h4 className="text-base font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                            <Cloud size={16} className="text-stone-400" /> 雲端同步
                        </h4>
                        <p className="text-sm">
                            長按 (或右鍵) 雲端圖示可設定 Firebase。設定完成後，資料會自動備份。
                        </p>
                        <div className="flex gap-2 text-xs font-mono bg-stone-100 p-3 rounded-lg text-stone-500">
                            <span>上傳 (Upload): 覆蓋雲端</span>
                            <span className="text-stone-300">|</span>
                            <span>下載 (Download): 還原至本機</span>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-100 shrink-0 bg-stone-50/50">
                    <button
                        onClick={onClose}
                        className="w-full bg-stone-800 hover:bg-stone-700 text-white font-bold py-3 rounded-xl shadow-lg transition active:scale-95"
                    >
                        了解，開始使用
                    </button>
                </div>
            </div>
        </div>
    );
};
