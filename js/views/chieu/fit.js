// Trình chiếu: fit engine. After a slide renders (and on resize) step --fit 1 → 0.6 (0.05 steps) until nothing overflows its box (vertically or horizontally).
// Still too tall at 0.6: tổ lines go 2-column (landscape), then lines are trimmed with "+ n mục khác" (never silently dropped).
const MIN = 0.6, STEP = 0.05;
const land = () => !matchMedia('(max-width:899px),(orientation:portrait)').matches;
// podium columns grow upward from the baseline, so overflow there is above the area (not in scrollHeight): compare tops
const high = el => [...el.querySelectorAll('.pd-area')].some(a => { const t = a.getBoundingClientRect().top - 1; return [...a.children].some(c => c.getBoundingClientRect().top < t); });
// HORIZONTAL overflow too (scrollWidth > clientWidth): columns/cards (.ch-main/.ch-cols/.ch-col/.bd-rows) and rows (Nổi bật + tổ lines, star card, board rows, tổ side)
const wide = c => c.scrollWidth > c.clientWidth + 1;
const over = el => [el, ...el.querySelectorAll('.ch-main,.ch-cols,.ch-col,.pd-area,.pd-hero,.bd-rows')].some(c => c.scrollHeight > c.clientHeight + 1)
  || [...el.querySelectorAll('.ch-main,.ch-cols,.ch-col,.bd-rows,.ch-ol li,.ch-lines li,.ch-star,.bd-row,.ch-side')].some(wide) || high(el);

function run(el) {
  for (let f = 1; f >= MIN - 1e-6; f = Math.round((f - STEP) * 100) / 100) { el.style.setProperty('--fit', f); if (!over(el)) return true; }
  return false;
}

export function fit(el) {
  if (!el || !el.isConnected || !el.classList.contains('ch-s')) return;
  const ul = el.querySelector('.ch-lines'), more = el.querySelector('.ch-more'), lis = ul ? [...ul.children] : [], base = more ? +more.dataset.n || 0 : 0;
  const setMore = c => { if (!more) return; more.textContent = `+ ${base + c} mục khác`; more.hidden = base + c <= 0; };
  lis.forEach(li => li.classList.remove('ch-trim')); ul?.classList.remove('two'); setMore(0);
  if (run(el) || !ul) return;
  if (land()) { ul.classList.add('two'); if (run(el)) return; }
  let cut = 0;
  while (over(el) && lis.length - cut > 1) { lis[lis.length - 1 - cut].classList.add('ch-trim'); setMore(++cut); }
}

// Re-fit the current slide on resize / rotation (debounced). Returns unbind().
export function watchFit(get) {
  let t = 0;
  const go = () => { clearTimeout(t); t = setTimeout(() => fit(get()), 120); };
  addEventListener('resize', go); addEventListener('orientationchange', go);
  document.fonts?.ready?.then(go).catch(() => {});
  return () => { clearTimeout(t); removeEventListener('resize', go); removeEventListener('orientationchange', go); };
}
