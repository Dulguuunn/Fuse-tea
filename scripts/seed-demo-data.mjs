// Dev helper: writes realistic demo data into a folder (NEVER point this at your real data folder).
// Usage: node scripts/seed-demo-data.mjs <dir>     then: node scripts/screenshot.mjs out.png --data <dir>
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('usage: node scripts/seed-demo-data.mjs <dir>')
  process.exit(1)
}
mkdirSync(join(dir, 'notes'), { recursive: true })

const now = Date.now()
const min = 60_000
const day = 24 * 60 * min
const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayOffset = (n) => iso(new Date(now + n * day))

const notebooks = [
  { id: 'physics', name: 'Physics', createdAt: now - 30 * day },
  { id: 'calculus', name: 'Calculus II', createdAt: now - 30 * day },
  { id: 'english', name: 'English Literature', createdAt: now - 20 * day }
]
writeFileSync(join(dir, 'notebooks.json'), JSON.stringify(notebooks, null, 2))

const doc = (...blocks) => ({ type: 'doc', content: blocks })
const p = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const h = (level, text) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] })
const todo = (checked, text) => ({
  type: 'taskItem',
  attrs: { checked },
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
})

const notes = [
  {
    id: 'n-newton',
    title: 'Newton’s laws — lecture 4',
    notebookId: 'physics',
    pinned: true,
    updatedAt: now - 25 * min,
    content: doc(
      h(2, 'Second law'),
      p('Net force equals mass times acceleration: F = ma. Units are newtons (kg·m/s²).'),
      h(2, 'Before Thursday'),
      { type: 'taskList', content: [todo(true, 'Re-read chapter 4.2'), todo(false, 'Problem set 3, questions 1–6')] }
    ),
    text: 'Second law Net force equals mass times acceleration: F = ma. Units are newtons (kg·m/s²). Before Thursday Re-read chapter 4.2 Problem set 3, questions 1–6'
  },
  {
    id: 'n-series',
    title: 'Taylor series cheat sheet',
    notebookId: 'calculus',
    pinned: false,
    updatedAt: now - 3 * 60 * min,
    content: doc(p('eˣ = 1 + x + x²/2! + x³/3! + …'), p('sin x = x − x³/3! + x⁵/5! − …')),
    text: 'eˣ = 1 + x + x²/2! + x³/3! + … sin x = x − x³/3! + x⁵/5! − …'
  },
  {
    id: 'n-gatsby',
    title: 'Gatsby essay outline',
    notebookId: 'english',
    pinned: false,
    updatedAt: now - 1 * day,
    content: doc(p('Thesis: the green light stands for a future that is always one step out of reach.')),
    text: 'Thesis: the green light stands for a future that is always one step out of reach.'
  },
  {
    id: 'n-mn',
    title: 'Монгол хэлний дасгал',
    notebookId: null,
    pinned: false,
    updatedAt: now - 3 * day,
    content: doc(p('Өнөөдрийн хичээлээр үйл үгийн цагийг давтсан. Үүнийг дараагийн долоо хоногт шалгана.')),
    text: 'Өнөөдрийн хичээлээр үйл үгийн цагийг давтсан. Үүнийг дараагийн долоо хоногт шалгана.'
  },
  {
    id: 'n-groceries',
    title: 'Groceries',
    notebookId: null,
    pinned: false,
    updatedAt: now - 9 * day,
    content: doc(p('Rice, eggs, milk, apples')),
    text: 'Rice, eggs, milk, apples'
  },
  {
    id: 'n-old',
    title: 'Old lab notes',
    notebookId: 'physics',
    pinned: false,
    updatedAt: now - 40 * day,
    deletedAt: now - 2 * day,
    content: doc(p('Pendulum period measurements')),
    text: 'Pendulum period measurements'
  }
]
for (const n of notes) {
  writeFileSync(
    join(dir, 'notes', `${n.id}.json`),
    JSON.stringify({ createdAt: n.updatedAt - day, deletedAt: null, ...n }, null, 2)
  )
}

const tasks = [
  { id: 't1', title: 'Problem set 3', done: false, dueDate: dayOffset(-1), dueTime: null },
  { id: 't2', title: 'Email lab partner about the report', done: false, dueDate: dayOffset(0), dueTime: 17 * 60 },
  { id: 't3', title: 'Read chapter 5 of Gatsby', done: false, dueDate: dayOffset(0), dueTime: null },
  { id: 't4', title: 'Calculus quiz', done: false, dueDate: dayOffset(2), dueTime: 9 * 60 },
  { id: 't5', title: 'Buy a new notebook', done: false, dueDate: null, dueTime: null },
  { id: 't6', title: 'Submit library form', done: true, dueDate: dayOffset(-2), dueTime: null, completedAt: now - day }
].map((t) => ({ createdAt: now - 5 * day, completedAt: null, ...t }))
writeFileSync(join(dir, 'tasks.json'), JSON.stringify(tasks, null, 2))

const calendar = {
  classes: [
    {
      id: 'c-physics',
      name: 'Physics',
      room: 'Room 204',
      color: '#7cc4ff',
      sessions: [
        { id: 's1', weekday: 1, start: 9 * 60, end: 10 * 60 + 30 },
        { id: 's2', weekday: 3, start: 9 * 60, end: 10 * 60 + 30 }
      ]
    },
    {
      id: 'c-calc',
      name: 'Calculus II',
      room: 'Hall B',
      color: '#ffd84d',
      sessions: [
        { id: 's3', weekday: 2, start: 13 * 60, end: 15 * 60 },
        { id: 's4', weekday: 4, start: 13 * 60, end: 15 * 60 }
      ]
    },
    {
      id: 'c-eng',
      name: 'English Literature',
      room: 'Library 3',
      color: '#ff9ec4',
      sessions: [{ id: 's5', weekday: 5, start: 10 * 60 + 40, end: 12 * 60 + 10 }]
    },
    {
      id: 'c-lab',
      name: 'Physics lab',
      room: 'Lab 1',
      color: '#7ee0a1',
      sessions: [{ id: 's6', weekday: 3, start: 10 * 60, end: 12 * 60 }]
    }
  ],
  events: [
    { id: 'e1', title: 'Calculus midterm', date: dayOffset(1), start: 16 * 60, end: 17 * 60 + 30, color: '#ff9f6b', location: 'Hall A' }
  ]
}
writeFileSync(join(dir, 'calendar.json'), JSON.stringify(calendar, null, 2))

console.log(`seeded ${dir}`)
