# Dev Dash — Project Index

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Login / entry point |
| `/admin` | `src/app/admin/page.tsx` | Dashboard — phase overview + stats |
| `/admin/tasks` | `src/app/admin/tasks/page.tsx` | Kanban task board (drag-and-drop) |
| `/admin/changelog` | `src/app/admin/changelog/page.tsx` | Release notes + version history |
| `/admin/notes` | `src/app/admin/notes/page.tsx` | Developer scratch pad |
| `/admin/feedback` | `src/app/admin/feedback/page.tsx` | User feedback tracker + analytics |
| `/admin/sow` | `src/app/admin/sow/page.tsx` | Scope of work progress |
| `/admin/database` | `src/app/admin/database/page.tsx` | Table explorer |
| `/admin/database/[table]` | `src/app/admin/database/[table]/page.tsx` | Single table CRUD view |

## API Routes

| Endpoint | Description |
|----------|-------------|
| `POST /api/admin/auth` | Login — sets `admin_session` cookie |
| `GET/PATCH/DELETE /api/admin/tasks/[id]` | Task CRUD |
| `GET/POST /api/admin/notes` | Notes list + create |
| `PATCH/DELETE /api/admin/notes/[id]` | Note update + delete |
| `GET/POST /api/admin/changelog` | Changelog list + create |
| `GET/PATCH/DELETE /api/admin/feedback/[id]` | Feedback CRUD |
| `GET /api/admin/stats` | Dashboard statistics |
| `GET /api/admin/tables` | Database table list + metadata |
| `POST /api/admin/ai/chat` | AI chat endpoint |
| `POST /api/admin/ai/audit` | Project audit command |
| `POST /api/admin/ai/sync-sprint` | Sprint sync command |
| `POST /api/admin/ai/suggest-next` | Next steps suggestion |
| `POST /api/admin/ai/find-blockers` | Blocker detection |
| `POST /api/admin/ai/generate-report` | Progress report generation |
| `GET/POST /api/admin/ai/memories` | AI memory CRUD |
| `POST /api/admin/ai/memories/extract` | Extract memories from conversation |

## DB Schema

| Table | File | Description |
|-------|------|-------------|
| `dev_tasks` | `src/db/schema/dev-tasks.ts` | Tasks with phases, priorities, checklists |
| `dev_notes` | `src/db/schema/dev-notes.ts` | Developer notes |
| `feedback` | `src/db/schema/feedback.ts` | User feedback submissions |
| `changelog_entries` | `src/db/schema/changelog.ts` | Release changelog |
| `ai_memories` | `src/db/schema/ai-memories.ts` | Persistent AI context |

## Component Structure

```
src/components/
├── features/admin/
│   ├── AdminAccessTrigger.tsx   — Login trigger component
│   ├── CommandBar.tsx            — Ctrl+K command palette
│   ├── DataTable.tsx             — Reusable data table (TanStack)
│   └── index.ts                  — Barrel export
└── ui/
    ├── badge.tsx, button.tsx, card.tsx
    ├── charts.tsx                — Recharts wrappers
    ├── command.tsx               — cmdk integration
    ├── dialog.tsx, dropdown-menu.tsx
    ├── dock.tsx                  — Sidebar dock
    ├── input.tsx, progress.tsx, tooltip.tsx
    ├── phase-timeline.tsx        — SOW phase visualizer
    └── segmented-progress.tsx    — Multi-segment progress bar
```
