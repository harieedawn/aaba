// Firebase adapter: Firestore (persistentLocalCache, multi-tab) + anonymous Auth. Same primitives as adapter.local.js:
// init, watch, get, list, entriesBetween, set, batch, remove, stats, uid, remember, signOut. Domain logic (invites, closeCycle, ...) lives in store.js.
// SDK is loaded by dynamic import() ONLY when BACKEND==='firebase'. Pinned exact version below.
import { FIREBASE_CONFIG } from '../config.js';
import { CATEGORIES, TITLES } from './seed.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
let F, AU, auth, db;
const subs = new Set();
let selfWatch = null, myRole = null;

// ONE shared onSnapshot on config/main for every watcher; stops with the last watcher.
const CS = new Set(); let csUn = null, csSnap = null;
function cfgWatch(cb, fail) {
  const w = { cb, fail }; CS.add(w);
  if (!csUn) csUn = F.onSnapshot(ref('config'), s => { csSnap = s; [...CS].forEach(x => x.cb(s)); }, err => { csUn = null; csSnap = null; [...CS].forEach(x => x.fail(err)); });
  else if (csSnap) queueMicrotask(() => CS.has(w) && w.cb(csSnap));
  return () => { CS.delete(w); if (!CS.size && csUn) { csUn(); csUn = null; csSnap = null; } };
}
// ---- helpers ----
const W = p => p.catch(e => { throw e && e.code === 'permission-denied' ? Object.assign(new Error('Bạn không có quyền làm việc này'), { code: e.code }) : e; });
// Offline: the write is queued by the persistent cache and syncs later, so do not block the UI waiting for the server.
const ack = p => navigator.onLine ? W(p) : (p.catch(() => {}), Promise.resolve());
const ref = (col, id) => col === 'config' ? F.doc(db, 'config', 'main') : F.doc(db, col, id);
const conv = d => { for (const k in d) { const v = d[k]; if (v && typeof v.toMillis === 'function') d[k] = v.toMillis(); } return d; };
const docOf = s => conv({ id: s.id, ...s.data({ serverTimestamps: 'estimate' }) });
const VIRTUAL_CONFIG = () => ({ id: 'main', _virtual: true, className: '', school: '', cycleWeeks: 4, currentCycleId: null, categories: CATEGORIES, titles: TITLES });
// invites/members carry join secrets: non-dev roles may only query the low roles (matches firestore.rules).
const base = col => { const c = F.collection(db, col); return (col === 'invites' || col === 'members') && myRole !== 'dev' ? F.query(c, F.where('role', 'in', ['recorder', 'teacher', 'student'])) : c; };
// Docs delivered by the server (billed reads): snapshot changes not served from cache + getDocs/getDoc results. See store.stats().
let docsIn = 0;
export const stats = () => ({ docs: docsIn });
const toTs = ms => F.Timestamp.fromMillis(ms);
// Entry write payload: normal = server time; {at: ms} = admin back-dated (Timestamp + addedAt server time); raw = dev import (numbers -> Timestamp).
function prep(col, data, { merge = false, raw = false, at = null } = {}) {
  const d = { ...data };
  if (col !== 'entries' || merge) return d;
  if (raw) { if (typeof d.at === 'number') d.at = toTs(d.at); if (typeof d.addedAt === 'number') d.addedAt = toTs(d.addedAt); }
  else if (typeof at === 'number') { d.at = toTs(at); d.addedAt = F.serverTimestamp(); }
  else d.at = F.serverTimestamp();
  return d;
}
const kick = () => { location.replace(location.pathname + '#/join'); location.reload(); };

export async function init() {
  if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) throw new Error('Chưa điền FIREBASE_CONFIG trong js/config.js (xem SETUP.md).');
  const [AP, au, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
  AU = au; F = fs;
  const app = AP.initializeApp(FIREBASE_CONFIG);
  try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch { db = F.getFirestore(app); }
  auth = AU.getAuth(app);
  const user = await new Promise(res => { const off = AU.onAuthStateChanged(auth, u => { off(); res(u); }); });
  if (!user) await AU.signInAnonymously(auth);
  const uid = auth.currentUser.uid;
  let m = null;
  try { const s = await F.getDoc(F.doc(db, 'members', uid)); m = s.exists() ? conv(s.data()) : null; }
  catch (e) { if (e.code !== 'permission-denied') throw e; }
  if (m) { myRole = m.role; watchSelf(uid); return { session: { uid, ...m } }; }
  // No member doc: anonymous guest, only while config/main.openView === true (rules enforce the same).
  try { const c = await F.getDoc(F.doc(db, 'config', 'main')); if (c.exists() && c.data().openView === true) return { session: { uid, role: 'guest', name: 'Khách', studentId: null, groupId: null, titleId: null } }; }
  catch (e) { if (e.code !== 'permission-denied') throw e; }
  return { session: null };
}

// Revoked (member doc deleted) -> back to the join screen.
function watchSelf(uid) {
  if (selfWatch) return;
  selfWatch = F.onSnapshot(F.doc(db, 'members', uid),
    s => { if (!s.exists() && !s.metadata.fromCache) kick(); },
    e => { if (e.code === 'permission-denied') kick(); });
}

// watch(col, cb, opts) : 'config' delivers one object; entries need opts.range [a,b) | status | studentId (never all).
export function watch(col, cb, opts = {}) {
  const sub = { dead: false, stops: [] };
  const fail = e => { console.warn('aaba watch', col, e.code || e); sub.stops.splice(0).forEach(f => f()); sub.dead = e.code === 'permission-denied'; if (sub.dead) opts.onDenied?.(); };
  const arr = s => { if (!s.metadata.fromCache) docsIn += s.docChanges().length; cb(s.docs.map(docOf)); };
  sub.start = () => {
    sub.dead = false;
    if (col === 'config') sub.stops.push(cfgWatch(s => cb(s.exists() ? docOf(s) : VIRTUAL_CONFIG()), fail));
    else {
      const c = base(col);
      // ONE field per query (no composite index): `at` range | status | studentId
      let q = c;
      if (col === 'entries') {
        if (!(opts.range || opts.status || opts.studentId)) throw new Error('entries: a query is required (never the whole collection)');
        if (opts.range) q = F.query(c, F.where('at', '>=', toTs(opts.range[0])), F.where('at', '<', toTs(opts.range[1])));
        else if (opts.status) q = F.query(c, F.where('status', '==', opts.status));
        else if (opts.studentId) q = F.query(c, F.where('studentId', '==', opts.studentId));
      }
      sub.stops.push(F.onSnapshot(q, arr, fail));
    }
  };
  sub.start(); subs.add(sub);
  return () => { sub.stops.splice(0).forEach(f => f()); subs.delete(sub); };
}

export async function get(col, id) {
  const s = await W(F.getDoc(ref(col, id)));
  if (!s.exists()) return null;
  docsIn++;
  const { id: _id, ...d } = docOf(s);
  return d;
}
export async function list(col) { const s = await W(F.getDocs(base(col))); docsIn += s.size; return s.docs.map(docOf); }
// One-time fetch of entries with `at` in [a, b) (single-field range). Returns {docs, truncated}; limit+1 is read to detect truncation.
export async function entriesBetween(a, b, limit = 1000) {
  const s = await W(F.getDocs(F.query(F.collection(db, 'entries'), F.where('at', '>=', toTs(a)), F.where('at', '<', toTs(b)), F.limit(limit + 1))));
  docsIn += s.size;
  const docs = s.docs.map(docOf);
  return { docs: docs.slice(0, limit), truncated: docs.length > limit };
}
// entries: `at` is the server time (rules require at==request.time) unless raw (dev import keeps original values).
export async function set(col, id, data, o = {}) {
  const d = prep(col, data, o);
  await ack(o.merge ? F.setDoc(ref(col, id), d, { merge: true }) : F.setDoc(ref(col, id), d));
}
// batch(ops): atomic writeBatch of [{col, id, data, merge?, at?, raw?}] (<=500). Same offline ack behaviour as set.
export async function batch(ops) {
  const b = F.writeBatch(db);
  for (const { col, id, data, ...o } of ops) { const d = prep(col, data, o); o.merge ? b.set(ref(col, id), d, { merge: true }) : b.set(ref(col, id), d); }
  await ack(b.commit());
}
export async function remove(col, id) { await ack(F.deleteDoc(ref(col, id))); }
export const uid = async () => auth.currentUser.uid;
// Called after the member doc is written: start watching it and revive listeners that failed before joining.
export function remember(u, r) { if (r) myRole = r; watchSelf(u || auth.currentUser.uid); subs.forEach(s => s.dead && s.start()); }
export async function signOut() {
  try { await AU.signOut(auth); } catch {}
  location.replace(location.pathname + '#/join');
  location.reload();
}
