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

## Styling Architecture

**Token file:** `src/styles/admin-tokens.css` — single source of truth for all design tokens.

### Boundary Rules

| Layer | Use For | Never Mix With |
|-------|---------|---------------|
| CSS Modules (`.module.css`) | Layout, surfaces, elevation, interactive states, animations | Tailwind utilities on the same property |
| Tailwind classes | shadcn component overrides, inline spacing tweaks | CSS Module properties |
| `admin-tokens.css` | Color, spacing, typography, shadow, motion, z-index | Raw hex/rgba in any file |

### Token Categories

- **Colors:** `--admin-gray-*` (warm stone), `--admin-slate-*` (dark mode), `--admin-blue-*` (accent)
- **Semantic:** `--admin-bg-*`, `--admin-text-*`, `--admin-border-*`, `--admin-interactive-*`
- **Status:** `--admin-status-{success|warning|error|info}` + `-muted`, `-text`, `-border` variants
- **Surfaces:** `--admin-surface-{1-4}-{bg|border|shadow|backdrop}` (5-level elevation system)
- **Motion:** `--admin-transition-{hover|enter|move|fast}`, `--admin-duration-*`, `--admin-ease-*`
- **Page accents:** Each page sets `--page-accent-h/s/l` → auto-computes gradient + glow

### Rules

- Zero hardcoded hex/rgba in CSS modules — always use tokens
- `color: white` on buttons → `var(--admin-interactive-primary-text)`
- `color: white` on badges/status → `var(--admin-text-inverse)`
- Modal overlays → `var(--admin-overlay-scrim)`
- Header icon gradients → `var(--page-accent-gradient)` (set accent HSL per page)
- Use `color-mix(in srgb, var(--token) %, transparent)` for computed opacity on tokens
- Card radius: `--admin-radius-xl` (12px). Buttons/inputs: `--admin-radius-md` (8px)
- Exit animations 30% faster than enter

### Deleted Files

- `admin-theme.css` — removed. All `--color-*` vars were internal-only. Replaced by admin-tokens.

## Gotchas

- `sonner` toast uses `toast.success()` / `toast.error()` — not `toast({ variant })`.
- DB connection is lazy-initialized. No env var = no crash until you actually query.
- CSS Modules are used alongside Tailwind — check for `.module.css` files before refactoring styles.
- Package manager: `pnpm` preferred, `npm` works fine.
- `:focus-visible` states exist on login, layout nav, AdminAccessTrigger. Other interactive elements should add them as they're touched.
