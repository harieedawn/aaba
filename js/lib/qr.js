// QR as SVG via CDN qrcode-generator@1.4.4 (lazy). On failure: link + code as text.
import { h } from '../ui/dom.js';
const URL_ = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
let loading;
const load = () => loading ||= new Promise((ok, no) => {
  if (window.qrcode) return ok(window.qrcode);
  const s = h('script', { src: URL_, async: true });
  s.onload = () => (window.qrcode ? ok(window.qrcode) : no(new Error('qr')));
  s.onerror = () => { loading = null; no(new Error('qr')); };
  document.head.append(s);
});
export const inviteLink = code => location.origin + location.pathname + '#/join/' + code;
const fallback = (text, code) => h('div', { class: 'qr-fallback' },
  h('p', { class: 'muted' }, 'Không tạo được mã QR (offline). Dùng liên kết hoặc mã bên dưới.'),
  h('code', null, text), code && h('code', null, code));

// renderQR(text, {code}) -> element (placeholder now, filled when the library arrives)
export function renderQR(text, { code, size = 220 } = {}) {
  const box = h('div', { class: 'qr', style: { width: size + 'px', height: size + 'px' }, role: 'img', 'aria-label': 'Mã QR' });
  load().then(qrcode => {
    const q = qrcode(0, 'M');
    q.addData(text); q.make();
    const t = document.createElement('template');
    t.innerHTML = q.createSvgTag(4, 16);
    const svg = t.content.firstElementChild;
    svg.removeAttribute('width'); svg.removeAttribute('height');
    svg.style.cssText = 'width:100%;height:100%;display:block';
    box.replaceChildren(svg);
  }).catch(() => { box.style.cssText = ''; box.removeAttribute('role'); box.replaceChildren(fallback(text, code)); });
  return box;
}
