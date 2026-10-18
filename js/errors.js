// Global safety net: last 20 errors kept in memory (Công cụ dev → Chẩn đoán), friendly toast instead of a white screen.
import { toast } from './ui/toast.js';
const log = []; let lastToast = 0;
export const errorLog = () => log;
export function logError(src, e) {
  log.push({ t: new Date().toISOString(), src, code: e?.code || '', msg: String(e?.message || e),
    stack: String(e?.stack || '').split('\n').slice(0, 4).join(' | ') });
  if (log.length > 20) log.shift();
}
function soft(src, e) {
  if (/ResizeObserver/.test(String(e?.message || e))) return;
  logError(src, e);
  if (Date.now() - lastToast > 4000) { lastToast = Date.now(); try { toast('Có lỗi, thử lại'); } catch {} }
}
export function installErrors() {
  addEventListener('error', ev => soft('error', ev.error || ev.message));
  addEventListener('unhandledrejection', ev => soft('promise', ev.reason));
}
