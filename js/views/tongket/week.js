// Tổng kết · Tuần: ranking, Nổi bật, per-tổ full detail.
import { h } from '../../ui/dom.js';
import { fmtNum, plusMinus } from '../../format.js';
import { rankGroups } from '../../scoring.js';
import { emptyState } from '../../ui/components.js';
import { groupDetail } from './parts.js';
import { tags } from './tags.js';

export function renderWeek({ entries, truncated, M, isCurrent, readOnly, extra }) {
  const ranked = rankGroups(M.groups, entries, M.config);
  const ctx = { gm: new Map(M.groups.map(g => [g.id, g])), sm: new Map(M.students.map(s => [s.id, s])), readOnly, tags, voidExtra: extra?.voidExtra };
  const out = [];
  if (truncated) out.push(h('div', { class: 'note' }, 'Chỉ hiển thị 1000 điểm đầu tiên của tuần.'));
  if (isCurrent) out.push(h('div', { class: 'note' }, 'Tuần đang diễn ra, điểm có thể còn thay đổi.'));
  out.push(h('section', { class: 'lb', 'aria-label': 'Xếp hạng' }, ranked.map(r => h('div', { class: `lb-row g-${r.group.color}` },
    h('span', { class: 'rank' }, r.rank),
    h('span', { class: 'tile' }, ((r.group.name || '?').match(/\d+/) || [(r.group.name || '?')[0]])[0]),
    h('div', { class: 'lb-id' }, h('div', { class: 'lb-name-row' }, h('span', { class: 'lb-name' }, r.group.name)),
      h('div', { class: 'lb-sub' }, plusMinus(r))),
    h('div', { class: 'lb-score' }, h('span', { class: 'lb-total' }, fmtNum(r.total)))))));
  const ok = entries.filter(e => e.status === 'ok'), use = new Map();
  ok.filter(e => e.points < 0).forEach(e => use.set(e.ruleName, (use.get(e.ruleName) || 0) + 1));
  const top = [...use].sort((a, b) => b[1] - a[1]).slice(0, 3);
  out.push(h('section', { class: 'card' }, h('h2', null, 'Nổi bật'),
    top.length ? h('ol', { class: 'tk-top' }, top.map(([n, c]) => h('li', null, h('span', null, n), h('b', null, `${c} lần`)))) : h('p', { class: 'muted' }, 'Chưa có vi phạm nào.'),
    h('p', { class: 'muted' }, `${ok.filter(e => e.points > 0).length} lần cộng · ${ok.filter(e => e.points < 0).length} lần trừ`)));
  if (extra?.top) out.push(extra.top);
  out.push(h('h2', { class: 'tk-sec' }, 'Chi tiết từng tổ'));
  if (!entries.length) out.push(emptyState({ icon: 'history', title: 'Tuần này chưa có điểm nào' }));
  ranked.forEach(r => out.push(groupDetail(r, entries, M.students, ctx)));
  return out;
}
