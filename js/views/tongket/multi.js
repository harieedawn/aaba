// Tổng kết · Tháng / 3 tháng: table tổ × tuần, weeks fetched sequentially (max 14).
import { h, put } from '../../ui/dom.js';
import { fmtNum, fmtPts } from '../../format.js';
import { groupScore } from '../../scoring.js';
import { skeletonCards } from '../../ui/components.js';
import * as store from '../../data/store.js';
import * as W from '../../weeks.js';

export function weeksFor(mode, key) { return (mode === 'quy' ? W.last3Months(key).weeks : W.weeksOfMonth(key)).slice(-14); }

// returns {el, stop}; M = {config, groups, students}
export function multiView({ mode, key, M, fresh }) {
  const weeks = weeksFor(mode, key), cur = W.weekStart(Date.now()), box = h('div', { class: 'stack' }, ...skeletonCards(3));
  const D = new Map(), failed = new Set(); let stopped = false, sel = null;
  const total = id => weeks.reduce((s, w) => s + (D.get(w) ? groupScore(id, D.get(w).entries, M.config.categories).total : 0), 0);
  function paint() {
    const rows = M.groups.map(g => ({ g, t: total(g.id) })).sort((a, b) => b.t - a.t || a.g.name.localeCompare(b.g.name, 'vi'));
    rows.forEach((r, i) => { r.rank = i && r.t === rows[i - 1].t ? rows[i - 1].rank : i + 1; });
    const th = w => h('th', null, h('div', null, W.label(w).replace(' → ', ' →\u00a0')), w === cur && h('div', { class: 'tag' }, 'đang diễn ra'));
    const cell = (g, w) => h('td', null, w > cur ? '—' : D.get(w) ? fmtNum(groupScore(g.id, D.get(w).entries, M.config.categories).total) : failed.has(w) ? '!' : '…');
    const table = h('div', { class: 'tk-tw' }, h('table', { class: 'tk-t' },
      h('thead', null, h('tr', null, h('th', null, 'Hạng'), h('th', null, 'Tổ'), weeks.map(th), h('th', null, 'Tổng'))),
      h('tbody', null, rows.map(r => h('tr', { class: `g-${r.g.color} pressable` + (sel === r.g.id ? ' on' : ''), tabindex: '0', onclick: () => { sel = sel === r.g.id ? null : r.g.id; paint(); } },
        h('td', null, r.rank), h('td', null, h('b', null, r.g.name)), weeks.map(w => cell(r.g, w)), h('td', null, h('b', null, fmtNum(r.t))))))));
    const out = [table];
    if (failed.size) out.push(h('div', { class: 'note' }, `Không tải được ${failed.size} tuần. Bấm “Tải lại”.`));
    if (D.size < weeks.filter(w => w <= cur).length && !failed.size) out.push(h('p', { class: 'muted' }, `Đang tải tuần ${D.size + 1}/${weeks.filter(w => w <= cur).length}…`));
    if (sel) {
      const g = M.groups.find(x => x.id === sel);
      out.push(h('section', { class: 'card' }, h('h2', null, g.name), weeks.filter(w => D.get(w)).map(w => {
        const s = groupScore(g.id, D.get(w).entries, M.config.categories);
        return h('a', { class: 'tk-mem pressable', href: `#/tongket/tuan/${W.weekKey(w)}` }, h('span', null, W.label(w)),
          h('span', { class: 'muted' }, `${fmtPts(s.plus)} / ${fmtPts(s.minus)}`), h('b', null, fmtNum(s.total)));
      })));
    }
    put(box, ...out);
  }
  (async () => {
    for (const w of weeks) {
      if (stopped) return;
      if (w > cur) continue;
      try { D.set(w, await store.weekEntries(w, { fresh: fresh || w === cur })); failed.delete(w); } catch { failed.add(w); }
      if (!stopped) paint();
    }
    if (!stopped) paint();
  })();
  paint();
  return { el: box, stop: () => { stopped = true; } };
}
