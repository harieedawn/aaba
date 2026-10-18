// Seed rules (SPEC §12), default titles/categories and demo data (SPEC §13).
import { weekStart, WEEK } from '../weeks.js';
const DAY = 864e5, HOUR = 36e5;

export const CATEGORIES = [
  { id: 'noiquy', name: 'Nội quy', base: 100 },
  { id: 'hoctap', name: 'Học tập', base: 200 },
  { id: 'phongtrao', name: 'Phong trào', base: 50 },
];
export const TITLES = [
  { id: 't_lt', name: 'Lớp trưởng', role: 'admin' },
  { id: 't_lphtap', name: 'Lớp phó học tập', role: 'admin' },
  { id: 't_lpld', name: 'Lớp phó lao động', role: 'admin' },
  { id: 't_lpvtm', name: 'Lớp phó văn thể mỹ', role: 'student' },
  { id: 't_bithu', name: 'Bí thư', role: 'student' },
  { id: 't_thuquy', name: 'Thủ quỹ', role: 'student' },
  { id: 't_totruong', name: 'Tổ trưởng', role: 'recorder' },
  { id: 't_topho', name: 'Tổ phó', role: 'student' },
];

// [id, cat, scope(S|G|B), points, name, note, flags] flags: u=perUnit h=hot a=assumed
const R = [
  ['nq01', 'noiquy', 'S', -20, 'Không phù hiệu, bảng tên', 'Buổi sáng', ''],
  ['nq02', 'noiquy', 'S', -20, 'Nghỉ học có phép, đi trễ', '', ''],
  ['nq03', 'noiquy', 'S', -50, 'Nghỉ học không phép', '', ''],
  ['nq04', 'noiquy', 'S', -50, 'Để tóc dài, mang dép lê', 'Buổi sáng', ''],
  ['nq05', 'noiquy', 'S', -50, 'Không thực hiện tốt đồng phục', '', ''],
  ['nq06', 'noiquy', 'S', -50, 'GV bộ môn nhắc nhở vi phạm và ghi vào sổ đầu bài', '', ''],
  ['nq07', 'noiquy', 'S', -50, 'Nói tục, chửi thề', '', ''],
  ['nq08', 'noiquy', 'S', -50, 'Sử dụng điện thoại trong giờ học', '', ''],
  ['nq09', 'noiquy', 'B', -50, 'Làm mất vệ sinh lớp học', '', ''],
  ['nq10', 'noiquy', 'S', -50, 'Tự ý đổi chỗ ngồi trong giờ học', '', ''],
  ['nq11', 'noiquy', 'S', -100, 'Có thái độ vô lễ với giáo viên bộ môn', '', ''],
  ['nq12', 'noiquy', 'S', -50, 'Ăn, uống trong lớp', '', ''],
  ['nq13', 'noiquy', 'S', -50, 'Ăn vụng trong giờ học', '', ''],
  ['nq14', 'noiquy', 'S', -20, 'Không tập trung trong giờ học (bị giáo viên nhắc nhở)', '', 'a'],
  ['nq15', 'noiquy', 'S', -50, 'Không nghiêm túc trong giờ chào cờ', '', ''],
  ['ht01', 'hoctap', 'S', 2, 'Tích cực phát biểu xây dựng bài', '', 'h'],
  ['ht02', 'hoctap', 'S', 8, 'Có điểm kiểm tra miệng từ 8 trở lên', '', ''],
  ['ht03', 'hoctap', 'S', -10, 'Có điểm kiểm tra miệng dưới 5', '', ''],
  ['ht04', 'hoctap', 'S', 5, 'Giải bài tập tại lớp từ 9 trở lên', '', ''],
  ['ht05', 'hoctap', 'S', -20, 'Phát biểu linh tinh trong giờ học', '', ''],
  ['ht06', 'hoctap', 'S', -10, 'Không soạn bài & làm bài tập theo phân công', '', ''],
  ['ht07', 'hoctap', 'S', -20, 'Thiếu nghiêm túc trong giờ học (không tập trung nghe giáo viên giảng bài, nói chuyện riêng trong giờ học, ngủ gục…)', '', ''],
  ['pt01', 'phongtrao', 'G', -50, 'Tổ trực nhật không hoàn thành', 'Trực nhật lại', ''],
  ['pt02', 'phongtrao', 'S', -50, 'Không thực hiện lao động theo phân công', '', ''],
  ['pt03', 'phongtrao', 'S', -10, 'Không tập thể dục giữa giờ', '', ''],
  ['pt04', 'phongtrao', 'B', 10, 'Được nhà trường tuyên dương trước cờ', '', ''],
  ['pt05', 'phongtrao', 'G', -10, 'Tổ trực không tham gia xây dựng bài đủ 100%', '', 'u'],
  ['pt06', 'phongtrao', 'G', 50, 'Tổ trực tham gia xây dựng bài đủ 100%', '', ''],
  ['pt07', 'phongtrao', 'B', 100, 'Thành viên đạt giải phong trào cấp trường', '', 'u'],
  ['pt08', 'phongtrao', 'B', 500, 'Thành viên đạt giải phong trào cấp tỉnh', '', 'u'],
];
const SCOPE = { S: 'student', G: 'group', B: 'both' };
export function seedRules() {
  const out = {};
  R.forEach(([id, cat, sc, points, name, note, f], i) => {
    out['r_' + id] = { cat, name, points, scope: SCOPE[sc], perUnit: f.includes('u'),
      hot: f.includes('h'), note, order: i + 1, active: true, assumed: f.includes('a') };
  });
  return out;
}

const COLORS = ['blue', 'green', 'orange', 'purple'];
// [group 1-4, student 1-4 (0 = whole group), rule, daysAgo, hoursOfDay, status, qty, by: t|r|a]
const E = [
  [1, 2, 'nq01', 10, 8, 'ok', 1, 't'], [2, 1, 'nq08', 9, 9, 'ok', 1, 'r'], [3, 3, 'ht01', 9, 10, 'ok', 1, 't'],
  [4, 2, 'nq04', 8, 8, 'ok', 1, 't'], [1, 0, 'pt01', 8, 15, 'ok', 1, 't'], [2, 4, 'ht02', 7, 9, 'ok', 1, 't'],
  [3, 1, 'nq02', 7, 8, 'ok', 1, 'r'], [4, 3, 'ht03', 6, 10, 'ok', 1, 't'], [1, 3, 'ht04', 6, 11, 'ok', 1, 't'],
  [2, 0, 'nq09', 5, 13, 'ok', 1, 'a'], [3, 2, 'ht07', 5, 9, 'ok', 1, 't'], [4, 4, 'nq07', 4, 10, 'ok', 1, 't'],
  [1, 1, 'nq08', 4, 9, 'ok', 1, 'r'], [2, 2, 'ht01', 3, 10, 'ok', 1, 't'], [3, 0, 'pt04', 3, 8, 'ok', 1, 't'],
  [2, 0, 'pt06', 3, 14, 'ok', 1, 't'], [1, 4, 'nq05', 2, 8, 'ok', 1, 't'], [2, 3, 'ht05', 2, 10, 'void', 1, 't'],
  [3, 1, 'ht02', 2, 9, 'ok', 1, 't'], [4, 2, 'nq12', 1, 9, 'ok', 1, 'r'], [1, 2, 'ht01', 1, 10, 'ok', 1, 't'],
  [2, 1, 'nq01', 1, 8, 'ok', 1, 'r'], [3, 4, 'pt07', 1, 12, 'ok', 1, 't'], [1, 1, 'ht02', 0, -1, 'pending', 1, 'r'],
  [4, 3, 'ht01', 0, -2, 'pending', 1, 'r'], [3, 2, 'nq10', 0, -3, 'ok', 1, 'r'], [2, 2, 'ht02', 0, -4, 'ok', 1, 't'],
];

export function buildDemo(now = Date.now()) {
  const cur = weekStart(now), start = cur - WEEK; // demo spreads entries over the last 5 weeks; cycles docs stay dormant
  const rules = seedRules();
  const groups = {}, students = {};
  COLORS.forEach((color, i) => {
    const g = i + 1;
    groups['g' + g] = { name: 'Tổ ' + g, color, order: g };
    for (let n = 1; n <= 4; n++) {
      const titleId = n === 1 ? 't_totruong' : n === 2 ? 't_topho' : g === 1 && n === 3 ? 't_lt' : g === 2 && n === 3 ? 't_thuquy' : null;
      students[`s_${g}_${n}`] = { name: `Học sinh ${g}.${n}`, groupId: 'g' + g, titleId, active: true };
    }
  });
  const entries = {};
  E.forEach(([g, s, rid, d, hr, status, qty, by], i) => {
    const rule = rules['r_' + rid];
    // week offset 0..4 (0 = current); the 2nd pending entry sits 2 weeks back so "pending from any week" is visible
    const w = hr < 0 ? (i === 23 ? 0 : 2) : i % 5, ws = cur - w * WEEK;
    let t = hr < 0 && w === 0 ? now + hr * HOUR : ws + ((i * 3) % 7) * DAY + (8 + (i % 7)) * HOUR;
    if (w === 0) t = Math.max(cur, Math.min(now - 30 * 6e4, Math.max(cur + HOUR, t)));
    const rec = `s_${g}_1`;
    entries['e_demo' + String(i + 1).padStart(2, '0')] = {
      cycleId: 'c2', groupId: 'g' + g, studentId: s ? `s_${g}_${s}` : null, ruleId: 'r_' + rid, ruleName: rule.name, cat: rule.cat,
      unit: rule.points, qty, points: rule.points * qty, note: '', by: by === 'r' ? 'u_' + rec : by === 't' ? 'u_teacher' : 'u_admin',
      byName: by === 'r' ? `Học sinh ${g}.1` : by === 't' ? 'Giáo viên' : 'Ban cán sự', at: t, status,
      voidReason: status === 'void' ? 'Ghi nhầm học sinh' : '', voidBy: status === 'void' ? 'u_teacher' : '',
    };
  });
  const sum = [['g1', 372, 90, 215, 67], ['g2', 355, 85, 220, 50], ['g3', 340, 80, 210, 50], ['g4', 318, 70, 198, 50]]
    .map(([groupId, total, a, b, c]) => ({ groupId, total, byCat: { noiquy: a, hoctap: b, phongtrao: c } }));
  return {
    v: 2,
    config: { className: '11A3', school: 'THPT Trần Quốc Toản', cycleWeeks: 4, openView: true, currentCycleId: 'c2', categories: CATEGORIES, titles: TITLES },
    groups, students, rules, entries,
    cycles: {
      c1: { n: 1, start: start - 28 * DAY, end: start, closed: true, summary: sum },
      c2: { n: 2, start, end: null, closed: false, summary: [] },
    },
    members: {},
    invites: {
      MACCHUNG11A3DEMO0001: { role: 'student', label: 'Mã chung của lớp', studentId: null, groupId: null, titleId: null, active: true, createdBy: 'u_admin', at: now },
      TOTRUONG1DEMOCODE001: { role: 'recorder', label: 'Tổ trưởng Tổ 1', studentId: 's_1_1', groupId: 'g1', titleId: 't_totruong', active: true, createdBy: 'u_admin', at: now },
      ADMINDEMOCODE0000001: { role: 'admin', label: 'Ban cán sự', studentId: 's_1_3', groupId: 'g1', titleId: 't_lt', active: true, createdBy: 'u_dev', at: now },
      DEVDEMOCODE000000001: { role: 'dev', label: 'Quản trị', studentId: null, groupId: null, titleId: null, active: true, createdBy: 'u_dev', at: now },
      GVCNDEMOCODE000000A1: { role: 'teacher', label: 'Giáo viên chủ nhiệm', studentId: null, groupId: null, titleId: null, active: true, createdBy: 'u_admin', at: now },
    },
  };
}
