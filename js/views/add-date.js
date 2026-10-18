// Ghi điểm: "Ngày xảy ra" row (admin/dev only). at() -> ms for a back-dated entry, null = normal (server time).
import { h } from '../ui/dom.js';
import { isoDate, noonOf, weekStart, label, DAY, dayMonth } from '../weeks.js';

export function dateRow({ orig = null, preset = null, onChange = () => {} } = {}) {
  const now = () => Date.now(), today = isoDate(now()), min = isoDate(now() - 199 * DAY), edit = orig != null;
  let mode = edit ? 'orig' : preset && preset !== today ? 'pick' : 'today', pick = preset || today;
  const date = h('input', { class: 'input', type: 'date', max: today, min, value: pick, 'aria-label': 'Chọn ngày', onchange: e => { pick = e.target.value; paint(); } });
  const opts = [...(edit ? [['orig', `Ngày cũ (${dayMonth(orig)})`]] : []), ['today', 'Hôm nay'], ['yday', 'Hôm qua'], ['pick', 'Chọn ngày']];
  const seg = h('div', { class: 'fchips', role: 'group', 'aria-label': 'Ngày xảy ra' }), line = h('div', { class: 'hint' });
  const el = h('div', { class: 'add-sec' }, h('div', { class: 'add-lab' }, 'Ngày xảy ra'), seg, date, line);
  const valid = () => mode !== 'pick' || (pick >= min && pick <= today && noonOf(pick) != null);
  // edits must be back-dated (rules: `replaces` only with a past `at`), so "today" = 2 minutes ago
  function at(forEdit = edit) {
    if (mode === 'orig') return orig;
    if (mode === 'yday') return noonOf(isoDate(now() - DAY));
    if (mode === 'pick' && pick !== today) return valid() ? noonOf(pick) : null;
    return forEdit ? now() - 120000 : null;
  }
  function paint() {
    seg.replaceChildren(...opts.map(([v, l]) => h('button', { class: 'fchip pressable', type: 'button', 'aria-pressed': String(v === mode), onclick: () => { mode = v; paint(); } }, l)));
    date.hidden = mode !== 'pick';
    if (!valid()) line.textContent = 'Ngày không hợp lệ (tối đa 199 ngày trước, không chọn ngày tương lai).';
    else {
      const ws = weekStart(at() ?? now());
      line.textContent = `Sẽ tính vào tuần ${label(ws)}${ws < weekStart(now()) ? ' (đã tổng kết)' : ''}`;
    }
    onChange();
  }
  paint();
  return { el, at, valid, reset() { mode = edit ? 'orig' : 'today'; pick = today; date.value = today; paint(); } };
}
