# Money Flow OS

A TanStack Start (React 19 + Vite) personal-finance dashboard with Supabase, shadcn/ui, Tailwind v4, and d3-sankey visualizations.

## Stack
- **Framework:** TanStack Start + TanStack Router (SSR)
- **Bundler:** Vite 7 via `@lovable.dev/vite-tanstack-config`
- **UI:** React 19, Tailwind CSS v4, Radix UI / shadcn-style components
- **Data:** `@supabase/supabase-js`, `@tanstack/react-query`
- **Package manager:** `bun` (fallback: `npm`)

## Replit Setup
- Dev server runs on **port 5000** at host `0.0.0.0` (configured in `vite.config.ts`).
- HMR uses the Replit dev domain over `wss` on port 443.
- `allowedHosts: true` is set so the iframe proxy works.
- The Cloudflare Vite plugin is disabled (`cloudflare: false`) so the SSR build targets Node.

## Workflow
- `Start application` runs `bun run dev` (waits for port 5000, webview output).

## Production / Deployment
- Target: **Autoscale**
- Build: `bun run build` — emits `dist/client/` (assets) and `dist/server/server.js` (SSR handler).
- Run: `node server.mjs` — a small Node HTTP wrapper that serves `dist/client/` static assets and forwards everything else to the TanStack Start `fetch` handler.

## Environment Variables
Defined in `.env` (already committed by upstream):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — client-side Supabase config
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` — server-side
- `VITE_SUPABASE_PROJECT_ID`

## App Architecture
- **Routing:** TanStack file-based routing under `src/routes/`. `__root.tsx` mounts `<AuthProvider><FinanceProvider><RouteSwitch /></FinanceProvider></AuthProvider>`. `RouteSwitch` skips the `<AppShell>` for `/auth`. Routes: `/`, `/cash-flow`, `/goals`, `/rental`, `/reports`, `/settings`, `/auth`.
- **Auth:** `src/lib/auth-context.tsx` exposes `<AuthProvider>` + `useAuth()` (wrapping `supabase.auth.getSession` + `onAuthStateChange`). `src/components/auth/AuthCard.tsx` is a 3-mode card: Đăng nhập / Đăng ký / Quên mật khẩu. `<FinanceProvider>` redirects unauthed users to `/auth`.
- **Cloud data:** `src/lib/supabase-data.ts` is the single boundary between the app and Supabase: `fetchAllForUser(userId)` returns a `FinanceState`; `cloud.{insert,update,delete,seedDemo,wipe}` perform mutations. Tx type `savings` ↔ DB `saving` is converted at this boundary.
- **State:** `src/lib/finance-store.ts` is a vanilla pub/sub store exposed via `useFinance()` / `useActiveMonth()` / `useFinanceActions()` (uses `useSyncExternalStore`). On login it calls `hydrateForUser(userId)` and subscribes to a Realtime channel `mfos-{userId}` (debounced refetch). All mutations are **optimistic** — the local state updates first, then Supabase is hit; on failure, a refetch reconciles. Per-mutation undo stack capped at 25 (local-only convenience).
- **Schema:** Single migration at `supabase/migrations/0001_init.sql` (idempotent). Tables: `profiles`, `transactions`, `budget_items`, `goals`, `rental_rooms`. View: `monthly_summary`. Trigger `handle_new_user` auto-creates a profile row. RLS on every table: `auth.uid() = user_id`.
- **Types:** `src/lib/finance-types.ts` for app types; `src/integrations/supabase/types.ts` is a hand-written `Database` interface (each table includes `Relationships: []` so `supabase-js` infers schemas correctly). The Supabase client at `src/integrations/supabase/client.ts` is a lazy proxy (so SSR doesn't trip on missing env vars at import).
- **Layout:** `AppShell` wraps authenticated pages with sidebar + sticky header + mobile FAB + `<Toaster />`. UI state lives in `shell-context.ts`.
- **Key UI:** AuthCard, MonthSelector, QuickAddDialog, TransactionList, GoalsBoard + GoalCard + WhatIfPanel, RentalBoard, ReportsPanel, SettingsPage (now: email, logout, cloud-aware reset/wipe).
- **Currency:** `formatVND` → "27.000.000 ₫" via `toLocaleString("vi-VN")`. UI is fully Vietnamese.

## One-time setup (user must do)
Open `supabase/migrations/0001_init.sql` and paste it into the Supabase SQL editor for the project (https://supabase.com/dashboard/project/vlvdivviuxcspgxhvdhk/sql/new). This creates all tables, the `monthly_summary` view, the `handle_new_user` trigger, and the RLS policies. The migration is idempotent — safe to re-run.
