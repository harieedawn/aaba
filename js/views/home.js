// Home: header, leaderboard (FLIP / count-up / bar grow / stagger), duty chip, "Mới nhất".
import { h } from '../ui/dom.js';
import * as store from '../data/store.js';
import { rankGroups, deltaSince } from '../scoring.js';
import { fmtNum, fmtPts, cycleInfo, startOfDay, weekKey } from '../format.js';
import { logo, chip, dot, themeToggle, entryRow, skeletonCards, emptyState } from '../ui/components.js';
import { countUp, flip, stagger, setBar, floatDelta } from '../ui/anim.js';
import { getSession } from '../session.js';

const memo = new Map(); let memoOrder = ''; // last shown values: remount animates from them
const COLS = ['config', 'groups', 'students', 'entries', 'cycles', 'duty'];

function makeCard(cats, id) {
  const c = { v: 0, d: 0 };
  c.rank = h('span', { class: 'rank' });
  c.name = h('span', { class: 'lb-name' });
  c.mine = h('span', { class: 'tag', hidden: true }, 'Tổ của bạn');
  c.pend = chip('', 'warn');
  c.dot = h('span');
  c.total = h('span', { class: 'lb-total' }, '0');
  c.delta = chip('', '');
  c.bars = cats.map(() => h('div', { class: 'fill' }));
  c.vals = cats.map(() => h('span', { class: 'lb-bar-v' }));
  const m = memo.get(id);
  if (m) {
    c.v = m.v; c.d = m.d; c.total._v = m.v; c.total.textContent = fmtNum(m.v); c.dot.className = 'dot';
    c.bars.forEach((b, i) => { b._f = m.f[i] ?? 0; b.style.transform = `scaleX(${b._f})`; });
  }
  c.el = h('a', { class: 'lb-card pressable' },
    h('div', { class: 'lb-top' }, c.rank,
      h('div', { class: 'lb-id' }, h('div', { class: 'lb-name-row' }, c.dot, c.name, c.mine), c.pend),
      h('div', { class: 'lb-score' }, c.total, c.delta)),
    h('div', { class: 'lb-bars' }, cats.map((k, i) => h('div', { class: 'lb-bar' },
      h('div', { class: 'lb-bar-h' }, h('span', { class: 'muted' }, k.name), c.vals[i]),
      h('div', { class: 'track' }, c.bars[i])))));
  return c;
}

export default function home() {
  const S = {}, cards = new Map();
  let order = '', done = false, latestDone = false;
  const sub = h('p', { class: 'hdr-sub muted' });
  const duty = h('div', { class: 'duty' });
  const board = h('div', { class: 'lb' }, skeletonCards(4));
  const latest = h('div', { class: 'entries' });
  const el = h('div', { class: 'view home' },
    h('header', { class: 'hdr' },
      h('div', { class: 'hdr-main' }, logo(), h('h1', { class: 'hdr-title sr' }, 'Xếp hạng'), sub), themeToggle()),
    duty,
    h('div', { class: 'home-grid' },
      h('section', { 'aria-label': 'Bảng xếp hạng' }, board),
      h('aside', { class: 'card side' },
        h('div', { class: 'side-head' }, h('h2', null, 'Mới nhất'), h('a', { class: 'link', href: '#/lichsu' }, 'Xem tất cả')), latest)));

  function paint(c, r, cats, maxCat, mine, since) {
    const fresh = !c.dot.className;
    c.el.className = `lb-card pressable g-${r.group.color}${r.rank <= 3 ? ' top' : ''}${r.group.id === mine ? ' mine' : ''}`;
    c.el.href = '#/to/' + r.group.id;
    c.el.setAttribute('aria-label', `Hạng ${r.rank}, ${r.group.name}, ${fmtNum(r.total)} điểm`);
    c.dot.className = 'dot';
    c.rank.textContent = r.rank;
    c.name.textContent = r.group.name;
    c.mine.hidden = r.group.id !== mine;
    countUp(c.total, r.total);
    const d = deltaSince(r.group.id, S.entries, since);
    c.delta.hidden = d === 0;
    c.delta.textContent = fmtPts(d);
    c.delta.className = 'chip ' + (d > 0 ? 'pos' : 'neg');
    if (!fresh && d !== c.d) floatDelta(c.delta, fmtPts(d - c.d), d - c.d > 0 ? 'pos' : 'neg');
    c.d = d;
    c.pend.hidden = !r.pending;
    c.pend.textContent = `${fmtPts(r.pending)} chờ duyệt`;
    cats.forEach((k, i) => {
      c.vals[i].textContent = fmtNum(r.byCat[k.id]);
      setBar(c.bars[i], Math.max(0, r.byCat[k.id]) / maxCat[k.id], 80 * i);
    });
    memo.set(r.group.id, { v: r.total, d, f: c.bars.map(b => b._f) });
  }

  function renderBoard(cats) {
    const ranked = rankGroups(S.groups, S.entries, cats, S.config.currentCycleId);
    const maxCat = {};
    cats.forEach(k => { maxCat[k.id] = Math.max(1, ...ranked.map(r => r.byCat[k.id])); });
    const since = startOfDay(Date.now()), mine = getSession()?.groupId;
    if (!done) board.replaceChildren();
    const next = ranked.map(r => {
      let c = cards.get(r.group.id);
      if (!c) cards.set(r.group.id, (c = makeCard(cats, r.group.id)));
      paint(c, r, cats, maxCat, mine, since);
      return c;
    });
    next.forEach((c, i) => { c.id = ranked[i].group.id; });
    for (const [id, c] of cards) if (!ranked.some(r => r.group.id === id)) { c.el.remove(); cards.delete(id); }
    const key = ranked.map(r => r.group.id).join();
    const apply = () => next.forEach(c => board.append(c.el));
    if (!done && memoOrder) { // remount: start in the previously shown order, then FLIP to the new one
      const prev = memoOrder.split(',');
      [...next].sort((a, b) => prev.indexOf(a.id) - prev.indexOf(b.id)).forEach(c => board.append(c.el));
      key !== memoOrder ? flip(board, apply) : apply();
    } else done && key !== order ? flip(board, apply) : apply();
    if (!done) { if (!memoOrder) stagger(board.children); done = true; }
    order = memoOrder = key;
  }

  function renderLatest() {
    const gm = new Map(S.groups.map(g => [g.id, g])), sm = new Map(S.students.map(s => [s.id, s]));
    const rows = S.entries.filter(e => e.status !== 'void').sort((a, b) => b.at - a.at).slice(0, 5)
      .map(e => entryRow(e, { group: gm.get(e.groupId), student: sm.get(e.studentId) }));
    latest.replaceChildren(...(rows.length ? rows : [emptyState({ icon: 'clock', title: 'Chưa có điểm nào', text: 'Điểm mới sẽ hiện ở đây.' })]));
    if (!latestDone && rows.length) { stagger(latest.children); latestDone = true; }
  }

  function update() {
    if (!COLS.every(k => S[k] !== undefined)) return;
    const info = cycleInfo(S.cycles.find(c => c.id === S.config.currentCycleId), S.config.cycleWeeks);
    sub.textContent = info ? `Vòng ${info.n} · tuần ${info.week}/${info.weeks} · còn ${info.daysLeft} ngày` : '';
    const dg = S.groups.find(g => g.id === S.duty.find(d => d.id === weekKey(Date.now()))?.groupId);
    duty.replaceChildren(...(dg ? [chip([dot(dg.color), `Tổ trực tuần này: ${dg.name}`], 'duty-chip')] : []));
    renderBoard(S.config.categories);
    renderLatest();
  }
  const subs = COLS.map(c => store.on(c, v => { S[c] = v; update(); }));
  return { el, destroy: () => subs.forEach(u => u()) };
}
