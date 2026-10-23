# Validation record

Latest verification: 23 October 2026 (Asia/Yerevan).

## Published release

- Live demo: [rafayelkaramyan.github.io/raftrame](https://rafayelkaramyan.github.io/raftrame/).
- Release source: [`b5d7b765a9020e0084b73f767c15410e4576168a`](https://github.com/RafayelKaramyan/raftrame/commit/b5d7b765a9020e0084b73f767c15410e4576168a).
- [Workflow run 39773826788](https://github.com/RafayelKaramyan/raftrame/actions/runs/39773826788) completed successfully on 22 October 2026. Both the verification job and GitHub Pages deployment passed.
- The verification log confirms 42 unit/integration tests and all 54 browser cases passed, together with TypeScript, ESLint, Prettier and the production build.
- The deployment log confirms successful publication at the demo URL above.

## Live demo verification

Performed on 23 October 2026 in managed Chrome against the published demo:

- Changed the home score from 2 to 3, selected the scoreboard scene and observed the updated score. A complete reload retained the edit and the saved state. Restored the sample score to 2 before export.
- Downloaded a 1,571-byte JSON file and parsed it as `raftrame-project` version 1 with four scenes and the expected match data.
- Imported that exact downloaded JSON and observed confirmation that it became a separate editable copy, with all four scenes present.
- Downloaded a 151,036-byte PNG, verified its PNG signature and read its dimensions as 1920 × 1080.
- Inspected the live studio visually and captured the [studio screenshot](images/studio.jpg). This session used the vector fallback; WebGL availability depends on the browser environment.

## Initial local verification

Recorded on 22 October 2026:

- Clean dependency installation with a pinned lockfile.
- Strict TypeScript, zero-warning ESLint and Prettier checks passed.
- 42 domain, transport, save-queue and IndexedDB integration tests passed.
- Production build passed.
- Managed Chrome preview opened with the WebGL backend.
- A committed score edit survived a full reload during the initial preview review.
- Actual JSON export downloaded 1,571 bytes and parsed as `raftrame-project` version 1 with four scenes. The same downloaded file was imported as a separate editable project.
- Actual PNG export downloaded 165,826 bytes, parsed as 1920 × 1080, and was visually inspected.
- The 320px and 768px responsive frames were opened and inspected; document scroll width matched each viewport. The 768px inspector was operated with the keyboard.
- `npm audit --omit=dev` reported zero known production dependency vulnerabilities at this checkpoint.
- Save-queue tests preserve newer edits during an in-flight save, preserve edits arriving during a remote refresh, and verify rejected-write retry. The unsaved-work navigation guard covers every application page.

The local checks above describe the initial development checkpoint. The completed workflow and published-demo checks are recorded separately above.

## Browser coverage

The Playwright suite contains 18 scenarios configured for Chromium, Firefox and Pixel 7 Chromium emulation. It covers navigation and canonical home/reload, match validation/persistence, undo/redo, scene operations, transport, keyboard positioning, real download contents, import isolation, malformed imports, project lifecycle, modal focus/Escape/return, 320px and 768px layouts, reduced motion, unavailable WebGL, rejected writes, representative axe scans, competing tabs and unreadable-data recovery.

The first CI run (39772346719, commit `6fd2e1a`) passed 39 unit/integration checks and 30 of 54 browser cases. It exposed a hidden mobile save indicator, unstable field names during validation, a modal Tab boundary issue, renderer auto-detection selecting a different backend, and an ambiguous project-title assertion. These findings were corrected in `b5d7b765`; the subsequent workflow passed all 54 browser cases. Three additional save-queue tests brought the unit/integration total to 42.

## Limits

No physical-device, Safari or assistive-technology session has been performed. Axe scans and keyboard tests are useful checks rather than a full accessibility certification. No field Core Web Vitals, GPU benchmark, production load or availability claim is made. The product has no video export, live data feed, real broadcaster integration, server tenancy or cloud backup.
