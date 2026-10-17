// Session, permissions (can) and theme preference. Mirrors SPEC §7 table.
const ROLES = ['student', 'recorder', 'teacher', 'admin', 'dev'];
export const ROLE_LABEL = { student: 'Học sinh', recorder: 'Tổ trưởng', teacher: 'Giáo viên', admin: 'Ban cán sự', dev: 'Quản trị' };
let S = null;
const subs = new Set();

export const getSession = () => S;
export function setSession(s) { S = s; subs.forEach(f => f(S)); }
export function onSession(f) { subs.add(f); return () => subs.delete(f); }

// Effective role (dev may preview another role: UI only, not security).
export function role() {
  let p = null;
  try { p = sessionStorage.getItem('aaba.preview'); } catch {}
  return S?.role === 'dev' && ROLES.includes(p) ? p : S?.role || null;
}
export function setPreview(r) {
  try { r ? sessionStorage.setItem('aaba.preview', r) : sessionStorage.removeItem('aaba.preview'); } catch {}
  setSession(S);
}

export function can(action, ctx = {}) {
  const r = role();
  if (!r || !S) return false;
  const staff = r === 'teacher' || r === 'admin' || r === 'dev';
  switch (action) {
    case 'view': return true;
    case 'record':
      if (r === 'student') return false;
      return r === 'recorder' ? ctx.groupId == null || S.groupId === ctx.groupId : true;
    case 'void':
      if (r === 'student') return false;
      return r === 'recorder' ? !ctx.entry || ctx.entry.by === S.uid : true;
    case 'approve': return staff && (!ctx.entry || ctx.entry.by !== S.uid);
    case 'edit': case 'close': return r === 'admin' || r === 'dev';
    case 'manage': return staff;
    case 'createInvite':
      if (r === 'dev') return true;
      return r === 'admin' && (ctx.role == null || ['recorder', 'teacher', 'student'].includes(ctx.role));
    case 'dev': return S.role === 'dev';
    default: return false;
  }
}

// ---- theme (light/dark, manual choice stored in localStorage) ----
const TK = 'aaba.theme';
const COLORS = { light: '#F5F6F8', dark: '#0F1115' };
const stored = () => { try { return localStorage.getItem(TK); } catch { return null; } };
function apply(t) {
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('meta[name=theme-color]').forEach(m => m.setAttribute('content', COLORS[t]));
}
export const getTheme = () => document.documentElement.dataset.theme || 'light';
export function setTheme(t) { try { localStorage.setItem(TK, t); } catch {} apply(t); themeSubs.forEach(f => f(t)); }
const themeSubs = new Set();
export function onTheme(f) { themeSubs.add(f); return () => themeSubs.delete(f); }
export function initTheme() {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  apply(stored() || (mq.matches ? 'dark' : 'light'));
  mq.addEventListener('change', e => { if (!stored()) apply(e.matches ? 'dark' : 'light'); });
}
