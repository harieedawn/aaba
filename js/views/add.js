// Ghi điểm: sheet flow. Tổ -> Học sinh -> Mục -> (qty) -> (note) -> big button.
import { h, put } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import * as store from '../data/store.js';
import { fmtPts, fmtNum } from '../format.js';
import { dot, pageHeader, live, entryRow, entrySheet, emptyState, weekSrc } from '../ui/components.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { getSession, can, role } from '../session.js';
import { navigate } from '../router.js';
import { act } from '../ui/act.js';
import { dateRow } from './add-date.js';
import { takeDraft } from '../ui/draft.js';
import { confirmSheet } from '../ui/form.js';
import { weekStart, label as wkLabel } from '../weeks.js';

const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
let lastGroup = null; // "Ghi tiếp" / next visit keeps the tổ
const fresh = g => ({ g, stu: undefined, cat: '', q: '', sq: '', rule: null, qty: 1, sign: 'neg' });

export default function add() {
  let D = null, sh = null, closing = false;
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config', 'groups', 'students', 'rules', 'entries'], (S, first) => { // entries = current week
    D = S;
    if (first) queueMicrotask(openFlow);
    const gm = new Map(S.groups.map(g => [g.id, g])), sm = new Map(S.students.map(s => [s.id, s]));
    const mine = S.entries.filter(e => e.by === getSession().uid).sort((a, b) => b.at - a.at).slice(0, 5);
    return [pageHeader('Ghi điểm', { sub: 'Điểm bạn ghi gần đây' }), h('section', { class: 'card' },
      mine.length ? mine.map(e => entryRow(e, { group: gm.get(e.groupId), student: sm.get(e.studentId), onOpen: x => entrySheet(x, { group: gm.get(x.groupId), student: sm.get(x.studentId) }) }))
        : emptyState({ icon: 'plus', title: 'Bạn chưa ghi điểm nào', text: 'Điểm bạn ghi sẽ hiện ở đây.' }))];
  }, { src: { entries: weekSrc } });

  function openFlow() {
    if (sh || !D) return;
    const me = getSession(), rec = role() === 'recorder';
    let st = fresh(rec ? me.groupId : D.groups.some(g => g.id === lastGroup) ? lastGroup : D.groups[0]?.id);
    let ready = false;
    const dr = takeDraft(); let ed = dr?.edit || null;
    if (ed) {
      const r0 = D.rules.find(x => x.id === ed.ruleId && x.active !== false);
      if (!r0) { toast('Nội dung này đã bị tắt hoặc xoá nên không sửa được.'); return navigate('/'); }
      st = { ...fresh(ed.groupId), stu: ed.studentId || 'G', rule: r0, qty: ed.qty, sign: ed.points < 0 ? 'neg' : 'pos' };
    }
    const dUi = can('backdate') ? dateRow({ orig: ed?.at ?? null, preset: dr?.date || null, onChange: () => ready && paintSubmit() }) : null;
    const eg = () => st.g;
    const lab = t => h('div', { class: 'add-lab' }, t);
    const stepH = (n, t) => h('div', { class: 'step-h' }, `Bước ${n}/3 · ${t}`);
    const signSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Loại điểm' });
    const gBox = h('div', { class: 'fchips tiles', role: 'group', 'aria-label': 'Tổ' });
    const sIn = h('input', { class: 'input', placeholder: 'Tìm học sinh', 'aria-label': 'Tìm học sinh', oninput: e => { st.sq = e.target.value; paintS(); } });
    const sChips = h('div', { class: 'pick' });
    const sSec = h('div', { class: 'add-sec' }, lab('Học sinh'), sIn, h('div', { style: { height: '8px' } }), sChips);
    const rIn = h('input', { class: 'input', placeholder: 'Tìm nội dung', 'aria-label': 'Tìm nội dung', oninput: e => { st.q = e.target.value; paintR(); } });
    const cats = h('div', { class: 'fchips' }), rList = h('div', { class: 'add-list' });
    const qOut = h('output', null, '1');
    const stepBtn = (d, t, l) => h('button', { class: 'pressable', type: 'button', 'aria-label': l, onclick: () => { st.qty = Math.min(99, Math.max(1, st.qty + d)); paintQ(); paintSubmit(); } }, icon(d > 0 ? 'plus' : 'minus', 20));
    const qSec = h('div', { class: 'add-sec' }, lab('Số lượng'), h('div', { class: 'stepper' }, stepBtn(-1, '', 'Giảm'), qOut, stepBtn(1, '', 'Tăng')));
    const note = h('input', { class: 'input', placeholder: 'Ghi chú (không bắt buộc)', 'aria-label': 'Ghi chú', maxlength: '500' });
    const submit = h('button', { class: 'btn', type: 'button' }), subHint = h('div', { class: 'hint', hidden: true });
    const form = h('div', null, h('div', { class: 'add-sec' }, stepH(1, 'Chọn tổ và học sinh'), gBox), sSec,
      h('div', { class: 'add-sec' }, stepH(2, 'Chọn nội dung'), signSeg, h('div', { style: { height: '8px' } }), rIn, h('div', { style: { height: '8px' } }), cats, rList), qSec,
      h('div', { class: 'add-sec' }, stepH(3, 'Xác nhận'), dUi?.el, note), h('div', { class: 'add-submit' }, submit, subHint));
    const cont = h('div', null, form);
    if (ed) note.value = ed.note || '';

    function paintG() {
      const cur = eg(), list = rec ? D.groups.filter(g => g.id === me.groupId) : D.groups;
      put(gBox, ...list.map(g => h('button', { class: 'fchip pressable', type: 'button', 'aria-pressed': String(g.id === cur), disabled: rec,
        onclick: () => { st.g = g.id; lastGroup = g.id; st.stu = undefined; paintAll(); } }, dot(g.color), g.name)));
    }
    function paintS() {
      const r = st.rule, g = eg();
      sSec.hidden = r?.scope === 'group';
      const q = norm(st.sq), ss = D.students.filter(s => s.groupId === g && norm(s.name).includes(q));
      const pick = (v, label) => h('button', { class: 'fchip pressable', type: 'button', 'aria-pressed': String(st.stu === v), onclick: () => { st.stu = v; paintS(); paintSubmit(); } }, label);
      put(sChips, ...(r?.scope === 'student' ? [] : [pick('G', 'Cả tổ')]), ...ss.map(s => pick(s.id, s.name)));
    }
    function paintR() {
      const q = norm(st.q), use = {};
      D.entries.forEach(e => { use[e.ruleId] = (use[e.ruleId] || 0) + 1; });
      const all = D.rules.filter(r => r.active !== false).sort((a, b) => a.order - b.order);
      const top = new Set(Object.entries(use).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id));
      const isHot = r => r.hot || top.has(r.id);
      put(cats, ...[['', 'Tất cả'], ...D.config.categories.map(c => [c.id, c.name])].map(([v, l]) => h('button', {
        class: 'fchip pressable', type: 'button', 'aria-pressed': String(st.cat === v), onclick: () => { st.cat = v; paintR(); } }, l)));
      put(signSeg, ...[['neg', 'Trừ điểm'], ['pos', 'Cộng điểm']].map(([v, l]) => h('button', { type: 'button', 'aria-pressed': String(st.sign === v),
        onclick: () => { st.sign = v; if (st.rule && (st.rule.points < 0) !== (v === 'neg')) st.rule = null; paintAll(); } }, l)));
      signSeg.classList.toggle('neg', st.sign === 'neg');
      const f = all.filter(r => (r.points < 0) === (st.sign === 'neg') && (!st.cat || r.cat === st.cat) && (!q || norm(r.name).includes(q)));
      const row = r => h('button', { class: 'rule-pick pressable', type: 'button', 'aria-pressed': String(st.rule?.id === r.id), onclick: () => pickRule(r) },
        h('span', { class: 'rule-main' }, h('span', null, r.name)),
        h('span', { class: 'amt ' + (r.points > 0 ? 'pos' : 'neg') }, fmtPts(r.points)));
      const hot = q || st.cat ? [] : f.filter(isHot), rest = q || st.cat ? f.sort((a, b) => isHot(b) - isHot(a)) : f.filter(r => !isHot(r));
      put(rList, ...(hot.length ? [lab('Thường dùng'), ...hot.map(row), lab('Tất cả nội dung')] : []), ...rest.map(row),
        ...(f.length ? [] : [h('p', { class: 'muted' }, 'Không tìm thấy nội dung nào.')]));
    }
    function pickRule(r) {
      st.rule = st.rule?.id === r.id ? null : r; st.qty = 1;
      if (st.rule?.scope === 'student' && st.stu === 'G') st.stu = undefined;
      paintAll();
    }
    function paintQ() { qSec.hidden = !st.rule?.perUnit; qOut.textContent = st.qty; }
    function paintSubmit() {
      const r = st.rule, gid = eg(), grp = D.groups.find(g => g.id === gid);
      const stuOk = r && (r.scope === 'group' || (r.scope === 'student' ? st.stu && st.stu !== 'G' : st.stu !== undefined));
      let text = '', ok = false;
      if (!r) text = 'Chọn nội dung';
      else if (!grp) text = 'Chọn tổ';
      else if (!can('record', { groupId: gid })) text = 'Bạn không được ghi cho tổ này';
      else if (!stuOk) text = r.scope === 'student' ? 'Chọn học sinh' : 'Chọn học sinh hoặc Cả tổ';
      else { ok = true; const n = fmtNum(Math.abs(r.points * st.qty)); text = r.points < 0 ? `Trừ ${n} điểm của ${grp.name}` : `Cộng ${n} điểm cho ${grp.name}`; }
      if (ok && dUi && !dUi.valid()) { ok = false; text = 'Chọn ngày hợp lệ'; }
      if (ok && ed) text = 'Lưu bản sửa';
      submit.textContent = text; submit.disabled = !ok; submit.className = 'btn' + (ok && r.points < 0 ? ' neg' : '');
      const wait = ok && rec && r.points > 0;
      subHint.hidden = !wait; subHint.textContent = wait ? 'Điểm cộng sẽ chờ giáo viên xác nhận.' : '';
    }
    const paintAll = () => { paintG(); paintS(); paintR(); paintQ(); paintSubmit(); };

    submit.onclick = () => {
      const r = st.rule, gid = eg(), studentId = r.scope === 'group' || st.stu === 'G' ? null : st.stu;
      const dt = dUi ? dUi.at(!!ed) : null, p = { groupId: gid, studentId, ruleId: r.id, qty: st.qty, note: note.value, at: dt };
      const save = async () => success(ed ? await store.editEntry(ed.id, p) : await store.addEntry(p));
      if (dt != null && weekStart(dt) !== weekStart(Date.now())) confirmSheet({ title: 'Ghi vào tuần đã tổng kết?', danger: false, label: ed ? 'Lưu bản sửa' : 'Ghi điểm',
        text: `Điểm sẽ được tính vào tuần ${wkLabel(weekStart(dt))}. Bảng tổng kết của tuần đó sẽ thay đổi.`, onConfirm: save });
      else act(save, { btn: submit });
    };
    function success(e) {
      const grp = D.groups.find(g => g.id === e.groupId), stu = D.students.find(s => s.id === e.studentId);
      const title = h('h2', null, e.status === 'pending' ? 'Đã gửi, chờ xác nhận' : ed ? 'Đã lưu bản sửa' : 'Đã ghi điểm');
      put(cont, h('div', { class: 'success' }, h('div', { class: 'success-ico' }, icon('check', 40, 'check-draw')), title,
        h('p', { class: 'muted' }, `${fmtPts(e.points)} điểm cho ${grp?.name || ''}${stu ? `, ${stu.name}` : ''}`),
        h('div', { class: 'row-btns', style: { width: '100%', marginTop: '8px' } },
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => sh.close() }, 'Xong'),
          h('button', { class: 'btn', type: 'button', onclick: () => { ed = null; dUi?.reset(); st = fresh(st.g); sIn.value = rIn.value = note.value = ''; put(cont, form); paintAll(); } }, 'Ghi tiếp'))));
      if (!ed) toast(`${fmtPts(e.points)} cho ${grp?.name || ''}`, { duration: 8000, action: { label: 'Hoàn tác', onClick: () =>
        act(async () => { await store.voidEntry(e.id, 'hoàn tác'); title.textContent = 'Đã hoàn tác'; }, { ok: 'Đã hoàn tác' }) } });
    }
    sh = openSheet({ title: ed ? 'Sửa điểm' : 'Ghi điểm', content: cont, onClose: () => { sh = null; if (!closing) navigate('/'); } });
    paintAll(); ready = true;
  }
  return { el: h('div', { class: 'view narrow' }, body), destroy: () => { closing = true; stop(); sh?.close(); } };
}
