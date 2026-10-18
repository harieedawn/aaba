// Tôi: my card, role cards (phone), theme, install hint, sign out, version.
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import * as store from '../data/store.js';
import { personalPoints } from '../scoring.js';
import { fmtPts } from '../format.js';
import { pageHeader, live, entryRow, entrySheet, emptyState } from '../ui/components.js';
import { getSession, can, role, setPreview, ROLE_LABEL, getThemePref, setTheme } from '../session.js';
import { APP_VERSION } from '../config.js';

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
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config', 'groups', 'students', 'entries', 'cycles'], S => {
    const s = getSession(), r = role();
    const g = S.groups.find(x => x.id === s.groupId), title = (S.config.titles || []).find(t => t.id === s.titleId);
    const pending = S.entries.filter(e => e.status === 'pending').length;
    const mineAbout = !!s.studentId;
    const mine = S.entries.filter(e => (mineAbout ? e.studentId === s.studentId : e.by === s.uid) && e.status !== 'void').sort((a, b) => b.at - a.at);
    const gm = new Map(S.groups.map(x => [x.id, x])), sm = new Map(S.students.map(x => [x.id, x]));
    const cards = [can('approve') && link('#/duyet', 'check', 'Cần xác nhận', pending), can('manage') && link('#/quanly', 'settings', 'Quản lý'),
      role() === 'dev' && link('#/dev', 'shield', 'Công cụ dev')].filter(Boolean);
    const pts = mineAbout ? personalPoints(s.studentId, S.entries, S.config.currentCycleId) : null;
    return [
      pageHeader('Tôi'),
      cards.length ? h('div', { class: 'stack me-cards' }, cards.map(c => (c.classList.add('only-phone'), c))) : null,
      h('section', { class: 'card' },
        h('div', { class: 'prof' }, h('span', { class: 'tile', 'aria-hidden': 'true' }, initials(s.name)),
          h('div', null, h('h2', null, s.name || 'Khách'),
            h('div', { class: 'muted' }, [ROLE_LABEL[r], title?.name, g?.name].filter(Boolean).join(' · ')))),
        pts !== null && h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Điểm cá nhân đợt này'), h('span', { class: 'me-big' }, fmtPts(pts)))),
      h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, mineAbout ? 'Điểm của tôi' : 'Điểm tôi đã ghi')),
        mine.length ? mine.map(e => entryRow(e, { group: gm.get(e.groupId), student: sm.get(e.studentId), onOpen: x => entrySheet(x, { group: gm.get(x.groupId), student: sm.get(x.studentId) }) }))
          : emptyState({ icon: 'clock', title: 'Chưa có điểm nào', text: 'Điểm sẽ hiện ở đây khi có.' })),
      getSession().role === 'dev' && role() !== 'dev' ? h('section', { class: 'card' }, h('div', { class: 'setting' }, h('span', null, `Đang xem như: ${ROLE_LABEL[role()]}`),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => setPreview(null) }, 'Thoát xem thử'))) : null,
      h('section', { class: 'card' }, h('h2', { class: 'sec-h' }, 'Giao diện'), themeSeg()),
      installHint(),
      h('section', { class: 'card' },
        h('button', { class: 'btn btn-ghost', style: { width: '100%' }, onclick: () => store.signOut() }, 'Đăng xuất'),
        h('p', { class: 'muted', style: { textAlign: 'center', marginTop: '12px', fontSize: '13px' } }, `aaba ${APP_VERSION}`)),
    ];
  });
  return { el: h('div', { class: 'view narrow' }, body), destroy: stop };
}
