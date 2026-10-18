// Small tags on entry lines (Step 4 adds Bổ sung / Bản sửa).
import { chip } from '../../ui/components.js';
export const tags = e => [e.addedAt && chip('Bổ sung', ''), e.replaces && chip('Bản sửa', '')].filter(Boolean);
