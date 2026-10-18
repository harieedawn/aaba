// Firebase adapter: Firestore (persistentLocalCache, multi-tab) + anonymous Auth. Same primitives as adapter.local.js:
// init, watch, get, list, set, remove, uid, remember, signOut. Domain logic (invites, closeCycle, ...) lives in store.js.
// SDK is loaded by dynamic import() ONLY when BACKEND==='firebase'. Pinned exact version below.
import { FIREBASE_CONFIG } from '../config.js';
import { CATEGORIES, TITLES } from './seed.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
let F, AU, auth, db;
const subs = new Set();
let selfWatch = null, myRole = null;

// ---- helpers ----
const W = p => p.catch(e => { throw e && e.code === 'permission-denied' ? new Error('Không có quyền thực hiện thao tác này') : e; });
// Offline: the write is queued by the persistent cache and syncs later, so do not block the UI waiting for the server.
const ack = p => navigator.onLine ? W(p) : (p.catch(() => {}), Promise.resolve());
const ref = (col, id) => col === 'config' ? F.doc(db, 'config', 'main') : F.doc(db, col, id);
const conv = d => { for (const k in d) { const v = d[k]; if (v && typeof v.toMillis === 'function') d[k] = v.toMillis(); } return d; };
const docOf = s => conv({ id: s.id, ...s.data({ serverTimestamps: 'estimate' }) });
const VIRTUAL_CONFIG = () => ({ id: 'main', _virtual: true, className: '', school: '', cycleWeeks: 4, currentCycleId: null, categories: CATEGORIES, titles: TITLES });
// invites/members carry join secrets: non-dev roles may only query the low roles (matches firestore.rules).
const base = col => { const c = F.collection(db, col); return (col === 'invites' || col === 'members') && myRole !== 'dev' ? F.query(c, F.where('role', 'in', ['recorder', 'teacher', 'student'])) : c; };
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
  if (m) { myRole = m.role; watchSelf(uid); }
  return { session: m ? { uid, ...m } : null };
}

// Revoked (member doc deleted) -> back to the join screen.
function watchSelf(uid) {
  if (selfWatch) return;
  selfWatch = F.onSnapshot(F.doc(db, 'members', uid),
    s => { if (!s.exists() && !s.metadata.fromCache) kick(); },
    e => { if (e.code === 'permission-denied') kick(); });
}

// watch(col, cb, {cycle}) : 'config' delivers one object; entries filtered by cycle ('current' | id | null=all).
export function watch(col, cb, opts = {}) {
  const sub = { dead: false, stops: [] };
  const fail = e => { console.warn('aaba watch', col, e.code || e); sub.stops.splice(0).forEach(f => f()); sub.dead = e.code === 'permission-denied'; };
  const arr = s => cb(s.docs.map(docOf));
  sub.start = () => {
    sub.dead = false;
    if (col === 'config') sub.stops.push(F.onSnapshot(ref('config'), s => cb(s.exists() ? docOf(s) : VIRTUAL_CONFIG()), fail));
    else if (col === 'entries' && opts.cycle === 'current') {
      let cur, un = null;
      sub.stops.push(() => un && un());
      sub.stops.push(F.onSnapshot(ref('config'), s => {
        const id = s.exists() ? s.data().currentCycleId || null : null;
        if (un && id === cur) return;
        cur = id; if (un) un(); un = null;
        if (!id) return cb([]);
        un = F.onSnapshot(F.query(F.collection(db, 'entries'), F.where('cycleId', '==', id)), arr, fail);
      }, fail));
    } else {
      const c = base(col);
      const q = col === 'entries' && opts.cycle ? F.query(c, F.where('cycleId', '==', opts.cycle)) : c;
      sub.stops.push(F.onSnapshot(q, arr, fail));
    }
  };
  sub.start(); subs.add(sub);
  return () => { sub.stops.splice(0).forEach(f => f()); subs.delete(sub); };
}

export async function get(col, id) {
  const s = await W(F.getDoc(ref(col, id)));
  if (!s.exists()) return null;
  const { id: _id, ...d } = docOf(s);
  return d;
}
export async function list(col) { return (await W(F.getDocs(base(col)))).docs.map(docOf); }
// entries: `at` is the server time (rules require at==request.time) unless raw (dev import keeps original values).
export async function set(col, id, data, { merge = false, raw = false } = {}) {
  const d = { ...data };
  if (col === 'entries' && !merge && !raw) d.at = F.serverTimestamp();
  await ack(merge ? F.setDoc(ref(col, id), d, { merge: true }) : F.setDoc(ref(col, id), d));
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
