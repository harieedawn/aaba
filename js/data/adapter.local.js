// Local adapter: memory + localStorage. Generic primitives only; domain logic lives in store.js.
// watch(col, cb, opts): entries need opts.range | status | studentId. 'config' delivers the single config object.
import { buildDemo } from './seed.js';
const KEY = 'aaba.local.v1', RK = 'aaba.role', UK = 'aaba.uid';
const ROLES = ['dev', 'admin', 'teacher', 'recorder', 'student', 'guest'];
let db, subs = [];

let docsIn = 0; // parity with adapter.firebase.js stats()
export const stats = () => ({ docs: docsIn });
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };
const clone = x => JSON.parse(JSON.stringify(x));

// same single-field filters as the firebase adapter: at range | status | studentId
function filterEntries(a, o) {
  if (o.range) return a.filter(e => e.at >= o.range[0] && e.at < o.range[1]);
  if (o.status) return a.filter(e => e.status === o.status);
  if (o.studentId) return a.filter(e => e.studentId === o.studentId);
  return a;
}
function emit(s) {
  const { col, cb, opts } = s;
  if (col === 'config') return cb(clone({ id: 'main', ...db.config }));
  let a = Object.entries(db[col] || {}).map(([id, d]) => ({ id, ...d }));
  if (col === 'entries') a = filterEntries(a, opts);
  if (col === 'notes' && opts.range) a = a.filter(n => n.date >= opts.range[0] && n.date <= opts.range[1]);
  if (col === 'pnotes') a = a.filter(n => n.owner === opts.owner); // personal notes: owner only
  docsIn += col === 'entries' ? a.length : 0;
  cb(clone(a));
}
const notify = col => subs.filter(s => s.col === col).forEach(emit);

function demoSession() {
  const q = new URLSearchParams(location.search).get('role');
  let r = ROLES.includes(q) ? q : null;
  try {
    if (r) { localStorage.setItem(RK, r); localStorage.removeItem(UK); }
    else {
      const uid = localStorage.getItem(UK);
      if (uid && db.members[uid]) return { uid, ...db.members[uid] };
      r = localStorage.getItem(RK);
    }
  } catch {}
  if (!ROLES.includes(r)) r = 'recorder';
  if (r === 'guest') return db.config.openView === true ? { uid: 'u_guest', role: 'guest', name: 'Khách', studentId: null, groupId: null, titleId: null } : null;
  const st = id => ({ studentId: id, groupId: db.students[id].groupId, titleId: db.students[id].titleId });
  const base = { uid: 'u_' + r, role: r };
  if (r === 'recorder') return { ...base, name: db.students.s_1_1.name, ...st('s_1_1') };
  if (r === 'student') return { ...base, name: db.students.s_3_2.name, ...st('s_3_2') };
  if (r === 'admin') return { ...base, name: 'Ban cán sự', studentId: null, groupId: null, titleId: null };
  return { ...base, name: r === 'dev' ? 'Quản trị' : 'Giáo viên', studentId: null, groupId: null, titleId: null };
}

export async function init() {
  try { const raw = JSON.parse(localStorage.getItem(KEY)); db = raw && raw.v === 2 ? raw : null; } catch { db = null; }
  if (!db) db = buildDemo();
  if (!db.notes || !db.pnotes) { const d = buildDemo(); db.notes ||= d.notes; db.pnotes ||= d.pnotes; } // older local data: add demo notes
  persist();
  addEventListener('storage', e => {
    if (e.key !== KEY || !e.newValue) return;
    db = JSON.parse(e.newValue); subs.forEach(emit);
  });
  return { session: demoSession() };
}
export function watch(col, cb, opts = {}) {
  const s = { col, cb, opts };
  subs.push(s);
  queueMicrotask(() => subs.includes(s) && emit(s));
  return () => { subs = subs.filter(x => x !== s); };
}
export const get = async (col, id) => clone(col === 'config' ? db.config : db[col]?.[id] ?? null);
export const list = async col => Object.entries(db[col] || {}).map(([id, d]) => ({ id, ...clone(d) }));
const prep = (col, data, { merge = false, at = null } = {}) => {
  const d = clone(data);
  if (col === 'entries' && !merge && typeof at === 'number') { d.at = at; d.addedAt = Date.now(); }
  return d;
};
export async function entriesBetween(a, b, limit = 1000) {
  const all = Object.entries(db.entries || {}).map(([id, d]) => ({ id, ...clone(d) })).filter(e => e.at >= a && e.at < b);
  docsIn += Math.min(all.length, limit + 1);
  return { docs: all.slice(0, limit), truncated: all.length > limit };
}
export async function notesBetween(a, b) {
  return clone(Object.entries(db.notes || {}).map(([id, d]) => ({ id, ...d })).filter(n => n.date >= a && n.date <= b));
}
export async function batch(ops) {
  for (const { col, id, data, ...o } of ops) { const d = prep(col, data, o); db[col][id] = o.merge ? { ...(db[col][id] || {}), ...d } : d; }
  persist(); [...new Set(ops.map(o => o.col))].forEach(notify);
}
export async function set(col, id, data, o = {}) {
  const { merge = false } = o; data = prep(col, data, o);
  if (col === 'config') db.config = merge ? { ...db.config, ...clone(data) } : clone(data);
  else (db[col] ||= {})[id] = merge ? { ...(db[col][id] || {}), ...clone(data) } : clone(data);
  persist(); notify(col);
}
export async function remove(col, id) { delete db[col]?.[id]; persist(); notify(col); }
export const dump = async () => clone(db);
export async function load(obj) { db = clone(obj); persist(); subs.forEach(emit); }
export const uid = async () => 'u_' + Math.random().toString(36).slice(2, 10);
export const remember = u => { try { localStorage.setItem(UK, u); localStorage.removeItem(RK); } catch {} };
export async function signOut() {
  try { localStorage.removeItem(RK); localStorage.removeItem(UK); } catch {}
  location.replace(location.pathname + '#/join');
  location.reload();
}
