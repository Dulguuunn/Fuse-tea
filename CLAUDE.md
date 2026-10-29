# CLAUDE.md — Notes app

Personal, offline Windows desktop app replacing UpNote: rich-text notes, to-dos, and a weekly class
calendar. Built for one user (a student) on one PC. Electron + React + TypeScript.

## Start here (every new session)

1. Read the **Progress** checklist below — it says what's done and what's next.
2. The design is in `docs/superpowers/specs/2026-10-29-notes-app-design.md`.
   The task-by-task plan is in `docs/superpowers/plans/2026-10-29-notes-app.md`.
3. `git log --oneline` shows one commit per finished task.
4. Work one task at a time: tests first, then code, then `npm test` + `npm run typecheck`, then
   update this checklist and commit.

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
- Files use LF in the editor; git may warn about CRLF — harmless.

## Progress

- [x] Task 1: Project scaffold
- [x] Task 2: Shared types, time utils, normalization, storage, IPC
- [ ] Task 3: App shell, theme, saver, settings store
- [ ] Task 4: Notes — notebooks, list, search, pin, trash
- [ ] Task 5: Rich-text editor
- [ ] Task 6: Images in notes
- [ ] Task 7: To-dos page
- [ ] Task 8: Calendar week view
- [ ] Task 9: Calendar editing — dialogs and drag
- [ ] Task 10: Settings page
- [ ] Task 11: Daily backups
- [ ] Task 12: Packaging, icon, Desktop shortcut
- [ ] Task 13: End-to-end tests, README, final docs

## Gotchas learned

- Electron 45 does not download its binary on `npm install`; run `node node_modules/electron/install.js`
  (or just `npm run dev`, which downloads it on first use).
- TypeScript is v7 (native compiler); `baseUrl` is not used — `paths` are relative to each tsconfig.
- Windows PowerShell 5.1 can't write UTF-8 without BOM — create files with the editor tool, not `Set-Content`.
