// Chức vụ helpers. A person may hold several; students.titleIds is the truth, titleId mirrors the highest-role one
// (members/invites + firestore.rules still carry the single titleId). Missing titleIds -> [titleId].
const RANK = { student: 0, recorder: 1, teacher: 2, admin: 3, dev: 4 };
export const roleRank = r => RANK[r] ?? 0;
export const titleIdsOf = s => (Array.isArray(s?.titleIds) ? s.titleIds : s?.titleId ? [s.titleId] : []);
export const titleObjs = (s, titles = []) => titleIdsOf(s).map(id => titles.find(t => t.id === id)).filter(Boolean);
export const titleNames = (s, titles = []) => titleObjs(s, titles).map(t => t.name).join(' · ');
// Highest-role title among ids (first wins on ties), or null.
export function topTitle(ids, titles = []) {
  let best = null;
  for (const id of ids || []) { const t = titles.find(x => x.id === id); if (t && (!best || roleRank(t.role) > roleRank(best.role))) best = t; }
  return best;
}
