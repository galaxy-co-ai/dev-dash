# Dev Dash — Project Index

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Login / entry point |
| `/admin` | `src/app/admin/page.tsx` | Projects list — create and manage projects |
| `/admin/[slug]` | `src/app/admin/[slug]/page.tsx` | Project dashboard — stats + phase overview |
| `/admin/[slug]/tasks` | `src/app/admin/[slug]/tasks/page.tsx` | Kanban task board (drag-and-drop) |
| `/admin/[slug]/changelog` | `src/app/admin/[slug]/changelog/page.tsx` | Release notes + version history |
| `/admin/[slug]/notes` | `src/app/admin/[slug]/notes/page.tsx` | Developer scratch pad |
| `/admin/[slug]/feedback` | `src/app/admin/[slug]/feedback/page.tsx` | User feedback tracker + analytics |
| `/admin/[slug]/sow` | `src/app/admin/[slug]/sow/page.tsx` | Scope of work progress |
| `/admin/[slug]/database` | `src/app/admin/[slug]/database/page.tsx` | Table explorer |
| `/admin/[slug]/database/[table]` | `src/app/admin/[slug]/database/[table]/page.tsx` | Single table CRUD view |

## Layouts

| File | Purpose |
|------|---------|
| `src/app/admin/layout.tsx` | Auth-only wrapper (no sidebar) |
| `src/app/admin/[slug]/layout.tsx` | Fetches project by slug, renders sidebar + `ProjectContext` |
| `src/app/admin/[slug]/ProjectContext.tsx` | React context — provides `{ project, basePath }` |

## API Routes

| Endpoint | Description |
|----------|-------------|
| `POST /api/admin/auth` | Login — sets `admin_session` cookie |
| `GET/POST /api/admin/projects` | Projects list + create |
| `GET/PATCH/DELETE /api/admin/projects/[slug]` | Single project CRUD |
| `GET/POST /api/admin/tasks` | Tasks list + create (accepts `projectId`) |
| `GET/PATCH/DELETE /api/admin/tasks/[id]` | Task CRUD |
| `GET/POST /api/admin/notes` | Notes list + create (accepts `projectId`) |
| `PATCH/DELETE /api/admin/notes/[id]` | Note update + delete |
| `GET/POST /api/admin/changelog` | Changelog list + create (accepts `projectId`) |
| `GET/POST /api/admin/feedback` | Feedback list + create (accepts `projectId`) |
| `GET/PATCH/DELETE /api/admin/feedback/[id]` | Feedback CRUD |
| `GET /api/admin/stats` | Dashboard statistics (accepts `projectId`) |
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
| `projects` | `src/db/schema/projects.ts` | Projects with slug, phases (JSONB), blockers (JSONB) |
| `dev_tasks` | `src/db/schema/dev-tasks.ts` | Tasks with phases, priorities, checklists, `projectId` FK |
| `dev_notes` | `src/db/schema/dev-notes.ts` | Developer notes, `projectId` FK |
| `feedback` | `src/db/schema/feedback.ts` | User feedback submissions, `projectId` FK |
| `changelog_entries` | `src/db/schema/changelog.ts` | Release changelog, `projectId` FK |
| `ai_memories` | `src/db/schema/ai-memories.ts` | Persistent AI context, `projectId` FK |

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
