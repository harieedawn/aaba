// Session, permissions (can) and theme preference. Mirrors SPEC §7 table.
const ROLES = ['student', 'recorder', 'teacher', 'admin', 'dev'];
export const ROLE_LABEL = { student: 'Học sinh', recorder: 'Tổ trưởng', teacher: 'Giáo viên', admin: 'Ban cán sự', dev: 'Quản trị', guest: 'Khách' };
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
  if (r === 'guest') return action === 'view';
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
    case 'backdate': return r === 'admin' || r === 'dev';
    case 'purge': return staff && ctx.entry?.status === 'void';
    case 'createInvite':
      if (r === 'dev') return true;
      return r === 'admin' && (ctx.role == null || ['recorder', 'teacher', 'student'].includes(ctx.role));
    case 'dev': return S.role === 'dev';
    default: return false;
  }
}

// Roles the current user may put on a new invite (SPEC §7: admin never admin/dev).
export const inviteRoles = () => ['dev', 'admin', 'teacher', 'recorder', 'student'].filter(x => can('createInvite', { role: x }));

// ---- theme: pref = light (default) | dark | auto, stored in localStorage ----
const TK = 'aaba.theme';
const COLORS = { light: '#FBF8F2', dark: '#13151A' };
const stored = () => { try { const v = localStorage.getItem(TK); return v === 'dark' || v === 'auto' ? v : 'light'; } catch { return 'light'; } };
const mq = matchMedia('(prefers-color-scheme: dark)');
const resolve = p => (p === 'auto' ? (mq.matches ? 'dark' : 'light') : p);
function apply(t) {
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('meta[name=theme-color]').forEach(m => { m.removeAttribute('media'); m.setAttribute('content', COLORS[t]); });
}
export const getTheme = () => document.documentElement.dataset.theme || 'light';
export const getThemePref = stored;
export function setTheme(p) { try { localStorage.setItem(TK, p); } catch {} apply(resolve(p)); themeSubs.forEach(f => f(p)); }
const themeSubs = new Set();
export function onTheme(f) { themeSubs.add(f); return () => themeSubs.delete(f); }
export function initTheme() {
  apply(resolve(stored()));
  mq.addEventListener('change', () => { if (stored() === 'auto') { apply(resolve('auto')); themeSubs.forEach(f => f('auto')); } });
}
