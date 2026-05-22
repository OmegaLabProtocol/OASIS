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

## Disclaimer

OASIS provides informational analytics only. Non-custodial. Not financial advice.
