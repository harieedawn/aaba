# NOTES-SPEC (stage 1 -> stage 2)
Vanilla ES modules, no build, Vietnamese UI (label "Notes" is English). Route `#/notes`, nav item after Tổng kết, icon `note`.
## Files
css/notes.css · js/notes/{dates,layout,subjects,data,board,sheet,index}.js · js/data/notestore.js (pass-through; store.js re-exports noteWatch/noteRange/noteSet/noteRemove) · notes.selftest.mjs (`node`, dates+layout+AA contrast).
Edited: app.js (NAV + `ghi-li` class), router.js, session.js, icons.js, adapter.firebase/local, store.js, seed.js, index.html, firestore.rules.
## Data model (ids 'n_'+base36 time+4 chars; date = Vietnam 'YYYY-MM-DD')
`notes`: date, subject, title(1-80), body(0-1000), color '#RRGGBB', by, byName, at(ms), upd(ms). `pnotes`: same minus by/byName, plus owner(uid), slot(int>=0).
Subjects: toan van anh ly hoa sinh su gdqp tin khac (default colour hex = SUBJECTS[i].hex = light --sub-<id>).
Queries (index-free): notes = one `date` range; pnotes = owner == uid. Adapter: `watch('notes',cb,{range:[a,b]})`, `watch('pnotes',cb,{owner})`, `notesBetween(a,b)`.
Permissions: can('postNote') teacher/admin/dev; can('myNote') any member (guest no). Edit/delete class note: creator or admin/dev (`canEditNote(note)`). `by` immutable (rules).
## Contracts
- dates.js: todayKey() keyToDate(key) addDays(key,n) diffDays(a,b)=b-a fmtDay(key)->"T4 28/10" relText(diff); extra isKey(key).
- data.js: watchClass(cb) (one shared listener today-30d..+90d, cb gets the WHOLE cache incl. loaded ranges), watchMine(cb), loadClassRange(from,to)->Promise<note[]> (merges into cache, re-notifies watchers), saveClassNote(note), deleteClassNote(id), saveMine(note), deleteMine(id), newNoteId(); extra inLive(key), canEditNote(note). save* strip `id`; saveMine sets owner=uid and slot=count if slot null. Outside the live window saves/deletes update the cache by hand.
- layout.js: layoutSlots({classNotes,mine,cols,minSlots})->[{slot,note|null,kind:'class'|'mine'|'empty'}] (class by `at` in first slots, mine at slot or next free, whole rows, >=minSlots, >=2 free); resetMine({classNotes,mine})->[{id,slot}] by `at`, free slots after class notes. Both pure; give them ONE day's notes.
- board.js: createBoard({onOpen}) -> {el, update({dateKey,classNotes,mine}), destroy()}; update takes any notes and filters n.date===dateKey itself. Columns 2/3/4 by board width (<500/<800), ResizeObserver. Also exports noteCard(note,kind,{onOpen}), tiltOf(id).
- sheet.js: openNoteSheet({mode:'class'|'mine', note?, dateKey}) / openNoteDetail(note) (mine = note.owner set). Both return openSheet handle.
- subjects.js: SUBJECTS[{id,name,hex}], subjectOf(id) (fallback khac), noteStyle(note,kind)->{cls,style}, textOn(hex), contrast(a,b), HEX.
## index.js (stage 2 replaces ONLY the header: h1 + `todayBtn` + `.nb-nav` prev/label/next + add actions)
State: key, cls, mine; `go(key)` repaints and calls loadClassRange when !inLive(key); `paint()` updates board + empty state; `openAdd()` chooser; phone "+" is `.nb-fab` appended to document.body (removed in destroy; hidden by html.kb / html.lock, shown <600px).
Stage 2 notes: for a calendar load months with loadClassRange(first,last) (one-off, merged); banner: diffDays(todayKey(), key) <0 past, >0 future. Drag-and-drop: move only personal notes (saveMine({...n, slot}), layout resolves collisions); class notes never move. Avoid extra listeners.
## CSS
Variables (light+dark in notes.css): --sub-<id>, --sub-<id>-fg, --nb-frame, --nb-board, --nb-spot, --nb-ink; per-note --n-bg, --n-fg (class), --n-hue (mine), --tilt. Classes: nbs-<id>/nbs-custom (class colour), nb-mine (tint), nb-note nb-pin nb-tape nb-sub nb-ttl nb-body nb-priv nb-board nb-surface nb-grid nb-cell nb-spot nb-nav nb-date nb-today nb-actions nb-fab nb-empty nb-skel nb-chips nb-sws nb-sw nb-prev nb-dhead nb-dtitle nb-dbody. Prefix `nb-` avoids clashes (`.note` already exists in components.css).
## Original app helpers Notes relies on
ui/dom.js h(tag,props,...kids) put(el,...kids) (style object accepts '--x'); ui/icons.js icon(name,size); ui/components.js emptyState({icon,title,text,action:{label,onClick|href}}), skeletonCards(n); ui/sheet.js openSheet({title,content,onClose})->{close,el}; ui/form.js field textInput(value,props) textArea(value,props) errBox confirmSheet({title,text,label,onConfirm}); ui/act.js act(fn,{btn,ok}) errMsg; ui/toast.js toast; session.js can getSession role onSession; weeks.js (VN UTC+7: isoDate noonOf dowOf WD_SHORT dayMonth DAY).
Classes: .view .hdr .hdr-main .btn .btn-ghost .btn-accent .icon-btn .pressable .fchip[aria-pressed] .field .field-l .form .form-err .kv .stack .row-btns .add-submit .empty .skeleton .card .muted. Tokens: --bg --surface --surface-2 --border --text --text-2 --ink --on-ink --accent --on-accent --r-s/m/l --sp-1..12 --fs-12..60 --shadow --d2 --ease-out. html.kb = keyboard open, html.lock = sheet open.
## Know before stage 2
Phone bar has 6 items for recorders+ (`li.ghi-li` fixed 64px cell, labels 11px). Local demo: `?role=teacher|admin|recorder|student|guest`. Unit-tested only (node); not browser/emulator-tested. firestore.rules must be republished.
