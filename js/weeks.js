// Week model (pure, no DOM, no Date local-time use). Asia/Ho_Chi_Minh = fixed UTC+7.
// A week starts Saturday 00:00 VN and ends at the end of Friday: [start, start + 7d).
// Sunday and Monday..Friday belong to the week that began on the previous Saturday.
// A week belongs to the month of its Friday. Week key = ISO date (VN) of its Saturday.
export const OFF = 7 * 36e5, DAY = 864e5, WEEK = 7 * DAY;
const pad = n => String(n).padStart(2, '0');
const dayIdx = t => Math.floor((t + OFF) / DAY);                 // VN calendar day number
const dow = t => (dayIdx(t) + 4) % 7;                            // 0=CN 1=T2 ... 5=T6 6=T7
const dayMs = i => i * DAY - OFF;                                // VN 00:00 of day number i
const ymd = t => { const d = new Date(t + OFF); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; };

export const weekStart = t => dayMs(dayIdx(t) - ((dow(t) + 1) % 7));
export const weekRange = start => [start, start + WEEK];
export const weekEnd = start => start + WEEK;
export const friday = start => start + 6 * DAY;                  // VN 00:00 of that week's Friday
export const nextWeekStart = t => weekStart(t) + WEEK;
export const addWeeks = (start, n) => start + n * WEEK;
export const isoDate = t => { const [y, m, d] = ymd(t); return `${y}-${pad(m)}-${pad(d)}`; };
export const weekKey = start => isoDate(start);
export function keyToStart(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  if (!m) return null;
  const s = Date.UTC(+m[1], +m[2] - 1, +m[3]) - OFF;
  return weekStart(s) === s ? s : null;                          // key must be a Saturday
}
// 'YYYY-MM-DD' -> that day 12:00 VN (ms), or null
export function noonOf(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) - OFF : null;
}
export const dowOf = dow;
export const WD_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const dm = t => { const [, m, d] = ymd(t); return `${d}/${m}`; };
export const dayMonth = dm;
export const label = start => `T7 ${dm(start)} → T6 ${dm(friday(start))}`;
// {y, m, key:'YYYY-MM'} of the month the week belongs to (month of its Friday)
export function monthOfWeek(start) { const [y, m] = ymd(friday(start)); return { y, m, key: `${y}-${pad(m)}` }; }
export const parseMonth = key => { const m = /^(\d{4})-(\d{2})$/.exec(key || ''); return m && +m[2] >= 1 && +m[2] <= 12 ? { y: +m[1], m: +m[2], key } : null; };
export const addMonths = (key, n) => { const { y, m } = parseMonth(key); const i = y * 12 + (m - 1) + n; return `${Math.floor(i / 12)}-${pad((i % 12) + 1)}`; };
export const monthLabel = key => { const { y, m } = parseMonth(key); return `Tháng ${m}/${y}`; };
// week starts (ascending) whose Friday falls in month `key`
export function weeksOfMonth(key) {
  const { y, m } = parseMonth(key), out = [];
  for (let d = 1; d <= 31; d++) {
    const t = Date.UTC(y, m - 1, d) - OFF;
    if (new Date(t + OFF).getUTCMonth() !== m - 1) break;
    if (dow(t) === 5) out.push(t - 6 * DAY);
  }
  return out;
}
// selected month + 2 previous: month keys ascending and all their weeks (max 14)
export function last3Months(key) {
  const months = [addMonths(key, -2), addMonths(key, -1), key];
  return { months, weeks: months.flatMap(weeksOfMonth) };
}
// days left after today until Friday: Sat 6 ... Thu 1, Fri 0
export function daysLeft(t) { const d = dow(t); return d === 6 ? 6 : d === 0 ? 5 : 5 - d; }
