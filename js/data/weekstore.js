// Week-model entry access (used through store.js). Every query uses ONE field: at range | status | studentId.
import { weekStart, weekKey, WEEK } from '../weeks.js';
let A;
export const bind = a => { A = a; };

const ehub = new Map();
function eshare(key, opts, cb, den) {
  let g = ehub.get(key);
  if (!g) {
    g = { cbs: new Set(), den: new Set(), has: false, last: null, stop: null };
    ehub.set(key, g);
    const me = g;
    me.stop = A.watch('entries', d => { me.has = true; me.last = d; [...me.cbs].forEach(f => f(d.slice())); }, { ...opts, onDenied: () => [...me.den].forEach(f => f()) });
  }
  g.cbs.add(cb); if (den) g.den.add(den);
  if (g.has) queueMicrotask(() => g.cbs.has(cb) && cb(g.last.slice()));
  return () => {
    if (!g.cbs.delete(cb)) return;
    if (den) g.den.delete(den);
    if (!g.cbs.size) { g.stop?.(); if (ehub.get(key) === g) ehub.delete(key); }
  };
}
export const pendingEntries = (cb, onDenied) => eshare('pending', { status: 'pending' }, cb, onDenied);
export const studentEntries = (id, cb, onDenied) => eshare('stu|' + id, { studentId: id }, cb, onDenied);

// Current week, realtime, with automatic rollover at Friday 24:00 VN (timer + re-check on visibility/focus/online).
const wk = { cbs: new Set(), start: 0, un: null, timer: null, has: false, last: null, wired: false };
function wkEmit() { const m = { entries: wk.last.slice(), weekStart: wk.start }; [...wk.cbs].forEach(f => f(m)); }
function wkCheck() {
  if (!wk.cbs.size) return;
  const s = weekStart(Date.now());
  clearTimeout(wk.timer);
  wk.timer = setTimeout(wkCheck, Math.min(2 ** 31 - 1, Math.max(1000, s + WEEK - Date.now() + 300)));
  if (wk.un && s === wk.start) return;
  const rolled = !!wk.un;
  wk.un?.(); wk.start = s; wk.has = false; wk.last = [];
  wk.un = eshare('wk|' + s, { range: [s, s + WEEK] }, es => { wk.has = true; wk.last = es; wkEmit(); });
  if (rolled) wkEmit(); // new week renders at once (empty until the snapshot arrives)
}
export function onWeek(cb) {
  if (!wk.wired) {
    wk.wired = true;
    const re = () => wkCheck();
    addEventListener('focus', re); addEventListener('online', re);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) re(); });
  }
  wk.cbs.add(cb); wkCheck();
  if (wk.has) queueMicrotask(() => wk.cbs.has(cb) && cb({ entries: wk.last.slice(), weekStart: wk.start }));
  return () => {
    wk.cbs.delete(cb);
    if (!wk.cbs.size) { clearTimeout(wk.timer); wk.un?.(); wk.un = null; wk.has = false; wk.last = null; }
  };
}

// One-time week fetch. Cache: memory + localStorage aaba.wk.<key>; TTL 1h for the last 2 weeks, 6h older; {fresh} bypasses. Cap 1000 docs.
const WK_CAP = 1000, memWk = new Map(), inflight = new Map();
const ttl = start => (start >= weekStart(Date.now()) - WEEK ? 36e5 : 6 * 36e5);
const lsRead = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
export async function weekEntries(start, { fresh = false } = {}) {
  const key = weekKey(start), lk = 'aaba.wk.' + key, now = Date.now();
  if (!fresh) {
    const c = memWk.get(key) || lsRead(lk);
    if (c && now - c.t < ttl(start)) { memWk.set(key, c); return { entries: c.entries.slice(), truncated: !!c.truncated, at: c.t }; }
  }
  if (inflight.has(key) && !fresh) return inflight.get(key);
  const p = (async () => {
    const { docs, truncated } = await A.entriesBetween(start, start + WEEK, WK_CAP);
    const c = { t: Date.now(), entries: docs, truncated };
    memWk.set(key, c);
    try { localStorage.setItem(lk, JSON.stringify(c)); } catch { /* quota: memory cache only */ }
    return { entries: docs.slice(), truncated, at: c.t };
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
export function invalidateWeek(key) {
  memWk.delete(key); inflight.delete(key);
  try { localStorage.removeItem('aaba.wk.' + key); } catch {}
  try { dispatchEvent(new CustomEvent('aaba:inv', { detail: key })); } catch {}
}
export const stats = () => A.stats?.() || { docs: 0 };

