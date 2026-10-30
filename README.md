# Notes

Your own free notes app for Windows: **rich-text notes**, **to-dos**, and a **weekly class calendar**,
all in one window. No account, no internet, no premium wall: everything is saved as plain files in
`C:\Note\data` on your PC.

---

## 1. Opening the app

Double-click **Notes** on your Desktop, or press the Windows key and type **Notes**.

The shortcut points to the program inside this folder:

```
Desktop\Notes  ──opens──▶  C:\Note\release\win-unpacked\Notes.exe  ──saves to──▶  C:\Note\data\
```

**Does it work like that, with the folder staying in C:\Note?** Yes. The `.exe` lives inside
`C:\Note\release\win-unpacked\`, and the Desktop icon is only a *shortcut* to it, the same way shortcuts
to Chrome or Word point at files in `Program Files`. Keep the `C:\Note` folder where it is and the
shortcut keeps working.

- **No shortcut, or you deleted it?** Double-click **`Create Desktop Shortcut.bat`** in `C:\Note`.
  It puts one on the Desktop and one in the Start menu.
- **Moved the whole `Note` folder somewhere else?** Everything still works, because the app finds
  its data relative to itself. Only the old shortcut breaks: run `Create Desktop Shortcut.bat` again
  from the new place.
- **No `release` folder yet?** Build the app first (see section 4).

---

## 2. Using it

The left sidebar switches between **Notes**, **To-dos**, **Calendar** and **Settings**.

- **Need more room?** Click the panel button next to **notes** at the top of the sidebar, or press
  **Ctrl+\\**. The sidebar shrinks to a thin strip of icons; hover an icon to see its name. Notebooks are
  hidden while it's shrunk. Click the button or press **Ctrl+\\** again to bring it back. The app
  remembers your choice.

### Notes

- **New note:** the pen button above the list, or **Ctrl+N** from anywhere. A new note you leave
  completely empty (no title, no text, no picture) removes itself when you move on, so blank
  "Untitled" notes don't pile up.
- **Notebooks:** press **+** next to *Notebooks* to make one, e.g. one per class. Hover a notebook to
  rename or delete it. Deleting a notebook moves its notes to the Trash.
- **Which notebook a note is in:** the small picker under the note's title.
- **Pin** a note (pin button, top right) to keep it at the top of the list.
- **Search** finds words in titles and inside notes. It works with Cyrillic too.
- **Delete** moves a note to the **Trash**. From there you can restore it or delete it forever.
- **Saving is automatic.** "Saving…" and "Saved" appear at the top right. There is no Save button.
- **Images:** paste a screenshot (Win+Shift+S, then Ctrl+V), drag a picture in, or use the image
  button. Images are copied into `data\attachments`.

**Formatting while you type:**

| Type this at the start of a line | You get |
|---|---|
| `# ` / `## ` / `### ` | Big / medium / small heading |
| `- ` or `* ` | Bullet list |
| `1. ` | Numbered list |
| `[] ` | Checkbox list |
| `> ` | Quote |
| ```` ``` ```` | Code block |
| `---` | Divider line |

| Keys | Does |
|---|---|
| Ctrl+B / Ctrl+I / Ctrl+U | Bold / italic / underline |
| Ctrl+Shift+S | Strikethrough |
| Ctrl+Shift+H | Highlight (yellow marker) |
| Ctrl+Z / Ctrl+Y | Undo / redo |
| Ctrl+click a link | Open it in your browser |
| Tab / Shift+Tab in a list | Indent / outdent |

### To-dos

- Type in the box at the top and press **Enter**. Choose **Today**, **Tomorrow** or a date, and
  optionally a time, before adding.
- To-dos are grouped into **Overdue** (red), **Today**, **Upcoming**, **No date**, and
  **Completed** (click to expand).
- Click the circle to tick one off. Click its text to edit it. Hover to delete it. Deleted by
  mistake? Click **Undo** in the message that appears at the bottom for a few seconds.
- To-dos with a due date also show at the top of that day in the **Calendar**, and you can tick them
  off there too.

### Calendar: your class timetable

- **Add a class:** click an empty spot on the grid, then **New class**, or use the **New class** button.
  - Give it a name, an optional room, and a color.
  - Under **Every week**, set the day, start and end. Each time slot has its **own length**, so a
    class can be 1h 30m on Monday and 2h on Wednesday. Use **Add another day** for more slots.
- **Change a time:**
  - Click a class to type exact times. Once you've changed something in that editor, a stray click
    outside it no longer closes it. Use **Save class** or **Cancel**.
  - **Drag** a class to move it, including to another day.
  - **Drag its bottom edge** to make it longer or shorter. Times snap to 5 minutes.
- **One-off events** such as exams or deadlines happen on one date only. Use **New event**. They look
  striped so you can tell them apart from weekly classes.
- **‹ Today ›** moves between weeks. The red line shows the current time, and today's date has a
  yellow highlight.
- Classes repeat every week. When the semester ends, open a class and choose **Delete class**.

### Settings

- **Theme:** System (follows Windows), Light, or Dark. Dark is pure black with white accents.
- **Time format:** 24-hour or 12-hour.
- **Week starts on:** Monday or Sunday.
- **Hours shown on the calendar:** 07:00–22:00 by default. A class outside these hours still shows,
  because the grid stretches to fit it.
- **Open data folder:** opens `C:\Note\data` in File Explorer.

---

## 3. Your data, backups, and moving to another PC

Everything you make is in **`C:\Note\data`**:

```
data\
  notes\<id>.json     one file per note
  notebooks.json      your notebooks
  tasks.json          your to-dos
  calendar.json       your classes and events
  settings.json       your settings
  attachments\        images pasted into notes
  backups\2026-10-29\ automatic daily copies (the newest 7 are kept)
```

- **Automatic backups:** each day the app copies the data folder into `data\backups\<date>`.
- **Restoring from a backup:**
  1. Close Notes.
  2. Copy the files from a backup folder back into `data\`, replacing the current ones.
  3. Open Notes again.
- **Extra safety:** now and then, copy the whole `data` folder to a USB stick or to OneDrive.
- **Moving to a new PC:**
  1. Copy the entire `C:\Note` folder to the new PC.
  2. Run `Create Desktop Shortcut.bat` there.
- **A damaged file?** If a data file gets corrupted, for example after a power cut mid-save, the app
  doesn't overwrite it. It renames the file `something.json.corrupt-<number>` and carries on with
  everything else.
- **Rebuilding the app never touches `data\`.** Your notes are separate from the program.

---

## 4. Building or updating the app

You only need this the first time, or after the code changes.

1. **Close Notes** if it's open. Windows locks a running program, so it can't be replaced.
2. Double-click **`Build App.bat`**. It runs `npm install` the first time, then builds
   `release\win-unpacked\Notes.exe`. It takes about a minute.
3. If you don't have the Desktop shortcut yet, double-click **`Create Desktop Shortcut.bat`**.

This needs **Node.js** (installed on this PC). Commands for a developer terminal in `C:\Note`:

| Command | What it does |
|---|---|
| `npm run dev` | Run the app from source with live reload. It uses the real `data\` folder. |
| `npm test` | Unit tests (time math, calendar layout, storage, backups…) |
| `npm run typecheck` | Check the TypeScript code for type errors |
| `npm run e2e` | Build, then click through the real app automatically, using a throwaway data folder |
| `npm run package` | Build `release\win-unpacked\Notes.exe` (same as `Build App.bat`) |
| `npm run shortcut` | Create the Desktop and Start-menu shortcuts (same as the `.bat`) |

### Changing the app icon, its name, or the sidebar icons

After any of these, rebuild (**`Build App.bat`**), then run **`Create Desktop Shortcut.bat`** again so
the shortcut picks up the change.

- **App icon** (the picture on the exe, the Desktop shortcut, the taskbar and the window): replace
  `build\icon.ico` (and `build\icon.png`) with your own. The `.ico` should include a 256×256 size; a
  free online "PNG to ICO" converter can make one from any square picture. Don't run
  `scripts\make-icon.mjs` afterwards: it redraws the original icon over yours. Windows sometimes keeps
  showing the old icon for a while; restarting File Explorer or the PC clears its cache.
- **App name** ("Notes"): it's set in `productName` in both `package.json` and `electron-builder.yml`
  (this decides the exe's file name), the window title in `src\main\index.ts` and
  `src\renderer\index.html`, and the exe and shortcut names in `Build App.bat` and
  `scripts\create-desktop-shortcut.ps1`. Change them all together; the easiest way is to ask Claude.
- **Sidebar icons** (next to Notes, To-dos, Calendar, Settings): they come from the free
  [Lucide](https://lucide.dev/icons) icon set and are listed in `src\renderer\src\components\Sidebar.tsx`
  (`NotebookPen`, `ListChecks`, `CalendarDays`, `Settings`). To change one, find an icon on lucide.dev,
  write its name in PascalCase ("book-open" → `BookOpen`), and swap it in both the `import` line at the
  top and the `NAV` list. The icons for All notes, Pinned, notebooks and Trash are in
  `src\renderer\src\features\notes\NotesSidebar.tsx`.

---

## 5. What is Electron?

This app is built with **Electron**.

### What it is

Electron is a free, open-source toolkit, made by GitHub and now maintained by the OpenJS
Foundation, for building **desktop programs out of web technology** (HTML, CSS and JavaScript). It
combines two well-known engines into one program:

- **Chromium**, the open-source core of Google Chrome. It *draws the window's contents*: buttons,
  text, the editor, the calendar grid.
- **Node.js**, JavaScript that runs outside a browser. It *talks to your computer*: reading and
  writing files, opening folders, knowing where your Desktop is.

A normal website can't save files into `C:\Note\data` or put an icon on your Desktop, because
browsers forbid that for safety. Electron gives a web-built interface those desktop powers.

### What it's usually used for

Apps that want one codebase on Windows, macOS and Linux, and want to look the same everywhere.
Well-known Electron apps include **Visual Studio Code**, **Discord**, **Slack**, **Obsidian**,
**Notion** and the **Figma** desktop app. Many note-taking and chat apps use it, because rich text
editors and modern UIs are easiest to build with web technology.

### What it does inside *this* app

```
┌──────────────────────────── Notes.exe (Electron) ────────────────────────────┐
│                                                                               │
│  MAIN PROCESS (Node.js)            PRELOAD (the bridge)     WINDOW (Chromium) │
│  src/main/                         src/preload/            src/renderer/      │
│  • opens the window                • exposes a small,      • React screens:   │
│  • reads/writes C:\Note\data         safe "window.api"       Notes, To-dos,   │
│  • daily backups                     the screens may use     Calendar,        │
│  • serves pasted images            • nothing else gets       Settings         │
│  • only one copy may run             through               • rich-text editor │
│                                                                               │
│        ◀──────────── messages ("save this note", "load tasks") ────────────▶ │
└───────────────────────────────────────────────────────────────────────────────┘
```

What Electron contributes here:

1. **The window.** A real Windows app window with its own icon and taskbar entry, instead of a
   browser tab.
2. **Access to your files.** The *main process* saves every note, to-do and class into
   `C:\Note\data`. It writes each file safely: to a temporary file first, then swapped in, so a crash
   never leaves half a file.
3. **A safe split between screen and disk.** The screens (the *renderer*) can't touch your disk
   directly. They can only send specific requests through the *preload bridge*, such as "save this
   note" or "give me my tasks". This is Electron's recommended security model (`contextIsolation`
   and `sandbox`).
4. **Packaging into an `.exe`.** The tool *electron-builder* bundles Chromium, Node.js and this
   app's code into `release\win-unpacked\Notes.exe`, a program you can double-click without
   installing anything else.
5. **Desktop extras.** Saving before the window closes, opening links in your normal browser, the
   "Open data folder" button, and blocking a second copy of the app from running and fighting over
   the same files.

### Trade-offs

- **Size:** every Electron app carries its own copy of Chromium. That's why the `release` folder is
  about 360 MB even though the app's own code is only about 2 MB.
- **Memory:** it uses about as much RAM as a couple of browser tabs.
- **In return:** a polished, modern interface; easy updates to the code; and the same technology as
  apps you already use daily.

---

## 6. How the code is organized

```
C:\Note\
├─ README.md                  ← this file
├─ CLAUDE.md                  ← progress notes for Claude, the AI that wrote this app
├─ Build App.bat              ← double-click to (re)build Notes.exe
├─ Create Desktop Shortcut.bat
├─ data\                      ← YOUR notes (not part of the code, never in git)
├─ release\win-unpacked\      ← the built app (Notes.exe lives here)
├─ src\
│  ├─ shared\    pure logic used everywhere: data types, time math, calendar layout,
│  │             to-do grouping, note search, file validation
│  ├─ main\      Electron main process: window, storage, backups, images
│  ├─ preload\   the safe bridge (window.api)
│  └─ renderer\  the screens, written in React
│     └─ src\features\  notes\, todos\, calendar\, settings\
├─ tests\unit\   automated tests for the logic (npm test)
├─ tests\e2e\    automated click-through tests of the real app (npm run e2e)
├─ scripts\      icon generator, shortcut script, screenshot and demo-data helpers
├─ build\        app icon
└─ docs\superpowers\  the design spec and the step-by-step build plan
```

**Built with:**

| Part | Tools |
|---|---|
| Desktop shell | Electron |
| Build tool | electron-vite |
| Screens | React and TypeScript |
| Note editor | TipTap |
| App state | zustand |
| Icons | lucide |
| Fonts | Onest and Unbounded, bundled for offline use, with Cyrillic support including Ө and Ү |
| Tests | Vitest and Playwright |
| Packaging | electron-builder |

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| The Desktop shortcut does nothing or is missing | Run `Create Desktop Shortcut.bat`. If it says Notes.exe wasn't found, run `Build App.bat` first. |
| `Build App.bat` says Notes is still open | Close the Notes window (check the taskbar), then run it again. |
| A note shows "Couldn't save" | Make sure `C:\Note\data` still exists and isn't read-only. Your next edit retries automatically. |
| Something looks wrong after an update | Close the app and run `Build App.bat` again. Your data isn't affected. |
| Lost something | Look in **Trash** first, then in `data\backups\`. |
