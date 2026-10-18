// Bulk paste: "# Tổ 1" line then one name per line. Creates missing tổ, skips duplicate names in a tổ.
import { h } from '../../ui/dom.js';
import * as store from '../../data/store.js';
import { toast } from '../../ui/toast.js';
import { formSheet, textArea, COLOR_IDS } from '../../ui/form.js';

export function parseRoster(text) {
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) { out.push({ group: line.replace(/^#+\s*/, '').trim(), names: [] }); continue; }
    const name = line.replace(/^(?:[-*•]|\d+[.)])\s*/, '').trim();
    if (!out.length) throw new Error('Thiếu dòng tên tổ, ví dụ: # Tổ 1');
    if (name) out.at(-1).names.push(name);
  }
  return out.filter(x => x.group);
}
const norm = s => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

export async function addRoster(parsed, groups, students) {
  const gs = [...groups]; let added = 0, skipped = 0;
  for (const p of parsed) {
    let g = gs.find(x => norm(x.name) === norm(p.group));
    if (!g) {
      const color = COLOR_IDS.find(c => !gs.some(x => x.color === c)) || 'slate';
      const data = { name: p.group, color, order: gs.reduce((m, x) => Math.max(m, x.order || 0), 0) + 1 };
      g = { id: await store.saveDoc('groups', null, data), ...data }; gs.push(g);
    }
    const have = new Set(students.filter(s => s.groupId === g.id).map(s => norm(s.name)));
    for (const n of p.names) {
      if (have.has(norm(n))) { skipped++; continue; }
      have.add(norm(n));
      await store.saveDoc('students', null, { name: n, groupId: g.id, titleId: null, active: true }); added++;
    }
  }
  return { added, skipped };
}
export function rosterSheet(groups, students) {
  const ta = textArea('', { rows: '10', placeholder: '# Tổ 1\nNguyễn Văn A\nTrần Thị B\n# Tổ 2\nLê Văn C', 'aria-label': 'Danh sách' });
  formSheet({ title: 'Dán danh sách lớp', submit: 'Thêm vào lớp', body: [
    h('p', { class: 'muted' }, 'Mỗi tổ bắt đầu bằng dòng “# Tên tổ”, sau đó mỗi dòng một học sinh. Tổ chưa có sẽ được tạo.'), ta],
  onSubmit: async () => {
    const parsed = parseRoster(ta.value);
    if (!parsed.some(p => p.names.length)) throw new Error('Chưa có học sinh nào để thêm.');
    const r = await addRoster(parsed, groups, students);
    toast(`Đã thêm ${r.added} học sinh` + (r.skipped ? `, bỏ qua ${r.skipped} tên trùng` : ''));
  } });
}
