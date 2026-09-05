# OASIS — Omega Analytics & Strategic Intelligence System

Institutional digital asset intelligence platform powered by **ORI (Omega Risk Index)**.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Flow

1. Landing page → institutional positioning
2. **Dashboard** → market risk, alerts, watchlist
3. Click **ETH** → ORI score, risk attribution, historical charts
4. **Generate Risk Brief** → investment committee report
5. **API Portal** → SaaS/API monetization story

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Recharts
- next-themes (light/dark)
- Lucide icons

## Architecture

```
src/
├── app/              # Pages & API routes
├── components/       # UI components
├── data/             # Mock datasets (raw metrics)
├── lib/scoring.ts    # ORI scoring engine
├── services/         # API abstraction (CoinGecko, DefiLlama, mock)
└── lib/tokenData.ts  # Token enrichment layer
```

API routes attempt public fetches and fall back to mock data gracefully.

## Environment

Copy `.env.local.example` to `.env.local` for optional API keys.

Required for private beta + persistence:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `BETA_SESSION_SECRET` (or it falls back to the Supabase secret)

Optional:

- `NEXT_PUBLIC_APP_URL` — canonical site URL for magic-link redirects (falls back to `VERCEL_URL` / production host)
- `CRON_SECRET` — Vercel Cron bearer for `GET /api/cron/ori-snapshots`
- `OASIS_DEV_AUTH_BYPASS=1` — local-only admin/product bypass (hard-disabled in production)
- `RESEND_API_KEY`, `OASIS_EMAIL_FROM`, `OASIS_EMAIL_REPLY_TO`
- `OPENAI_API_KEY` — Intelligence Report only (ORION is deterministic)

Supabase Auth (dashboard, not env): enable the Email provider with magic link / OTP. Confirm Site URL and add `{APP_URL}/auth/callback` to Redirect URLs. Admin login keeps `shouldCreateUser: false`. Beta confirmation creates a user for the invited email only, via the service-role `generateLink` path — no password.

## Database migrations (must apply)

Additive SQL in `supabase/migrations/`:

1. `0001_oasis_private_beta.sql`
2. `0002_beta_admin_refinements.sql`
3. `0003_ori_history.sql` — daily ORI snapshots (**already applied — do not re-run or edit**)
4. `0004_product_analytics.sql` — sessions, events, `beta_identity_links`; `user_id` is canonical, `invite_id` is attribution
5. `0005_user_workspace.sql` — saved screens, watchlists, portfolios owned by `user_id` (invite-only rows are transitional)

Paste **0004 then 0005** into the Supabase SQL editor. Do not modify 0003. Features that write to these tables fail closed (empty UI) until applied.

## Scheduled jobs

`vercel.json` registers:

```
0 6 * * *  →  /api/cron/ori-snapshots
```

Set `CRON_SECRET` on Vercel. The job writes one **observed** daily ORI snapshot per tracked/registry asset. It never fabricates backfilled history.

Manual: `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/ori-snapshots`

## Product workflow

Overview → Screener → Token Detail → Watchlist / Portfolios → Alerts → ORION → Export

Admin Product Analytics: `/admin/product` (RBAC: `view_activity`; CSV export: `export_beta_data`).

## Disclaimer

OASIS provides informational analytics only. Non-custodial. Not financial advice.
