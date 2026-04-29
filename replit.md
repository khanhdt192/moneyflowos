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
