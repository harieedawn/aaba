// Tham gia bằng mã đăng nhập: nhập mã -> (học sinh chọn tên, chỉ một lần) -> trang chủ.
import { h, put } from '../ui/dom.js';
import * as store from '../data/store.js';
import { BACKEND } from '../config.js';
import { logo, dot, themeToggle } from '../ui/components.js';
import { getSession } from '../session.js';
import { navigate } from '../router.js';
import { toast } from '../ui/toast.js';
import { act, errMsg } from '../ui/act.js';

const ERR = {
  empty: 'Hãy nhập mã gồm 20 ký tự.',
  bad: 'Mã không hợp lệ hoặc đã bị thu hồi. Kiểm tra lại mã hoặc hỏi người đã gửi cho bạn.',
  net: 'Không kết nối được. Kiểm tra mạng rồi thử lại.',
};
const clean = v => { const m = String(v).trim().match(/join\/([^/?#\s]+)/); return (m ? m[1] : String(v)).replace(/[\s-]+/g, ''); };

export default function join({ params }) {
  const root = h('div', { class: 'join' });
  let invites = [], unsub = null, demoBox = null;
  const needName = () => { const s = getSession(); return s?.role === 'student' && !s.studentId; };

  function showForm(code = '', err = '') {
    const input = h('input', { class: 'input', value: code, placeholder: 'Nhập mã 20 ký tự', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Mã tham gia', maxlength: '120' });
    const errEl = h('div', { class: 'form-err', role: 'alert', hidden: !err }, err);
    const btn = h('button', { class: 'btn btn-accent', type: 'button' }, 'Tham gia');
    const go = async raw => {
      const c = clean(raw ?? input.value);
      if (!c) { errEl.hidden = false; errEl.textContent = ERR.empty; return; }
      btn.disabled = true; errEl.hidden = true;
      let last;
      for (const k of [c, c.toLowerCase(), c.toUpperCase()]) {
        try { const m = await store.joinWithCode(k); return afterJoin(m); } catch (e) { last = e; }
      }
      btn.disabled = false; errEl.hidden = false;
      errEl.textContent = ['resource-exhausted', 'unavailable'].includes(last?.code) ? errMsg(last) : navigator.onLine ? ERR.bad : ERR.net;
    };
    btn.onclick = () => go();
    input.addEventListener('keydown', e => e.key === 'Enter' && go());
    const s = getSession();
    put(root, 
      h('div', { class: 'sec-h' }, logo(), themeToggle()),
      s?.role === 'guest' && h('a', { class: 'link', href: '#/' }, 'Xem mà không cần mã'),
      h('section', { class: 'card stack' },
        h('h1', null, 'Chào mừng đến aaba'),
        h('p', { class: 'muted' }, 'Nhập mã 20 ký tự thầy cô hoặc ban cán sự đưa.'),
        h('div', { class: 'form' }, input, errEl, btn)),
      BACKEND === 'local' ? (demoBox = h('div')) : null,
      s && s.role !== 'guest' && !needName() ? h('p', { class: 'muted', style: { marginTop: '24px', fontSize: '13px' } }, `Đang dùng: ${s.name}.`, ' ', h('a', { class: 'link', href: '#/' }, 'Về xếp hạng')) : null);
    paintDemo(input, go);
  }
  function paintDemo(input, go) {
    if (!demoBox) return;
    const act = invites.filter(i => i.active);
    put(demoBox, ...(act.length ? [h('div', { class: 'pick-g' }, 'Mã dùng thử (chế độ thử nghiệm)'),
      h('div', { class: 'pick' }, act.map(i => h('button', { class: 'fchip pressable', 'aria-pressed': 'false', onclick: () => { input.value = i.id; go(i.id); } }, `${i.label} (${i.role})`)))] : []));
    demoBox._p = () => paintDemo(input, go);
  }

  function afterJoin(m) {
    if (needName()) return showPicker();
    toast(`Chào ${m.name || 'bạn'}`);
    navigate('/');
  }

  async function showPicker() {
    let groups = [], students = [], sel = null, q = '';
    const list = h('div'), confirm = h('button', { class: 'btn', disabled: true, style: { width: '100%', marginTop: '16px' } }, 'Đây là tôi');
    const search = h('input', { class: 'input', placeholder: 'Tìm tên của bạn', 'aria-label': 'Tìm tên', oninput: e => { q = e.target.value.toLowerCase(); paint(); } });
    function paint() {
      put(list, ...groups.flatMap(g => {
        const ss = students.filter(s => s.groupId === g.id && s.name.toLowerCase().includes(q));
        return ss.length ? [h('div', { class: 'pick-g inl' }, dot(g.color), g.name), h('div', { class: 'pick' }, ss.map(s => h('button', {
          class: 'fchip pressable', 'aria-pressed': String(sel === s.id), onclick: () => { sel = s.id; confirm.disabled = false; paint(); } }, s.name)))] : [];
      }));
    }
    confirm.onclick = () => act(async () => { await store.claimStudent(sel); toast(`Chào ${getSession().name}`); navigate('/'); }, { btn: confirm });
    put(root, h('div', { class: 'sec-h' }, logo(), themeToggle()), h('h1', null, 'Bạn là ai?'),
      h('p', { class: 'muted', style: { margin: '8px 0 16px' } }, 'Chọn tên của bạn trong danh sách. Chỉ chọn được một lần, hãy chọn cẩn thận.'), search, list, confirm);
    const done = () => groups.length && students.length && paint();
    const u1 = store.on('groups', v => { groups = v.sort((a, b) => a.order - b.order); done(); });
    const u2 = store.on('students', v => { students = v; done(); });
    const prev = unsub; unsub = () => { prev?.(); u1(); u2(); };
  }

  if (BACKEND === 'local') unsub = store.on('invites', v => { invites = v; demoBox?._p?.(); });
  const code = params[0] ? clean(decodeURIComponent(params[0])) : '';
  if (needName() && !code) showPicker(); else { showForm(code); if (code) root.querySelector('.btn').click(); }
  return { el: h('div', { class: 'view' }, root), destroy: () => unsub?.() };
}
