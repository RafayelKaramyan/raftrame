# Validation record

Date: 22 October 2026 (Asia/Yerevan).

## Executed locally

- Clean dependency installation with a pinned lockfile.
- Strict TypeScript, zero-warning ESLint and Prettier checks passed.
- 39 domain, transport and IndexedDB integration tests passed.
- Production build passed.
- Managed Chrome preview opened with the WebGL backend.
- A committed score edit survived a full reload during the initial preview review.
- Actual JSON export downloaded 1,571 bytes and parsed as `raftrame-project` version 1 with four scenes. The same downloaded file was imported as a separate editable project.
- Actual PNG export downloaded 165,826 bytes, parsed as 1920 × 1080, and was visually inspected.
- The 320px and 768px responsive frames were opened and inspected; document scroll width matched each viewport. The 768px inspector was operated with the keyboard.
- `npm audit --omit=dev` reported zero known production dependency vulnerabilities at this checkpoint.

The checks above describe the code and observed browser state at this checkpoint. CI deployment and public verification are still pending.

## Prepared browser coverage

The Playwright suite contains 18 scenarios configured for Chromium, Firefox and Pixel 7 Chromium emulation. It covers navigation and canonical home/reload, match validation/persistence, undo/redo, scene operations, transport, keyboard positioning, real download contents, import isolation, malformed imports, project lifecycle, modal focus/Escape/return, 320px and 768px layouts, reduced motion, unavailable WebGL, rejected writes, representative axe scans, competing tabs and unreadable-data recovery.

The suite has not yet run in CI. Do not treat the 54 configured browser cases as passed until workflow logs confirm them.

## Limits

No physical-device, Safari or assistive-technology session has been performed. Axe scans and keyboard tests are useful checks rather than a full accessibility certification. No field Core Web Vitals, GPU benchmark, production load or availability claim is made. The product has no video export, live data feed, real broadcaster integration, server tenancy or cloud backup.
