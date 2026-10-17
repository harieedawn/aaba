// Luật: rules by category with point chips and notes.
import { h } from '../ui/dom.js';
import { chip, pointsChip, emptyState, pageHeader, live } from '../ui/components.js';
import { can } from '../session.js';
import { stagger } from '../ui/anim.js';

const SCOPE = { student: 'Học sinh', group: 'Cả tổ', both: 'Học sinh hoặc cả tổ' };

export default function rules() {
  const body = h('div', { class: 'stack' });
  const stop = live(body, ['config', 'rules'], (S, first) => {
    const admin = can('edit');
    const out = [pageHeader('Luật', { sub: 'Điểm cộng, trừ theo từng mảng' })];
    for (const c of S.config.categories) {
      const rs = S.rules.filter(r => r.cat === c.id && r.active !== false).sort((a, b) => a.order - b.order);
      out.push(h('section', { class: 'card' },
        h('div', { class: 'sec-h' }, h('h2', null, c.name), chip(`Điểm gốc ${c.base}`)),
        rs.length ? rs.map(r => h('div', { class: 'rule' },
          h('div', { class: 'rule-main' }, h('div', null, r.name),
            h('div', { class: 'rule-tags' }, chip(SCOPE[r.scope] || ''), r.perUnit && chip('Theo số lượng'), r.duty && chip('Tổ trực'), admin && r.assumed && chip('tạm tính', 'warn')),
            r.note && h('div', { class: 'rule-note muted' }, r.note)),
          pointsChip(r.points)))
          : emptyState({ icon: 'book', title: 'Chưa có luật', text: 'Mảng này chưa có mục nào.' })));
    }
    if (first) queueMicrotask(() => stagger(body.children));
    return out;
  });
  return { el: h('div', { class: 'view narrow' }, body), destroy: stop };
}
