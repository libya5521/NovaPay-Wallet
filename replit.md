# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

### `artifacts/novapay` (`@workspace/novapay`)

Expo React Native (+ web) mobile fintech app — NovaPay.

**Screens (app/):**
- `(auth)/login.tsx` — Login with email/password, error banner, forgot password link
- `(auth)/register.tsx` — Registration with password-strength rules indicator
- `(auth)/forgot-password.tsx` — Forgot password with email submission + success state
- `(tabs)/index.tsx` — Dashboard: balance card, quick actions (Send/Add/Withdraw/Activity), recent transactions
- `(tabs)/card.tsx` — Virtual card with freeze/unfreeze toggle wired to API
- `(tabs)/transactions.tsx` — Full transaction history with skeleton loaders, pagination, tap-for-detail modal
- `(tabs)/profile.tsx` — Profile info, edit button (navigates to /edit-profile), KYC verification section
- `(tabs)/settings.tsx` — Settings screen: account, integrations, app, danger zone
- `edit-profile.tsx` — Edit first/last/phone with pre-fill from current profile

**Components (components/):**
- `BalanceCard.tsx` — Gradient balance card with show/hide toggle
- `VirtualCard.tsx` — Card visualization with clipboard copy per field
- `TransactionItem.tsx` — Memoized transaction row with type-aware icons/colors
- `QuickAction.tsx` — Memoized quick action button with haptics
- `SendMoneyModal.tsx` — 2-step send: form → confirmation → execute
- `AddMoneyModal.tsx` — Top-up with preset quick amounts + custom input
- `WithdrawModal.tsx` — Withdraw with balance display and max button

**Key files:**
- `context/AuthContext.tsx` — JWT auth state using SecureStore (web: localStorage). `setAuthTokenGetter` wires token to API client.
- `constants/colors.ts` — Revolut-style design tokens: light/dark, text, tint, surface, status colors
- `hooks/useApiError.ts` — Consistent API error message parser
- `metro.config.js` — Blocks bcrypt temp files from Metro watcher (critical — without it Expo crashes)
- `babel.config.js` — Uses `babel-preset-expo@~54.0.10` (must match expo version)

**Backend API (artifacts/api-server/src/routes/):**
- `auth.ts` — POST /login, /register, /forgot-password
- `wallet.ts` — GET /balance, GET /card, POST /send, POST /add, POST /withdraw, POST /card/freeze, POST /card/unfreeze
- `transactions.ts` — GET /transactions (paginated with `hasMore`)
- `user.ts` — GET /profile, PATCH /profile
- `kyc.ts` — GET /kyc/status, POST /kyc/submit

**Security:**
- bcrypt cost 12 for password hashing
- JWT with timingSafeEqual comparison; startup validation of JWT_SECRET env var
- Helmet.js, CORS locked to env-var origin
- Global error handler (no stack traces in prod)

**Important notes:**
- Zod v3 API must be used in api-server (not `zod/v4` imports) — esbuild bundles fail otherwise
- `/user/profile` route is PATCH (not PUT)
- KYC routes at `/kyc/status` and `/kyc/submit`
- `setBaseUrl` called in `app/_layout.tsx`; `setAuthTokenGetter` wired in AuthContext
- Existing demo user passwords are bcrypt-incompatible; re-register to test
- `expo-clipboard@55` and `expo-secure-store@55` are installed (newer than expected; functional but show warnings)
