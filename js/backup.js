// "Xuất toàn bộ" (backup with entries) + last-backup date in localStorage, used by the dev nudge.
import * as store from './data/store.js';
import { download } from './ui/form.js';
import { toast } from './ui/toast.js';
const K = 'aaba.backup', DAY = 864e5;
export const stamp = () => new Date().toISOString().slice(0, 10);
// whole days since the last backup; null = never
export function daysSinceBackup() { try { const t = +localStorage.getItem(K); return t ? Math.floor((Date.now() - t) / DAY) : null; } catch { return null; } }
export async function runBackup() {
  download(`aaba-backup-${stamp()}.json`, JSON.stringify(await store.exportConfig({ withEntries: true })));
  try { localStorage.setItem(K, String(Date.now())); } catch {}
  toast('Đã tải bản sao lưu');
}
