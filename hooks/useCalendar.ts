
import { useMemo } from 'react';
import { CalendarDay } from '../types';
import { formatDateToLocalISO } from '../utils/dateUtils';

export const useCalendar = (currentDate: Date) => {
    return useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0=Sun

        const days: CalendarDay[] = [];

        // Previous Month padding
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const d = new Date(year, month - 1, prevMonthLastDay - i);
            days.push({
                date: d,
                dateStr: formatDateToLocalISO(d),
                isCurrentMonth: false,
                isToday: false
            });
        }

        // Current Month
        const todayStr = formatDateToLocalISO(new Date());
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            const dStr = formatDateToLocalISO(d);
            days.push({
                date: d,
                dateStr: dStr,
                isCurrentMonth: true,
                isToday: dStr === todayStr
            });
        }

        // Next Month padding
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(year, month + 1, i);
            days.push({
                date: d,
                dateStr: formatDateToLocalISO(d),
                isCurrentMonth: false,
                isToday: false
            });
        }
        return days;
    }, [currentDate]);
};
