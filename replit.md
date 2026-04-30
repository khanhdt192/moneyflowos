# Money Flow OS

A TanStack Start (React 19 + Vite) personal-finance dashboard with Supabase, shadcn/ui, Tailwind v4, and d3-sankey visualizations.

## Stack
- **Framework:** React 19 SPA with TanStack Router (file-based routing, no SSR)
- **Bundler:** Vite 7 (`@vitejs/plugin-react` + `@tanstack/router-plugin/vite` + `@tailwindcss/vite`)
- **UI:** React 19, Tailwind CSS v4, Radix UI / shadcn-style components
- **Data:** `@supabase/supabase-js`, `@tanstack/react-query`
- **Package manager:** `bun` (fallback: `npm`)

## Replit Setup
- Dev server runs on **port 5000** at host `0.0.0.0` (configured in `vite.config.ts`).
- `allowedHosts: true` is set so the iframe proxy works.
- Entry: `index.html` → `src/main.tsx` mounts `<RouterProvider router={getRouter()} />`.

## Workflow
- `Start application` runs `bun run dev` (waits for port 5000, webview output).

## Production / Deployment (Vercel)
- **Framework preset:** Vite (auto-detected; `vercel.json` pins it explicitly).
- **Build:** `bun run build` → outputs static assets to `dist/`.
- **Output dir:** `dist`.
- **Install:** `bun install`.
- **SPA rewrite:** `vercel.json` rewrites every non-asset path to `/index.html` so client-side routing works on hard refresh / direct links.
- **Required env vars on Vercel** (Project Settings → Environment Variables):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - (Optional) `VITE_SUPABASE_PROJECT_ID`
- After deploy, add the Vercel domain to Supabase → Authentication → URL Configuration → Site URL + Additional Redirect URLs so email confirmation links resolve correctly.

## Environment Variables
Local `.env` (gitignored):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` — optional, used by the dashboard link in docs

Because this is a pure SPA, only `VITE_*` env vars are needed (server-side `SUPABASE_*` are no longer used).

## App Architecture
- **Routing:** TanStack file-based routing under `src/routes/`. `__root.tsx` mounts `<AuthProvider><FinanceProvider><RouteSwitch /></FinanceProvider></AuthProvider>`. `RouteSwitch` skips the `<AppShell>` for `/auth`. Routes: `/`, `/cash-flow`, `/goals`, `/rental`, `/reports`, `/settings`, `/auth`.
- **Auth:** `src/lib/auth-context.tsx` exposes `<AuthProvider>` + `useAuth()` (wrapping `supabase.auth.getSession` + `onAuthStateChange`). `src/components/auth/AuthCard.tsx` is a 3-mode card: Đăng nhập / Đăng ký / Quên mật khẩu. `<FinanceProvider>` redirects unauthed users to `/auth`.
- **Cloud data:** `src/lib/supabase-data.ts` is the single boundary between the app and Supabase: `fetchAllForUser(userId)` returns a `FinanceState`; `cloud.{insert,update,delete,seedDemo,wipe}` perform mutations. Tx type `savings` ↔ DB `saving` is converted at this boundary.
- **State:** `src/lib/finance-store.ts` is a vanilla pub/sub store exposed via `useFinance()` / `useActiveMonth()` / `useFinanceActions()` (uses `useSyncExternalStore`). On login it calls `hydrateForUser(userId)` and subscribes to a Realtime channel `mfos-{userId}` (debounced refetch). All mutations are **optimistic** — the local state updates first, then Supabase is hit; on failure, a refetch reconciles. Per-mutation undo stack capped at 25 (local-only convenience).
- **Schema:** Single migration at `supabase/migrations/0001_init.sql` (idempotent). Tables: `profiles`, `transactions`, `budget_items`, `goals`, `rental_rooms`. View: `monthly_summary`. Trigger `handle_new_user` auto-creates a profile row. RLS on every table: `auth.uid() = user_id`.
- **Types:** `src/lib/finance-types.ts` for app types; `src/integrations/supabase/types.ts` is a hand-written `Database` interface (each table includes `Relationships: []` so `supabase-js` infers schemas correctly). The Supabase client at `src/integrations/supabase/client.ts` is a lazy proxy (so SSR doesn't trip on missing env vars at import).
- **Layout:** `AppShell` wraps authenticated pages with sidebar + sticky header + mobile FAB + `<Toaster />`. UI state lives in `shell-context.ts`.
- **Key UI:** AuthCard, MonthSelector, QuickAddDialog, TransactionList, GoalsBoard + GoalCard + WhatIfPanel, RentalBoard (6-tab redesign: Tổng quan / Phòng / Ghi số / Hóa đơn / Báo cáo / Cấu hình), ReportsPanel, SettingsPage.
- **Rental module:** Fully redesigned into a 6-tab SaaS workspace under `src/components/rental/`. Tabs are split into `src/components/rental/tabs/` — TongQuan.tsx (KPI dashboard + 6-month chart), Phong.tsx (room table + right-side Sheet drawer), GhiSo.tsx (keyboard-friendly meter reading table), HoaDon.tsx (invoice table with filters + modal), BaoCao.tsx (Recharts dashboards), CauHinh.tsx (per-section cost config form).
- **Currency:** `formatVND` → "27.000.000 ₫" via `toLocaleString("vi-VN")`. UI is fully Vietnamese.

## One-time setup (user must do)
Open `supabase/migrations/0001_init.sql` and paste it into the Supabase SQL editor for the project (https://supabase.com/dashboard/project/vlvdivviuxcspgxhvdhk/sql/new). This creates all tables, the `monthly_summary` view, the `handle_new_user` trigger, and the RLS policies. The migration is idempotent — safe to re-run.
