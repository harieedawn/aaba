// Trình chiếu: title / tổ / Nổi bật slides (DOM). Student names are .ch-nm spans so H can mask them.
import { h } from '../../ui/dom.js';
import { fmtNum, fmtPts, MINUS } from '../../format.js';

export const tileTxt = n => ((n || '?').match(/\d+/) || [(n || '?')[0]])[0];
export const nm = name => h('span', { class: 'ch-nm', 'data-n': name }, name);
export function maskNames(root, hide) { root.querySelectorAll('.ch-nm').forEach(e => { e.textContent = hide ? '·' : e.dataset.n; }); }
const names = list => [...list.slice(0, 3).flatMap((n, i) => [i ? ', ' : '', nm(n)]), list.length > 3 ? ` +${list.length - 3}` : ''];
const plus = n => (n > 0 ? fmtPts(n) : '0'), minus = n => (n > 0 ? MINUS + fmtNum(n) : '0');

function titleSlide(s) {
  const c = s.className ? (/^lớp/i.test(s.className) ? s.className : `Lớp ${s.className}`) : '', who = [c, s.school].filter(Boolean).join(' · ');
  return h('section', { class: 'ch-s ch-title' }, s.isCurrent && h('span', { class: 'ch-tag' }, 'Tuần đang diễn ra'),
    h('h1', { class: 'ch-h1' }, s.title), h('div', { class: 'ch-rule' }), h('p', { class: 'ch-week' }, s.weekLabel),
    who && h('p', { class: 'ch-who' }, who), h('p', { class: 'ch-hint' }, 'Nhấn → để bắt đầu'));
}

function groupSlide(s) {
  const body = s.empty
    ? [h('p', { class: 'ch-empty' }, 'Tuần này tổ không có ghi nhận nào')]
    : [h('p', { class: 'ch-counts' }, `${s.plusCount} lần cộng · ${s.minusCount} lần trừ`),
      h('div', { class: 'ch-net' }, h('span', { class: 'p' }, plus(s.plusSum)), h('span', { class: 'sep' }, ' / '), h('span', { class: 'n' }, minus(s.minusSum))),
      h('ul', { class: 'ch-lines' }, s.lines.map(l => h('li', null,
        h('span', { class: 'ch-rn' }, l.ruleName + (l.count > 1 ? ` ×${l.count}` : '')),
        l.names.length > 0 && h('span', { class: 'ch-nl' }, ...names(l.names)),
        h('b', { class: 'ch-amt ' + (l.sign > 0 ? 'p' : 'n') }, l.sign > 0 ? plus(l.points) : minus(-l.points))))),
      s.more > 0 && h('p', { class: 'ch-more' }, `+ ${s.more} mục khác`),
      s.star && h('div', { class: 'ch-star' }, h('span', null, 'Bạn nổi bật của tổ'), h('b', null, nm(s.star.name)), h('b', { class: 'ch-amt p' }, plus(s.star.net)))];
  return h('section', { class: `ch-s ch-group g-${s.group.color}` },
    h('div', { class: 'ch-side' }, h('h2', { class: 'ch-gname' }, s.group.name)),
    h('div', { class: 'ch-main' }, ...body, s.pending > 0 && h('p', { class: 'ch-pend' }, `${s.pending} điểm đang chờ xác nhận`)));
}

function topSlide(s) {
  const col = (t, kids) => h('div', { class: 'ch-col' }, h('h3', null, t), kids);
  const cols = [
    s.rules.length && col('Hay bị trừ nhất', h('ol', { class: 'ch-ol' }, s.rules.map(r => h('li', null, h('span', { class: 'ch-rn' }, r.name), h('b', { class: 'ch-cnt' }, `${r.count} lần`))))),
    s.students.length && col('Bạn nổi bật', h('ol', { class: 'ch-ol' }, s.students.map(x => h('li', null, h('span', { class: 'ch-rn' }, nm(x.name)),
      h('span', { class: `ch-gchip g-${x.group.color}` }, x.group.name), h('b', { class: 'ch-amt p' }, plus(x.net)))))),
  ].filter(Boolean);
  return h('section', { class: 'ch-s ch-top' }, h('h2', { class: 'ch-h2' }, 'Nổi bật'), h('div', { class: 'ch-cols' + (cols.length < 2 ? ' one' : '') }, cols));
}

export function renderSlide(s) {
  return s.type === 'title' ? titleSlide(s) : s.type === 'group' ? groupSlide(s) : topSlide(s);
}
