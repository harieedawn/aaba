// Notes subjects. `hex` = default stored colour (= light value of --sub-<id> in css/notes.css; the dark theme has its own value).
export const SUBJECTS = [
  { id: 'toan', name: 'Toán', hex: '#C62828' },
  { id: 'van', name: 'Văn', hex: '#FFE45C' },
  { id: 'anh', name: 'Tiếng Anh', hex: '#19C3B1' },
  { id: 'ly', name: 'Lý', hex: '#7B3FD1' },
  { id: 'hoa', name: 'Hoá', hex: '#1F5FE0' },
  { id: 'sinh', name: 'Sinh', hex: '#3DBE5F' },
  { id: 'su', name: 'Sử', hex: '#8B5A2B' },
  { id: 'gdqp', name: 'GDQP', hex: '#1B5E3A' },
  { id: 'tin', name: 'Tin học', hex: '#FFA000' },
  { id: 'khac', name: 'Khác', hex: '#55637A' },
];
export const HEX = /^#[0-9a-f]{6}$/i;
export const subjectOf = id => SUBJECTS.find(s => s.id === id) || SUBJECTS[SUBJECTS.length - 1];

const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const lum = hex => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export const textOn = hex => (contrast(hex, '#FFFFFF') >= contrast(hex, '#000000') ? '#FFFFFF' : '#000000');

// -> {cls, style}. class note: strong colour (preset = theme-aware CSS vars, custom = inline bg + AA text); mine: light tint of the same hue.
export function noteStyle(note, kind = 'class') {
  const s = subjectOf(note.subject);
  const col = HEX.test(note.color || '') ? note.color.toUpperCase() : s.hex, preset = col === s.hex;
  if (kind === 'mine') return { cls: 'nb-mine', style: { '--n-hue': preset ? `var(--sub-${s.id})` : col } };
  return preset ? { cls: `nbs-${s.id}`, style: {} } : { cls: 'nbs-custom', style: { '--n-bg': col, '--n-fg': textOn(col) } };
}
