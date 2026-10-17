// Tôi: my card, role cards (phone), theme, install hint, sign out, version.
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import * as store from '../data/store.js';
import { personalPoints, rankGroups } from '../scoring.js';
import { fmtPts, fmtNum } from '../format.js';
import { chip, dot, pageHeader, live, entryRow, entrySheet, themeToggle, emptyState } from '../ui/components.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { getSession, can, role, ROLE_LABEL } from '../session.js';
import { APP_VERSION } from '../config.js';

const link = (href, ic, label, badge) => h('a', { class: 'row-link pressable', href },
  icon(ic, 22), h('span', { class: 'grow' }, label), badge ? h('span', { class: 'badge' }, badge) : null, icon('chevron', 20));

function installHint() {
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return null;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Cài ứng dụng')),
    h('p', { class: 'muted' }, ios ? 'Trên iPhone/iPad: bấm nút Chia sẻ (Share) rồi chọn “Thêm vào Màn hình chính” (Add to Home Screen).'
      : 'Mở menu của trình duyệt và chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.'));
}

// TEMP: "Chốt vòng" lives here until admin/* (phase 4) provides it.
function closeFlow(S) {
  const cid = S.config.currentCycleId, n = S.cycles.find(c => c.id === cid)?.n;
  const ranked = rankGroups(S.groups, S.entries, S.config.categories, cid);
  const pend = S.entries.filter(e => e.status === 'pending').length;
  const ok = h('button', { class: 'btn btn-danger', type: 'button' }, `Chốt vòng ${n}`);
  const sh = openSheet({ title: `Chốt vòng ${n}?`, content: h('div', { class: 'form' },
    h('p', { class: 'muted' }, `Bảng điểm vòng ${n} được lưu lại (chỉ xem) và vòng ${n + 1} bắt đầu lại từ điểm gốc. Không hoàn tác được.`),
    h('div', null, ranked.map(r => h('div', { class: 'mem' }, h('span', { class: 'rank' }, r.rank), h('div', { class: 'mem-name' }, r.group.name), h('strong', null, fmtNum(r.total))))),
    pend ? h('div', { class: 'form-err' }, `Còn ${pend} điểm chờ duyệt. Điểm này sẽ không được tính nếu chưa duyệt.`) : null,
    h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => sh.close() }, 'Không'), ok)) });
  ok.onclick = async () => {
    ok.disabled = true;
    try { await store.closeCycle(); sh.close(); toast(`Đã chốt vòng ${n}, bắt đầu vòng ${n + 1}`); }
    catch (e) { ok.disabled = false; toast(e.message || 'Không chốt được'); }
  };
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
    const cards = [can('approve') && link('#/duyet', 'check', 'Duyệt điểm', pending), can('manage') && link('#/quanly', 'settings', 'Quản lý'),
      can('dev') && link('#/dev', 'shield', 'Công cụ dev')].filter(Boolean);
    const pts = mineAbout ? personalPoints(s.studentId, S.entries, S.config.currentCycleId) : null;
    return [
      pageHeader('Tôi'),
      cards.length ? h('div', { class: 'stack me-cards' }, cards.map(c => (c.classList.add('only-phone'), c))) : null,
      h('section', { class: 'card' },
        h('div', { class: 'sec-h' }, h('h2', null, s.name || 'Khách'), chip(r === 'dev' ? ROLE_LABEL.dev : ROLE_LABEL[r])),
        h('div', { class: 'g-stats' }, g && chip([dot(g.color), g.name]), title && chip(title.name)),
        pts !== null && h('div', { class: 'kv' }, h('span', { class: 'muted' }, 'Điểm cá nhân vòng này'), h('span', { class: 'me-big' }, fmtPts(pts)))),
      h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, mineAbout ? 'Điểm của tôi' : 'Điểm tôi đã ghi')),
        mine.length ? mine.map(e => entryRow(e, { group: gm.get(e.groupId), student: sm.get(e.studentId), onOpen: x => entrySheet(x, { group: gm.get(x.groupId), student: sm.get(x.studentId) }) }))
          : emptyState({ icon: 'clock', title: 'Chưa có điểm nào' })),
      can('close') ? h('section', { class: 'card' }, h('div', { class: 'sec-h' }, h('h2', null, 'Chốt vòng')),
        h('p', { class: 'muted', style: { marginBottom: '12px' } }, 'Lưu bảng điểm vòng này và bắt đầu vòng mới.'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => closeFlow(S) }, 'Chốt vòng…')) : null,
      h('section', { class: 'card' }, h('div', { class: 'setting' }, h('span', null, 'Giao diện sáng/tối'), themeToggle())),
      installHint(),
      h('section', { class: 'card' },
        h('button', { class: 'btn btn-ghost', style: { width: '100%' }, onclick: () => store.signOut() }, 'Đăng xuất'),
        h('p', { class: 'muted', style: { textAlign: 'center', marginTop: '12px', fontSize: '13px' } }, `aaba ${APP_VERSION}`)),
    ];
  });
  return { el: h('div', { class: 'view narrow' }, body), destroy: stop };
}
