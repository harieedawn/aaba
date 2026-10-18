// Hash router. Views: default export (ctx) => {el, destroy?}. Routes without a view yet render a "Sắp có" stub.
import { h, put } from './ui/dom.js';
import { emptyState } from './ui/components.js';
import { can, onSession, getSession } from './session.js';
import { reduced } from './ui/anim.js';
import { logError } from './errors.js';

const ROUTES = [
  [/^\/$/, { load: () => import('./views/home.js') }],
  [/^\/to\/([^/]+)$/, { load: () => import('./views/group.js') }],
  [/^\/lichsu$/, { load: () => import('./views/feed.js') }],
  [/^\/luat$/, { load: () => import('./views/rules.js') }],
  [/^\/toi$/, { load: () => import('./views/me.js') }],
  [/^\/ghi$/, { guard: 'record', load: () => import('./views/add.js') }],
  [/^\/duyet$/, { guard: 'approve', load: () => import('./views/review.js') }],
  [/^\/quanly(?:\/([^/]+))?$/, { guard: 'manage', load: () => import('./views/admin/index.js') }],
  [/^\/dev(?:\/([^/]+))?$/, { guard: 'dev', load: () => import('./views/dev/index.js') }],
  [/^\/join(?:\/([^/]+))?$/, { load: () => import('./views/join.js') }],
];
export const navigate = path => { location.hash = '#' + path; };

function parse() {
  const path = (location.hash.replace(/^#/, '').split('?')[0]) || '/';
  for (const [re, def] of ROUTES) { const m = re.exec(path); if (m) return { path, def, params: m.slice(1) }; }
  return null;
}
function stub(def, denied) {
  return { el: h('div', { class: 'view' }, h('header', { class: 'hdr' }, h('h1', null, def.stub)),
    emptyState(denied
      ? { icon: 'shield', title: 'Không có quyền', text: 'Tài khoản của bạn không xem được mục này.', action: { label: 'Về xếp hạng', href: '#/' } }
      : { icon: def.icon, title: 'Sắp có', text: `Mục “${def.stub}” sẽ có trong bản cập nhật tiếp theo.`, action: { label: 'Về xếp hạng', href: '#/' } })) };
}

export function startRouter(outlet, { onRoute } = {}) {
  let cur = null, token = 0, first = true;
  async function render() {
    const t = ++token, r = parse();
    if (!r) return navigate('/');
    const me = getSession();
    if ((!me || (me.role === 'student' && !me.studentId)) && !r.path.startsWith('/join')) return navigate('/join');
    let view;
    try {
      if (r.def.guard && !can(r.def.guard)) view = stub(r.def, true);
      else {
        let mod;
        try { mod = r.def.load ? await r.def.load() : null; }
        catch (e) { logError('import', e); throw Object.assign(new Error('import'), { stale: true }); }
        view = mod ? mod.default({ params: r.params, path: r.path }) : stub(r.def);
      }
    } catch (e) {
      if (!e.stale) logError('view', e);
      view = { el: emptyState({ icon: 'x', title: e.stale ? 'Không tải được trang này' : 'Có lỗi xảy ra',
        text: e.stale ? 'Có thể đã có bản cập nhật mới hoặc mạng yếu. Hãy tải lại trang.' : 'Không mở được mục này. Hãy thử tải lại.', action: { label: 'Tải lại', onClick: () => location.reload() } }) };
    }
    if (t !== token) return view.destroy?.();
    const vt = !first && document.startViewTransition && !reduced();
    const swap = () => {
      const old = cur;
      cur = view;
      old?.destroy?.();
      put(outlet, view.el);
      if (!first && !vt && !reduced()) view.el.classList.add('view-enter');
      scrollTo(0, 0);
      onRoute?.(r.path);
    };
    vt ? document.startViewTransition(swap) : swap();
    first = false;
  }
  addEventListener('hashchange', render);
  onSession(render);
  render();
}
