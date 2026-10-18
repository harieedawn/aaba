// Shared small components.
import { h } from './dom.js';
import { icon } from './icons.js';
import { fmtPts, relTime, fmtDate, fmtTime } from '../format.js';
const CAT_ICON = { noiquy: 'shield', hoctap: 'book', phongtrao: 'flag' };
import { getTheme, setTheme, onTheme, can } from '../session.js';
import * as store from '../data/store.js';
import { openSheet } from './sheet.js';
import { toast } from './toast.js';

export const logo = () => h('span', { class: 'logo' }, h('span', { class: 'logo-sq', 'aria-hidden': 'true' }, 'a'), h('span', { class: 'logo-t' }, 'aaba'));
export const dot = color => h('span', { class: `dot g-${color || 'slate'}`, 'aria-hidden': 'true' });
export const chip = (kids, tone = '') => h('span', { class: 'chip ' + tone }, kids);
export const pointsChip = n => chip(fmtPts(n), n > 0 ? 'pos' : n < 0 ? 'neg' : '');

export function skeletonCards(n = 4) {
  return Array.from({ length: n }, () => h('div', { class: 'card skeleton', 'aria-hidden': 'true' }));
}
// action: {label, href} | {label, onClick}
export function emptyState({ icon: ic = 'clock', title, text, action } = {}) {
  return h('div', { class: 'empty' },
    h('div', { class: 'empty-ico' }, icon(ic, 26)),
    h('h2', null, title), text && h('p', { class: 'muted' }, text),
    action && (action.href
      ? h('a', { class: 'btn btn-ghost pressable', href: action.href }, action.label)
      : h('button', { class: 'btn btn-ghost pressable', onclick: action.onClick }, action.label)));
}

export function themeToggle() {
  const b = h('button', { class: 'icon-btn pressable', 'aria-label': 'Đổi giao diện sáng/tối' });
  const paint = () => b.replaceChildren(icon(getTheme() === 'dark' ? 'sun' : 'moon'));
  paint();
  b.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
  onTheme(() => b.isConnected && paint());
  return b;
}

export function entryRow(e, { group, student, onOpen, catId } = {}) {
  const who = e.studentId ? student?.name || 'Học sinh' : 'Cả tổ';
  const cat = catId || e.catId || e.categoryId || e.cat;
  const amt = h('span', { class: 'amt ' + (e.points > 0 ? 'pos' : e.points < 0 ? 'neg' : '') }, fmtPts(e.points));
  const row = h('div', { class: 'entry' + (e.status === 'void' ? ' is-void' : '') + (onOpen ? ' pressable' : ''), role: onOpen ? 'button' : null, tabindex: onOpen ? '0' : null },
    h('span', { class: 'ico-tile', 'aria-hidden': 'true' }, icon(CAT_ICON[cat] || 'flag', 20)),
    h('div', { class: 'entry-main' },
      h('div', { class: 'entry-name' }, e.ruleName),
      h('div', { class: 'entry-sub muted' }, `${group?.name || ''} · ${who} · ${relTime(e.at)}`)),
    h('div', { class: 'entry-pts' }, amt,
      e.status === 'pending' && h('span', { class: 'pend' }, icon('clock', 14), 'chờ xác nhận'),
      e.status === 'void' && h('span', { class: 'void-t' }, 'Đã thu hồi')));
  if (onOpen) {
    row.addEventListener('click', () => onOpen(e));
    row.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpen(e); } });
  }
  return row;
}

export function pageHeader(title, { back, sub } = {}) {
  return h('header', { class: 'hdr' },
    back && h('a', { class: 'icon-btn back', href: back, 'aria-label': 'Quay lại' }, icon('chevron', 22)),
    h('div', { class: 'hdr-main' }, h('h1', null, title), sub && h('p', { class: 'hdr-sub muted' }, sub)));
}

// Subscribe to collections; show skeleton until all arrived, then el <- render(S, first) (array of nodes).
// Errors become an error state. Returns stop().
export function live(el, cols, render, opts = {}) {
  const S = {};
  let first = true;
  el.replaceChildren(...skeletonCards(3));
  const paint = () => {
    if (!cols.every(c => S[c] !== undefined)) return;
    try { el.replaceChildren(...[].concat(render(S, first))); }
    catch (err) { el.replaceChildren(emptyState({ icon: 'x', title: 'Có lỗi xảy ra', text: err.message, action: { label: 'Tải lại', onClick: () => location.reload() } })); }
    first = false;
  };
  const subs = cols.map(c => store.on(c, v => { S[c] = v; paint(); }, opts[c]));
  return () => subs.forEach(u => u());
}

// Shared "reason required" confirm sheet (void / reject).
export function reasonSheet({ title, text, label, onSubmit }) {
  const ta = h('textarea', { class: 'input textarea', rows: '3', placeholder: 'Lý do thu hồi (bắt buộc)', 'aria-label': 'Lý do thu hồi' });
  const err = h('div', { class: 'form-err', role: 'alert', hidden: true }, 'Cần nhập lý do.');
  const ok = h('button', { class: 'btn btn-danger', type: 'button' }, label);
  const sh = openSheet({ title, content: h('div', { class: 'form' }, text && h('p', { class: 'muted' }, text), ta, err,
    h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => sh.close() }, 'Không'), ok)) });
  ok.onclick = async () => {
    const v = ta.value.trim();
    if (!v) { err.textContent = 'Cần nhập lý do.'; err.hidden = false; ta.focus(); return; }
    ok.disabled = true;
    try { await onSubmit(v); sh.close(); } catch (e) { ok.disabled = false; err.textContent = e.message || 'Có lỗi xảy ra'; err.hidden = false; }
  };
  setTimeout(() => ta.focus(), 50);
  return sh;
}

export function entrySheet(e, { group, student, readOnly } = {}) {
  const kv = (k, v) => h('div', { class: 'kv' }, h('span', { class: 'muted' }, k), h('span', null, v));
  const status = { ok: chip('đã xác nhận', 'pos'), pending: chip('chờ xác nhận', 'warn'), void: chip('Đã thu hồi', 'neg') }[e.status];
  const canVoid = !readOnly && e.status !== 'void' && can('void', { entry: e });
  const sh = openSheet({ title: 'Chi tiết điểm', content: h('div', { class: 'detail' },
    h('div', { class: 'detail-top' }, h('div', { class: 'detail-name' }, e.ruleName), pointsChip(e.points)),
    kv('Tổ', h('span', { class: 'inl' }, dot(group?.color), group?.name || '')),
    kv('Học sinh', e.studentId ? student?.name || '' : 'Cả tổ'),
    e.qty > 1 && kv('Số lượng', `${e.qty} × ${fmtPts(e.unit)}`),
    kv('Thời gian', `${fmtDate(e.at)} ${fmtTime(e.at)}`),
    kv('Người ghi', e.byName), kv('Trạng thái', status),
    e.note && kv('Ghi chú', e.note),
    e.status === 'void' && kv('Lý do thu hồi', e.voidReason),
    canVoid && h('button', { class: 'btn btn-ghost detail-void', onclick: () => {
      sh.close();
      reasonSheet({ title: 'Thu hồi điểm này?', text: `${e.ruleName}: ${fmtPts(e.points)} điểm sẽ không còn được tính.`, label: 'Thu hồi điểm',
        onSubmit: async r => { await store.voidEntry(e.id, r); toast('Đã thu hồi điểm'); } });
    } }, 'Thu hồi điểm')) });
  return sh;
}
