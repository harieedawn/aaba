// Week-model entry access (used through store.js). Every query uses ONE field: at range | status | studentId.
import { weekStart, weekKey, WEEK } from '../weeks.js';
let A;
export const bind = a => { A = a; loadOut(); };

// ---- Outbox: every entry write is tracked until the SERVER confirms it. States: sending | queued (offline/slow) | error (rejected, with retry).
// Persisted in localStorage so a write rejected after a reload still shows up as an error instead of disappearing.
const OUT = new Map(), DONE = new Set(), outCbs = new Set(), OK = 'aaba.outbox';
const saveOut = () => { try { const a = [...OUT.values()].map(({ id, ops, entry, state, err }) => ({ id, ops, entry, state, err })); a.length ? localStorage.setItem(OK, JSON.stringify(a)) : localStorage.removeItem(OK); } catch {} };
function loadOut() {
  try { for (const i of JSON.parse(localStorage.getItem(OK)) || []) if (i && i.id && !OUT.has(i.id)) OUT.set(i.id, { ...i, state: i.state === 'error' ? 'error' : 'queued' }); } catch {}
  if (!loadOut.w) { loadOut.w = true; addEventListener('online', () => reconcile()); addEventListener('focus', () => reconcile()); }
}
function outEmit() { saveOut(); [...outCbs].forEach(f => f()); if (wk.last && wk.cbs.size) wkEmit(); }
export const entryState = id => OUT.get(id)?.state || (DONE.has(id) ? 'ok' : null);
export const entryError = id => OUT.get(id)?.err || null;
export const onOutbox = cb => { outCbs.add(cb); return () => outCbs.delete(cb); };
const settle = it => { OUT.delete(it.id); DONE.add(it.id); outEmit(); };
const fail = (it, e) => { it.state = 'error'; it.err = { code: e?.code || '', message: e?.message || '' }; outEmit(); };
async function send(it) {
  it.state = 'sending'; it.err = null; outEmit();
  try {
    const r = await A.batch(it.ops, { track: true });
    if (r && r.done && !r.confirmed) { it.state = 'queued'; outEmit(); r.done.then(() => settle(it), e => fail(it, e)); } else settle(it);
  } catch (e) { fail(it, e); }
  return it;
}
// track(entry, ops): idempotent per entry id (a double submit never writes twice). Never throws: a failure becomes state 'error'.
export async function track(entry, ops) {
  const old = OUT.get(entry.id);
  if (old && old.state !== 'error') return old;
  if (!old && DONE.has(entry.id)) return { id: entry.id, state: 'ok', entry };
  const it = old || { id: entry.id }; it.entry = entry; it.ops = ops;
  OUT.set(it.id, it);
  return send(it);
}
export async function retryEntry(id) {
  const it = OUT.get(id); if (!it || it.state === 'sending') return;
  it.state = 'sending'; outEmit();
  const p = await A.probe?.('entries', id);
  if (p === 'server') return settle(it);
  if (p === 'pending') { it.state = 'queued'; outEmit(); return; }
  return send(it);
}
export function dismissEntry(id) { if (OUT.delete(id)) outEmit(); }
// Items left over from an earlier page load: confirmed on the server, still queued, or rejected meanwhile.
let recBusy = false;
export async function reconcile() {
  if (recBusy || !A?.probe) return; recBusy = true;
  try {
    for (const it of [...OUT.values()]) {
      if (it.state !== 'queued' && it.state !== 'error') continue;
      const p = await A.probe('entries', it.id);
      if (p === 'server') settle(it);
      else if (p === 'missing' && it.state === 'queued') fail(it, { message: 'Máy chủ không nhận bản ghi này' });
    }
  } finally { recBusy = false; }
}
// Snapshot entries + outbox items the snapshot does not hold (rejected, or not yet cached). Rejected ones get status 'failed' so no score counts them.
function withOut(entries, start) {
  if (!OUT.size) return entries;
  const have = new Map(entries.map(e => [e.id, e])), extra = []; let done = false;
  for (const it of [...OUT.values()]) {
    const e = it.entry, cur = e && have.get(e.id);
    if (cur) { if (it.state === 'queued' && !cur._pend) { OUT.delete(it.id); DONE.add(it.id); done = true; } continue; }
    if (e && e.at >= start && e.at < start + WEEK) extra.push({ ...e, _out: it.state, ...(it.state === 'error' && { status: 'failed' }) });
  }
  if (done) { saveOut(); queueMicrotask(() => [...outCbs].forEach(f => f())); }
  return extra.length ? entries.concat(extra) : entries;
}

const ehub = new Map();
function eshare(key, opts, cb, den) {
  let g = ehub.get(key);
  if (!g) {
    g = { cbs: new Set(), den: new Set(), has: false, last: null, stop: null };
    ehub.set(key, g);
    const me = g;
    me.stop = A.watch('entries', d => { me.has = true; me.last = d; [...me.cbs].forEach(f => f(d.slice())); }, { ...opts, onDenied: () => { if (ehub.get(key) === me) ehub.delete(key); [...me.den].forEach(f => f()); } });
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
function wkEmit() { const m = { entries: withOut(wk.last, wk.start).slice(), weekStart: wk.start }; [...wk.cbs].forEach(f => f(m)); }
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
  if (wk.has) queueMicrotask(() => wk.cbs.has(cb) && wk.last && cb({ entries: withOut(wk.last, wk.start).slice(), weekStart: wk.start }));
  return () => {
    wk.cbs.delete(cb);
    if (!wk.cbs.size) { clearTimeout(wk.timer); wk.un?.(); wk.un = null; wk.has = false; wk.last = null; }
  };
}

// One-time week fetch. Cache: memory + localStorage aaba.wk.<key>; TTL 5 min for the last 2 weeks, 6h older; {fresh} bypasses. Cap 1000 docs.
const WK_CAP = 1000, memWk = new Map(), inflight = new Map();
const ttl = start => (start >= weekStart(Date.now()) - WEEK ? 3e5 : 6 * 36e5); // last 2 weeks: 5 min (others add entries), older: 6h
const lsRead = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
export async function weekEntries(start, { fresh = false } = {}) {
  const key = weekKey(start), lk = 'aaba.wk.' + key, now = Date.now();
  if (!fresh) {
    const c = memWk.get(key) || lsRead(lk);
    if (c && now - c.t < ttl(start)) { memWk.set(key, c); return { entries: c.entries.slice(), truncated: !!c.truncated, at: c.t }; }
  }
  if (inflight.has(key) && !fresh) return inflight.get(key);
  const p = (async () => {
    const r0 = await A.entriesBetween(start, start + WEEK, WK_CAP), truncated = r0.truncated, docs = r0.docs.map(({ _pend, ...d }) => d);
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

