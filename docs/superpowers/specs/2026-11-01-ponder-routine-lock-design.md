# Ponder: rename, icon, lock code, repeating events, daily routine (v1.3)

Approved in chat 2026-11-01. Tasks 22–27 continue the plan in `plans/2026-10-29-notes-app.md`.

## Decisions

- **Name:** the app is now **Ponder** (exe `Ponder.exe`, window title, bat files, shortcut, docs). Data folder unchanged.
- **Icon:** the user's photo (`pexels-gogul-s-1606744-33835167.jpg`), center-cropped square, rendered to
  `build/icon.png` + multi-size `build/icon.ico` by `scripts/make-icon.mjs` (uses Electron's `nativeImage`).
  The JPG is copied to `build/icon-source.jpg`.
- **Lock:** code **8848** is asked on every launch. Main process keeps a salted scrypt hash in `lock.json`
  (never in settings the renderer sees) and refuses every data IPC call until unlocked. 5 wrong tries → 30 s wait.
  Settings: change code / turn off lock, both need the current code. It keeps casual snoopers out; it does not
  encrypt the JSON files.
- **Repeating events:** `CalendarEvent.repeat?: { every: 'day' | 'week'; interval: number; weekdays: number[];
  until: string | null }` (no skip list: the Friday exception is done by splitting the series). The event's own `date` is the first day. Pure expansion in
  `src/shared/recurrence.ts`. Editing a repeating event edits the whole series.
- **Routine:** the user's personal daily routine was loaded as repeating events and to-dos. Its data and loader are
  kept on the user's PC only (git-ignored) because they describe a private schedule.
- The calendar grid stretches to fit late-night events by itself (it starts at 00:00 when such events exist).
- Minimum event length lowered from 15 to 5 minutes so very short events can be edited.

## Tasks

- 22 Rename to Ponder · 23 Icon from photo · 24 Lock screen (8848) · 25 Repeating events
  · 26 Routine script, run on real data · 27 Rebuild exe, README/CLAUDE.md
