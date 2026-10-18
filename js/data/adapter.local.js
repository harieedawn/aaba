// Local adapter: memory + localStorage. Generic primitives only; domain logic lives in store.js.
// watch(col, cb, {cycle}) : cycle 'current' | cycleId filters entries. 'config' delivers the single config object.
import { buildDemo } from './seed.js';
const KEY = 'aaba.local.v1', RK = 'aaba.role', UK = 'aaba.uid';
const ROLES = ['dev', 'admin', 'teacher', 'recorder', 'student', 'guest'];
let db, subs = [];

const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };
const clone = x => JSON.parse(JSON.stringify(x));

function emit(s) {
  const { col, cb, opts } = s;
  if (col === 'config') return cb(clone({ id: 'main', ...db.config }));
  let a = Object.entries(db[col] || {}).map(([id, d]) => ({ id, ...d }));
  if (col === 'entries' && opts.cycle) {
    const c = opts.cycle === 'current' ? db.config.currentCycleId : opts.cycle;
    a = a.filter(e => e.cycleId === c);
  }
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
export async function set(col, id, data, { merge = false } = {}) {
  if (col === 'config') db.config = merge ? { ...db.config, ...clone(data) } : clone(data);
  else db[col][id] = merge ? { ...(db[col][id] || {}), ...clone(data) } : clone(data);
  persist(); notify(col);
  if (col === 'config') notify('entries'); // current cycle may have changed
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
