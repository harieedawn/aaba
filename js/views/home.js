// Home: header, leaderboard (FLIP / count-up / bar grow / stagger), "Hoạt động gần đây".
import { h, put } from '../ui/dom.js';
import * as store from '../data/store.js';
import { rankGroups, deltaSince } from '../scoring.js';
import { fmtNum, fmtPts, cycleInfo, startOfDay } from '../format.js';
import { bell, themeToggle, entryRow, skeletonCards, emptyState } from '../ui/components.js';
import { countUp, flip, stagger, floatDelta } from '../ui/anim.js';
import { getSession, can, role } from '../session.js';

const memo = new Map(); let memoOrder = ''; // last shown values: remount animates from them
const COLS = ['config', 'groups', 'students', 'entries', 'cycles'];

function makeCard(cats, id) {
  const c = { v: 0, d: 0 };
  c.rank = h('span', { class: 'rank' });
  c.name = h('span', { class: 'lb-name' });
  c.mine = h('span', { class: 'tag', hidden: true }, 'Tổ của bạn');
  c.tile = h('span', { class: 'tile' });
  c.total = h('span', { class: 'lb-total' }, '0');
  c.today = h('div', { class: 'hero-today' });
  c.sub = h('div', { class: 'lb-sub' });
  c.pend = h('span');
  c.el = h('a', { class: 'lb-row pressable' });
  const m = memo.get(id);
  if (m) { c.v = m.v; c.d = m.d; c.total._v = m.v; c.total.textContent = fmtNum(m.v); c.fresh = false; } else c.fresh = true;
  return c;
}

export default function home() {
  const S = {}, cards = new Map();
  let order = '', done = false, latestDone = false;
  const hello = h('h1', { class: 'hello' }), lead = h('p', { class: 'lead' });
  const wk = h('div', { class: 'weekbar', 'aria-hidden': 'true' }), wkT = h('div', { class: 'wk-t' });
  const hero = h('div'), board = h('div', { class: 'lb' }, skeletonCards(4));
  const side = h('div', { class: 'side-stack side' });
  const latest = h('div', { class: 'entries' });
  const el = h('div', { class: 'view home' },
    h('header', { class: 'hdr' }, h('div', { class: 'hdr-main' }, hello, lead), bell(), themeToggle()),
    h('div', { class: 'hdr-prog' }, wk, wkT),
    h('div', { class: 'home-grid' },
      h('section', { 'aria-label': 'Bảng xếp hạng' }, board),
      side));

  function paint(c, r, cats, mine, since) {
    const top = r.rank === 1, g = r.group;
    c.el.className = (top ? `lb-hero pressable g-${g.color}` : `lb-row pressable g-${g.color}`) + (g.id === mine ? ' mine' : '');
    c.el.href = '#/to/' + g.id;
    c.el.setAttribute('aria-label', `Hạng ${r.rank}, ${g.name}, ${fmtNum(r.total)} điểm`);
    c.rank.textContent = r.rank;
    c.tile.textContent = ((g.name || '?').match(/\d+/) || [(g.name || '?')[0]])[0];
    c.name.textContent = g.name;
    c.mine.hidden = g.id !== mine;
    c.total.className = top ? 'hero-score' : 'lb-total';
    countUp(c.total, r.total);
    const d = deltaSince(g.id, S.entries, since);
    c.today.textContent = d ? `${fmtPts(d)} hôm nay` : 'Chưa có điểm hôm nay';
    c.sub.textContent = cats.map(k => `${k.name} ${fmtNum(r.byCat[k.id])}`).join(' · ');
    if (!c.fresh && d !== c.d) floatDelta(c.total, fmtPts(d - c.d), d - c.d > 0 ? 'pos' : 'neg');
    c.fresh = false; c.d = d;
    const rankLab = h('div', { class: 'hero-rank' }, 'Dẫn đầu');
    if (top) put(c.el, rankLab, h('div', { class: 'hero-name' }, c.name, c.mine), c.total, c.today);
    else put(c.el, c.rank, c.tile, h('div', { class: 'lb-id' }, h('div', { class: 'lb-name-row' }, c.name, c.mine), c.sub), h('div', { class: 'lb-score' }, c.total));
    memo.set(g.id, { v: r.total, d });
  }

  function renderBoard(cats) {
    const ranked = rankGroups(S.groups, S.entries, cats, S.config.currentCycleId);
    const since = startOfDay(Date.now()), mine = getSession()?.groupId;
    if (!done) put(board);
    const next = ranked.map(r => {
      let c = cards.get(r.group.id);
      if (!c) cards.set(r.group.id, (c = makeCard(cats, r.group.id)));
      paint(c, r, cats, mine, since);
      return c;
    });
    next.forEach((c, i) => { c.id = ranked[i].group.id; });
    for (const [id, c] of cards) if (!ranked.some(r => r.group.id === id)) { c.el.remove(); cards.delete(id); }
    const key = ranked.map(r => r.group.id).join();
    const apply = () => next.forEach(c => board.append(c.el));
    if (!done && memoOrder) {
      const prev = memoOrder.split(',');
      [...next].sort((a, b) => prev.indexOf(a.id) - prev.indexOf(b.id)).forEach(c => board.append(c.el));
      key !== memoOrder ? flip(board, apply) : apply();
    } else done && key !== order ? flip(board, apply) : apply();
    if (!done) { if (!memoOrder) stagger(board.children); done = true; }
    order = memoOrder = key;
    return ranked;
  }

  function renderSide(ranked) {
    const gm = new Map(S.groups.map(g => [g.id, g])), sm = new Map(S.students.map(x => [x.id, x]));
    const rows = S.entries.filter(e => e.status !== 'void').sort((a, b) => b.at - a.at).slice(0, 5)
      .map(e => entryRow(e, { group: gm.get(e.groupId), student: sm.get(e.studentId) }));
    put(latest, ...(rows.length ? rows : [emptyState({ icon: 'clock', title: 'Chưa có điểm nào', text: 'Điểm mới sẽ hiện ở đây.' })]));
    if (!latestDone && rows.length) { stagger(latest.children); latestDone = true; }
    const pend = S.entries.filter(e => e.status === 'pending');
    const myPend = pend.filter(e => e.groupId === getSession()?.groupId).length;
    const cards = [];
    if (can('approve')) cards.push(h('section', { class: 'card need' }, h('div', null, h('b', null, 'Cần xác nhận'), h('div', { class: 'muted' }, pend.length ? `${pend.length} điểm đang chờ` : 'Không có điểm nào đang chờ')),
      h('a', { class: 'btn pressable', href: '#/duyet' }, 'Xem')));
    else if (role() === 'recorder' && myPend) cards.push(h('section', { class: 'card' }, h('b', null, `${myPend} điểm đang chờ xác nhận`)));
    cards.push(h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Hoạt động gần đây'), h('a', { class: 'link', href: '#/lichsu' }, 'Xem tất cả')), latest));
    put(side, ...cards);
  }

  function update() {
    if (!COLS.every(k => S[k] !== undefined)) return;
    const ss = getSession(), first = (ss?.name || '').trim().split(/\s+/).pop();
    hello.textContent = first ? `Chào ${first}` : 'Chào bạn';
    const info = cycleInfo(S.cycles.find(c => c.id === S.config.currentCycleId), S.config.cycleWeeks);
    wkT.textContent = info ? `Đợt ${info.n} · tuần ${info.week}/${info.weeks} · còn ${info.daysLeft} ngày` : '';
    put(wk, ...(info ? Array.from({ length: info.weeks }, (_, i) => h('i', { class: i < info.week ? 'on' : '' })) : []));
    const ranked = renderBoard(S.config.categories);
    const [a, b] = ranked;
    lead.textContent = !a || !S.entries.length ? 'Chưa có điểm nào trong đợt này.'
      : !b ? `${a.group.name} đang dẫn đầu.`
      : a.total === b.total ? `${a.group.name} và ${b.group.name} đang bằng điểm.`
      : `${a.group.name} đang dẫn đầu, hơn ${b.group.name} ${fmtNum(a.total - b.total)} điểm.`;
    renderSide(ranked);
  }
  const subs = COLS.map(c => store.on(c, v => { S[c] = v; update(); }));
  return { el, destroy: () => subs.forEach(u => u()) };
}
