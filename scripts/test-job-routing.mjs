/**
 * Quick checks for keyword → workspace routing.
 * Run: node scripts/test-job-routing.mjs
 */
import { suggestJobId } from '../utils/jobRouting.ts';

const jobs = [
  { id: 'job-b', name: '開溜', color: 'forest' },
  { id: 'job-ji', name: '寂屋', color: 'walnut' },
  { id: 'job-huang', name: '黃衣', color: 'amber' },
  { id: 'job-rehearsal', name: '排練', color: 'rose' },
];

const cases = [
  ['16:00 寂', 'job-ji'],
  ['19:20 黃', 'job-huang'],
  ['鬼混排練', 'job-rehearsal'],
  ['寂 · 確認', 'job-ji'],
  ['未知主題', null],
];

let failed = 0;
for (const [note, expected] of cases) {
  const got = suggestJobId(note, jobs);
  if (got !== expected) {
    console.error(`FAIL: "${note}" → ${got}, expected ${expected}`);
    failed++;
  } else {
    console.log(`OK: "${note}" → ${got ?? '（需手動）'}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
