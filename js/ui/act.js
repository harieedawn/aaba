// act(fn, {btn, ok}): run a store write once, button disabled while pending, errors -> Vietnamese toast.
import { toast } from './toast.js';
import { logError } from '../errors.js';

// Firebase errors carry `code`; errors thrown by aaba itself are plain Error with a Vietnamese message.
export function errMsg(e) {
  const c = String(e?.code || '').replace(/^(firestore|auth)\//, '');
  if (c === 'permission-denied') return 'Bạn không có quyền làm việc này';
  if (c === 'unavailable' || c === 'network-request-failed' || c === 'deadline-exceeded') return 'Đang mất mạng, sẽ tự gửi khi có mạng';
  if (c === 'resource-exhausted' || /quota/i.test(String(e?.message || ''))) return 'Hôm nay hệ thống đã hết lượt dùng miễn phí, thử lại vào ngày mai';
  if (!c && e && e.constructor === Error && e.message) return e.message;
  return 'Có lỗi, thử lại';
}
export const OFFLINE_SAVED = 'Đã lưu trên máy, sẽ gửi khi có mạng';
// success text: honest when the device is offline (write is queued, not yet sent)
export const saved = msg => (typeof navigator !== 'undefined' && navigator.onLine === false ? OFFLINE_SAVED : msg);
export async function act(fn, { btn, ok } = {}) {
  if (btn) { if (btn.disabled) return undefined; btn.disabled = true; }
  try { const r = await fn(); if (ok) toast(saved(ok)); return r; }
  catch (e) { logError('act', e); toast(errMsg(e)); return undefined; }
  finally { if (btn) btn.disabled = false; }
}
