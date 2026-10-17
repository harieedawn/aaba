# aaba — PROGRESS
## Done (P1 Foundation+Home; P2 read-only screens+join; P3 recording+moderation)
- P1: shell (tab bar/rail/sidebar, role-aware), css, PWA files, js: config, format, scoring (+selftest passes), session (can, theme, dev preview), data/store + adapter.local + seed (§12 rules, §13 demo), ui/* (dom, icons, components, sheet, toast, anim), router, app.
- views/home.js: leaderboard (FLIP, count-up, bar grow, stagger, delta float), duty chip, "Mới nhất", pending shown separately.
- `?role=dev|admin|teacher|recorder|student` (persisted in localStorage; default recorder = Học sinh 1.1, Tổ 1).
- P2: views group, feed (filters, cycle picker, read-only past vòng), rules, me (role cards on phone, theme, install hint, sign out), join (local: deep link, manual code, demo-code chips, name picker once). entrySheet/live/pageHeader in ui/components.js. Relative paths + .nojekyll for GitHub Pages.
- P3: views add (sheet flow, hay dùng, duty rules -> tổ trực, qty stepper, check anim, 8s Hoàn tác toast), review (#/duyet approve / reject=void+reason), void flow in entry sheet (reasonSheet), closeCycle (me.js TEMP "Chốt vòng" button, admin/dev). Home remount animates from last shown values (memo).
## Pending
- P4: admin/*, dev/*. P5: adapter.firebase, qr, SETUP.md, firestore.rules.
## Decisions
- Category bars = share of the leading tổ in that category (min 0). Delta chip = today's ok points (hidden at 0).
- Added --pos/neg/warn-text darker tokens for AA text on tints; dark fg colors for pos/neg/warn chosen by me.
- store.on('config') delivers one object (not array). fonts.css also lists optional .woff (user's GoogleSans-var.woff); font NOT embedded.
- Local demo db bumped to v2 (adds admin/dev demo invites; resets old demo data). Joined member persisted in localStorage aaba.uid; ?role= overrides.
- Theme set via data-theme (inline script in head + matchMedia listener).
- Add flow closes to home (navigate '/'). Duty rule always targets the duty tổ; recorder of another tổ is blocked with a message. Pending entries left at close are not counted.
- Local adapter: config writes re-emit entries (current cycle may change).
## Known issues
- Not visually checked in a browser (none installed); verified with node --check + jsdom smoke test only.
- Dev role preview of "recorder" has no tổ yet. Join demo chips are local-mode only.
