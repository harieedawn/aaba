/* store.js: the ONLY data access point for views. Adapters: adapter.local.js | adapter.firebase.js (P5).
 * Methods (15):
 *  init()                         -> loads adapter, sets session, returns it
 *  on(col, cb, opts)              -> unsubscribe. cols: config (object), groups, students, rules, entries,
 *                                    cycles, members, invites (arrays of {id,...}). entries = current đợt
 *                                    unless opts.all or opts.cycleId.
 *  addEntry({groupId,studentId,ruleId,qty,note}) -> entry   (snapshots rule, sets status per role)
 *  voidEntry(id, reason)          approveEntry(id)
 *  saveDoc(col, id|null, data)    -> id (merge)        deleteDoc(col, id)
 *  closeCycle()                   -> stores summary, opens next đợt
 *  createInvite(inv) -> code      revokeInvite(code)   joinWithCode(code)   claimStudent(studentId)
 *  exportConfig({withEntries})    importConfig(obj, 'merge'|'replace')      signOut()
 */
import { BACKEND, APP_VERSION } from '../config.js';
import { getSession, setSession, can, role } from '../session.js';
import { cycleSummary } from '../scoring.js';
let A;
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
const rand = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALPHA[b % ALPHA.length]).join('');
const need = (ok, msg = 'Bạn không có quyền làm việc này') => { if (!ok) throw new Error(msg); };

export async function init() {
  A = BACKEND === 'firebase' ? await import('./adapter.firebase.js') : await import('./adapter.local.js');
  let { session } = await A.init();
  if (session?.role === 'guest') session = await guestInit(session);
  setSession(session);
  return session;
}
// Guest: picked student lives only in localStorage (no Firestore write). Guest loses access when openView turns off.
const PK = 'aaba.me';
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch {} };
async function guestInit(s) {
  const kick = () => { stop?.(); setSession(null); };
  const stop = on('config', c => { if (c.openView !== true) kick(); }, { onDenied: kick });
  const id = lsGet(PK);
  if (!id) return s;
  const st = await A.get('students', id).catch(() => null);
  if (!st) { lsDel(PK); return s; }
  return { ...s, studentId: id, groupId: st.groupId, titleId: st.titleId, name: st.name };
}
export async function pickStudent(id) {
  const s = getSession();
  need(s && s.role === 'guest');
  lsDel('aaba.seen');
  if (!id) { lsDel(PK); return setSession({ uid: s.uid, role: 'guest', name: 'Khách', studentId: null, groupId: null, titleId: null }); }
  const st = await A.get('students', id);
  need(st, 'Không tìm thấy học sinh');
  try { localStorage.setItem(PK, id); } catch {}
  setSession({ ...s, studentId: id, groupId: st.groupId, titleId: st.titleId, name: st.name });
}
// ONE shared adapter listener per (collection, cycle), ref-counted: stops when the last subscriber leaves.
const hub = new Map();
const share = (col, d) => (Array.isArray(d) ? d.slice()
  : col === 'config' && d ? { className: '', school: '', cycleWeeks: 4, currentCycleId: null, ...d, categories: d.categories || [], titles: d.titles || [] } : d);
export function on(col, cb, opts = {}) {
  const o = {};
  if (col === 'entries') o.cycle = opts.cycleId || (opts.all ? null : 'current');
  const key = col + '|' + (o.cycle || '');
  let g = hub.get(key);
  if (!g) {
    g = { cbs: new Set(), den: new Set(), has: false, last: null, stop: null };
    hub.set(key, g);
    const me = g;
    me.stop = A.watch(col, d => { me.has = true; me.last = d; [...me.cbs].forEach(f => f(share(col, d))); }, { ...o, onDenied: () => [...me.den].forEach(f => f()) });
  }
  g.cbs.add(cb);
  if (opts.onDenied) g.den.add(opts.onDenied);
  if (g.has) { const d = g.last; queueMicrotask(() => g.cbs.has(cb) && cb(share(col, d))); }
  return () => {
    if (!g.cbs.delete(cb)) return;
    if (opts.onDenied) g.den.delete(opts.onDenied);
    if (!g.cbs.size) { g.stop?.(); if (hub.get(key) === g) hub.delete(key); }
  };
}
export async function addEntry(e) {
  const s = getSession();
  need(can('record', { groupId: e.groupId }));
  const [rule, cfg] = await Promise.all([A.get('rules', e.ruleId), A.get('config', 'main')]);
  need(rule && rule.active !== false, 'Nội dung không tồn tại');
  if (e.studentId && role() === 'recorder') {
    const st = await A.get('students', e.studentId);
    need(st && st.groupId === s.groupId);
  }
  const studentId = rule.scope === 'group' ? null : e.studentId || null;
  need(rule.scope !== 'student' || studentId, 'Cần chọn học sinh');
  const qty = rule.perUnit ? Math.min(99, Math.max(1, e.qty | 0)) : 1, points = rule.points * qty;
  const doc = {
    cycleId: cfg.currentCycleId, groupId: e.groupId, studentId, ruleId: e.ruleId,
    ruleName: rule.name, cat: rule.cat, unit: rule.points, qty, points, note: String(e.note || '').trim().slice(0, 500),
    by: s.uid, byName: s.role === 'dev' ? 'Quản trị' : s.name, at: Date.now(),
    status: role() === 'recorder' && points > 0 ? 'pending' : 'ok', voidReason: '', voidBy: '',
  };
  const id = 'e_' + Date.now().toString(36) + rand(4);
  await A.set('entries', id, doc);
  return { id, ...doc };
}
export async function voidEntry(id, reason) {
  const entry = await A.get('entries', id);
  need(entry && can('void', { entry }));
  need(reason && reason.trim(), 'Cần nhập lý do');
  reason = reason.trim().slice(0, 500);
  await A.set('entries', id, { status: 'void', voidReason: reason, voidBy: getSession().uid }, { merge: true });
}
export async function approveEntry(id) {
  const entry = await A.get('entries', id);
  need(entry && entry.status === 'pending' && can('approve', { entry }));
  await A.set('entries', id, { status: 'ok' }, { merge: true });
}
export async function saveDoc(col, id, data) {
  need(can('edit'));
  data = { ...data };
  if (typeof data.name === 'string') data.name = data.name.trim().slice(0, 80);
  if (typeof data.note === 'string') data.note = data.note.trim().slice(0, 500);
  id = col === 'config' ? 'main' : id || col[0] + '_' + Date.now().toString(36) + rand(3);
  await A.set(col, id, data, { merge: true });
  return id;
}
export async function deleteDoc(col, id) { need(can('edit')); await A.remove(col, id); }
export async function closeCycle() {
  need(can('close'));
  const cfg = await A.get('config', 'main'), cur = await A.get('cycles', cfg.currentCycleId);
  const [groups, entries] = await Promise.all([A.list('groups'), A.list('entries')]);
  const now = Date.now(), nid = 'c' + (cur.n + 1);
  await A.set('cycles', cfg.currentCycleId, { closed: true, end: now,
    summary: cycleSummary(groups, entries, cfg.categories, cfg.currentCycleId) }, { merge: true });
  await A.set('cycles', nid, { n: cur.n + 1, start: now, end: null, closed: false, summary: [] });
  await A.set('config', 'main', { currentCycleId: nid }, { merge: true });
  return nid;
}
export async function createInvite(inv) {
  need(can('createInvite', { role: inv.role }));
  const code = rand(20);
  await A.set('invites', code, { role: inv.role, label: inv.label || '', studentId: inv.studentId || null,
    groupId: inv.groupId || null, titleId: inv.titleId || null, active: true, createdBy: getSession().uid, at: Date.now() });
  return code;
}
export async function revokeInvite(code) {
  const inv = await A.get('invites', code);
  need(inv && can('createInvite', { role: inv.role }));
  await A.set('invites', code, { active: false }, { merge: true });
  for (const m of await A.list('members')) if (m.inviteId === code) await A.remove('members', m.id);
}
export async function joinWithCode(code) {
  const inv = await A.get('invites', String(code).trim());
  need(inv && inv.active, 'Mã không hợp lệ hoặc đã bị thu hồi');
  const uid = await A.uid();
  const m = { role: inv.role, inviteId: String(code).trim(), studentId: inv.studentId ?? null, groupId: inv.groupId ?? null,
    titleId: inv.titleId ?? null, name: inv.label || '', at: Date.now() };
  await A.set('members', uid, m);
  A.remember?.(uid, m.role);
  setSession({ uid, ...m });
  return m;
}
export async function claimStudent(studentId) {
  const s = getSession();
  need(s && s.role === 'student' && !s.studentId);
  const st = await A.get('students', studentId);
  need(st, 'Không tìm thấy học sinh');
  const patch = { studentId, groupId: st.groupId, titleId: st.titleId, name: st.name };
  await A.set('members', s.uid, patch, { merge: true });
  setSession({ ...s, ...patch });
}
const COLS = ['groups', 'students', 'rules', 'cycles', 'entries'];
const byId = a => Object.fromEntries(a.map(({ id, ...d }) => [id, d]));
// Config export: never invite codes (labels+roles only), never entries unless withEntries (full backup).
export async function exportConfig({ withEntries = false } = {}) {
  need(can('dev'));
  const config = await A.get('config', 'main'), out = { v: 1, app: 'aaba', appVersion: APP_VERSION, exportedAt: new Date().toISOString(), config, titles: config.titles || [] };
  for (const c of COLS.filter(c => c !== 'entries' || withEntries)) out[c] = byId(await A.list(c));
  out.invites = (await A.list('invites')).map(({ label, role, active, groupId, studentId, titleId }) => ({ label, role, active, groupId, studentId, titleId }));
  const per = {};
  Object.values(out.students).forEach(s => { per[s.groupId] = (per[s.groupId] || 0) + 1; });
  out.memberCounts = per;
  out.counts = { groups: Object.keys(out.groups).length, students: Object.keys(out.students).length, rules: Object.keys(out.rules).length, invites: out.invites.length };
  return out;
}
// mode 'replace' clears every collection present in obj first (and replaces config). Invites/members are never imported.
export async function importConfig(obj, mode = 'merge') {
  need(can('dev'));
  need(obj && obj.v === 1, 'File không đúng định dạng aaba');
  delete obj.duty; // tolerated: old exports may still carry a 'duty' key; silently ignored
  for (const c of COLS.filter(k => obj[k] && typeof obj[k] === 'object')) {
    if (mode === 'replace') for (const d of await A.list(c)) await A.remove(c, d.id);
    for (const [id, d] of Object.entries(obj[c])) await A.set(c, id, d, { raw: true });
  }
  if (obj.config) await A.set('config', 'main', { ...obj.config, ...((obj.config.titles || obj.titles) && { titles: obj.config.titles || obj.titles }) }, { merge: mode !== 'replace' });
  const cfg = await A.get('config', 'main');
  if (cfg?.currentCycleId && !(await A.get('cycles', cfg.currentCycleId)))
    await A.set('cycles', cfg.currentCycleId, { n: parseInt(cfg.currentCycleId.slice(1)) || 1, start: Date.now(), end: null, closed: false, summary: [] });
}
export const signOut = async () => { await A.signOut(); setSession(null); };
