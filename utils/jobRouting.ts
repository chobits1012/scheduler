import { Job } from '../types';

/** Theme token before status suffixes like「確認」. */
export const extractThemeKeyword = (note?: string): string | null => {
  if (!note) return null;
  const primary = note.split(' · ')[0].trim();
  return primary || null;
};

/**
 * Suggest a workspace from parsed note text.
 * Matches when the job name contains the theme keyword (寂→寂屋, 黃→黃衣).
 * Notes containing「排練」route to a job whose name includes「排練」.
 */
export const suggestJobId = (note: string | undefined, jobs: Job[]): string | null => {
  if (!note || jobs.length === 0) return null;

  if (note.includes('排練')) {
    const rehearsal = jobs.find((j) => j.name.includes('排練'));
    if (rehearsal) return rehearsal.id;
  }

  const primary = extractThemeKeyword(note);
  if (!primary) return null;

  const match = jobs.find((j) => j.name.includes(primary));
  return match?.id ?? null;
};
