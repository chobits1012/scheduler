
/**
 * Formats a Date object to a YYYY-MM-DD string in local time.
 * This avoids the one-day offset issue caused by toISOString() in different timezones.
 */
export const formatDateToLocalISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Parses a YYYY-MM-DD string into a Date object in local time.
 */
export const parseLocalISO = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};
