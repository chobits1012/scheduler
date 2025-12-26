import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { CalendarDay, Job, Shift, JOB_A_ID, JOB_B_ID, ALL_JOBS_ID, PayType, ClipboardShift } from './types';
import { generateAvailabilityMessage } from './services/geminiService';
import { ShiftModal } from './components/ShiftModal';
import { SidebarButton, NavButton } from './components/LayoutButtons';
import { AVAILABLE_COLORS, getColorClass } from './utils/theme';
import { useIncomeStats } from './hooks/useIncomeStats';
import { useCalendar } from './hooks/useCalendar';
import { useAuth } from './hooks/useAuth';
import { useCloudSync } from './hooks/useCloudSync';
import { exportToIcal } from './utils/icsHelper';
import { ConfigModal } from './components/ConfigModal';
import { formatDateToLocalISO, parseLocalISO } from './utils/dateUtils';
import { ConfirmModal } from './components/ConfirmModal';
import { QuickAddModal } from './components/QuickAddModal';
import { HelpModal } from './components/HelpModal';
import {
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Sparkles,
  Copy,
  Check,
  Settings,
  Layers,
  X,
  Loader2,
  Home,
  DollarSign,
  TrendingUp,
  Clock,
  Ticket,
  Plus,
  Trash2,
  Palette,
  Download,
  Cloud,
  CloudOff,
  LogOut,
  User as UserIcon,

  Zap,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

// Mock Initial Data
const INITIAL_JOBS: Job[] = [
  {
    id: JOB_A_ID,
    name: '小狐狸',
    color: 'indigo',
    managerName: '陳店長',
    hourlyRate: 183,
    payType: 'hourly',
    presets: [
      { label: '早班', start: '09:00', end: '18:00' },
      { label: '晚班', start: '18:00', end: '22:00' }
    ]
  },
  {
    id: JOB_B_ID,
    name: '開溜',
    color: 'emerald',
    managerName: '林組長',
    hourlyRate: 1200,
    payType: 'perShift',
    presets: [
      { label: '全天', start: '10:00', end: '22:00' }
    ]
  }
];

const App: React.FC = () => {
  // --- State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeJobId, setActiveJobId] = useState<string>(ALL_JOBS_ID);
  const [direction, setDirection] = useState(0);

  // Auth & Cloud Sync
  const { user, login, logout, loading: authLoading, error: authError } = useAuth();

  useEffect(() => {
    if (authError) {
      if (authError.toLowerCase().includes('configuration') || authError.toLowerCase().includes('api key') || authError.toLowerCase().includes('app')) {
        setIsConfigModalOpen(true);
      } else {
        alert(`Login Failed: ${authError}`);
      }
    }
  }, [authError]);

  // Replaced useState/useEffect with useCloudSync
  const [jobs, setJobs, uploadJobs, downloadJobs] = useCloudSync<Job[]>(user, 'jobs', INITIAL_JOBS, 'shiftsync_jobs');
  const [shifts, setShifts, uploadShifts, downloadShifts] = useCloudSync<Shift[]>(user, 'shifts', [], 'shiftsync_shifts');

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // Long Press Logic
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsConfigModalOpen(true);
      // Optional: Vibrate if supported
      if (navigator.vibrate) navigator.vibrate(50);
    }, 800); // 800ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Clipboard State (Now an Array)

  // Clipboard State (Now an Array)
  // Clipboard State (Now an Array)
  const [clipboardShifts, setClipboardShifts] = useState<ClipboardShift[]>([]);

  // --- Quick Schedule Mode ---
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [activePresetIndex, setActivePresetIndex] = useState(0);

  // Turn off Quick Mode when switching to Overview
  useEffect(() => {
    if (activeJobId === ALL_JOBS_ID) setIsQuickMode(false);
  }, [activeJobId]);

  // --- Computed ---
  const isOverviewMode = activeJobId === ALL_JOBS_ID;
  const activeJob = jobs.find(j => j.id === activeJobId);

  const currentMonthStats = useIncomeStats(shifts, jobs, currentDate);
  const calendarDays = useCalendar(currentDate);


  // --- Handlers ---
  const changeMonth = (delta: number) => {
    setDirection(delta);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const onDragEnd = (e: any, { offset, velocity }: PanInfo) => {
    const swipe = swipePower(offset.x, velocity.x);

    if (swipe < -swipeConfidenceThreshold) {
      changeMonth(1);
    } else if (swipe > swipeConfidenceThreshold) {
      changeMonth(-1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      position: 'absolute' as const // Fix layout shift
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      position: 'relative' as const
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      position: 'absolute' as const // Fix layout shift
    })
  };

  const handleDayClick = (day: CalendarDay) => {
    // Quick Mode Logic
    if (isQuickMode && !isOverviewMode && activeJob) {
      const presets = activeJob.presets || [];
      const preset = presets[activePresetIndex];

      if (!preset) return;

      // Check for existing identical shift to toggle
      const existingShift = shifts.find(s =>
        s.jobId === activeJobId &&
        s.dateStr === day.dateStr &&
        s.startTime === preset.start &&
        s.endTime === preset.end
      );

      if (existingShift) {
        // Toggle OFF (Delete)
        handleDeleteShift(existingShift.id);
        if (navigator.vibrate) navigator.vibrate(50);
      } else {
        // Toggle ON (Add)
        const newShift: Shift = {
          id: crypto.randomUUID(),
          jobId: activeJobId,
          dateStr: day.dateStr,
          startTime: preset.start,
          endTime: preset.end,
          note: preset.label
        };
        handleAddShift(newShift);
        if (navigator.vibrate) navigator.vibrate(20);
      }
      return;
    }

    // Normal Mode
    setSelectedDateStr(day.dateStr);
    setIsModalOpen(true);
  };

  const handleAddShift = (newShift: Shift) => {
    setShifts(prev => [...prev, newShift]);
  };

  const handleBatchAddShifts = (newShifts: Shift[]) => {
    setShifts(prev => [...prev, ...newShifts]);
  };

  const handleDeleteShift = (shiftId: string) => {
    setShifts(prev => prev.filter(s => s.id !== shiftId));
  };

  const handleCopyShifts = (shiftsToCopy: ClipboardShift[]) => {
    setClipboardShifts(shiftsToCopy);
  };

  const handleExportIcal = () => {
    exportToIcal(shifts, jobs);
  };

  const handleAddJob = () => {
    const newJob: Job = {
      id: crypto.randomUUID(),
      name: `新工作 ${jobs.length + 1}`,
      color: AVAILABLE_COLORS[jobs.length % AVAILABLE_COLORS.length].value,
      payType: 'hourly',
      hourlyRate: 183,
      presets: [
        { label: '早班', start: '09:00', end: '17:00' }
      ]
    };
    setJobs(prev => [...prev, newJob]);
  };

  const handleDeleteJob = (jobId: string) => {
    if (confirm('確定要刪除這份工作嗎？該工作的相關班表也會一併刪除。')) {
      setJobs(prev => prev.filter(j => j.id !== jobId));
      setShifts(prev => prev.filter(s => s.jobId !== jobId));
      if (activeJobId === jobId) setActiveJobId(ALL_JOBS_ID);
    }
  };


  // --- Render Helpers ---
  const getDayShifts = (dateStr: string) => shifts.filter(s => s.dateStr === dateStr);

  // --- Actions (Manual Sync) ---
  const handleManualUpload = async () => {
    setConfirmModalState({
      isOpen: true,
      title: '上傳備份 (Upload)',
      message: '確定要用目前的電腦資料覆蓋雲端備份嗎？',
      confirmText: '確認上傳',
      onConfirm: async () => {
        const j = await uploadJobs();
        const s = await uploadShifts();
        if (j && s) {
          alert('上傳成功！ (Upload Success)');
        } else {
          alert('上傳失敗 (Upload Failed)。請檢查 Firestore Rules 權限設定。');
        }
      }
    });
  };

  const handleManualDownload = async () => {
    setConfirmModalState({
      isOpen: true,
      title: '下載還原 (Download)',
      message: '確定要從雲端還原資料嗎？這會覆蓋目前的更改。',
      confirmText: '確認下載',
      isDestructive: true,
      onConfirm: async () => {
        const j = await downloadJobs();
        const s = await downloadShifts();
        if (j && s) alert('還原成功！');
        else alert('雲端沒有資料，或下載失敗。');
      }
    });
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 flex flex-col md:flex-row relative selection:bg-stone-200 overflow-x-hidden">
      {/* --- Japandi Background --- */}
      <div className="japandi-bg-container"></div>
      <div className="paper-overlay"></div>

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full relative z-10">

        {/* --- Desktop Sidebar --- */}
        <aside className="hidden md:flex w-72 h-screen sticky top-0 flex-col p-8 z-20 border-r border-[#8E8679]/20 bg-[#F9F7F2]/50 backdrop-blur-md">
          <div className="mb-12 animate-stagger-1 text-center py-4 bg-[#DCC7A1]/10 border border-[#DCC7A1]/20 rounded-lg">
            <h1 className="text-xl font-black tracking-[0.4em] text-[#333333] uppercase flex items-center justify-center gap-2">
              ShiftSync
            </h1>
            <div className="h-0.5 w-6 bg-[#5D432C] mx-auto mt-2 opacity-50"></div>
            <p className="text-[#8E8679] mt-2 text-[8px] font-black uppercase tracking-[0.3em]">Japandi Scheduler</p>
          </div>

          {/* Stats Card (Desktop) - Japandi Look */}
          <div className="mb-10 p-6 bg-white border border-[#8E8679]/30 shadow-sm animate-stagger-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <Layers size={40} className="text-[#8E8679]" />
            </div>
            <div className="text-[9px] font-black text-[#8E8679] uppercase tracking-[0.4em] mb-2 border-b border-[#F9F7F2] pb-2">本月統計資料</div>
            <div className="text-3xl font-black tracking-tight text-[#333333]">
              ${currentMonthStats.totalIncome.toLocaleString()}
            </div>

            <div className="mt-4 mb-4">
              <button
                onClick={() => setIsQuickAddOpen(true)}
                className="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all"
                title="Quick Re-entry"
              >
                <Zap size={14} /> Rapid Fill
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="bg-[#8E8679]/10 px-2 py-1 rounded-md flex items-center gap-2 text-[9px] font-black text-[#8E8679] uppercase tracking-tighter">
                <Clock size={10} /> {currentMonthStats.totalHours}H
              </div>
              <div className="bg-[#8E8679]/10 px-2 py-1 rounded-md flex items-center gap-2 text-[9px] font-black text-[#8E8679] uppercase tracking-tighter">
                <Ticket size={10} /> {currentMonthStats.totalShifts} 次
              </div>
            </div>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto no-scrollbar pb-4 animate-stagger-3">
            <div className="text-[9px] font-black text-[#8E8679] uppercase tracking-[0.5em] mb-4 pl-2 opacity-40">Main</div>
            <SidebarButton
              isActive={isOverviewMode}
              onClick={() => setActiveJobId(ALL_JOBS_ID)}
              icon={<Home size={18} />}
              label="總覽"
              subLabel="Overall View"
              color="stone"
            />

            <div className="text-[9px] font-black text-[#8E8679] uppercase tracking-[0.5em] mt-8 mb-4 pl-2 opacity-40">Workspaces</div>
            {jobs.map(job => (
              <SidebarButton
                key={job.id}
                isActive={activeJobId === job.id}
                onClick={() => setActiveJobId(job.id)}
                icon={<Briefcase size={18} />}
                label={job.name}
                subLabel={job.managerName || 'Business Unit'}
                color={job.color}
              />
            ))}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full p-4 border border-dashed border-[#8E8679]/50 text-[#8E8679] hover:text-[#5D432C] hover:border-[#5D432C] flex items-center justify-center gap-2 font-black transition-all group mt-6 h-12"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform" /> <span className="text-[9px] uppercase tracking-[0.2em]">Add Unit</span>
            </button>
          </nav>

          <div className="mt-8 flex gap-1 pt-8 border-t border-[#8E8679]/20">
            {/* Sync Status / Login Button */}
            {/* Sync Status / Manual Controls */}
            {!user ? (
              <button
                onClick={login}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setIsConfigModalOpen(true);
                }}
                className="w-full mb-2 py-3 bg-[#333333] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider hover:bg-[#5D432C] transition-all"
                title="Right-click to enter Config"
              >
                <CloudOff size={14} /> Login to Sync
              </button>
            ) : (
              <div className="space-y-2 w-full">
                <div className="flex items-center gap-2 mb-2 px-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-bold text-[#333333]">{user.displayName || 'User'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleManualUpload}
                    className="py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-emerald-100 transition"
                  >
                    <Cloud size={14} />
                    <span className="text-[9px] font-black uppercase">Upload</span>
                  </button>
                  <button
                    onClick={handleManualDownload}
                    className="py-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-blue-100 transition"
                  >
                    <Download size={14} />
                    <span className="text-[9px] font-black uppercase">Download</span>
                  </button>
                </div>
                <button
                  onClick={logout}
                  className="w-full py-2 flex items-center justify-center gap-2 text-[#8E8679] hover:text-red-500 text-[10px] font-black uppercase tracking-wider transition"
                >
                  <LogOut size={12} /> Logout
                </button>
              </div>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 border border-[#8E8679]/30 text-[#8E8679] hover:bg-white flex items-center justify-center transition-all bg-white/20"
            >
              <Settings size={18} />
            </button>
            {!isOverviewMode && (
              <button
                onClick={() => setIsQuickMode(!isQuickMode)}
                className={`w-10 h-10 border transition-all flex items-center justify-center transition-all ${isQuickMode ? 'bg-[#333333] text-white border-[#333333]' : 'border-[#8E8679]/30 text-[#8E8679] hover:bg-white bg-white/20'}`}
                title={isQuickMode ? "Close Quick Schedule" : "Open Quick Schedule"}
              >
                {isQuickMode ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              </button>
            )}

            {isOverviewMode && (
              <button
                onClick={handleExportIcal}
                className="w-10 h-10 border border-[#8E8679]/30 text-[#8E8679] hover:bg-white flex items-center justify-center transition-all bg-white/20"
                title="Export Calendar"
              >
                <Download size={18} />
              </button>
            )}

            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="w-10 h-10 border border-[#8E8679]/30 text-[#8E8679] hover:bg-white flex items-center justify-center transition-all bg-white/20"
              title="User Manual"
            >
              <div className="font-serif font-black text-lg">?</div>
            </button>
          </div>
        </aside>

        {/* --- Mobile Header --- */}
        <header className="md:hidden sticky top-0 z-30 px-6 pb-4 animate-fade-in bg-[#F9F7F2] pt-[calc(1.5rem+env(safe-area-inset-top))]">
          <div className="bg-white/90 backdrop-blur-md p-4 flex justify-between items-center shadow-sm border border-[#8E8679]/20 rounded-xl">
            <div>
              <h1 className="text-xl font-black text-[#333333] tracking-tight uppercase">
                {isOverviewMode ? '總覽' : activeJob?.name}
              </h1>
              <p className="text-[8px] font-black text-[#8E8679] uppercase tracking-[0.4em] mt-0.5">
                {isOverviewMode ? 'Japandi Dashboard' : activeJob?.managerName || 'Business Unit'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!user) login();
                  else setIsSyncModalOpen(true);
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // Optional: also allow right click on mobile if supported
                  setIsConfigModalOpen(true);
                }}
                className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${user ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'border-[#8E8679]/20 text-[#8E8679]'}`}
              >
                {user ? <Cloud size={18} /> : <CloudOff size={18} />}
              </button>


              {isOverviewMode && (
                <button onClick={handleExportIcal} className="w-10 h-10 border border-[#8E8679]/20 text-[#8E8679] flex items-center justify-center rounded-lg">
                  <Download size={18} />
                </button>
              )}
              <button onClick={() => setIsQuickAddOpen(true)} className="w-10 h-10 bg-amber-100 text-amber-900 flex items-center justify-center rounded-lg border border-amber-200">
                <Zap size={18} />
              </button>

              {!isOverviewMode && (
                <button
                  onClick={() => setIsQuickMode(!isQuickMode)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${isQuickMode ? 'bg-[#333333] text-white border-[#333333]' : 'border-[#8E8679]/20 text-[#8E8679] bg-white'}`}
                  title={isQuickMode ? "Close Quick Schedule" : "Open Quick Schedule"}
                >
                  {isQuickMode ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
              )}

              <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 border border-[#8E8679]/20 text-[#8E8679] flex items-center justify-center rounded-lg">
                <Settings size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* --- Main Content --- */}
        <main className="flex-1 p-4 md:p-12 overflow-y-auto z-10">
          <div className="max-w-4xl mx-auto">

            {/* Calendar Navigation */}
            <div className="flex items-center justify-between mb-8 md:mb-12 animate-fade-in px-2">
              <button onClick={() => changeMonth(-1)} className="w-10 h-10 md:w-12 md:h-12 border border-[#8E8679]/30 text-[#8E8679] hover:text-[#333333] flex items-center justify-center transition-all bg-white/40 rounded-lg">
                <ChevronLeft size={16} className="md:w-5 md:h-5" />
              </button>
              <div className="text-center">
                <div className="wood-plaque px-5 py-2 md:px-10 md:py-3 shadow-lg transform transition-all hover:scale-105">
                  <h2 className="text-sm md:text-xl font-black text-[#DCC7A1] tracking-[0.2em] md:tracking-[0.4em] uppercase whitespace-nowrap">
                    {currentDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })}
                  </h2>
                </div>
              </div>
              <button onClick={() => changeMonth(1)} className="w-10 h-10 md:w-12 md:h-12 border border-[#8E8679]/30 text-[#8E8679] hover:text-[#333333] flex items-center justify-center transition-all bg-white/40 rounded-lg">
                <ChevronRight size={16} className="md:w-5 md:h-5" />
              </button>
            </div>

            {/* Mobile Stats Summary */}
            <div className="md:hidden mb-6 bg-white p-4 rounded-xl border border-[#8E8679]/20 shadow-sm flex items-center justify-between animate-slide-up">
              <div>
                <div className="text-[8px] font-black text-[#8E8679] uppercase tracking-[0.2em] mb-1">Total Income</div>
                <div className="text-2xl font-black text-[#333333] tracking-tight font-mono">${currentMonthStats.totalIncome.toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-1 text-[9px] font-black text-[#8E8679] tracking-tighter items-end">
                <div className="bg-[#F9F7F2] px-2 py-1 rounded flex items-center gap-1 w-fit"><Clock size={10} /> {currentMonthStats.totalHours}H</div>
                <div className="bg-[#F9F7F2] px-2 py-1 rounded flex items-center gap-1 w-fit"><Ticket size={10} /> {currentMonthStats.totalShifts} Shifts</div>
              </div>
            </div>

            {/* Elegant Calendar Grid */}
            <div className="bg-white p-6 shadow-sm border border-[#8E8679]/20 animate-stagger-2 rounded-xl overflow-hidden relative min-h-[400px]">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-6 border-b border-[#F9F7F2] pb-4">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                  <div key={i} className={`text-center text-[8px] font-black tracking-[0.4em] ${i === 0 || i === 6 ? 'text-[#DCC7A1]' : 'text-[#8E8679] opacity-80'}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Days with Swipe & Animation */}
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={currentDate.toISOString()}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={onDragEnd}
                  className="grid grid-cols-7 gap-1 w-full"
                >
                  {calendarDays.map((day, idx) => {
                    const dayShifts = getDayShifts(day.dateStr);
                    const relevantShifts = isOverviewMode
                      ? dayShifts
                      : dayShifts.filter(s => s.jobId === activeJobId);

                    relevantShifts.sort((a, b) => {
                      if (a.jobId !== b.jobId) return a.jobId.localeCompare(b.jobId);
                      return a.startTime.localeCompare(b.startTime);
                    });

                    return (
                      <div
                        key={day.dateStr + idx}
                        onClick={() => handleDayClick(day)}
                        className={`
                          aspect-square md:aspect-[4/5] relative cursor-pointer transition-all duration-300 group
                          flex flex-col items-center justify-between p-2 border border-transparent rounded-md
                          ${!day.isCurrentMonth ? 'opacity-10 grayscale' : 'hover:bg-[#F9F7F2] hover:border-[#8E8679]/30 hover:z-10'}
                          ${day.isToday ? 'bg-[#333333] text-white' : 'bg-[#8E8679]/5'}
                          ${selectedDateStr === day.dateStr ? 'ring-1 ring-[#333333] bg-[#DCC7A1]/10' : ''}
                        `}
                      >
                        <span className={`text-[9px] md:text-xs font-black tracking-tighter ${day.isToday ? 'text-white' : 'text-[#8E8679] group-hover:text-[#333333]'}`}>
                          {day.date.getDate()}
                        </span>

                        {/* Visual Indicators */}
                        <div className="flex flex-wrap gap-1 w-full justify-center mt-auto">
                          {relevantShifts.map(shift => {
                            const job = jobs.find(j => j.id === shift.jobId);
                            const color = getColorClass(job?.color || 'stone', 'bg');
                            return (
                              <div
                                key={shift.id}
                                className={`w-1.5 h-1.5 rounded-full ${color} shadow-sm border border-white/20`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            </div>



            {/* Selected Date Details (Mobile Helper) */}
            {selectedDateStr && (
              <div className="mt-8 md:hidden animate-fade-in pb-12">
                <h3 className="text-[9px] font-black text-[#8E8679] uppercase tracking-[0.4em] mb-4 pl-1 border-l-2 border-[#DCC7A1] pl-3">
                  Schedule / {parseLocalISO(selectedDateStr).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
                </h3>
                <div className="space-y-2">
                  {getDayShifts(selectedDateStr).length === 0 ? (
                    <div className="p-8 border border-dashed border-[#8E8679]/30 text-[#8E8679] text-center text-[9px] uppercase tracking-[0.4em] bg-white/40">No Assigned Tasks</div>
                  ) : (
                    getDayShifts(selectedDateStr).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(shift => {
                      const job = jobs.find(j => j.id === shift.jobId);
                      const color = getColorClass(job?.color || 'text', 'text');
                      const bg = getColorClass(job?.color || 'bg', 'bg');
                      return (
                        <div key={shift.id} onClick={() => setIsModalOpen(true)} className="bg-white p-5 border border-[#8E8679]/20 flex justify-between items-center active:bg-[#F9F7F2] transition rounded-lg">
                          <div>
                            <div className={`text-[8px] font-black ${color} mb-1 flex items-center gap-2 uppercase tracking-[0.3em]`}>
                              <span className={`w-1 h-1 rounded-full ${bg}`}></span>
                              {job?.name}
                            </div>
                            <div className="font-black text-[#333333] text-xl tracking-tighter flex items-center gap-2">
                              {shift.startTime} <span className="text-[#8E8679] opacity-30">/</span> {shift.endTime}
                            </div>
                            {shift.note && <div className="text-[#8E8679] text-[9px] mt-2 font-medium tracking-wide">{shift.note}</div>}
                          </div>
                          <div className={`w-0.5 h-8 ${bg} opacity-30`}></div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* --- Mobile Bottom Navigation --- */}
        <nav className="md:hidden fixed bottom-6 left-6 right-6 z-40 animate-fade-in">
          <div className="bg-white shadow-lg border border-[#8E8679]/30 flex justify-around p-2 rounded-2xl">
            <NavButton
              isActive={isOverviewMode}
              onClick={() => setActiveJobId(ALL_JOBS_ID)}
              icon={<Home size={18} />}
              label="總覽"
              className="flex-shrink-0"
            />
            {jobs.map(job => (
              <NavButton
                key={job.id}
                isActive={activeJobId === job.id}
                onClick={() => setActiveJobId(job.id)}
                icon={<Briefcase size={18} />}
                label={job.name}
                color={job.color}
                className="flex-shrink-0"
              />
            ))}
          </div>
        </nav>

        {/* --- Modals --- */}

        {/* Quick Paint Toolbar (Bottom Sheet) - Moved to Root */}
        <AnimatePresence>
          {isQuickMode && !isOverviewMode && activeJob && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-[#8E8679]/20 shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.1)] pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            >
              <div className="p-4 md:p-6 max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8E8679]">Quick Paint</div>
                    <div className="text-sm font-black text-[#333333]">Tap dates to paint</div>
                  </div>
                  <button onClick={() => setIsQuickMode(false)} className="bg-[#F9F7F2] p-2 rounded-full hover:bg-stone-200 transition"><X size={16} /></button>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {(activeJob.presets || []).map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePresetIndex(idx)}
                      className={`
                       flex-shrink-0 px-4 py-3 rounded-xl border flex flex-col items-start min-w-[100px] transition-all
                       ${activePresetIndex === idx
                          ? 'bg-[#333333] text-white border-[#333333] ring-2 ring-[#DCC7A1] ring-offset-2'
                          : 'bg-[#F9F7F2] text-[#8E8679] border-transparent hover:bg-[#EAE5D9]'
                        }
                     `}
                    >
                      <span className="text-xs font-black tracking-wider block mb-1">{preset.label}</span>
                      <span className={`text-[10px] font-mono opacity-80 ${activePresetIndex === idx ? 'text-[#DCC7A1]' : ''}`}>
                        {preset.start}-{preset.end}
                      </span>
                    </button>
                  ))}
                  {(!activeJob.presets || activeJob.presets.length === 0) && (
                    <div className="w-full text-center py-4 text-xs text-[#8E8679] italic border border-dashed border-[#8E8679]/30 rounded-lg">
                      No presets found. Add them in Settings.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ShiftModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          dateStr={selectedDateStr}
          jobs={jobs}
          initialJobId={isOverviewMode ? JOB_A_ID : activeJobId}
          dayShifts={getDayShifts(selectedDateStr)}
          onSave={handleAddShift}
          onBatchAddShifts={handleBatchAddShifts}
          onDelete={handleDeleteShift}
          clipboardShifts={clipboardShifts}
          onCopyShifts={handleCopyShifts}
        />

        {/* Quick Add Modal */}
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onBatchAddShifts={handleBatchAddShifts}
          currentYear={currentDate.getFullYear()}
          currentMonth={currentDate.getMonth()}
          jobs={jobs}
        />

        <HelpModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
        />

        {/* Settings Modal */}
        {
          isSettingsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-[#333333]/30 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
              <div className="bg-white relative w-full max-w-md p-0 animate-slide-up shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-center shrink-0 border-b border-[#F9F7F2]">
                  <div>
                    <h3 className="text-lg font-black text-[#333333] uppercase tracking-[0.2em]">Workspace Details</h3>
                    <p className="text-[#8E8679] text-[8px] font-black uppercase tracking-[0.4em] mt-1">Configure your environment</p>
                  </div>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-[#F9F7F2] hover:bg-[#8E8679]/10 transition rounded-md"><X size={16} /></button>
                </div>

                {/* Job List */}
                <div className="p-8 overflow-y-auto flex-1 space-y-12">

                  {/* Help Button (Mobile Only / Settings Menu) */}
                  <div className="block md:hidden mb-8">
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsHelpModalOpen(true);
                      }}
                      className="w-full py-4 bg-amber-50 border border-amber-100 text-amber-900 rounded-xl flex items-center justify-center gap-3 font-bold shadow-sm active:scale-95 transition-all"
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs">?</div>
                      看使用說明書 (Help)
                    </button>
                    <div className="flex items-center gap-4 mt-6 mb-2">
                      <div className="h-px bg-[#F9F7F2] flex-1"></div>
                      <span className="text-[9px] font-black text-[#8E8679] uppercase tracking-[0.3em]">Workspaces</span>
                      <div className="h-px bg-[#F9F7F2] flex-1"></div>
                    </div>
                  </div>

                  {jobs.map((job, idx) => {
                    const theme = getColorClass(job.color, 'text');
                    const themeBg = getColorClass(job.color, 'bg');
                    return (
                      <div key={job.id} className="relative group">
                        <div className="absolute left-[-1.5rem] top-0 bottom-0 w-0.5 bg-[#DCC7A1]/30"></div>
                        <div className={`relative transition-all`}>
                          {/* Job Header */}
                          <div className="flex justify-between items-center mb-6">
                            <div className={`text-[8px] font-black ${theme} uppercase tracking-[0.4em] flex items-center gap-2 bg-[#8E8679]/5 px-2 py-1`}>
                              <Briefcase size={12} />
                              Unit #{idx + 1}
                            </div>
                            <button
                              onClick={() => {
                                setConfirmModalState({
                                  isOpen: true,
                                  title: '刪除工作',
                                  message: '確定要移除這個工作和相關班表嗎？此動作無法復原。',
                                  confirmText: '確認刪除',
                                  isDestructive: true,
                                  onConfirm: () => handleDeleteJob(job.id)
                                });
                              }}
                              className="text-[#8E8679] hover:text-red-400 p-1.5 transition"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="space-y-6">
                            {/* Name Input */}
                            <div>
                              <label className="block text-[8px] font-black text-[#8E8679] uppercase tracking-[0.4em] mb-2">Display Name</label>
                              <input
                                type="text"
                                value={job.name}
                                onChange={(e) => {
                                  const newJobs = [...jobs];
                                  newJobs[idx].name = e.target.value;
                                  setJobs(newJobs);
                                }}
                                className="w-full bg-[#F9F7F2] border-b border-[#8E8679]/30 p-3 text-sm focus:border-[#333333] outline-none transition text-[#333333] font-black placeholder-stone-200"
                                placeholder="e.g. Starbucks AM"
                              />
                            </div>

                            {/* Color Picker */}
                            <div>
                              <label className="block text-[8px] font-black text-[#8E8679] uppercase tracking-[0.4em] mb-4 flex items-center gap-1"><Palette size={10} /> Palettes</label>
                              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                {AVAILABLE_COLORS.map(c => (
                                  <button
                                    key={c.value}
                                    onClick={() => {
                                      const newJobs = [...jobs];
                                      newJobs[idx].color = c.value;
                                      setJobs(newJobs);
                                    }}
                                    className={`w-5 h-5 flex-shrink-0 flex items-center justify-center transition-all ${c.bg} ${job.color === c.value ? 'ring-1 ring-offset-2 ring-[#333333] scale-110' : 'opacity-40 hover:opacity-100'}`}
                                    title={c.name}
                                  >
                                    {job.color === c.value && <Check size={10} className="text-white" strokeWidth={5} />}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-8">
                              <div>
                                <label className="block text-[8px] font-black text-[#8E8679] uppercase tracking-[0.4em] mb-2">Manager</label>
                                <input
                                  type="text"
                                  value={job.managerName || ''}
                                  onChange={(e) => {
                                    const newJobs = [...jobs];
                                    newJobs[idx].managerName = e.target.value;
                                    setJobs(newJobs);
                                  }}
                                  className="w-full bg-[#F9F7F2] border-b border-[#8E8679]/30 p-3 text-sm focus:border-[#333333] outline-none text-[#333333]"
                                  placeholder="..."
                                />
                              </div>
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <label className="block text-[8px] font-black text-[#8E8679] uppercase tracking-[0.4em]">Payment</label>
                                </div>
                                <div className="flex gap-2">
                                  <div className="relative w-1/2">
                                    <select
                                      value={job.payType || 'hourly'}
                                      onChange={(e) => {
                                        const newJobs = [...jobs];
                                        newJobs[idx].payType = e.target.value as any;
                                        setJobs(newJobs);
                                      }}
                                      className="w-full bg-[#F9F7F2] border-b border-[#8E8679]/30 py-3 pr-8 pl-0 text-xs font-black text-[#8E8679] focus:border-[#333333] outline-none appearance-none uppercase tracking-wider"
                                    >
                                      <option value="hourly">Hourly Rate</option>
                                      <option value="perShift">Per Shift</option>
                                    </select>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[#8E8679]">
                                      <ChevronRight size={12} className="rotate-90" />
                                    </div>
                                  </div>
                                  <input
                                    type="number"
                                    value={job.hourlyRate || ''}
                                    onChange={(e) => {
                                      const newJobs = [...jobs];
                                      newJobs[idx].hourlyRate = Number(e.target.value);
                                      setJobs(newJobs);
                                    }}
                                    className="w-1/2 bg-[#F9F7F2] border-b border-[#8E8679]/30 p-3 text-sm focus:border-[#333333] outline-none text-[#333333] font-bold text-right"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Presets Editor */}
                            <div>
                              <label className="block text-[8px] font-black text-[#8E8679] uppercase tracking-[0.4em] mb-2">Smart Presets</label>
                              <div className="space-y-2 mb-2">
                                {(job.presets || []).map((preset, pIdx) => (
                                  <div key={pIdx} className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      value={preset.label}
                                      onChange={(e) => {
                                        const newJobs = [...jobs];
                                        const newPresets = [...(newJobs[idx].presets || [])];
                                        newPresets[pIdx] = { ...newPresets[pIdx], label: e.target.value };
                                        newJobs[idx].presets = newPresets;
                                        setJobs(newJobs);
                                      }}
                                      className="w-1/3 bg-[#F9F7F2] border-b border-[#8E8679]/30 p-2 text-xs font-bold text-[#333333] outline-none"
                                      placeholder="Label"
                                    />
                                    <input
                                      type="time"
                                      value={preset.start}
                                      onChange={(e) => {
                                        const newJobs = [...jobs];
                                        const newPresets = [...(newJobs[idx].presets || [])];
                                        newPresets[pIdx] = { ...newPresets[pIdx], start: e.target.value };
                                        newJobs[idx].presets = newPresets;
                                        setJobs(newJobs);
                                      }}
                                      className="w-1/4 bg-[#F9F7F2] border-b border-[#8E8679]/30 p-2 text-xs font-mono text-[#333333] outline-none text-center"
                                    />
                                    <span className="text-[#8E8679]">-</span>
                                    <input
                                      type="time"
                                      value={preset.end}
                                      onChange={(e) => {
                                        const newJobs = [...jobs];
                                        const newPresets = [...(newJobs[idx].presets || [])];
                                        newPresets[pIdx] = { ...newPresets[pIdx], end: e.target.value };
                                        newJobs[idx].presets = newPresets;
                                        setJobs(newJobs);
                                      }}
                                      className="w-1/4 bg-[#F9F7F2] border-b border-[#8E8679]/30 p-2 text-xs font-mono text-[#333333] outline-none text-center"
                                    />
                                    <button
                                      onClick={() => {
                                        const newJobs = [...jobs];
                                        const newPresets = [...(newJobs[idx].presets || [])];
                                        newPresets.splice(pIdx, 1);
                                        newJobs[idx].presets = newPresets;
                                        setJobs(newJobs);
                                      }}
                                      className="text-[#8E8679] hover:text-red-400 p-1"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => {
                                  const newJobs = [...jobs];
                                  const newPresets = [...(newJobs[idx].presets || [])];
                                  newPresets.push({ label: 'New', start: '09:00', end: '17:00' });
                                  newJobs[idx].presets = newPresets;
                                  setJobs(newJobs);
                                }}
                                className="text-[9px] font-black text-[#8E8679] hover:text-[#333333] uppercase tracking-wider flex items-center gap-1 py-2"
                              >
                                <Plus size={12} /> Add Preset
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <button
                    onClick={handleAddJob}
                    className="w-full py-8 border border-dashed border-[#8E8679]/30 text-[#8E8679] hover:text-[#333333] hover:border-[#333333] hover:bg-[#F9F7F2] transition flex items-center justify-center gap-2 font-black uppercase tracking-[0.4em] text-[9px]"
                  >
                    <Plus size={16} /> Create Unit
                  </button>
                </div>

                {/* Footer */}
                <div className="p-8 pt-4 border-t border-[#F9F7F2] shrink-0 bg-white">
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-full bg-[#333333] text-white py-4 font-black uppercase tracking-[0.4em] text-[9px] hover:bg-[#5D432C] transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )
        }
      </div >

      {/* Sync Modal (Mobile) */}
      {
        isSyncModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#333333]/40 backdrop-blur-sm" onClick={() => setIsSyncModalOpen(false)}></div>
            <div className="bg-white relative w-full max-w-sm p-6 animate-slide-up shadow-lg rounded-xl overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-6 border-b border-[#F9F7F2] pb-4">
                <h3 className="font-black text-lg text-[#333333] flex items-center gap-2 uppercase tracking-[0.2em]">
                  <Cloud size={20} className="text-[#DCC7A1]" /> Sync Center
                </h3>
                <button onClick={() => setIsSyncModalOpen(false)} className="p-2 bg-[#F9F7F2] rounded-full hover:bg-[#8E8679]/10 transition"><X size={16} /></button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                    {user?.displayName?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase text-emerald-800 tracking-wider">Logged in as</div>
                    <div className="text-sm font-bold text-[#333333]">{user?.displayName || 'User'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setIsSyncModalOpen(false);
                      handleManualUpload();
                    }}
                    className="py-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-emerald-100 transition"
                  >
                    <Cloud size={20} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Upload</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsSyncModalOpen(false);
                      handleManualDownload();
                    }}
                    className="py-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-blue-100 transition"
                  >
                    <Download size={20} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Download</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setIsSyncModalOpen(false);
                  }}
                  className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-[#8E8679] hover:text-red-500 hover:bg-red-50 rounded-lg transition font-bold"
                >
                  <LogOut size={16} /> <span className="text-xs uppercase tracking-wider">Logout</span>
                </button>
              </div>
            </div>
          </div>
        )
      }


      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={() => window.location.reload()}
      />

      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        isDestructive={confirmModalState.isDestructive}
        confirmText={confirmModalState.confirmText}
      />
    </div >
  );
};



export default App;
