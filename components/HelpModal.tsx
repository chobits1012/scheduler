
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

                    {/* 1. Core Concepts */}
                    <section className="space-y-4">
                        <h4 className="text-base font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                            <Layers size={16} className="text-stone-400" /> 1. 核心概念
                        </h4>
                        <ul className="space-y-3 text-sm pl-4 border-l-2 border-stone-200">
                            <li>
                                <strong className="text-stone-800 block mb-1">工作區 (Workspaces)</strong>
                                <span className="text-stone-500">您可以同時管理多份工作（例如：「工作 A」、「工作 B」）。每份工作都有獨立的代表色、時薪設定以及常用班別 (Presets)。</span>
                            </li>
                            <li>
                                <strong className="text-stone-800 block mb-1">檢視模式 (Modes)</strong>
                                <ul className="list-disc list-inside space-y-1 text-stone-500 pl-2">
                                    <li><strong>總覽模式 (Overview)</strong>：在同一個行事曆上顯示所有工作的班表，方便查看整體工作量與收入。</li>
                                    <li><strong>工作區模式 (Workspace)</strong>：專注於檢視特定一份工作。進入此模式後，才能使用該工作的「快速塗抹 (Quick Paint)」功能。</li>
                                </ul>
                            </li>
                            <li>
                                <strong className="text-stone-800 block mb-1">雲端同步 (Cloud Sync)</strong>
                                <span className="text-stone-500">透過 Firebase 連結，將您的資料同步於手機與電腦之間。</span>
                            </li>
                        </ul>
                    </section>

                    {/* 2. Workspaces */}
                    <section className="space-y-4">
                        <h4 className="text-base font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                            <Briefcase size={16} className="text-stone-400" /> 2. 管理工作
                        </h4>

                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 space-y-3">
                            <h5 className="font-bold text-stone-800 border-b border-stone-200 pb-2">新增/編輯工作</h5>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-stone-600">
                                <li><strong>開啟設定</strong>：點擊導覽列或底部選單中的 <strong>設定 (齒輪)</strong> 圖示。</li>
                                <li><strong>自訂內容</strong>：設定名稱、主管/單位、代表色、計薪方式 (時薪/次薪)。</li>
                                <li><strong>新增工作</strong>：點擊 <strong>Add Unit (新增單位)</strong> 即可建立新的工作區。</li>
                            </ol>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-2">
                            <h5 className="font-bold text-amber-900 flex items-center gap-2">
                                <Zap size={14} /> 設定常用班別 (關鍵)
                            </h5>
                            <p className="text-xs text-amber-800">
                                為了讓排班更迅速，建議您在設定選單中為每份工作定義 <strong>常用班別 (Presets)</strong>。<br />
                                <span className="opacity-70">範例：「早班 (09:00 - 17:00)」</span><br />
                                設定完成後，您就可以使用「快速塗抹」模式，一鍵點擊日期來排班。
                            </p>
                        </div>
                    </section>

                    {/* 3. Scheduling */}
                    <section className="space-y-4">
                        <h4 className="text-base font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={16} className="text-stone-400" /> 3. 排班功能
                        </h4>
                        <div className="grid gap-4">
                            <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                                <div className="font-bold text-stone-800 mb-2 text-sm">A. 單日編輯 (精準)</div>
                                <p className="text-xs text-stone-500">點擊行事曆上的任一 <strong>日期</strong>，開啟詳細視窗來設定時間與備註，或刪除班表。</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                                <div className="font-bold text-stone-800 mb-2 text-sm">B. 快速塗抹 (極速)</div>
                                <p className="text-xs text-stone-500 mb-2">1. 切換至單一工作模式。<br />2. 打開下方工具列 (Toggle)。<br />3. 選擇班別後直接點擊日期。</p>
                                <div className="text-[10px] text-stone-400 bg-stone-50 p-1 rounded inline-block">再次點擊已套用該班別的日期，則會移除該班表。</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                                <div className="font-bold text-stone-800 mb-2 text-sm">C. 快速補單 (批量)</div>
                                <p className="text-xs text-stone-500 mb-2">點擊統計卡片或工具列中的 <strong>閃電 (Zap)</strong> 圖示，使用純文字批量輸入。</p>
                                <code className="block bg-stone-100 p-2 rounded text-[10px] font-mono text-stone-600">
                                    5 0900-1700<br />
                                    6 12-20 開會
                                </code>
                            </div>
                        </div>
                    </section>

                    {/* 4. Cloud */}
                    <section className="space-y-4">
                        <h4 className="text-base font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                            <Cloud size={16} className="text-stone-400" /> 4. 雲端同步
                        </h4>
                        <div className="space-y-3 text-sm text-stone-600">
                            <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">
                                <h5 className="font-bold text-stone-800 mb-1">初次設定</h5>
                                <ol className="list-decimal list-inside space-y-1 text-xs">
                                    <li><strong>長按 (或右鍵)</strong> 登入/雲端圖示。</li>
                                    <li>貼上您的 <strong>Firebase 設定物件</strong>。</li>
                                    <li>點擊 <strong>儲存並連線</strong>。</li>
                                </ol>
                            </div>
                            <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">
                                <h5 className="font-bold text-stone-800 mb-1">同步資料</h5>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li><strong>自動同步</strong>：更動資料時自動嘗試同步。</li>
                                    <li><strong>手動控制</strong>：若更換裝置，可透過選單強制同步。</li>
                                </ul>
                                <div className="mt-2 flex gap-2 text-[10px] font-mono bg-white p-2 rounded border border-stone-200 text-stone-500 justify-center">
                                    <span>上傳 (Upload): 覆蓋雲端</span>
                                    <span className="text-stone-300">|</span>
                                    <span>下載 (Download): 還原至本機</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 5. Stats & Tools */}
                    <section className="space-y-4">
                        <h4 className="text-base font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={16} className="text-stone-400" /> 5. 統計與工具
                        </h4>
                        <ul className="space-y-2 text-sm pl-4 border-l-2 border-stone-200">
                            <li>
                                <strong className="text-stone-800">收入追蹤</strong>：
                                <span className="text-stone-500">儀表板顯示本月預估收入、總工時與總班次數。</span>
                            </li>
                            <li>
                                <strong className="text-stone-800">匯出至行事曆</strong>：
                                <span className="text-stone-500">點擊下載圖示產生 .ics 檔案，可匯入 Google/Apple Calendar。</span>
                            </li>
                            <li>
                                <strong className="text-stone-800">瀏覽導航</strong>：
                                <span className="text-stone-500">手機上左右滑動 (Swipe) 或使用螢幕箭頭切換月份。</span>
                            </li>
                        </ul>
                    </section>

                    {/* 6. Troubleshooting */}
                    <section className="space-y-4">
                        <h4 className="text-base font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                            <HelpCircle size={16} className="text-stone-400" /> 6. 疑難排解
                        </h4>
                        <ul className="space-y-2 text-sm bg-stone-50 p-4 rounded-xl border border-stone-100 text-stone-600">
                            <li>
                                <strong className="text-stone-800 block">登入失敗 / 設定錯誤</strong>
                                <span className="text-xs">通常表示尚未設定 Firebase Config 或格式錯誤。請嘗試長按雲端圖示重新輸入設定。</span>
                            </li>
                            <li>
                                <strong className="text-stone-800 block">另一台裝置看不到資料</strong>
                                <span className="text-xs">請嘗試在來源裝置點擊 <strong>上傳</strong>，接著在目標裝置點擊 <strong>下載</strong>。</span>
                            </li>
                        </ul>
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
