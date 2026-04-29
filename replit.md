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
- **Routing:** TanStack file-based routing under `src/routes/`. `__root.tsx` mounts `<FinanceProvider><AppShell><Outlet /></AppShell></FinanceProvider>`. Routes: `/`, `/cash-flow`, `/goals`, `/rental`, `/reports`, `/settings`.
- **State:** Vanilla pub/sub store at `src/lib/finance-store.ts` exposed via `useFinance()` / `useActiveMonth()` / `useFinanceActions()` (uses `useSyncExternalStore`). Persisted to `localStorage` under `moneyflow:state:v2`. Includes a per-mutation undo stack (capped at 25). Hydrated client-side by `<FinanceProvider>` to avoid SSR mismatch.
- **Types:** `src/lib/finance-types.ts` (`FinanceState`, `MonthData`, `Transaction`, `Goal`, `RentalRoom`, `Settings`). `src/components/budget/types.ts` re-exports the same names for legacy imports.
- **Layout:** `AppShell` wraps the page with sidebar + sticky header + mobile FAB + `<Toaster />`. UI state (quick-add open, mobile drawer open) lives in `shell-context.ts` (separate file to avoid circular imports between AppShell↔AppSidebar↔TopHeader).
- **Key UI:** MonthSelector (prev/next/dropdown + duplicate-from-prev), QuickAddDialog (modal w/ type pills, amount, suggestions), TransactionList (search/filter/range), GoalsBoard + GoalCard + WhatIfPanel (sliders that re-project goal ETAs), RentalBoard with occupancy stats, ReportsPanel (CSV export + print), SettingsPage (name + reset).
- **Currency:** `formatVND` → "27.000.000 ₫" via `toLocaleString("vi-VN")`. UI is fully Vietnamese.
