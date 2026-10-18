// Trình chiếu (#/chieu/:weekKey): full-screen stage over the app. Read-only, one weekEntries fetch.
import { h, put } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import * as W from '../../weeks.js';
import { icon } from '../../ui/icons.js';
import { navigate } from '../../router.js';
import { play, skip, cancelAll } from './motion.js';
import { enter } from './enter.js';
import { buildSlides } from './build.js';
import { renderSlide, maskNames } from './slides.js';
import { renderFinale } from './finale.js';
import { bindInput } from './input.js';

function toggleFs(root) {
  try {
    const d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
    else { const r = root.requestFullscreen || root.webkitRequestFullscreen; r && Promise.resolve(r.call(root)).catch(() => {}); }
  } catch { /* silent fallback */ }
}

export default function chieu({ params: [key] }) {
  const cur = W.weekStart(Date.now()), start = W.keyToStart(key);
  if (start == null || start > cur) { setTimeout(() => navigate('/tongket'), 0); return { el: h('div') }; }
  const M = {}, exit = () => navigate(`/tongket/tuan/${key}`);
  let slides = [], i = 0, k = 0, fin = null, hide = false, gone = false, tok = 0, started = false;
  const ready = () => ['config', 'groups', 'students'].every(c => M[c] !== undefined);
  const btn = (cls, label, kids, on) => h('button', { class: `ch-btn ch-ctl ${cls}`, type: 'button', 'aria-label': label, onclick: on }, kids);
  const box = h('div', { class: 'ch-box' }), dots = h('span', { class: 'ch-dots' }), cnt = h('span', { class: 'ch-cnt2' });
  // Edge hit-zones: whole zone = prev/next (click bubbles from the arrow); arrow is only visible on zone hover / keyboard focus.
  const zone = (cls, label, ic, on) => h('div', { class: `ch-zone ${cls}`, onclick: on }, h('button', { class: 'ch-nav', type: 'button', 'aria-label': label }, icon(ic, 22)));
  const zPrev = zone('ch-zl', 'Trước', 'chevron-left', () => back()), zNext = zone('ch-zr', 'Tiếp', 'chevron', () => advance());
  const bPrev = zPrev.firstChild, bNext = zNext.firstChild;
  const ind = h('span', { class: 'ch-ind', hidden: true }, 'Đang ẩn tên · nhấn H để hiện');
  const root = h('div', { class: 'ch', role: 'dialog', 'aria-label': 'Trình chiếu' }, box,
    btn('ch-exit', 'Thoát', [icon('x', 24), 'Thoát'], exit), btn('ch-fsb', 'Toàn màn hình (F)', icon('expand', 24), () => toggleFs(root)),
    zPrev, zNext, ind, h('div', { class: 'ch-foot' }, dots, cnt));

  function nav() {
    bPrev.disabled = i === 0 && k === 0; bNext.disabled = i === slides.length - 1 && (!fin || k >= fin.total);
    put(dots, slides.map((_, j) => h('span', { class: 'ch-dot' + (j === i ? ' on' : '') })));
    cnt.textContent = slides.length ? `${i + 1} / ${slides.length}` : '';
  }
  function paint(dir) {
    cancelAll(); const s = slides[i]; k = 0; fin = s.type === 'finale' ? renderFinale(s) : null;
    const el = fin ? fin.el : renderSlide(s);
    put(box, el); maskNames(el, hide);
    if (dir < 0) play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 }); else enter(s, el);
    nav();
  }
  function next() { if (!slides.length) return; if (fin && k < fin.total) { fin.set(++k); nav(); } else if (i < slides.length - 1) { i++; paint(1); } }
  function prev() { if (!slides.length) return; if (fin && k > 0) { fin.set(--k); nav(); } else if (i > 0) { i--; paint(-1); } }
  // Advance = finish running animation first (that press does nothing else); prev just cancels and goes back.
  function advance() { if (!slides.length || skip()) return; next(); }
  function back() { cancelAll(); prev(); }
  function toggleHide() { hide = !hide; ind.hidden = !hide; maskNames(box, hide); }

  function load(fresh) {
    if (!ready()) return;
    const t = ++tok; cancelAll(); slides = []; fin = null; nav();
    put(box, h('div', { class: 'ch-skel', 'aria-busy': 'true' }, h('i'), h('i'), h('i')));
    store.weekEntries(start, { fresh: fresh || start === cur }).then(r => {
      if (t !== tok || gone) return;
      slides = buildSlides({ entries: r.entries, groups: M.groups, students: M.students, config: M.config, weekLabel: W.label(start), isCurrent: start === cur, daysLeft: W.daysLeft(Date.now()) });
      i = 0; paint(0);
    }).catch(() => t === tok && !gone && put(box, h('div', { class: 'ch-msg' }, h('h2', null, 'Không tải được'), h('p', null, 'Kiểm tra mạng rồi thử lại.'),
      h('div', { class: 'ch-msgbtns' }, h('button', { class: 'ch-btn', type: 'button', onclick: () => load(true) }, 'Thử lại'), h('button', { class: 'ch-btn ch-btn2', type: 'button', onclick: exit }, 'Thoát')))));
  }

  const unbind = bindInput({ root, next: advance, prev: back, fs: () => toggleFs(root), hide: toggleHide, exit });
  document.body.append(root); document.body.classList.add('chieu-on');
  const subs = ['config', 'groups', 'students'].map(c => store.on(c, v => { M[c] = v; if (ready() && !started) { started = true; load(false); } }));
  put(box, h('div', { class: 'ch-skel', 'aria-busy': 'true' }, h('i'), h('i'), h('i')));
  nav();
  return { el: h('div'), destroy() {
    gone = true; cancelAll(); unbind(); subs.forEach(u => u()); root.remove();
    if (!document.querySelector('.ch')) document.body.classList.remove('chieu-on');
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* ignore */ }
  } };
}
