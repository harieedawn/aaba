// Bottom sheet on phone, centred dialog >=768px (CSS decides). openSheet({title, content, onClose}) -> {close, el}
import { h } from './dom.js';
import { icon } from './icons.js';
import { reduced } from './anim.js';
export function openSheet({ title = '', content, onClose } = {}) {
  const prev = document.activeElement;
  let closed = false;
  const overlay = h('div', { class: 'overlay' });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' },
    h('div', { class: 'sheet-grab', 'aria-hidden': 'true' }),
    title && h('div', { class: 'sheet-head' }, h('h2', null, title),
      h('button', { class: 'icon-btn', 'aria-label': 'Đóng', onclick: () => close() }, icon('x'))),
    h('div', { class: 'sheet-body' }, content));
  const wrap = h('div', { class: 'sheet-wrap', onclick: e => e.target === wrap && close() }, sheet);
  const onKey = e => {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    const f = [...sheet.querySelectorAll('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled);
    if (!f.length) return e.preventDefault();
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { z.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === z) { a.focus(); e.preventDefault(); }
  };
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    document.documentElement.classList.remove('lock');
    const done = () => { overlay.remove(); wrap.remove(); if (!document.querySelector('.sheet')) prev?.focus?.(); onClose?.(); };
    if (reduced()) return done();
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
    sheet.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(24px)', opacity: 0 }], { duration: 180, fill: 'forwards' }).onfinish = done;
  }
  document.body.append(overlay, wrap);
  document.documentElement.classList.add('lock');
  document.addEventListener('keydown', onKey);
  sheet.focus();
  return { close, el: sheet };
}
