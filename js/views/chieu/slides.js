// Trình chiếu: title / tổ / Nổi bật slides (DOM). Student names are .ch-nm spans so H can mask them.
import { h } from '../../ui/dom.js';
import { fmtNum, fmtPts, MINUS } from '../../format.js';
import { icon } from '../../ui/icons.js';

export const tileTxt = n => ((n || '?').match(/\d+/) || [(n || '?')[0]])[0];
const words = t => t.split(' ').flatMap((w, i) => [i ? ' ' : '', h('span', { class: 'ch-w', 'aria-hidden': 'true' }, w)]);
// tappable tiles: detail payload kept off-DOM, read by index.js via tapOf()
const tapData = new WeakMap();
export const tapOf = el => tapData.get(el);
const tap = (cls, data, ...kids) => { const b = h('button', { class: `ch-tap ${cls}`, type: 'button', 'data-tap': '1', 'aria-haspopup': 'dialog' }, ...kids, h('span', { class: 'ch-chev', 'aria-hidden': 'true' }, icon('chevron', 16))); tapData.set(b, data); return b; };
export const nm = name => h('span', { class: 'ch-nm', 'data-n': name }, name);
export function maskNames(root, hide) { root.querySelectorAll('.ch-nm').forEach(e => { e.textContent = hide ? '·' : e.dataset.n; }); }
const names = list => [...list.slice(0, 4).flatMap((n, i) => [i ? ', ' : '', nm(n)]), list.length > 4 ? ` +${list.length - 4}` : ''];
export const plus = n => (n > 0 ? fmtPts(n) : '0'), minus = n => (n > 0 ? MINUS + fmtNum(n) : '0');

function titleSlide(s) {
  const c = s.className ? (/^lớp/i.test(s.className) ? s.className : `Lớp ${s.className}`) : '', who = [c, s.school].filter(Boolean).join(' · ');
  return h('section', { class: 'ch-s ch-title' }, s.isCurrent && h('span', { class: 'ch-tag' }, s.tag),
    h('h1', { class: 'ch-h1' }, s.title), h('div', { class: 'ch-rule' }), h('p', { class: 'ch-week' }, s.weekLabel),
    who && h('p', { class: 'ch-who' }, who), h('p', { class: 'ch-hint' }, 'Nhấn → để bắt đầu'));
}

function groupSlide(s) {
  const body = s.empty
    ? [h('p', { class: 'ch-empty' }, 'Tuần này tổ không có ghi nhận nào')]
    : [h('p', { class: 'ch-counts' }, `${s.plusCount} lần cộng · ${s.minusCount} lần trừ`),
      h('div', { class: 'ch-net' }, h('span', { class: 'p', 'data-v': s.plusSum, 'data-f': 'p' }, plus(s.plusSum)), h('span', { class: 'sep' }, ' / '), h('span', { class: 'n', 'data-v': s.minusSum, 'data-f': 'm' }, minus(s.minusSum))),
      h('ul', { class: 'ch-lines' }, s.lines.map(l => h('li', null, tap('ch-ltap', { title: l.ruleName, sub: `${s.group.name} · ${l.count} lần · ${l.sign > 0 ? fmtPts(l.points) : MINUS + fmtNum(-l.points)}`, color: s.group.color, items: [...l.items].sort((a, b) => b.at - a.at) },
        h('span', { class: 'ch-rn' }, l.ruleName + (l.count > 1 ? ` ×${l.count}` : '')),
        h('b', { class: 'ch-amt ' + (l.sign > 0 ? 'p' : 'n') }, l.sign > 0 ? plus(l.points) : minus(-l.points)),
        l.names.length > 0 && h('span', { class: 'ch-nl' }, ...names(l.names)))))),
      h('p', { class: 'ch-more', 'data-n': s.more, hidden: s.more <= 0 }, `+ ${s.more} mục khác`),
      s.star && h('div', { class: 'ch-star' }, h('span', { class: 'ch-sl' }, 'Bạn nổi bật của tổ'), h('div', { class: 'ch-sr' }, h('b', { class: 'ch-sn' }, nm(s.star.name)), h('b', { class: 'ch-amt p', 'data-v': s.star.net, 'data-f': 'p' }, plus(s.star.net))))];
  return h('section', { class: `ch-s ch-group g-${s.group.color}`, 'data-density': s.density || 'medium' },
    h('div', { class: 'ch-side' }, h('h2', { class: 'ch-gname', 'aria-label': s.group.name }, ...words(s.group.name))),
    h('div', { class: 'ch-main' }, ...body, s.pending > 0 && h('p', { class: 'ch-pend' }, `${s.pending} điểm đang chờ xác nhận`)));
}

const chip = g => h('span', { class: `tp-chip g-${g.color}` }, g.name);
const rows = (title, sub, color, items) => ({ title, sub, color, items });
const colOf = (t, list) => h('div', { class: 'ch-col' }, h('h3', null, t), h('ol', { class: 'ch-ol' }, list));
const head = (title, big, f, sub, cls) => h('div', { class: 'tp-head' }, h('h2', { class: 'ch-h2' }, title), h('div', { class: 'tp-big' }, h('b', { class: cls, 'data-v': big, 'data-f': f }, f === 'm' ? minus(big) : plus(big)), h('span', null, sub)));

function minusSlide(s) {
  const gs = s.groups.map(x => tap(`tp-tile tp-g g-${x.group.color}${x.group.id === s.topGroup ? ' top' : ''}`, rows(`Bị trừ · ${x.group.name}`, `${x.count} lần · ${MINUS}${fmtNum(x.total)}`, x.group.color, x.items),
    h('span', { class: 'tp-gt' }, tileTxt(x.group.name)), h('span', { class: 'tp-gn' }, x.group.name), h('b', { class: 'tp-gv', 'data-v': x.total, 'data-f': 'm' }, minus(x.total)), h('span', { class: 'tp-gc' }, `${x.count} lần`)));
  const cols = [
    s.students.length && colOf('Học sinh bị trừ nhiều nhất', s.students.map((x, i) => h('li', null, tap(`tp-tile tp-row g-${x.group.color}`, rows(x.name, `${x.group.name} · ${x.count} lần · ${MINUS}${fmtNum(x.total)}`, x.group.color, x.items),
      h('b', { class: 'tp-rk' }, i + 1), h('span', { class: 'tp-who' }, nm(x.name), chip(x.group)), h('b', { class: 'ch-amt n tp-v', 'data-v': x.total, 'data-f': 'm' }, minus(x.total)), h('span', { class: 'tp-ct' }, `${x.count} lần`))))),
    s.rules.length && colOf('Nội quy hay bị vi phạm', s.rules.map((r, i) => h('li', null, tap('tp-tile tp-row', rows(r.name, `${r.count} lần · ${MINUS}${fmtNum(r.total)}`, null, r.items),
      h('b', { class: 'tp-rk' }, i + 1), h('span', { class: 'tp-who' }, r.name), h('b', { class: 'ch-amt n tp-v', 'data-v': r.count, 'data-f': 'c' }, `${r.count} lần`), h('span', { class: 'tp-ct' }, `${MINUS}${fmtNum(r.total)}`))))),
  ].filter(Boolean);
  return h('section', { class: 'ch-s ch-top tp-minus' }, head('Hay bị trừ', s.total, 'm', `${s.count} lần trừ trong tuần`, 'n'),
    h('div', { class: 'tp-gs' }, gs), cols.length ? h('div', { class: 'ch-cols' + (cols.length < 2 ? ' one' : '') }, cols) : null);
}

function plusSlide(s) {
  const cols = [
    colOf('Nhiều điểm cộng nhất', s.students.map((x, i) => h('li', null, tap(`tp-tile tp-row g-${x.group.color}`, rows(x.name, `${x.group.name} · ${x.count} lần · ${fmtPts(x.total)}`, x.group.color, x.items),
      h('b', { class: 'tp-rk' }, i + 1), h('span', { class: 'tp-who' }, nm(x.name), chip(x.group)), h('b', { class: 'ch-amt p tp-v', 'data-v': x.total, 'data-f': 'p' }, plus(x.total)), h('span', { class: 'tp-ct' }, `${x.count} lần`))))),
    s.active.length && colOf('Được ghi nhận nhiều lần nhất', s.active.map((x, i) => h('li', null, tap(`tp-tile tp-row g-${x.group.color}`, rows(x.name, `${x.group.name} · ${x.count} lần · ${fmtPts(x.total)}`, x.group.color, x.items),
      h('b', { class: 'tp-rk' }, i + 1), h('span', { class: 'tp-who' }, nm(x.name), chip(x.group)), h('b', { class: 'ch-amt p tp-v', 'data-v': x.count, 'data-f': 'c' }, `${x.count} lần`), h('span', { class: 'tp-ct' }, plus(x.total)))))),
  ].filter(Boolean);
  return h('section', { class: 'ch-s ch-top tp-plus' }, head('Bạn nổi bật', s.total, 'p', `${s.count} lần cộng trong tuần`, 'p'),
    h('div', { class: 'ch-cols' + (cols.length < 2 ? ' one' : '') }, cols));
}

export function renderSlide(s) {
  return s.type === 'title' ? titleSlide(s) : s.type === 'group' ? groupSlide(s) : s.type === 'minus' ? minusSlide(s) : plusSlide(s);
}
