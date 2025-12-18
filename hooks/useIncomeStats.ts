
import { useMemo } from 'react';
import { Job, Shift } from '../types';

export const useIncomeStats = (shifts: Shift[], jobs: Job[], currentDate: Date) => {
    return useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        let totalIncome = 0;
        let totalHours = 0;
        let totalShifts = 0;

        shifts.forEach(shift => {
            const d = new Date(shift.dateStr);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const job = jobs.find(j => j.id === shift.jobId);
                if (job && job.hourlyRate) {
                    totalShifts += 1;
                    const [startH, startM] = shift.startTime.split(':').map(Number);
                    const [endH, endM] = shift.endTime.split(':').map(Number);
                    let duration = (endH + endM / 60) - (startH + startM / 60);
                    if (duration < 0) duration += 24;

                    totalHours += duration;

                    let payForShift = 0;
                    if (job.payType === 'perShift') {
                        // If Per Shift, add flat rate
                        payForShift = job.hourlyRate;
                    } else {
                        // Default: Hourly
                        payForShift = duration * job.hourlyRate;
                    }

                    if (shift.isDoublePay) {
                        payForShift *= 2;
                    }

                    totalIncome += payForShift;
                }
            }
        });

        return { totalIncome: Math.floor(totalIncome), totalHours: Math.round(totalHours), totalShifts };
    }, [shifts, jobs, currentDate]);
};
