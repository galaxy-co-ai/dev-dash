# Dev Dash

A full-featured developer admin dashboard built with Next.js 14, designed to be dropped into any project. Includes a task board, changelog, notes, feedback tracker, database explorer, SOW tracker, and AI-powered commands.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 3. Configure
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and ADMIN_PASSWORD

# 4. Push schema to database
npm run db:push

# 5. Start dev server
npm run dev
# Visit http://localhost:3000/admin
```

## Configuration

All project-specific content lives in **`admin.config.ts`**. Edit this single file to customize:

### Project Identity

```ts
export const project = {
  name: 'My Project',
  subtitle: 'Development Dashboard',
  logoPath: '/placeholder-logo.svg',
  logoAlt: 'Project Logo',
  siteUrl: '/',
};
```

### AI Chat

```ts
export const ai = {
  enabled: true,
  model: 'claude-sonnet-4-20250514',
  projectContext: `Your project-specific system prompt here...`,
};
```

Set `ANTHROPIC_API_KEY` in `.env.local` to enable the AI chat panel and command bar prompts.

### SOW Phases

```ts
export const phases: Phase[] = [
  {
    id: 1,
    name: 'Discovery & Setup',
    status: 'complete',
    deliverables: [
      { name: 'Kickoff meeting', status: 'complete' },
      { name: 'Repository setup', status: 'complete' },
    ],
  },
  // Add more phases...
];
```

### Database Explorer

Register your own tables for the database explorer:

```ts
import { myTable } from './src/db/schema';

export const database = {
  tables: {
    dev_tasks: devTasks,
    my_table: myTable,  // Add your tables here
  } as Record<string, PgTable>,
  editableTables: new Set(['dev_tasks', 'my_table']),
};
```

## Features

| Feature | Path | Description |
|---------|------|-------------|
| Dashboard | `/admin` | Phase overview with progress bars |
| Task Board | `/admin/tasks` | Drag-and-drop Kanban board |
| Changelog | `/admin/changelog` | Release notes and version history |
| Notes | `/admin/notes` | Scratch pad for dev notes |
| Feedback | `/admin/feedback` | User feedback tracker with analytics |
| Database | `/admin/database` | Table explorer with CRUD |
| SOW Tracker | `/admin/sow` | Scope of work progress |
| Command Bar | `Ctrl+K` | AI commands and quick navigation |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Styling**: Tailwind CSS + CSS Modules
- **UI**: shadcn/ui components + Radix primitives
- **AI**: Anthropic Claude API (optional)
- **Motion**: Motion (Framer Motion)
- **Charts**: Recharts
- **DnD**: @dnd-kit

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `ADMIN_PASSWORD` | Yes | Password for admin login |
| `ADMIN_SESSION_TOKEN` | No | Fixed session token (auto-generated if empty) |
| `ANTHROPIC_API_KEY` | No | Enables AI chat and commands |

## Adding to an Existing Project

If you're adding the admin panel to an existing Next.js project:

1. Copy `src/app/admin/` and `src/app/api/admin/` into your app directory
2. Copy `src/components/features/admin/` and the UI components you don't already have
3. Copy `src/db/schema/` files (merge with your existing schema)
4. Copy `admin.config.ts` to your project root
5. Add the `@/admin.config` path alias to `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/admin.config": ["./admin.config.ts"]
       }
     }
   }
   ```
6. Install any missing dependencies from `package.json`

## Authentication

The admin panel uses cookie-based authentication. Login at `/admin` with the `ADMIN_PASSWORD` env var. Sessions are stored as `admin_session` cookies validated on each API request.

## Database Schema

Ships with 5 admin tables:

- `dev_tasks` — Task board items with phases, priorities, checklists
- `dev_notes` — Developer notes
- `feedback` — User feedback submissions
- `changelog_entries` — Release changelog
- `ai_memories` — Persistent AI conversation context

Run `npm run db:push` to create tables, or `npm run db:studio` to browse with Drizzle Studio.
