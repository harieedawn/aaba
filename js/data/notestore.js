// Notes collections (notes = class, pnotes = personal): thin pass-through to the adapter. Permissions live in js/notes/data.js + firestore.rules.
// watch opts: notes {range:[fromKey,toKey]} (single `date` range) | pnotes {owner:uid} (single equality). Never the whole collection.
let A;
export const bind = a => { A = a; };
export const noteWatch = (col, cb, opts) => A.watch(col, cb, opts);
export const noteRange = (fromKey, toKey) => A.notesBetween(fromKey, toKey);
export const noteSet = (col, id, d) => A.set(col, id, d);
export const noteRemove = (col, id) => A.remove(col, id);
