// Trình chiếu: desktop pointer polish. Winner hero card tilts <= 4deg towards the pointer (rAF-throttled, reset on leave).
import { reduced } from '../../ui/anim.js';

export function tilt(root) {
  if (reduced() || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  let raf = 0, card = null, ev = null;
  const clear = () => { if (card) card.style.transform = ''; };
  const apply = () => {
    raf = 0; if (!card || !ev) return;
    const r = card.parentElement.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width - .5) * 2)), ny = Math.max(-1, Math.min(1, ((ev.clientY - r.top) / r.height - .5) * 2));
    card.style.transform = `perspective(900px) rotateX(${(-ny * 4).toFixed(2)}deg) rotateY(${(nx * 4).toFixed(2)}deg)`;
  };
  root.addEventListener('pointermove', e => {
    const c = e.target.closest?.('.pd-hcard') || null;
    if (c !== card) { clear(); card = c; }
    ev = e; if (card && !raf) raf = requestAnimationFrame(apply);
  });
  root.addEventListener('pointerleave', () => { clear(); card = null; });
}
