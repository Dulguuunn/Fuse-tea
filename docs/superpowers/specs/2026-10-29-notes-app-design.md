# Notes — Design Spec

Date: 2026-10-29
Status: Approved (parts 1–2 approved in chat; part 3 + remaining decisions delegated to Claude: "just do what's best")

## 1. Purpose

A free, offline, personal replacement for UpNote (which now requires premium to create notes).
One user, one Windows PC, no accounts, no cloud. Success = the user can delete UpNote and use
this daily for notes, to-dos, and their weekly class schedule, without limits.

## 2. Decisions

| Topic | Decision |
|---|---|
| Platform | Electron desktop app (Windows) |
| Language / UI | TypeScript, React, electron-vite build tool |
| Editor | Rich text via TipTap (toolbar + markdown-style typing shortcuts) |
| Calendar | Week view; classes repeat weekly with one or more slots, each with its own day/start/end; plus one-off dated events |
| To-dos | Dedicated To-dos page (optional due date/time) **and** checkbox lists inside notes |
| Data location | `C:\Note\data` (relative to the app, so moving the whole folder keeps working) |
| Distribution | `release\win-unpacked\Notes.exe` (no installer) + Desktop shortcut created by a script |
| Version control | Local git repo; `data\` is git-ignored |
| App name | "Notes" |

## 3. Architecture

```
src/
  shared/    pure TypeScript shared by main + renderer: types, time math, calendar logic, task grouping
  main/      Electron main process: window, data-dir resolution, JSON storage, IPC handlers, backups
  preload/   contextBridge exposing a typed `window.api` (the ONLY way the UI touches disk)
  renderer/  React UI: Notes, To-dos, Calendar, Settings
```

- Security: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP meta tag,
  external links open in the system browser (http/https only).
- Single-instance lock: launching a second copy focuses the first (prevents two writers).

### Data directory resolution (main)

1. `NOTES_DATA_DIR` env var if set (used by tests).
2. Packaged: `<exe dir>\..\..\data` → `C:\Note\data`.
3. Dev (`npm run dev`): `<project root>\data`.

### Data files

```
data/
  notes/<id>.json     one file per note
  notebooks.json
  tasks.json
  calendar.json       { classes: [...], events: [...] }
  settings.json
  attachments/        pasted images
  backups/YYYY-MM-DD/ daily automatic backups (last 7 kept)
```

Models (times are minutes since midnight; weekday uses JS convention 0=Sun..6=Sat; dates are `YYYY-MM-DD`):

- Note: `{ id, title, content (TipTap JSON), text (plain text for search/preview), notebookId|null, pinned, createdAt, updatedAt, deletedAt|null }`
- Notebook: `{ id, name, createdAt }`
- Task: `{ id, title, done, dueDate|null, dueTime|null, createdAt, completedAt|null }`
- Class: `{ id, name, room, color, sessions: [{ id, weekday, start, end }] }`
- Event: `{ id, title, date, start, end, color, location }`
- Settings: `{ theme: system|light|dark, dayStart, dayEnd, weekStartsOn: 0|1, timeFormat: 24h|12h }`

### Storage rules

- Atomic writes: write `<file>.tmp`, then rename over the target (with retries for Windows file locks).
- A file that fails to parse is renamed `<file>.corrupt-<timestamp>` and the app continues with defaults
  (or skips that one note) — never silently overwrites the bad file.
- Renderer debounces saves (~400 ms). On window close, main asks the renderer to flush pending saves
  and waits (3 s timeout) before closing.
- Daily backup on startup: copy data files (not backups) into `backups/YYYY-MM-DD`, keep the newest 7.

## 4. Screens

Sidebar: Notes, To-dos, Calendar, Settings. Light/dark/system theme.

**Notes** (three columns: sidebar · note list · editor)
- Sidebar: All notes, Pinned, Notebooks (create/rename/delete), Trash.
- Note list: title, preview line, last-edited time; pinned first, then newest edited.
- Search: case-insensitive match on title + text.
- Editor: title field + toolbar (bold, italic, underline, strike, highlight, H1–H3, bullet/numbered
  lists, checklist, quote, code block, link, divider, undo/redo). Typing shortcuts (`# `, `- `, `[] `).
  Autosave with "Saving… / Saved" indicator. Ctrl+N = new note.
- Delete → Trash (restore / delete forever / empty trash). Deleting a notebook moves its notes to Trash
  (after confirmation). Restoring a note whose notebook is gone puts it in no notebook.
- Paste or drop images → saved to `data/attachments`, shown inline (custom `attachment://` protocol).

**To-dos**
- Quick-add input (Enter), optional due date + time.
- Groups: Overdue, Today, Upcoming, No date, Completed (collapsed).
- Tick, edit inline, delete.

**Calendar** (week view)
- Days across (week starts Mon by default), hours down (default 07:00–22:00).
- Classes: name, room, color, one or more weekly sessions each with own weekday/start/end.
- One-off events on a date. Tasks with due dates shown as chips at top of their day (click to tick).
- Click empty slot → create class session or event at that time. Click block → edit dialog.
- Drag block to move (time + day), drag bottom edge to resize; 5-minute snap; minimum 15 min.
- Overlaps laid out side by side. Red current-time line. Prev / Today / Next week.

**Settings**: theme, calendar hour range, week start day, 12h/24h time, data folder path + "Open data folder".

## 5. Out of scope (v1)

Month view, reminder notifications, sync/mobile, PDF export, semester end dates, class-skipping on holidays.

## 6. Testing

- Vitest unit tests for all pure logic (`src/shared`) and storage (temp dirs).
- Playwright `_electron` smoke tests: app launches against a temp data dir, create note, add task, add class.
- Manual visual check via screenshots captured during smoke tests.

## 7. Continuity

- `CLAUDE.md` holds project context, commands, conventions and a **progress checklist** mirroring the plan.
- Plan: `docs/superpowers/plans/2026-10-29-notes-app.md` — tasks are done one at a time, each ending
  with tests passing and a git commit.
- `README.md` explains usage, building, the Desktop shortcut, data/backups, and "What is Electron?".
