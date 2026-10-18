// #/chao: cổng chọn danh tính. Học sinh chỉ chọn tổ + tên (lưu trên máy, không ghi Firestore) hoặc xem với tư cách khách.
import { h, put } from '../ui/dom.js';
import * as store from '../data/store.js';
import { logo, themeToggle, skeletonCards } from '../ui/components.js';
import { getSession, passGate } from '../session.js';
import { navigate } from '../router.js';
import { act } from '../ui/act.js';

const codeLink = () => h('a', { class: 'link', href: '#/join' }, 'Tôi có mã đăng nhập');

export default function chao() {
  const root = h('div', { class: 'chao' });
  const subs = [];
  let groups = null, students = null, step = 'home', gid = null;
  const s = getSession();
  const head = () => h('div', { class: 'sec-h' }, logo(), themeToggle());
  const back = (label, to) => h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { step = to; gid = null; paint(); } }, label);

  function paint() {
    if (!s) return put(root, head(), h('section', { class: 'card stack' },
      h('p', null, 'Lớp chưa mở xem tự do. Hãy nhập mã đăng nhập.'), codeLink()));
    if (s.role !== 'guest') return navigate('/');
    if (step === 'home') return put(root, head(), h('h1', null, 'Chào bạn'),
      h('button', { class: 'btn chao-opt', type: 'button', onclick: start }, 'Tôi là học sinh lớp 11A3'),
      h('button', { class: 'btn btn-ghost chao-opt', type: 'button', onclick: () => { passGate(); navigate('/'); } }, 'Tôi chỉ muốn xem (khách)'),
      h('div', { class: 'chao-code' }, codeLink()));
    if (!groups || !students) return put(root, head(), back('Quay lại', 'home'), ...skeletonCards(3));
    if (step === 'to') return put(root, head(), back('Quay lại', 'home'), h('h1', null, 'Tổ của bạn là?'),
      groups.length ? h('div', { class: 'chao-tiles' }, groups.map(g => h('button', {
        class: `chao-tile pressable g-${g.color || 'slate'}`, type: 'button', onclick: () => { gid = g.id; step = 'name'; paint(); } }, g.name)))
        : h('p', { class: 'muted' }, 'Chưa có tổ nào.'));
    const g = groups.find(x => x.id === gid) || {};
    const ss = students.filter(x => x.groupId === gid).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    put(root, head(), back('Đổi tổ', 'to'), h('h1', null, g.name || 'Chọn tên'),
      h('p', { class: 'muted' }, 'Chọn tên của bạn. Chỉ lưu trên máy này, để xem điểm và thông báo của bạn.'),
      ss.length ? h('div', { class: 'pick' }, ss.map(x => h('button', { class: 'fchip pressable', type: 'button',
        onclick: ev => act(async () => { passGate(); await store.pickStudent(x.id); navigate('/'); }, { btn: ev.currentTarget }) }, x.name)))
        : h('p', { class: 'muted' }, 'Chưa có học sinh'));
  }
  function start() {
    step = 'to';
    if (!subs.length) {
      subs.push(store.on('groups', v => { groups = v.sort((a, b) => a.order - b.order); step !== 'home' && paint(); }));
      subs.push(store.on('students', v => { students = v; step !== 'home' && paint(); }));
    }
    paint();
  }
  paint();
  return { el: h('div', { class: 'view' }, root), destroy: () => subs.forEach(u => u()) };
}
