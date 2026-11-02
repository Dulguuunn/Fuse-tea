# Applications section: task plan

Design: `../specs/2026-11-02-applications-design.md`. One task at a time: tests first, then code, then
`npm test` + `npm run typecheck` (+ `npm run e2e` for UI), update CLAUDE.md, commit.

- [ ] Task 28: Data layer. Types, normalizers, text counting, application/task/file logic, seed, JSON Resume
      mapper, export/import bundle (pure code + unit tests).
- [ ] Task 29: Main process + preload. IPC for profile/applications/files, stored-file protocol, drag-out,
      copy text, export/import dialogs, first-run seed. Renderer stores and task sync subscription.
- [ ] Task 30: Applications page shell + Profile tab (all nine sections, counters, Copy buttons).
- [ ] Task 31: Files tab (folders, upload, drag-in, preview, download, drag-out, links).
- [ ] Task 32: Applications tab (list, badges, filter/sort, editor, steps, answers/answer bank, files, to-do link).
- [ ] Task 33: Export/import UI, e2e test, screenshots.
- [ ] Task 34: README + CLAUDE.md, rebuild exe note.
