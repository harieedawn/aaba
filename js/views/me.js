// Tôi: my card, role cards (phone), theme, install hint, sign out, version.
import { h } from '../ui/dom.js';
import { namePicker, notifRow } from './me-parts.js';
import { titleNames } from '../titles.js';
import { notifs, lastSeen, markSeen } from '../notify.js';
import { icon } from '../ui/icons.js';
import * as store from '../data/store.js';
import { personalPoints } from '../scoring.js';
import { weekStart, WEEK } from '../weeks.js';
import { fmtPts } from '../format.js';
import { pageHeader, live, entryRow, entrySheet, emptyState } from '../ui/components.js';
import { getSession, can, role, setPreview, ROLE_LABEL, getThemePref, setTheme } from '../session.js';
import { APP_VERSION } from '../config.js';
import { act } from '../ui/act.js';

const link = (href, ic, label, badge) => h('a', { class: 'row-link pressable', href },
  icon(ic, 22), h('span', { class: 'grow' }, label), badge ? h('span', { class: 'badge' }, badge) : null, icon('chevron', 20));

const initials = n => { const w = String(n || '?').trim().split(/\s+/); return ((w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2))).toUpperCase(); };

function themeSeg() {
  const opts = [['light', 'Sáng'], ['dark', 'Tối'], ['auto', 'Tự động']];
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Giao diện' });
  const paint = () => [...seg.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === getThemePref())));
  opts.forEach(([v, l]) => seg.append(h('button', { type: 'button', 'data-v': v, onclick: () => { setTheme(v); paint(); } }, l)));
  paint();
  return seg;
}

function installHint() {
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return null;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Cài ứng dụng')),
    h('p', { class: 'muted' }, ios ? 'Trên iPhone/iPad: bấm nút Chia sẻ (Share) rồi chọn “Thêm vào Màn hình chính” (Add to Home Screen).'
      : 'Mở menu của trình xác nhận và chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.'));
}

export default function me() {
  const body = h('div', { class: 'stack' }), seenAtOpen = lastSeen();
  const sid = getSession()?.studentId || null;
  const src = { // my entries (studentId==me, any week) or, without a student, this week's; pending only for staff
    entries: cb => (sid ? store.studentEntries(sid, cb) : store.onWeek(m => cb(m.entries))),
    pending: cb => (can('approve') ? store.pendingEntries(cb) : (queueMicrotask(() => cb([])), () => {})),
  };
  const stop = live(body, ['config', 'groups', 'students', 'entries', 'pending'], S => {
    const s = getSession(), r = role(), guest = s.role === 'guest';
    const codeLink = h('section', { class: 'card' }, h('a', { class: 'link', href: '#/join' }, 'Tôi có mã đăng nhập'));
    if (guest && !s.studentId) return [pageHeader('Tôi'), namePicker(S.groups, S.students), codeLink, h('section', { class: 'card' }, h('h2', { class: 'sec-h' }, 'Giao diện'), themeSeg())];
    queueMicrotask(markSeen);
    const nf = notifs().slice(0, 20);
    const g = S.groups.find(x => x.id === s.groupId), me0 = S.students.find(x => x.id === s.studentId), tn = titleNames(me0 || s, S.config.titles);
    const pending = S.pending.length, ws = weekStart(Date.now());
    const mineAbout = !!s.studentId;
    const mine = S.entries.filter(e => (mineAbout ? e.studentId === s.studentId : e.by === s.uid) && e.status !== 'void').sort((a, b) => b.at - a.at).slice(0, 50);
    const gm = new Map(S.groups.map(x => [x.id, x])), sm = new Map(S.students.map(x => [x.id, x]));
    const cards = [can('approve') && link('#/duyet', 'check', 'Cần xác nhận', pending), can('manage') && link('#/quanly', 'settings', 'Quản lý'),
      role() === 'dev' && link('#/dev', 'shield', 'Công cụ dev')].filter(Boolean);
    const pts = mineAbout ? personalPoints(s.studentId, S.entries.filter(e => e.at >= ws && e.at < ws + WEEK)) : null;
    return [
      pageHeader('Tôi'),
      cards.length ? h('div', { class: 'stack me-cards' }, cards.map(c => (c.classList.add('only-phone'), c))) : null,
      h('section', { class: 'card' },
        h('div', { class: 'prof' }, h('span', { class: 'tile', 'aria-hidden': 'true' }, initials(s.name)),
          h('div', null, h('h2', null, s.name || 'Khách'),
            h('div', { class: 'muted' }, [ROLE_LABEL[r], tn, g?.name].filter(Boolean).join(' · ')))),
        pts !== null && h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Điểm tuần này'), h('span', { class: 'me-big' }, fmtPts(pts)))),
      s.studentId && h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Thông báo')),
        nf.length ? nf.map(e => notifRow(e, e.at > seenAtOpen)) : emptyState({ icon: 'clock', title: 'Chưa có thông báo', text: 'Khi có điểm cộng hoặc trừ cho bạn, thông báo sẽ hiện ở đây.' }),
        h('p', { class: 'muted', style: { fontSize: '13px', marginTop: '12px' } }, 'Thông báo hiện khi bạn mở aaba')),
      h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, mineAbout ? 'Điểm của tôi' : 'Điểm tôi đã ghi tuần này')),
        mine.length ? mine.map(e => entryRow(e, { group: gm.get(e.groupId), student: sm.get(e.studentId), onOpen: x => entrySheet(x, { group: gm.get(x.groupId), student: sm.get(x.studentId) }) }))
          : emptyState({ icon: 'clock', title: 'Chưa có điểm nào', text: 'Điểm sẽ hiện ở đây khi có.' })),
      getSession().role === 'dev' && role() !== 'dev' ? h('section', { class: 'card' }, h('div', { class: 'setting' }, h('span', null, `Đang xem như: ${ROLE_LABEL[role()]}`),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => setPreview(null) }, 'Thoát xem thử'))) : null,
      h('section', { class: 'card' }, h('h2', { class: 'sec-h' }, 'Giao diện'), themeSeg()),
      installHint(),
      guest ? h('section', { class: 'card stack' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: ev => act(() => store.pickStudent(null), { btn: ev.currentTarget }) }, 'Đổi tên'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: ev => act(() => store.leaveGuest(), { btn: ev.currentTarget }) }, 'Đăng xuất'),
        h('a', { class: 'link', href: '#/join' }, 'Tôi có mã đăng nhập'),
        h('p', { class: 'muted', style: { textAlign: 'center', fontSize: '13px' } }, `aaba ${APP_VERSION}`))
      : h('section', { class: 'card' },
        h('button', { class: 'btn btn-ghost', style: { width: '100%' }, onclick: ev => act(() => store.signOut(), { btn: ev.currentTarget }) }, 'Đăng xuất'),
        h('p', { class: 'muted', style: { textAlign: 'center', marginTop: '12px', fontSize: '13px' } }, `aaba ${APP_VERSION}`)),
    ];
  }, { src });
  return { el: h('div', { class: 'view narrow' }, body), destroy: stop };
}
