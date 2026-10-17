/* store.js: the ONLY data access point for views. Adapters: adapter.local.js | adapter.firebase.js (P5).
 * Methods (15):
 *  init()                         -> loads adapter, sets session, returns it
 *  on(col, cb, opts)              -> unsubscribe. cols: config (object), groups, students, rules, entries,
 *                                    cycles, duty, members, invites (arrays of {id,...}). entries = current vòng
 *                                    unless opts.all or opts.cycleId.
 *  addEntry({groupId,studentId,ruleId,qty,note}) -> entry   (snapshots rule, sets status per role)
 *  voidEntry(id, reason)          approveEntry(id)
 *  saveDoc(col, id|null, data)    -> id (merge)        deleteDoc(col, id)
 *  closeCycle()                   -> stores summary, opens next vòng
 *  createInvite(inv) -> code      revokeInvite(code)   joinWithCode(code)   claimStudent(studentId)
 *  exportConfig({withEntries})    importConfig(obj, 'merge'|'replace')      signOut()
 */
import { BACKEND } from '../config.js';
import { getSession, setSession, can, role } from '../session.js';
import { cycleSummary } from '../scoring.js';
let A;
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
const rand = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALPHA[b % ALPHA.length]).join('');
const need = (ok, msg = 'Không có quyền') => { if (!ok) throw new Error(msg); };

export async function init() {
  A = BACKEND === 'firebase' ? await import('./adapter.firebase.js') : await import('./adapter.local.js');
  const { session } = await A.init();
  setSession(session);
  return session;
}
export function on(col, cb, opts = {}) {
  const o = { ...opts };
  if (col === 'entries') o.cycle = opts.cycleId || (opts.all ? null : 'current');
  return A.watch(col, cb, o);
}
export async function addEntry(e) {
  const s = getSession();
  need(can('record', { groupId: e.groupId }));
  const [rule, cfg] = await Promise.all([A.get('rules', e.ruleId), A.get('config', 'main')]);
  need(rule && rule.active !== false, 'Mục không tồn tại');
  if (e.studentId && role() === 'recorder') {
    const st = await A.get('students', e.studentId);
    need(st && st.groupId === s.groupId);
  }
  const studentId = rule.scope === 'group' ? null : e.studentId || null;
  need(rule.scope !== 'student' || studentId, 'Cần chọn học sinh');
  const qty = rule.perUnit ? Math.max(1, e.qty | 0) : 1, points = rule.points * qty;
  const doc = {
    cycleId: cfg.currentCycleId, groupId: e.groupId, studentId, ruleId: e.ruleId,
    ruleName: rule.name, cat: rule.cat, unit: rule.points, qty, points, note: e.note || '',
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
  await A.set('entries', id, { status: 'void', voidReason: reason.trim(), voidBy: getSession().uid }, { merge: true });
}
export async function approveEntry(id) {
  const entry = await A.get('entries', id);
  need(entry && entry.status === 'pending' && can('approve', { entry }));
  await A.set('entries', id, { status: 'ok' }, { merge: true });
}
export async function saveDoc(col, id, data) {
  need(can('edit'));
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
  need(can('createInvite'));
  await A.set('invites', code, { active: false }, { merge: true });
  for (const m of await A.list('members')) if (m.inviteId === code) await A.remove('members', m.id);
}
export async function joinWithCode(code) {
  const inv = await A.get('invites', String(code).trim());
  need(inv && inv.active, 'Mã không hợp lệ hoặc đã bị thu hồi');
  const uid = await A.uid();
  const m = { role: inv.role, inviteId: String(code).trim(), studentId: inv.studentId, groupId: inv.groupId,
    titleId: inv.titleId, name: inv.label, at: Date.now() };
  await A.set('members', uid, m);
  A.remember?.(uid);
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
export async function exportConfig({ withEntries = false } = {}) {
  need(can('dev'));
  const cols = ['groups', 'students', 'rules', 'cycles', 'duty', ...(withEntries ? ['entries'] : [])], out = { v: 1, config: await A.get('config', 'main') };
  for (const c of cols) out[c] = Object.fromEntries((await A.list(c)).map(({ id, ...d }) => [id, d]));
  return out;
}
export async function importConfig(obj, mode = 'merge') {
  need(can('dev'));
  for (const c of Object.keys(obj).filter(k => k !== 'v' && k !== 'config')) {
    if (mode === 'replace') for (const d of await A.list(c)) await A.remove(c, d.id);
    for (const [id, d] of Object.entries(obj[c])) await A.set(c, id, d);
  }
  if (obj.config) await A.set('config', 'main', obj.config, { merge: mode !== 'replace' });
}
export const signOut = async () => { await A.signOut(); setSession(null); };
