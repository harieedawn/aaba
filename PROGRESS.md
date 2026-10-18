**TODO (bắt buộc): Re-publish firestore.rules in the Firebase console (Firestore → Rules → Publish)** — Step 4 changes the rules (backdated entries + delete of voided entries).

# aaba — PROGRESS
## Week model v3 (log)
- Model: week = Saturday 00:00 VN → Friday 24:00 (Sunday/Mon–Fri belong to the week begun the previous Saturday); key = ISO date of the Saturday; month = month of the Friday; scores restart each week from config.categories[].base. All in js/weeks.js (pure, VN = UTC+7 fixed; selftest under 2 TZs). Label format "T7 17/10 → T6 23/10" (day/month not zero-padded).
- Step 1 DONE: weeks.js(+selftest); store: onWeek (auto rollover: timer + visibility/focus/online), weekEntries (mem + localStorage `aaba.wk.<key>`, TTL 1h last 2 weeks / 6h older, cap 1000 -> {entries,truncated,at}), invalidateWeek, pendingEntries, studentEntries, stats(); closeCycle removed. adapter.firebase: Timestamp range on `at`, status==, studentId== (ONE field per query), entriesBetween, set raw numeric at -> Timestamp, batch(ops), docs counter. adapter.local/seed: same API, demo spread over 5 weeks incl. pending/void.
- store.js re-exports the week API from js/data/weekstore.js (keeps files ≲200 lines).
- Step 2 DONE: all views off cycles. home (week header "Tuần T7 17/10 → T6 23/10 · còn N ngày" / "Hôm nay chốt tuần", 7-day bar, rollover toast linking #/tongket, Saturday recap card, other days small link), feed (current week live, ‹ › older weeks via weekEntries; past weeks read-only unless can('backdate')), group (week), review + nav badge (pendingEntries, any week), notify + Tôi (studentEntries; Tôi shows "Điểm tuần này"). live() got opts.src + weekSrc/pendingSrc/studentSrc. store.on('entries') now throws; adapters refuse an entries watch without range|status|studentId. Removed: admin 'vong' (cycle.js, listed in DELETE.txt), cycleWeeks input in settings (field stays in data, untouched), cycleInfo/cycleSummary, 'Đợt' copy. Base-score change now recomputes past weeks too (copy says so). Nav: Xếp hạng · Tổng kết · (Ghi điểm) · Thể lệ · Tôi on phone; Nhật ký/Xác nhận/Quản lý rail-only (home "Xem tất cả" -> Nhật ký). #/tongket is a "Sắp có" stub until Step 3.
- Dormant (kept on purpose): cycles docs, config.currentCycleId, entry.cycleId (rules require it), export/import of cycles, dev setup/reset writing c1. importConfig 'replace' (dev only) still lists entries to clear them.
## Step 3 (Tổng kết) DONE
- js/views/tongket/{index,week,multi,parts,tags,admin}.js; route #/tongket[/:mode/:key] (tuan|thang|quy, default = previous week). `.grow` fixed in weeks.css. Current week always fetched fresh; others via weekEntries cache; "Tải lại" = fresh. Tháng/3 tháng fetch weeks sequentially (skeleton, max 14, future weeks skipped); row click = per-tổ drill-down from fetched data (link to week view). Staff banner "N điểm chờ xác nhận" → #/duyet. Home "Hoạt động gần đây" already excluded voided. Nhật ký hides voided behind chip "Hiện đã thu hồi (n)" (status chip 'Đã thu hồi' removed).
- weekstore.invalidateWeek dispatches window event `aaba:inv`; Tổng kết and Nhật ký (past weeks) reload on it. store.voidEntry/approveEntry invalidate the entry's week.
## Step 4 (corrections of the past) DONE
- firestore.rules: ONLY (a) validEntry accepts optional addedAt/replaces + `entryTime()` (normal | admin-backdated), (b) delete = dev OR staff on status=='void'.
- Client: store.addEntry({at}) (admin/dev; 199d window), store.editEntry (ONE batch: new entry replaces:oldId + void old, reason "Sửa lại"), purgeEntries, ruleUsable; session.can backdate/purge; js/ui/draft.js (hand-over to Ghi điểm); js/views/add-date.js ("Ngày xảy ra"); js/views/purge.js ("Xoá tất cả đã thu hồi (n)", chunks of 20 via act()); Tổng kết admin button "Thêm điểm vào tuần này" (js/views/tongket/admin.js). Edit with "Hôm nay" stores at = now−2 min (rules need a past `at` when `replaces` is present). store.js is ~217 lines (over the soft limit; not split to keep risk low).
- Sửa is blocked with a message if the entry's rule is inactive/missing (Thu hồi stays available).
### Paper test of the new rules (m = member doc, role)
| Case | validEntry / delete | Result |
|---|---|---|
| recorder normal (at==now, no extra keys, own tổ) | normal branch | OK |
| teacher normal | normal branch | OK |
| admin normal | normal branch | OK |
| admin backdated 10d (addedAt==now, at=now−10d) | backdated branch | OK |
| admin backdated 300d | at > now−200d false | DENIED |
| admin future at | at < now false | DENIED |
| recorder/teacher with addedAt | normal fails (key present), backdated needs role admin | DENIED |
| admin backdated without addedAt | 'addedAt' in d false | DENIED |
| admin/teacher delete void entry | isStaff && status=='void' | OK |
| admin delete ok/pending entry | status != void | DENIED |
| recorder/student/guest delete | not dev, not staff | DENIED |
| admin batch: new entry (replaces) + void old | create backdated OK; update = validVoid (staff, ok/pending→void, only 3 keys) | OK |
(dev bypasses validEntry and may delete anything, as before.)
## Done
- Patch3 DONE (hardening): js/errors.js (window error/unhandledrejection -> toast "Có lỗi, thử lại", last 20 kept; shown + "Sao chép" in Công cụ dev → Công cụ & chẩn đoán); js/ui/act.js `act(fn,{btn,ok})` + `errMsg` (permission-denied/unavailable/resource-exhausted/default; app-thrown Vietnamese Errors pass through) used by ghi điểm, hoàn tác, xác nhận, đổi thứ tự thể lệ, join, Tôi buttons, dev export/backup; formSheet/confirmSheet/reasonSheet show errMsg (covers all admin/dev saves, thu hồi, tổng kết đợt, import). Defensive: config normalised (categories/titles/cycleWeeks defaults), deleted student -> "Học sinh đã xoá", entries keep own ruleName snapshot, view render errors -> friendly state with Tải lại. Validation: textInput maxlength 80, ghi chú/lý do 500, qty 1-99 clamp in store, saveDoc trims name(80)/note(500). Router: failed view import() -> "Tải lại" state (sw.js unchanged, network-first). Backup nudge (dev hub): js/backup.js, `aaba.backup` date, banner if never/>7 days.
- Listener audit (Patch3): BEFORE every store.on() opened its own Firestore listener (home, feed, group, add, Tôi... each re-subscribed per visit; entries 'current' also opened a 2nd config listener). NOW store.on is a ref-counted hub keyed by collection(+cycle): one adapter listener per key, late subscribers get the cached value, last unsubscribe stops it; firebase adapter shares one config/main listener between the config view and entries-current. Guest openView watch goes through the same hub. Not browser/emulator-tested.
- Patch2 DONE: students.titleIds (array; missing -> [titleId]); titleId mirrors the highest-role title (js/titles.js: titleIdsOf/titleNames/topTitle/roleRank) so members/invites/rules unchanged. Student form = multi-select chips; names joined " · " in roster, group page, Tôi, invite list. Invite suggested role = highest role among the person's titles that the issuer may create (admin issuer can't issue admin -> falls back to next highest); groupId kept.
- Patch1 DONE: Lịch trực nhật removed everywhere (admin section, home card, add.js, collection/adapters/seed/setup/export; import ignores `duty` key; rule `duty` flag ignored). Student `active` checkbox/filters removed (field may stay; missing/false = active). firestore.rules untouched (its /duty match is now unused).
- Step3 DONE: SETUP.md guest checklist (vi).
- Step2 DONE (open view): config.openView (seed/setup wizard = true; existing docs without the field = OFF, rules need explicit true -> admin enables toggle in Quản lý → Cài đặt). Guest = anon user without members doc while openView===true; role 'guest' ("Khách"), can() only 'view'. Firebase init reads config/main to form guest; store.guestInit watches config and drops to #/join if openView off/denied. Local adapter: ?role=guest. firestore.rules: openView() on config/groups/students/rules/cycles/duty/entries reads; members/invites untouched.
- Tôi for guests: name picker (localStorage aaba.me, no Firestore), "Đổi tên", link #/join; join screen has "Xem mà không cần mã" for guests. Notifications: js/notify.js (entries about me, by!=me, newer than localStorage aaba.seen; first run seeds seen to newest), bell in home header + red dot on Tôi tab, "Thông báo" list in Tôi (marks seen), js/views/me-parts.js. Status changes of old entries (pending->ok/void) do not re-notify.
- Fix1 DONE: ui/dom.js `put(el, ...kids)` (flatten, skip null/undefined/false, strings->text); all replaceChildren calls now use put (fixes literal "null"). Remaining .append calls only get real nodes.
- P1 shell/css/PWA/session/scoring/store+local adapter/seed/ui; home. P2 group, feed, rules, me, join. P3 add, review, void, closeCycle.
- P4 admin (groups, roster+bulk paste, rules, titles, invites+QR, cycle, settings) and dev (setup wizard, export/import, role preview, font check, diagnostics). Node smoke + ban-list grep passed.
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
- Entry pending/ok rule is enforced by rules.
- Two members may claim the same student name; no uniqueness check. Sign-out leaves an orphan member doc (no self-delete).
- Dev bypasses entry validation (import/resets); a dev invite = full control.
- Local Firestore cache keeps class data on a shared device after sign-out; queued offline writes rejected later are dropped silently.
- No App Check/rate limits: open anonymous sign-up can burn the free read quota (availability only).
## Terms (authoritative for all future UI copy)
- WEEK MODEL (v3, supersedes the Cycle line below): Tuần = Thứ Bảy 00:00 → hết Thứ Sáu (giờ VN, UTC+7); label "T7 17/10 → T6 23/10"; điểm tính lại từ Điểm khởi đầu mỗi tuần; tuần thuộc tháng của ngày thứ Sáu. Tổng kết = trang #/tongket (Tuần | Tháng | 3 tháng), Tổng kết tuần trước (home). Trình chiếu = reserved name for a future present/slideshow mode of Tổng kết (not built). Nhật ký keeps its name.
- DEPRECATED: Đợt/đợt, Tổng kết đợt (no UI copy; data fields stay dormant).
- Nav/screens: Nhật ký (was Lịch sử) · Ghi điểm (nav, was Ghi) · Thể lệ (was Luật) · Hoạt động gần đây (was Mới nhất)
- Cycle: Đợt/đợt (was Vòng) · Tổng kết đợt (was Chốt vòng; confirm: kết thúc đợt này, lưu bảng xếp hạng, bắt đầu đợt mới, tính lại điểm)
- Access: Mã đăng nhập (was Thẻ mời) · Mã chung của lớp (was QR chung)
- Approval: Chờ xác nhận (was Chờ duyệt) · Xác nhận (was Duyệt) · page "Cần xác nhận"
- Add flow: Thường dùng · Nhóm (was Mảng) · Nội dung (was Mục, item picker). Admin rules: Thể lệ, "Thêm tiêu chí"
- Void: Thu hồi điểm (was Huỷ) · Lý do thu hồi · voided = "Đã thu hồi"
- Score: Điểm khởi đầu (was Điểm nền/gốc) · Điểm cá nhân. Roles: Ban cán sự, Tổ trưởng, Giáo viên, Học sinh, Quản trị.
- QR removed; invites = typed code only (shown 5-5-5-5, copy raw 20 chars; #/join/:code still works but is never advertised).
- Xoá hẳn = xoá vĩnh viễn một dòng ĐÃ THU HỒI (không khôi phục; điểm không đổi). Bổ sung = dòng admin ghi cho ngày đã qua (có addedAt, tag "Bổ sung", "Ghi lúc … bởi …"). Bản sửa = dòng thay thế khi Sửa (có replaces; dòng cũ thu hồi với lý do "Sửa lại"). Ngày xảy ra = ngày của điểm khi ghi bù.
- Keep: Tổ, Chức vụ, Hoàn tác, Ghi tiếp, Quản lý, Công cụ dev, Nội quy/Học tập/Phong trào, seed rule names, "Dán luật bảo mật" (Firestore rules).
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
