// Notes dates (pure). Keys are 'YYYY-MM-DD' = Vietnam calendar day (UTC+7), built on js/weeks.js.
import { DAY, isoDate, noonOf, dowOf, WD_SHORT, dayMonth } from '../weeks.js';

export const isKey = k => typeof k === 'string' && noonOf(k) != null && isoDate(noonOf(k)) === k;
export const todayKey = () => isoDate(Date.now());
export const keyToDate = key => { const t = noonOf(key); return t == null ? null : new Date(t); }; // that day 12:00 VN
export const addDays = (key, n) => isoDate(noonOf(key) + n * DAY);
export const diffDays = (a, b) => Math.round((noonOf(b) - noonOf(a)) / DAY); // b - a
export function fmtDay(key) { const t = noonOf(key); return `${WD_SHORT[dowOf(t)]} ${dayMonth(t)}`; } // "T4 28/10"
export function relText(d) {
  if (d === 0) return 'Hôm nay';
  if (d === 1) return 'Ngày mai';
  if (d === -1) return 'Hôm qua';
  return d > 1 ? `Còn ${d} ngày` : `${-d} ngày trước`;
}
