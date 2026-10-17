import { h } from './dom.js';
import { reduced } from './anim.js';
let box;
// toast(msg, {action:{label,onClick}, duration}) -> dismiss()
export function toast(msg, { action, duration = 4000 } = {}) {
  box ||= document.body.appendChild(h('div', { class: 'toasts', 'aria-live': 'polite' }));
  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    if (!t.isConnected) return;
    if (reduced()) return t.remove();
    t.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(8px)' }], { duration: 180, fill: 'forwards' }).onfinish = () => t.remove();
  };
  const t = h('div', { class: 'toast' }, h('span', null, msg),
    action && h('button', { class: 'toast-act', onclick: () => { action.onClick(); dismiss(); } }, action.label));
  box.append(t);
  timer = setTimeout(dismiss, duration);
  return dismiss;
}
