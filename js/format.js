// Formatting + date helpers. Timezone Asia/Ho_Chi_Minh (UTC+7, no DST), week starts Monday.
const OFF = 7 * 36e5, DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
const vn = t => new Date(+t + OFF);
export const MINUS = '\u2212';
export const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export function startOfDay(t) { const d = vn(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - OFF; }
export function startOfWeek(t) { return startOfDay(t) - ((vn(t).getUTCDay() + 6) % 7) * DAY; }
export const dayKey = t => { const d = vn(t); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
export function weekKey(t) { // ISO week: YYYY-Www
  const d = vn(t), dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const y = dt.getUTCFullYear();
  return `${y}-W${pad(Math.ceil(((dt - Date.UTC(y, 0, 1)) / DAY + 1) / 7))}`;
}
export const fmtDate = t => { const d = vn(t); return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`; };
export const fmtTime = t => { const d = vn(t); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
export const fmtNum = n => (n < 0 ? MINUS : '') + Math.abs(n).toLocaleString('vi-VN');
export const fmtPts = n => (n > 0 ? '+' : n < 0 ? MINUS : '') + Math.abs(n).toLocaleString('vi-VN');

export function dayLabel(t) {
  const k = startOfDay(t), today = startOfDay(Date.now());
  if (k === today) return 'Hôm nay';
  if (k === today - DAY) return 'Hôm qua';
  return `${WD[vn(t).getUTCDay()]}, ${fmtDate(t)}`;
}
export function relTime(t, now = Date.now()) {
  const m = Math.floor((now - t) / 6e4);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  if (startOfDay(t) === startOfDay(now)) return `${Math.floor(m / 60)} giờ trước`;
  return `${fmtDate(t)} ${fmtTime(t)}`;
}
export function cycleInfo(cycle, weeks = 4, now = Date.now()) {
  if (!cycle) return null;
  const end = cycle.end || cycle.start + weeks * 7 * DAY;
  return {
    n: cycle.n, weeks,
    week: Math.min(weeks, Math.max(1, Math.floor((now - cycle.start) / (7 * DAY)) + 1)),
    daysLeft: Math.max(0, Math.ceil((end - now) / DAY)),
  };
}
