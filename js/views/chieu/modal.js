// Trình chiếu: floating detail modal (fixed size, dimmed backdrop, X / backdrop / Esc, focus trapped). Uses only data already on the slide.
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { fmtPts, fmtDate, fmtTime } from '../../format.js';
import { nm, maskNames } from './slides.js';

// openModal(root, {title, sub, color, items}, hide, onClose) -> { close() }
export function openModal(root, d, hide, onClose) {
  const prev = document.activeElement, items = d.items || [];
  const x = h('button', { class: 'tp-x', type: 'button', 'aria-label': 'Đóng' }, icon('x', 20));
  const list = h('ul', { class: 'tp-list', tabindex: '0', 'aria-label': 'Chi tiết' }, items.length
    ? items.map(it => h('li', { class: it.points > 0 ? 'p' : 'n' },
      h('div', { class: 'tp-l1' }, h('b', { class: 'tp-ln' }, nm(it.name)), h('b', { class: 'tp-lp' }, fmtPts(it.points))),
      h('div', { class: 'tp-l2' }, `${it.rule} · ${fmtDate(it.at)} ${fmtTime(it.at)}${it.by ? ` · ${it.by} ghi` : ''}`)))
    : h('li', { class: 'tp-none' }, 'Không có ghi nhận nào'));
  const dlg = h('div', { class: `tp-md${d.color ? ` g-${d.color}` : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': d.title },
    h('div', { class: 'tp-mh' }, h('div', { class: 'tp-mt' }, h('h3', null, d.title), d.sub && h('p', null, d.sub)), x), list);
  const ov = h('div', { class: 'tp-ov' }, dlg);
  const others = [...root.children].filter(c => !c.hasAttribute('inert'));
  others.forEach(c => c.setAttribute('inert', ''));
  root.append(ov); maskNames(ov, hide); x.focus({ preventScroll: true });
  let open = true;
  const close = () => {
    if (!open) return; open = false;
    removeEventListener('keydown', onKey, true); ov.removeEventListener('click', onBg); ov.removeEventListener('pointerdown', stop); ov.removeEventListener('pointerup', stop);
    ov.remove(); others.forEach(c => c.removeAttribute('inert'));
    try { prev?.isConnected && prev.focus({ preventScroll: true }); } catch { /* ignore */ }
    onClose?.();
  };
  const onBg = e => { if (e.target === ov) close(); };
  const stop = e => e.stopPropagation(); // taps inside never reach the slide's prev/next handlers
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
    if (e.key === 'Tab') { // trap: close button <-> list
      e.preventDefault(); e.stopImmediatePropagation();
      const t = [x, list], i = t.indexOf(document.activeElement); t[(i + (e.shiftKey ? -1 : 1) + t.length) % t.length].focus({ preventScroll: true }); return;
    }
    if (!(e.ctrlKey || e.metaKey || e.altKey)) e.stopImmediatePropagation(); // slide shortcuts (←/→/space/F/H) are off while open; native list scroll stays
  };
  x.addEventListener('click', close); ov.addEventListener('click', onBg); ov.addEventListener('pointerdown', stop); ov.addEventListener('pointerup', stop);
  addEventListener('keydown', onKey, true);
  return { close };
}
