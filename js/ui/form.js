// Shared form helpers for admin/dev sections: fields, inputs, selects, confirm + form sheets, clipboard.
import { h } from './dom.js';
import { openSheet } from './sheet.js';
import { toast } from './toast.js';
import { icon } from './icons.js';
import { errMsg } from './act.js';
import { logError } from '../errors.js';

export const field = (label, control, hint) => h('label', { class: 'field' },
  h('span', { class: 'field-l' }, label), control, hint && h('span', { class: 'hint' }, hint));
export const textInput = (value = '', props = {}) => h('input', { class: 'input', type: 'text', autocomplete: 'off', maxlength: '80', value, ...props });
export const numberInput = (value = 0, props = {}) => h('input', { class: 'input', type: 'number', step: '1', inputmode: 'numeric', value, ...props });
export const textArea = (value = '', props = {}) => { const t = h('textarea', { class: 'input textarea', rows: '5', ...props }); t.value = value; return t; };
// options: [{value,label}] or strings
export function selectInput(options, value, props = {}) {
  const s = h('select', { class: 'input', ...props }, options.map(o => {
    const { value: v, label } = typeof o === 'string' ? { value: o, label: o } : o;
    return h('option', { value: v }, label);
  }));
  if (value != null) s.value = value;
  return s;
}
// returns label element; read .input.checked
export function checkInput(label, checked = false) {
  const input = h('input', { type: 'checkbox', class: 'check' });
  input.checked = !!checked;
  const el = h('label', { class: 'check-row' }, input, h('span', null, label));
  el.input = input;
  return el;
}
export function errBox() { return h('div', { class: 'form-err', role: 'alert', hidden: true }); }
const showErr = (box, e) => { logError('form', e); box.textContent = errMsg(e); box.hidden = false; };

// formSheet({title, body:[nodes], submit:'Lưu', onSubmit}) ; onSubmit may throw -> shown inline; resolves -> closes.
export function formSheet({ title, body, submit = 'Lưu', danger = false, onSubmit }) {
  const err = errBox();
  const ok = h('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), type: 'submit' }, submit);
  const form = h('form', { class: 'form', novalidate: true }, body, err,
    h('div', { class: 'row-btns' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => sh.close() }, 'Hủy'), ok));
  const sh = openSheet({ title, content: form });
  form.addEventListener('submit', async ev => {
    ev.preventDefault(); err.hidden = true; ok.disabled = true;
    try { await onSubmit(); sh.close(); } catch (e) { ok.disabled = false; showErr(err, e); }
  });
  setTimeout(() => form.querySelector('input:not([type=checkbox]),textarea,select')?.focus(), 60);
  return sh;
}
// confirmSheet({title,text,label,danger=true,requireText,onConfirm}); requireText = word the user must type.
export function confirmSheet({ title, text, label = 'Xác nhận', danger = true, requireText, onConfirm, extra }) {
  const typed = requireText && textInput('', { placeholder: `Gõ ${requireText} để xác nhận`, 'aria-label': 'Xác nhận' });
  return formSheet({ title, submit: label, danger, body: [text && h('p', { class: 'muted' }, text), extra, typed],
    onSubmit: async () => {
      if (typed && typed.value.trim().toLowerCase() !== requireText.toLowerCase()) throw new Error(`Cần gõ ${requireText}.`);
      await onConfirm();
    } });
}
export async function copyText(text, msg = 'Đã sao chép') {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const t = h('textarea', { style: { position: 'fixed', opacity: '0' } }); t.value = text; document.body.append(t); t.select();
    try { ok = document.execCommand('copy'); } catch {} t.remove();
  }
  toast(ok ? msg : 'Không sao chép được, hãy chọn và chép tay');
  return ok;
}
export function download(name, text, type = 'application/json') {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// List row used by every admin/dev section.
export const iconBtn = (ic, label, onclick, cls = '') => h('button', { class: 'icon-btn pressable ' + cls, type: 'button', 'aria-label': label, onclick }, icon(ic, 20));
export const arow = ({ lead, name, sub, off, actions = [] }) => h('div', { class: 'arow' + (off ? ' is-off' : '') }, lead,
  h('div', { class: 'arow-main' }, h('div', { class: 'arow-name' }, name), sub && h('div', { class: 'arow-sub' }, sub)), actions);
export const COLOR_IDS = ['blue', 'green', 'orange', 'purple', 'teal', 'pink', 'amber', 'slate'];
// colour picker -> {el, get()}
export function colorPicker(value) {
  let cur = value || 'blue';
  const btns = COLOR_IDS.map(c => h('button', { type: 'button', class: `g-${c}`, 'aria-label': c, 'aria-pressed': String(c === cur),
    onclick: () => { cur = c; btns.forEach((b, i) => b.setAttribute('aria-pressed', String(COLOR_IDS[i] === c))); } }, h('span', { class: `dot g-${c}`, style: { width: '20px', height: '20px' } })));
  return { el: h('div', { class: 'colors', role: 'group', 'aria-label': 'Màu tổ' }, btns), get: () => cur };
}
