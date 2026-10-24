// Notes mini calendar. createCalendar({getSelected,onSelect(key),getToday,marksFor(key)->[{color,kind}],onRange?(from,to)}) -> {el, update(), destroy()}
// Week starts Monday. Compact = month label + strip of the selected week; open = full month grid (overlay card on wide screens).
import { h, put } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { noonOf, dowOf, addMonths, monthLabel } from '../weeks.js';
import { addDays, fmtDay } from './dates.js';

const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const mon = k => (dowOf(noonOf(k)) + 6) % 7;
const monthOf = k => k.slice(0, 7);
let uid = 0;

// up to 3 class dots (distinct colours first) + '+' when more, plus one hollow ring when the viewer has a personal note
export function dotsOf(marks) {
  const seen = new Set(), a = [], b = [];
  for (const m of marks) if (m.kind === 'class') { (seen.has(m.color) ? b : a).push(m); seen.add(m.color); }
  const all = [...a, ...b];
  return { dots: all.slice(0, 3).map(m => m.color), more: all.length > 3, mine: marks.some(m => m.kind === 'mine'), n: marks.length };
}

export function createCalendar({ getSelected, onSelect, getToday, marksFor, onRange }) {
  const id = 'nbcal' + ++uid, wide = window.matchMedia('(min-width:900px)');
  let open = false, view = monthOf(getSelected()), focus = getSelected(), lastRange = '';
  const toggle = h('button', { class: 'nb-cal-t pressable', type: 'button', 'aria-expanded': 'false', 'aria-controls': id, onclick: () => setOpen(!open, true) });
  const prev = h('button', { class: 'icon-btn pressable', type: 'button', 'aria-label': 'Tháng trước', onclick: () => shift(-1) }, icon('chevron-left', 20));
  const next = h('button', { class: 'icon-btn pressable', type: 'button', 'aria-label': 'Tháng sau', onclick: () => shift(1) }, icon('chevron', 20));
  const todayBtn = h('button', { class: 'btn btn-ghost nb-cal-today', type: 'button', onclick: () => pick(getToday()) }, 'Hôm nay');
  const strip = h('div', { class: 'nb-cal-days nb-cal-strip' });
  const grid = h('div', { class: 'nb-cal-days', role: 'group' });
  const wds = h('div', { class: 'nb-cal-wd', 'aria-hidden': 'true' }, WD.map(w => h('span', null, w)));
  const stripReg = h('div', { class: 'nb-cal-reg nb-cal-reg-strip' }, h('div', null, strip));
  const monthReg = h('div', { class: 'nb-cal-reg nb-cal-reg-month', id }, h('div', null, wds, grid, h('div', { class: 'nb-cal-foot' }, todayBtn)));
  const host = h('div', { class: 'nb-cal', 'data-open': 'false' },
    h('div', { class: 'nb-cal-card', role: 'group', 'aria-label': 'Lịch' },
      h('div', { class: 'nb-cal-head' }, toggle, h('div', { class: 'nb-cal-arrows' }, prev, next)), stripReg, monthReg));
  const el = host;

  function day(k, today, sel, inView) {
    const m = dotsOf(marksFor(k) || []);
    const lab = [fmtDay(k), k === today && 'hôm nay', m.n && `${m.n} note`].filter(Boolean).join(', ');
    return h('button', { class: 'nb-cd pressable', type: 'button', 'data-key': k, 'data-today': String(k === today), 'data-sel': String(k === sel), 'data-out': String(!inView),
      'aria-label': lab, 'aria-pressed': String(k === sel), 'aria-current': k === today ? 'date' : null, tabindex: '-1', onclick: () => pick(k) },
      h('span', { class: 'nb-cn' }, +k.slice(8)),
      h('span', { class: 'nb-dots', 'aria-hidden': 'true' }, m.dots.map(c => h('i', { class: 'nb-d', style: { '--c': c } })), m.more && h('b', { class: 'nb-more' }, '+'), m.mine && h('i', { class: 'nb-d nb-d-mine' })));
  }
  function render() {
    const ae = document.activeElement, keep = ae && host.contains(ae) && ae.dataset?.key ? { k: ae.dataset.key, m: !!ae.closest('.nb-cal-reg-month') } : null;
    const sel = getSelected(), today = getToday(), v = open ? view : monthOf(sel);
    put(toggle, h('span', { class: 'nb-cal-m' }, monthLabel(v)), icon('chevron', 18, 'nb-cal-chev'));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', `${open ? 'Thu gọn lịch' : 'Mở lịch'}, ${monthLabel(v)}, đang chọn ${fmtDay(sel)}`);
    const ws = addDays(sel, -mon(sel));
    put(strip, Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map(k => day(k, today, sel, true)));
    const f = view + '-01', gs = addDays(f, -mon(f)), rows = Math.ceil((mon(f) + (addDays(addMonths(view, 1) + '-01', -1).slice(8) | 0)) / 7);
    put(grid, Array.from({ length: rows * 7 }, (_, i) => addDays(gs, i)).map(k => day(k, today, sel, monthOf(k) === view)));
    grid.setAttribute('aria-label', monthLabel(view));
    // roving tabindex in the month grid; strip buttons stay normal tab stops
    strip.querySelectorAll('.nb-cd').forEach(b => b.removeAttribute('tabindex'));
    const t = grid.querySelector(`[data-key="${focus}"]`) || grid.querySelector('[data-sel="true"]') || grid.querySelector('[data-out="false"]');
    t?.setAttribute('tabindex', '0');
    const range = open ? [gs, addDays(gs, rows * 7 - 1)] : [ws, addDays(ws, 6)], rk = range.join();
    if (keep) (keep.m ? grid : strip).querySelector(`[data-key="${keep.k}"]`)?.focus({ preventScroll: true });
    if (onRange && rk !== lastRange) { lastRange = rk; onRange(range[0], range[1]); }
  }
  function focusDay() { grid.querySelector('[tabindex="0"]')?.focus({ preventScroll: true }); }
  function setOpen(v, byUser) {
    if (v === open) return;
    if (v) { if (wide.matches) host.style.height = host.offsetHeight + 'px'; view = monthOf(getSelected()); focus = getSelected(); }
    open = v; host.dataset.open = String(v); render();
    if (v) requestAnimationFrame(focusDay); else { host.style.height = ''; if (byUser) toggle.focus({ preventScroll: true }); }
  }
  function pick(k) { onSelect(k); setOpen(false, true); }
  function shift(n) { view = addMonths(view, n); focus = view + '-' + String(Math.min(+(focus || getSelected()).slice(8), 28)).padStart(2, '0'); render(); }
  function onKey(e) {
    if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false, true); return; }
    if (!open || !e.target.closest?.('.nb-cal-reg-month .nb-cd')) return;
    const k = e.target.dataset.key, d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    let nk = d != null ? addDays(k, d) : e.key === 'PageUp' ? addDays(k, -30) : e.key === 'PageDown' ? addDays(k, 30) : null;
    if (!nk) return;
    e.preventDefault();
    if (e.key === 'PageUp' || e.key === 'PageDown') nk = addMonths(monthOf(k), e.key === 'PageUp' ? -1 : 1) + '-' + k.slice(8, 10).replace(/^(29|30|31)$/, '28');
    view = monthOf(nk); focus = nk; render(); focusDay();
  }
  const outside = e => { if (open && !host.contains(e.target)) setOpen(false); };
  host.addEventListener('keydown', onKey);
  host.addEventListener('focusout', e => { if (open && e.relatedTarget && !host.contains(e.relatedTarget)) setOpen(false); });
  document.addEventListener('pointerdown', outside);
  render();
  return { el, update() { if (!open) view = monthOf(getSelected()); render(); }, destroy() { document.removeEventListener('pointerdown', outside); } };
}
