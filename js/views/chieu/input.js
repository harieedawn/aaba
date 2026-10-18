// Trình chiếu: keyboard, swipe/tap, idle auto-hide of controls, screen wake lock. Returns unbind().
export function bindInput({ root, next, prev, fs, hide, exit }) {
  const K = { ArrowRight: next, PageDown: next, ' ': next, ArrowLeft: prev, PageUp: prev, Escape: exit, f: fs, F: fs, h: hide, H: hide };
  const onKey = e => {
    if (e.ctrlKey || e.metaKey || e.altKey || !K[e.key]) return;
    e.preventDefault(); K[e.key]();
  };
  const onKeyUp = e => { if (e.key === ' ') e.preventDefault(); };
  let x0 = 0, y0 = 0, down = false, idle = 0;
  const wake = () => { root.classList.remove('ch-idle'); clearTimeout(idle); idle = setTimeout(() => root.classList.add('ch-idle'), 3000); };
  const onDown = e => { if (e.button > 0) return; down = true; x0 = e.clientX; y0 = e.clientY; wake(); };
  const onUp = e => {
    if (!down) return; down = false;
    if (e.target.closest?.('button,.ch-msg,.ch-zone')) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
    else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) (e.pointerType === 'touch' && e.clientX < innerWidth * 0.25 ? prev : next)();
  };
  let lock = null;
  const acquire = async () => {
    try {
      if (!navigator.wakeLock || document.visibilityState !== 'visible' || lock) return;
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } catch { lock = null; }
  };
  addEventListener('keydown', onKey); addEventListener('keyup', onKeyUp);
  root.addEventListener('pointerdown', onDown); root.addEventListener('pointerup', onUp);
  root.addEventListener('pointermove', wake); root.addEventListener('pointercancel', () => { down = false; });
  document.addEventListener('visibilitychange', acquire);
  wake(); acquire();
  return () => {
    clearTimeout(idle);
    removeEventListener('keydown', onKey); removeEventListener('keyup', onKeyUp);
    document.removeEventListener('visibilitychange', acquire);
    try { lock?.release?.().catch(() => {}); } catch { /* ignore */ }
  };
}
