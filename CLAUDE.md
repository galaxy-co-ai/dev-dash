# Dev Dash

Reusable developer admin dashboard template. Drop into any Next.js project.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Styling:** Tailwind CSS v3 + CSS Modules
- **UI:** shadcn/ui + Radix primitives
- **AI:** Anthropic Claude (optional)
- **Motion:** Motion (Framer Motion)
- **Charts:** Recharts
- **DnD:** @dnd-kit

## Commands

```bash
pnpm dev          # Dev server → localhost:3000/admin
pnpm build        # Production build
pnpm typecheck    # TypeScript check (tsc --noEmit)
pnpm lint         # ESLint
pnpm db:push      # Push schema to Neon
pnpm db:studio    # Drizzle Studio
```

## Key Files

| File | Purpose |
|------|---------|
| `admin.config.ts` | Single config — branding, AI, phases, blockers, DB tables |
| `src/db/schema/` | Drizzle schema files (5 admin tables) |
| `src/app/admin/` | All admin pages |
| `src/app/api/admin/` | API routes (auth, CRUD, AI endpoints) |
| `src/components/features/admin/` | Admin-specific components |
| `src/components/ui/` | shadcn/ui primitives |

## Env Vars

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `ADMIN_PASSWORD` | Yes | Login password |
| `ADMIN_SESSION_TOKEN` | No | Fixed session token (auto-gen if empty) |
| `ANTHROPIC_API_KEY` | No | Enables AI chat + command bar |

## Architecture

- **Config-driven:** `admin.config.ts` is the single source of project-specific content. All pages read from it.
- **Auth:** Cookie-based (`admin_session`). Layout checks cookie on every request.
- **DB init:** Lazy via Proxy pattern — no connection until first query.
- **Path alias:** `@/admin.config` maps to root `admin.config.ts`.

## Gotchas

- `sonner` toast uses `toast.success()` / `toast.error()` — not `toast({ variant })`.
- DB connection is lazy-initialized. No env var = no crash until you actually query.
- CSS Modules are used alongside Tailwind — check for `.module.css` files before refactoring styles.
- Package manager: `pnpm` preferred, `npm` works fine.
