// Notes board: framed whiteboard with a fixed slot grid. createBoard({onOpen, onMove?(moves:[{note,slot}])}) -> {el, update({dateKey, classNotes, mine}), destroy()}.
// Only personal notes (kind 'mine') drag, and only when onMove is given: mouse 4px, touch/pen 250ms long-press, keyboard Enter/Space + arrows.
import { h, put } from '../ui/dom.js';
import { layoutSlots } from './layout.js';
import { subjectOf, noteStyle } from './subjects.js';

const hash = s => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x >>> 0; };
export const tiltOf = id => (hash(String(id)) % 301) / 100 - 1.5; // deterministic, -1.5 .. +1.5 deg
const colsFor = w => (w < 500 ? 2 : w < 800 ? 3 : 4);

// One note (also used by the composer preview without onOpen). kind: 'class' | 'mine'
export function noteCard(note, kind, { onOpen } = {}) {
  const s = subjectOf(note.subject), st = noteStyle(note, kind), tape = (hash(String(note.id)) >>> 9) & 1;
  return h(onOpen ? 'button' : 'div', {
    class: `nb-note ${st.cls} ${tape ? 'nb-tape' : ''}`, type: onOpen ? 'button' : null,
    style: { ...st.style, '--tilt': tiltOf(note.id).toFixed(2) + 'deg' },
    'aria-label': onOpen ? `${s.name}: ${note.title}` : null, onclick: onOpen ? () => onOpen(note) : null,
  },
    h('span', { class: 'nb-pin', 'aria-hidden': 'true' }),
    h('span', { class: 'nb-sub' }, s.name, kind === 'mine' && h('span', { class: 'nb-priv' }, 'riêng tư')),
    h('span', { class: 'nb-ttl' }, note.title || ''),
    note.body && h('span', { class: 'nb-body' }, note.body));
}

export function createBoard({ onOpen, onMove } = {}) {
  let st = { dateKey: null, classNotes: [], mine: [] }, cols = 2, slots = [], ds = null, dirty = false, refocus = null, noClick = false;
  const reduce = () => window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const grid = h('div', { class: 'nb-grid' }), live = h('div', { class: 'sr', 'aria-live': 'assertive' });
  const hint = h('p', { class: 'sr', id: 'nb-dnd-hint' }, 'Note của bạn có thể sắp lại: nhấn Enter hoặc Space để nhấc, phím mũi tên để chọn ô, Enter để thả, Esc để huỷ. Thả lại đúng ô cũ sẽ mở note.');
  const el = h('section', { class: 'nb-board', 'aria-label': 'Bảng note' }, h('div', { class: 'nb-surface' }, grid), live, hint);
  const say = t => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); };
  function paint() {
    if (ds) { dirty = true; return; }
    dirty = false;
    const ae = document.activeElement, fid = ae && grid.contains(ae) ? ae.dataset.id : null;
    const d = st.dateKey;
    slots = layoutSlots({ classNotes: st.classNotes.filter(n => n.date === d), mine: st.mine.filter(n => n.date === d), cols, minSlots: 6 });
    grid.style.setProperty('--cols', cols);
    put(grid, slots.map(s => {
      const drag = !!onMove && s.kind === 'mine', c = s.note ? noteCard(s.note, s.kind, { onOpen }) : h('span', { class: 'nb-spot', 'aria-hidden': 'true' });
      if (drag) { c.classList.add('nb-drag'); c.dataset.id = s.note.id; c.dataset.slot = s.slot; c.setAttribute('aria-describedby', 'nb-dnd-hint'); }
      return h('div', { class: 'nb-cell', 'data-slot': s.slot }, c);
    }));
    const rf = refocus || fid; refocus = null;
    if (rf) grid.querySelector(`[data-id="${rf}"]`)?.focus({ preventScroll: true });
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(es => {
    const w = es[0].contentRect.width, c = w ? colsFor(w) : cols;
    if (c !== cols) { cols = c; paint(); }
  }) : null;
  ro?.observe(el);

  // ---- drag & drop ----
  const sy = () => window.scrollY || document.documentElement.scrollTop || 0, sx = () => window.scrollX || 0;
  const centres = () => [...grid.children].map(c => { const r = c.getBoundingClientRect(); return { x: r.left + sx() + r.width / 2, y: r.top + sy() + r.height / 2 }; });
  function begin(card, extra) {
    const src = +card.dataset.slot, cs = centres();
    ds = { card, id: card.dataset.id, src, target: src, cs, c0: cs[src], dx: 0, dy: 0, ...extra };
    card.classList.add('nb-lift'); grid.classList.add('nb-dragging');
    show();
  }
  function show(snap) {
    const { card, dx, dy } = ds;
    card.classList.toggle('nb-snap', !!snap);
    card.style.setProperty('--dx', dx + 'px'); card.style.setProperty('--dy', dy + 'px');
    [...grid.children].forEach((c, i) => { c.dataset.target = String(i === ds.target && i !== ds.src); c.dataset.bad = String(i === ds.target && slots[i]?.kind === 'class'); });
  }
  function nearest() {
    const x = ds.c0.x + ds.dx, y = ds.c0.y + ds.dy;
    let b = ds.src, bd = Infinity;
    ds.cs.forEach((c, i) => { const d = (c.x - x) ** 2 + (c.y - y) ** 2; if (d < bd) { bd = d; b = i; } });
    return b;
  }
  function plan() {
    const a = slots[ds.src], t = slots[ds.target];
    if (!t || ds.target === ds.src) return { ok: true, moves: [] };
    if (t.kind === 'empty') return { ok: true, moves: [{ note: a.note, slot: ds.target }] };
    if (t.kind === 'mine') return { ok: true, moves: [{ note: a.note, slot: ds.target }, { note: t.note, slot: ds.src }] };
    return { ok: false, moves: [] };
  }
  function finish(drop) {
    if (!ds || ds.settling) return;
    const s = ds, p = drop ? plan() : { ok: true, moves: [] };
    s.settling = true; stopLoop(); clearTimeout(s.timer);
    const done = () => {
      s.card.classList.remove('nb-lift', 'nb-snap', 'nb-shake'); s.card.style.removeProperty('--dx'); s.card.style.removeProperty('--dy');
      grid.classList.remove('nb-dragging'); [...grid.children].forEach(c => { delete c.dataset.target; delete c.dataset.bad; });
      ds = null;
      if (p.moves.length) { refocus = s.kb && !s.noFocus ? s.id : null; onMove(p.moves); }
      else if (s.kb && !s.noFocus) refocus = s.id;
      if (!p.moves.length && (dirty || refocus)) paint();
    };
    if (!p.ok) { s.target = s.src; s.dx = 0; s.dy = 0; show(true); say('Ô này đã có note của lớp'); s.card.classList.add('nb-shake'); setTimeout(done, reduce() ? 0 : 420); return; }
    const t = s.cs[s.target]; s.dx = t.x - s.c0.x; s.dy = t.y - s.c0.y; show(true);
    if (p.moves.length) say(p.moves.length > 1 ? 'Đã đổi chỗ hai note' : 'Đã chuyển note');
    setTimeout(done, reduce() ? 0 : 170);
  }
  // auto-scroll near the viewport edges while a pointer drag is active
  let raf = 0;
  const stopLoop = () => { cancelAnimationFrame(raf); raf = 0; };
  function loop() {
    if (!ds || ds.settling || ds.kb) return stopLoop();
    const H = window.innerHeight, top = 90, bot = H - 120, y = ds.py;
    const v = y < top ? -Math.ceil((top - y) / 6) : y > bot ? Math.ceil((y - bot) / 6) : 0;
    if (v) { window.scrollBy(0, Math.max(-18, Math.min(18, v))); track(); }
    raf = requestAnimationFrame(loop);
  }
  function track() { ds.dx = ds.px - ds.x0; ds.dy = ds.py + sy() - (ds.y0 + ds.sy0); ds.target = nearest(); show(); }
  const move = e => {
    if (!ds || e.pointerId !== ds.pid) return;
    ds.px = e.clientX; ds.py = e.clientY;
    if (!ds.lifted) {
      const d = Math.hypot(ds.px - ds.x0, ds.py - ds.y0);
      if (ds.touch ? d > 8 : d < 4) { if (ds.touch) cancelPress(); return; }
      if (ds.touch) return;
      lift();
    }
    e.preventDefault(); track();
  };
  function lift() {
    clearTimeout(ds.timer); ds.lifted = true; noClick = true;
    const s = ds; ds = null; begin(s.card, s); ds.lifted = true;
    if (ds.touch) navigator.vibrate?.(12);
    say('Đã nhấc note. Kéo tới ô trống để chuyển hoặc ô có note của bạn để đổi chỗ.');
    raf = requestAnimationFrame(loop);
  }
  function cancelPress() { if (ds && !ds.lifted) { clearTimeout(ds.timer); detach(); ds = null; } }
  const up = e => { if (!ds || e.pointerId !== ds.pid) return; const was = ds.lifted; detach(); if (was) finish(e.type === 'pointerup'); else cancelPress(); setTimeout(() => { noClick = false; }, 0); };
  function detach() { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); }
  grid.addEventListener('pointerdown', e => {
    const card = e.target.closest?.('.nb-drag');
    if (!card || ds || (e.pointerType === 'mouse' && e.button !== 0) || !e.isPrimary) return;
    const touch = e.pointerType !== 'mouse';
    ds = { card, id: card.dataset.id, pid: e.pointerId, touch, x0: e.clientX, y0: e.clientY, px: e.clientX, py: e.clientY, sy0: sy(), lifted: false, src: +card.dataset.slot };
    if (touch) ds.timer = setTimeout(() => { if (ds && !ds.lifted && !ds.settling) lift(); }, 250);
    addEventListener('pointermove', move, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  });
  grid.addEventListener('touchmove', e => { if (ds?.lifted && e.cancelable) e.preventDefault(); }, { passive: false });
  grid.addEventListener('click', e => { if (noClick) { e.preventDefault(); e.stopPropagation(); } }, true);
  grid.addEventListener('contextmenu', e => { if (e.target.closest?.('.nb-drag')) e.preventDefault(); });
  grid.addEventListener('dragstart', e => e.preventDefault());
  // keyboard
  const kmove = (card, dx, dy) => {
    const total = slots.length, row = Math.floor(ds.target / cols), col = ds.target % cols;
    const nc = Math.max(0, Math.min(cols - 1, col + dx)), nr = Math.max(0, row + dy);
    ds.target = Math.min(total - 1, nr * cols + nc);
    const t = ds.cs[ds.target]; ds.dx = t.x - ds.c0.x; ds.dy = t.y - ds.c0.y; show(true);
    grid.children[ds.target]?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    const k = slots[ds.target]; say(k.kind === 'empty' ? `Ô ${ds.target + 1}, trống` : k.kind === 'class' ? `Ô ${ds.target + 1} đã có note của lớp` : `Ô ${ds.target + 1}, đổi chỗ với ${k.note.title}`);
  };
  grid.addEventListener('keydown', e => {
    const card = e.target.closest?.('.nb-drag');
    if (!card || (ds && !ds.kb)) return;
    const k = e.key, act = k === 'Enter' || k === ' ';
    if (!ds) { if (act) { e.preventDefault(); begin(card, { kb: true }); say('Đã nhấc note. Dùng phím mũi tên để chọn ô, Enter để thả, Esc để huỷ.'); } return; }
    if (ds.settling) return;
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (dir) { e.preventDefault(); kmove(card, ...dir); }
    else if (act) {
      e.preventDefault();
      if (ds.target === ds.src) { const n = slots[ds.src].note; ds.noFocus = true; finish(false); onOpen?.(n); } else finish(true);
    } else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); say('Đã huỷ'); }
    else if (k === 'Tab') { ds.noFocus = true; finish(false); }
  });
  grid.addEventListener('keyup', e => { if (e.key === ' ' && e.target.closest?.('.nb-drag')) e.preventDefault(); });
  const esc = e => { if (e.key === 'Escape' && ds?.lifted && !ds.kb) { detach(); finish(false); setTimeout(() => { noClick = false; }, 0); } };
  addEventListener('keydown', esc);
  paint();
  return { el, update(next) { st = { ...st, ...next }; paint(); }, destroy() { stopLoop(); detach(); removeEventListener('keydown', esc); if (ds) clearTimeout(ds.timer); ro?.disconnect(); } };
}
