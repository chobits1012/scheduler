
export type PayType = 'hourly' | 'perShift';

export interface JobPreset {
  label: string;
  start: string;
  end: string;
}

export interface Job {
  id: string;
  name: string;
  color: string; // Tailwind color class prefix (e.g., 'blue', 'emerald')
  managerName?: string;
  hourlyRate?: number; // Functions as "Rate" (either per hour or per shift based on payType)
  payType?: PayType;   // New: Determines how the rate is applied
  presets?: JobPreset[];
}

export interface Shift {
  id: string;
  jobId: string;
  dateStr: string; // ISO YYYY-MM-DD
  startTime: string;
  endTime: string;
  note?: string;
  isDoublePay?: boolean;
}

export interface ClipboardShift {
  startTime: string;
  endTime: string;
  note?: string;
  isDoublePay?: boolean;
  jobId: string; // Keep track of source job, though we allow pasting anywhere
}

export interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export const JOB_A_ID = 'job-a';
export const JOB_B_ID = 'job-b';
export const ALL_JOBS_ID = 'all-jobs';
