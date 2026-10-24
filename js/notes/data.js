// Notes data layer over store (notes = class, pnotes = personal). One live listener per kind; one-off ranges merge into the same cache.
import * as store from '../data/store.js';
import { getSession, can, role } from '../session.js';
import { todayKey, addDays } from './dates.js';

const CLS = ['date', 'subject', 'title', 'body', 'color', 'by', 'byName', 'at', 'upd'];
const MINE = ['date', 'subject', 'title', 'body', 'color', 'owner', 'slot', 'at', 'upd'];
const pick = (n, keys) => Object.fromEntries(keys.map(k => [k, n[k]]));
const need = (ok, msg = 'Bạn không có quyền làm việc này') => { if (!ok) throw new Error(msg); };
const rand = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => '0123456789abcdefghijklmnopqrstuvwxyz'[b % 36]).join('');
export const newNoteId = () => 'n_' + Date.now().toString(36) + rand(4);

export const canEditNote = n => {
  const uid = getSession()?.uid;
  if (n.owner) return can('myNote') && n.owner === uid;
  return can('postNote') && (role() === 'admin' || role() === 'dev' || n.by === uid);
};

// ---- class notes ----
const cache = new Map(), csubs = new Set();
let win = null, cstop = null, cready = false;
const all = () => [...cache.values()];
const emitClass = () => { const a = all(); [...csubs].forEach(f => f(a)); };
export const inLive = key => !!win && key >= win[0] && key <= win[1];

export function watchClass(cb) {
  csubs.add(cb);
  if (!cstop) {
    const w = win = [addDays(todayKey(), -30), addDays(todayKey(), 90)];
    cstop = store.noteWatch('notes', docs => {
      for (const [id, n] of cache) if (n.date >= w[0] && n.date <= w[1]) cache.delete(id);
      docs.forEach(n => cache.set(n.id, n));
      cready = true; emitClass();
    }, { range: w, onDenied: () => { cready = true; emitClass(); } });
  } else if (cready) queueMicrotask(() => csubs.has(cb) && cb(all()));
  return () => { csubs.delete(cb); if (!csubs.size && cstop) { cstop(); cstop = null; cready = false; } };
}
export async function loadClassRange(fromKey, toKey) {
  const docs = await store.noteRange(fromKey, toKey);
  for (const [id, n] of cache) if (n.date >= fromKey && n.date <= toKey && !inLive(n.date)) cache.delete(id);
  docs.forEach(n => cache.set(n.id, n));
  emitClass();
  return docs;
}
export async function saveClassNote(note) {
  need(can('postNote'));
  const old = cache.get(note.id);
  need(!old || canEditNote(old));
  const d = pick(note, CLS);
  await store.noteSet('notes', note.id, d);
  if (!inLive(d.date) || (old && !inLive(old.date))) { cache.set(note.id, { id: note.id, ...d }); emitClass(); } // outside the live window: no listener will tell us
}
export async function deleteClassNote(id) {
  const old = cache.get(id);
  need(can('postNote') && (!old || canEditNote(old)));
  await store.noteRemove('notes', id);
  if (old && !inLive(old.date)) { cache.delete(id); emitClass(); }
}

// ---- personal notes ----
let mine = [], mstop = null, mready = false;
const msubs = new Set();
const emitMine = () => [...msubs].forEach(f => f(mine.slice()));
export function watchMine(cb) {
  if (!can('myNote') || !getSession()?.uid) { queueMicrotask(() => cb([])); return () => {}; }
  msubs.add(cb);
  if (!mstop) mstop = store.noteWatch('pnotes', docs => { mine = docs; mready = true; emitMine(); }, { owner: getSession().uid, onDenied: () => { mready = true; emitMine(); } });
  else if (mready) queueMicrotask(() => msubs.has(cb) && cb(mine.slice()));
  return () => { msubs.delete(cb); if (!msubs.size && mstop) { mstop(); mstop = null; mready = false; } };
}
export async function saveMine(note) {
  need(can('myNote'));
  const d = pick({ ...note, owner: getSession().uid }, MINE);
  if (d.slot == null) d.slot = all().filter(n => n.date === d.date).length + mine.filter(n => n.date === d.date && n.id !== note.id).length; // layout moves it on collision
  await store.noteSet('pnotes', note.id, d);
}
export async function deleteMine(id) {
  need(can('myNote'));
  await store.noteRemove('pnotes', id);
}
