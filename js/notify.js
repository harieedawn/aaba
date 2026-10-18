// In-app notifications: entries about me (studentId) newer than localStorage lastSeen. No push, no server.
import * as store from './data/store.js';
import { getSession, onSession } from './session.js';
const K = 'aaba.seen';
let all = [], list = [], seen = 0;
const subs = new Set();
const rd = () => { try { const v = localStorage.getItem(K); return v == null ? null : +v || 0; } catch { return 0; } };
const wr = v => { seen = v; try { localStorage.setItem(K, String(v)); } catch {} };
const top = a => a.reduce((m, e) => Math.max(m, e.at || 0), 0);

function calc() {
  const s = getSession();
  list = s?.studentId ? all.filter(e => e.studentId === s.studentId && e.by !== s.uid).sort((a, b) => b.at - a.at) : [];
  const v = rd();
  if (v == null) { if (s?.studentId && all.length) wr(top(list)); } else seen = v;
  subs.forEach(f => f());
}
export const notifs = () => list;
export const lastSeen = () => seen;
export const unseen = () => list.filter(e => e.at > seen).length;
export function markSeen() { const t = Math.max(seen, top(list)); if (t !== seen) { wr(t); subs.forEach(f => f()); } }
export function onNotif(f) { subs.add(f); return () => subs.delete(f); }
export function startNotify() {
  store.on('entries', es => { all = es; calc(); });
  onSession(calc);
}
