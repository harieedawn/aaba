// Tổng kết (#/tongket[/:mode/:key]): Tuần | Tháng | 3 tháng. Readable by every role.
import { h, put } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import * as W from '../../weeks.js';
import { icon } from '../../ui/icons.js';
import { can } from '../../session.js';
import { navigate } from '../../router.js';
import { pageHeader, skeletonCards, emptyState } from '../../ui/components.js';
import { renderWeek } from './week.js';
import { multiView } from './multi.js';
import { adminExtras } from './admin.js';
import { currentWeekSheet } from '../chieu/notice.js';

const MODES = [['tuan', 'Tuần'], ['thang', 'Tháng'], ['quy', '3 tháng']];
const go = (m, k) => navigate(`/tongket/${m}/${k}`);

export default function tongket({ params: [pm, pk] }) {
  const cur = W.weekStart(Date.now()), prev = W.addWeeks(cur, -1), curMonth = W.monthOfWeek(cur).key;
  let mode = MODES.some(m => m[0] === pm) ? pm : 'tuan', key = pk;
  if (mode === 'tuan' ? W.keyToStart(key) == null : !W.parseMonth(key)) { key = mode === 'tuan' ? W.weekKey(prev) : W.monthOfWeek(prev).key; if (pm) setTimeout(() => go(mode, key), 0); }
  const M = {}, S = { pend: 0 };
  let sub = null, tok = 0, gone = false;
  const banner = h('div'), nav = h('div', { class: 'wknav' }), seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Kiểu tổng kết' }), body = h('div', { class: 'stack' }, ...skeletonCards(3));
  const presLink = h('a', { class: 'btn btn-ghost tk-pres', href: '#/chieu/' + key, onclick: e => { if (W.keyToStart(key) !== cur || e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); const k = key; currentWeekSheet(W.daysLeft(Date.now()), () => navigate('/chieu/' + k)); } }, icon('present', 20), 'Trình chiếu'), presRow = h('div', { class: 'tk-pres-row' }, presLink);
  const reload = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => load(true) }, 'Tải lại');
  const el = h('div', { class: 'view narrow tk' }, pageHeader('Tổng kết'), banner, seg, presRow, nav, h('p', { class: 'muted tk-note' }, 'Tuần tính vào tháng của ngày thứ 6'), body, h('div', { class: 'tk-reload' }, reload));
  const ready = () => ['config', 'groups', 'students'].every(k => M[k] !== undefined);

  function head() {
    presLink.href = '#/chieu/' + key; presRow.hidden = mode !== 'tuan';
    const conv = m => (m === 'tuan' ? W.weekKey(Math.min(cur, W.weeksOfMonth(mode === 'tuan' ? W.monthOfWeek(W.keyToStart(key)).key : key).slice(-1)[0] ?? cur)) : mode === 'tuan' ? W.monthOfWeek(W.keyToStart(key)).key : key);
    put(seg, ...MODES.map(([m, l]) => h('button', { type: 'button', 'aria-pressed': String(m === mode), onclick: () => m !== mode && go(m, conv(m)) }, l)));
    const w = mode === 'tuan', s = w && W.keyToStart(key);
    const lab = w ? W.label(s) : mode === 'thang' ? W.monthLabel(key) : `${W.monthLabel(W.addMonths(key, -2))} → ${W.monthLabel(key)}`;
    const nxt = w ? W.weekKey(W.addWeeks(s, 1)) : W.addMonths(key, 1), prv = w ? W.weekKey(W.addWeeks(s, -1)) : W.addMonths(key, -1);
    const last = w ? s >= cur : key >= curMonth;
    const btn = (ic, l, k, off) => h('button', { class: 'icon-btn pressable', type: 'button', 'aria-label': l, disabled: off, onclick: () => go(mode, k) }, icon(ic, 20));
    put(nav, btn('chevron-left', w ? 'Tuần trước' : 'Tháng trước', prv, false), h('div', { class: 'wknav-t' }, h('b', null, lab),
      h('span', { class: w && s === cur ? 'pill-live' : 'muted' }, w ? (s === cur ? 'đang diễn ra' : W.monthLabel(W.monthOfWeek(s).key)) : mode === 'quy' ? '3 tháng gần nhất' : '')), btn('chevron', w ? 'Tuần sau' : 'Tháng sau', nxt, last));
  }
  function load(fresh) {
    if (!ready()) return;
    sub?.(); sub = null; const t = ++tok;
    head();
    if (mode !== 'tuan') { const v = multiView({ mode, key, M, fresh }); sub = v.stop; put(body, v.el); return; }
    const s = W.keyToStart(key); put(body, ...skeletonCards(3));
    store.weekEntries(s, { fresh: fresh || s === cur }).then(r => {
      if (t !== tok || gone) return;
      const isCurrent = s === cur;
      put(body, ...renderWeek({ entries: r.entries, truncated: r.truncated, M, isCurrent, readOnly: !isCurrent && !can('backdate'), extra: adminExtras({ start: s, isCurrent, entries: r.entries, reload: () => load(true) }) }));
    }).catch(() => t === tok && put(body, emptyState({ icon: 'x', title: 'Không tải được', text: 'Kiểm tra mạng rồi thử lại.', action: { label: 'Thử lại', onClick: () => load(true) } })));
  }
  function paintBanner() {
    put(banner, ...(can('approve') && S.pend ? [h('a', { class: 'wk-card tk-pend', href: '#/duyet' }, h('b', null, `${S.pend} điểm chờ xác nhận`), h('span', null, 'Xem'))] : []));
  }
  const subs = ['config', 'groups', 'students'].map(c => store.on(c, v => { M[c] = v; if (ready() && !sub && !body.dataset.ok) { body.dataset.ok = '1'; load(false); } }));
  if (can('approve')) subs.push(store.pendingEntries(es => { S.pend = es.length; paintBanner(); }));
  const onInv = () => ready() && load(true);
  addEventListener('aaba:inv', onInv);
  head();
  return { el, destroy: () => { gone = true; sub?.(); subs.forEach(u => u()); removeEventListener('aaba:inv', onInv); } };
}
