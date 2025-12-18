
import { Shift, Job } from '../types';

export const exportToIcal = (shifts: Shift[], jobs: Job[]) => {
    const calendarLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ShiftSync//Dual Job Scheduler//TW',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    shifts.forEach(shift => {
        const job = jobs.find(j => j.id === shift.jobId);
        const summary = job ? job.name : '未知工作';

        // Format dates for .ics (YYYYMMDDTHHMMSS)
        // shift.dateStr is YYYY-MM-DD
        // shift.startTime/endTime is HH:mm
        const datePart = shift.dateStr.replace(/-/g, '');
        const startPart = shift.startTime.replace(/:/g, '') + '00';
        const endPart = shift.endTime.replace(/:/g, '') + '00';

        calendarLines.push('BEGIN:VEVENT');
        calendarLines.push(`DTSTART:${datePart}T${startPart}`);
        calendarLines.push(`DTEND:${datePart}T${endPart}`);
        calendarLines.push(`SUMMARY:${summary}`);
        if (shift.note) {
            calendarLines.push(`DESCRIPTION:${shift.note}`);
        }
        calendarLines.push('END:VEVENT');
    });

    calendarLines.push('END:VCALENDAR');

    const calendarString = calendarLines.join('\r\n');
    const blob = new Blob([calendarString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shiftsync_calendar_${new Date().toISOString().split('T')[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
