# Dev Dash

Reusable developer admin dashboard template. Drop into any Next.js project.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Styling:** Tailwind CSS v4 (CSS-first config) + CSS Modules
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
| `admin.config.ts` | Single config — branding, AI, DB tables, cursor prompts |
| `src/db/schema/` | Drizzle schema files (6 tables including `projects`) |
| `src/app/admin/page.tsx` | Projects list (entry point) |
| `src/app/admin/[slug]/` | Project-scoped pages (dashboard, tasks, notes, etc.) |
| `src/app/admin/[slug]/ProjectContext.tsx` | React context — provides `{ project, basePath }` |
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

- **Multi-project:** `/admin` shows a projects list. Each project lives at `/admin/[slug]/` with isolated data. SOW phases and blockers are per-project JSONB, not shared config.
- **Project context:** `[slug]/layout.tsx` fetches the project by slug (server-side), then wraps children in `ProjectContext`. All page components read `project.id` from context and pass it as `projectId` to API calls.
- **Config-driven:** `admin.config.ts` holds branding, AI config, DB table registry, and cursor prompts. Per-project data (phases, blockers) lives in the DB.
- **Auth:** Cookie-based (`admin_session`). Root layout checks cookie on every request.
- **DB init:** Lazy via Proxy pattern — no connection until first query.
- **API scoping:** All CRUD and stats endpoints accept optional `projectId` query param (GET) or body field (POST). Nullable FK for backward compat.
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

- **Colors:** `--admin-gray-*` (notebook paper → slate ink), `--admin-slate-*` (dark mode), `--admin-blue-*` (steel ink accent)
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
- `tailwind.config.ts` — removed. All config migrated to CSS-first (`globals.css` `@theme` block).

### Notebook Textures

- `src/styles/notebook-textures.css` — college ruled + graph paper overlays via `data-texture` attr on `<html>`
- `TextureToggle` component in sidebar footer — cycles off → ruled → grid, persists in `localStorage`

## Gotchas

- `sonner` toast uses `toast.success()` / `toast.error()` — not `toast({ variant })`.
- DB connection is lazy-initialized. No env var = no crash until you actually query.
- CSS Modules are used alongside Tailwind — check for `.module.css` files before refactoring styles.
- Package manager: `pnpm` preferred, `npm` works fine.
- `:focus-visible` states exist on login, layout nav, AdminAccessTrigger. Other interactive elements should add them as they're touched.
- Tailwind v4 uses CSS-first config (`@theme` in globals.css). No `tailwind.config.ts`. Animation utilities defined via `@utility` in globals.css (replaces `tailwindcss-animate`).
- Status colors are two-tone (slate weight), NOT rainbow. Differentiation via weight/opacity/icons, not hue.
- Shadows are neumorphic (paired highlight + shade). Don't add flat drop-shadows.
