# CLAUDE.md — Notes app

Personal, offline Windows desktop app replacing UpNote: rich-text notes, to-dos, and a weekly class
calendar. Built for one user (a student) on one PC. Electron + React + TypeScript.

## Status (2026-10-29)

**Version 1.1 is complete** — plan tasks 1–17 done (v1 + polish: to-do undo, editors keep unsaved
changes on stray clicks, empty notes clean themselves up). 125 unit tests + 10 e2e tests passing,
packaged as `release/win-unpacked/Notes.exe`, Desktop + Start-menu shortcuts created for the user.
The user-facing guide is `README.md` (keep it in sync when behavior changes).

## Start here (every new session)

1. Read **Status**, **Progress** and **Next ideas** below.
2. The design is in `docs/superpowers/specs/2026-10-29-notes-app-design.md`.
   The task-by-task plan is in `docs/superpowers/plans/2026-10-29-notes-app.md`.
3. `git log --oneline` shows one commit per finished task.
4. For a new feature: agree on a short design with the user, add it as numbered task(s) to a plan,
   then do one task at a time: tests first, then code, then `npm test` + `npm run typecheck`
   (+ `npm run e2e` for UI changes), update this file, commit.
5. After any code change the user only sees it once the exe is rebuilt: `npm run package`
   (the app must be closed) — tell the user, or run it for them.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run the app with live reload (uses `C:\Note\data` — the user's REAL data) |
| `npm run build` | Compile to `out/` |
| `npm test` | Unit tests (Vitest, `tests/unit`) |
| `npm run typecheck` | TypeScript check for main/preload and renderer |
| `npm run e2e` | Build + Playwright end-to-end tests (`tests/e2e`, temp data dir) |
| `npm run package` | Build `release/win-unpacked/Notes.exe` |
| `npm run shortcut` | Create the Desktop shortcut to the exe |
| `node scripts/seed-demo-data.mjs <dir>` | Fill a folder with demo notes/tasks/classes (for screenshots) |
| `node scripts/screenshot.mjs out.png [--page Calendar] [--theme dark] [--data dir]` | Launch the built app against a temp data dir and save a screenshot (for visual checks) |

**Never test against the real `data/` folder.** Set `NOTES_DATA_DIR` to a temp dir (the screenshot
script and e2e tests do this automatically).

## Architecture

```
src/shared/    pure TS used by both sides: types, time math, calendar/task/note logic, normalizers
src/main/      Electron main process: window, data dir, atomic JSON storage, IPC, backups, attachments
src/preload/   contextBridge → window.api (typed by src/shared/ipc.ts). The ONLY disk access for the UI.
src/renderer/  React UI. src/renderer/src/{state,components,features/<notes|todos|calendar|settings>}
tests/unit/    Vitest   ·   tests/e2e/  Playwright (_electron)
data/          USER DATA (git-ignored). notes/<id>.json, notebooks.json, tasks.json, calendar.json,
               settings.json, attachments/, backups/YYYY-MM-DD/
```

Data dir resolution: `NOTES_DATA_DIR` env → packaged `<exe dir>\..\..\data` → dev `<project root>\data`.

## Conventions

- TypeScript strict. Renderer never imports Node/Electron — only `window.api`.
- Times are **minutes since midnight** (numbers). Weekday 0=Sun..6=Sat. Dates `YYYY-MM-DD` in
  **local** time — use `toISODate()` from `src/shared/time.ts`, never `toISOString()`.
- Writes are atomic (tmp + rename). Corrupt files are renamed `*.corrupt-<ts>`, never overwritten.
- Renderer persists through the debounced `saver` (400 ms); main asks the UI to flush before closing.
- Pure logic goes in `src/shared` with a unit test; components stay thin.
- Path aliases: `@shared/*`, `@renderer/*`.
- Line endings: LF everywhere except `.bat` (CRLF) — enforced by `.gitattributes`.
- Copy style: plain sentence case, active verbs, errors say what to do next (see README tone).
- Visual language: cool "paper and ink" palette (tokens in `styles/tokens.css`), highlighter colors
  for classes (`CLASS_COLORS` in `src/shared/calendar.ts`), fonts Onest (UI) + Unbounded (titles).

## Progress

- [x] Task 1: Project scaffold
- [x] Task 2: Shared types, time utils, normalization, storage, IPC
- [x] Task 3: App shell, theme, saver, settings store
- [x] Task 4: Notes — notebooks, list, search, pin, trash
- [x] Task 5: Rich-text editor
- [x] Task 6: Images in notes
- [x] Task 7: To-dos page
- [x] Task 8: Calendar week view
- [x] Task 9: Calendar editing — dialogs and drag
- [x] Task 10: Settings page
- [x] Task 11: Daily backups
- [x] Task 12: Packaging, icon, Desktop shortcut
- [x] Task 13: End-to-end tests, README, final docs
- [x] Task 14: Undo after deleting a to-do (toast in `components/Toast.tsx`, `useUi.showToast`)
- [x] Task 15: Class/event editors with unsaved changes ignore clicks outside (`Dialog closeOnBackdrop`)
- [x] Task 16: Empty notes clean themselves up (`isEmptyNote`, `discardIfEmpty` in notesStore)
- [x] Task 17: Rebuild exe, update README/CLAUDE.md

## Next ideas (not built — ask the user before starting any)

Known polish left (from the v1 review, ranked):
- Overlapping classes are drawn side by side and names get cut off ("Physi…") — smarter layout
- Backups copy all attachments daily — could copy only changed files to save disk
- Ctrl+N while a calendar editor is open switches to Notes and drops the editor
- Note list previews run headings into text ("Second law Net force…")
- Image paste errors use `window.alert` — use the toast instead

Features:
- Month view for the calendar
- Reminder pop-ups (Windows notifications) for to-dos and classes
- Semester start/end dates for classes; skip a class on a holiday
- Tags for notes; sort options for the note list
- Export a note to PDF; print
- Custom 24h time inputs (native `<input type=time>` follows the Windows locale, so it may show AM/PM)
- Sync between devices (would need a cloud service — big change)

## Gotchas learned

- Electron 45 does not download its binary on `npm install`; run `node node_modules/electron/install.js`
  (or just `npm run dev`, which downloads it on first use).
- TypeScript is v7 (native compiler); `baseUrl` is not used — `paths` are relative to each tsconfig.
- Windows PowerShell 5.1 can't write UTF-8 without BOM — create files with the editor tool, not `Set-Content`.
- TipTap `editor.setEditable(x)` emits an update by default → always pass `false` as 2nd arg, or opening a
  note bumps its "edited" time. TipTap `focus()` is deferred a frame; use `editor.view.focus()` when
  keystrokes follow immediately.
- TipTap 3 task items render as `ul[data-type="taskList"] > li[data-checked]` (no data-type on the li).
- E2E/flow scripts must wait for the UI (e.g. `.note-row`) before pressing keys: the app renders only
  after all stores load.
- Packaging: `npm run package` → `release/win-unpacked/Notes.exe` (electron-builder `dir` target, no
  installer, icon embedded fine — no winCodeSign/symlink problem on this PC). The exe must be closed
  before rebuilding (Windows locks it); `Build App.bat` checks this.
- `.bat` files must keep CRLF line endings (enforced in .gitattributes).
- The user's Desktop is OneDrive-redirected; the shortcut script uses `GetFolderPath('Desktop')`.
- Icon is generated by `node scripts/make-icon.mjs` (pure Node) → `build/icon.png` + `build/icon.ico`.
