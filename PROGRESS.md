# aaba — PROGRESS
## Done
- P1 shell/css/PWA/session/scoring/store+local adapter/seed/ui; home. P2 group, feed, rules, me, join. P3 add, review, void, closeCycle.
- P4 admin (groups, roster+bulk paste, rules, titles, duty, invites+QR, cycle, settings) and dev (setup wizard, export/import, role preview, font check, diagnostics). Node smoke + ban-list grep passed.
- P5 step 1: js/data/adapter.firebase.js (SDK 10.14.1 via gstatic dynamic import, anon auth, persistentLocalCache multi-tab, realtime watch, offline writes queued). store.js unchanged in logic (adapter exposes get/list/set/remove/watch/uid/remember/signOut). config.js: BACKEND='local' + FIREBASE_CONFIG placeholder block.
- P5 DONE: step 2 firestore.rules; step 3 SETUP.md (vi, 12 steps + security checklist); step 4 rules reviewed line by line vs §7/§10 (+rule defaults via .get, rule.active checked). sw.js network-first, all paths relative, .nojekyll, manifest scope "./" confirmed.
## Decisions (P5)
- router: no session -> #/join (needed for firebase, harmless locally). setup.js: `_virtual` default config (doc missing, until the wizard runs) still writes categories/titles/cycleWeeks.
- Entries `at` = serverTimestamp (rules need at==request.time); import uses {raw:true} (dev-only bypass in rules).
- Rules tighter than SPEC text where the text leaks secrets: members readable only by self/dev (admin: low roles); invites list: dev all, admin low roles only (adapter adds where role in [...] for non-dev). store.joinWithCode writes nulls (no undefined).
- Entry create also checks cycleId=current, unit/cat/name = rule, byName = member name.
## Known issues
- Not browser-tested; firebase adapter and rules never run (no emulator). Test with SETUP.md checklist.
## Residual risks (rules)
- Any leaked/QR-chung invite code grants its role until revoked (no expiry/use count); keep dev/admin codes private.
- Duty-tổ restriction is client-only; recorder can post a duty rule for own tổ out of turn. Entry pending/ok rule is enforced.
- Two members may claim the same student name; no uniqueness check. Sign-out leaves an orphan member doc (no self-delete).
- Dev bypasses entry validation (import/resets); a dev invite = full control.
- Local Firestore cache keeps class data on a shared device after sign-out; queued offline writes rejected later are dropped silently.
- No App Check/rate limits: open anonymous sign-up can burn the free read quota (availability only).
## Terms (authoritative for all future UI copy)
- Nav/screens: Nhật ký (was Lịch sử) · Ghi điểm (nav, was Ghi) · Thể lệ (was Luật) · Hoạt động gần đây (was Mới nhất)
- Cycle: Đợt/đợt (was Vòng) · Tổng kết đợt (was Chốt vòng; confirm: kết thúc đợt này, lưu bảng xếp hạng, bắt đầu đợt mới, tính lại điểm)
- Access: Mã đăng nhập (was Thẻ mời) · Mã chung của lớp (was QR chung)
- Approval: Chờ xác nhận (was Chờ duyệt) · Xác nhận (was Duyệt) · page "Cần xác nhận"
- Add flow: Thường dùng · Nhóm (was Mảng) · Nội dung (was Mục, item picker). Admin rules: Thể lệ, "Thêm tiêu chí"
- Void: Thu hồi điểm (was Huỷ) · Lý do thu hồi · voided = "Đã thu hồi"
- Score: Điểm khởi đầu (was Điểm nền/gốc) · Điểm cá nhân. Roles: Ban cán sự, Tổ trưởng, Giáo viên, Học sinh, Quản trị.
- Keep: Tổ, Tổ trực, Chức vụ, Hoàn tác, Ghi tiếp, Quản lý, Công cụ dev, Nội quy/Học tập/Phong trào, seed rule names, "xoay vòng" (duty rotation), "Dán luật bảo mật" (Firestore rules).
- Helper texts: Đợt (admin), Điểm khởi đầu (settings), Chờ xác nhận (Cần xác nhận page). Code ids/routes/fields unchanged.
## Design v2 log
- Step 1 DONE: tokens/base/layout/components CSS, light default theme (Sáng/Tối/Tự động in session.js + Me segmented control), manifest/theme-color. Components markup (step 2+) pending.
- Step 2 DONE: icons (+flag), logo "a" tile, entryRow = activity row (category icon tile, signed amount, clock+chờ xác nhận), home.js rewritten (greeting, lead sentence, week segments, hero card, rows without bars, side column cards). Nav restyled via CSS only.
- Step 3 DONE: feed (Hôm nay/Hôm qua/dd/MM), add (Bước n/3, Trừ|Cộng toggle default Trừ, 56px tiles, exact submit text), group (solid hero + bars), rules, review, me (profile card), join (welcome card).
## Design v2 (authoritative; supersedes SPEC §4 palette and §5 home)
- Light default (pref stored in localStorage `aaba.theme` = light|dark|auto; auto follows OS; Me has Sáng/Tối/Tự động segmented control; header icon toggles light/dark).
- Neutrals: bg #FBF8F2 · surface #FFFFFF · surface-2 #F3EFE6 · border #EAE4D8 · text #1F2430 · text-2 #6A6F7B. Primary = ink #1F2430 (white text). Accent pencil #FFD23F (ink text): Ghi điểm CTA, logo tile, join button only.
- pos #16A06A / tint #DDF4E8 / text #0D7549 · neg #E5484D / #FDE4E4 / text #C42F35 · warn text #8A5B00 / tint #FFF1CC (text darkened from spec for AA on tint).
- Tổ strong / tint / on: blue #2F5FE3/#E6EDFF/white · green #17835A/#DFF3E8/white · orange #B8500E (was #C75A12, 4.29 failed → 5.01)/#FFEBDD/white · purple #7A47DB/#EEE6FF/white · teal #0E7C8B/#DDF2F5/white · pink #C4326B/#FFE3EE/white · amber #FFC53D/#FFF3CF/ink (9.8) · slate #55637A/#E8ECF2/white. White-on-strong contrast: 5.43, 4.74, 5.01, 5.60, 4.91, 5.23, 6.08 (all ≥4.5).
- Radius 12/16/24, card padding 20, page padding 20/32, body 16, h1 30/700 -0.01em, hero score 60. Cards white+1px border, no tinted fills; shadow only on sheet/toast. Dark = neutral surfaces, tổ tint = surface-2.
## Decisions (Design v2)
- SPEC.md was not in the upload; worked from the task text. "Trừ|Cộng" toggle in Ghi điểm defaults to Trừ and filters rules by sign.
- Per-group "tile" shows the digits in the tổ name (first letter fallback). Greeting uses the last word of the member name.
- entrySheet and admin screens still use chip/pointsChip (inherit tokens; not redesigned). `.btn-accent` and `.seg` are new components.
## Checks (step 4)
- Ban-list grep clean; node --check all js OK; scoring selftest OK; no fixed widths >440px, flex children min-width:0, fchips scroll in own container → no horizontal scroll at 360px by CSS reading. Not browser-tested.
