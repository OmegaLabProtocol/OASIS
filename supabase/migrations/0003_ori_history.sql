-- =============================================================================
-- OASIS ORI History
-- Migration 0003 — persistent daily ORI snapshots (observed vs backfilled)
--
-- ADDITIVE ONLY. Does not modify or drop existing tables or data.
--
-- Design notes:
--  * One canonical daily observation per (asset_key, snapshot_date,
--    methodology_version). The unique constraint makes the snapshot job
--    idempotent — retries never create duplicate daily rows.
--  * `calculation_type` distinguishes OBSERVED (captured during a live
--    calculation) from BACKFILLED (reconstructed later). They must never be
--    silently treated as equivalent.
--  * Historical rows retain the methodology_version used at calculation time.
--  * RLS is ENABLED with NO permissive policies. Trusted server code writes
--    and reads via the service-role key (same pattern as beta tables).
--  * This table is NOT user-owned. It is an institutional time series.
-- =============================================================================

create table if not exists public.ori_snapshots (
  id                   uuid primary key default gen_random_uuid(),
  asset_key            text not null,
  symbol               text not null,
  name                 text,
  chain                text,
  snapshot_date        date not null,
  observed_at          timestamptz not null,
  overall_ori          numeric not null,
  grade                text,
  category_scores      jsonb not null default '[]'::jsonb,
  score_drivers        jsonb,
  data_confidence      jsonb,
  data_sources         jsonb,
  underlying_metrics   jsonb,
  source_metadata      jsonb,
  methodology_version  text not null,
  calculation_type     text not null
                         check (calculation_type in ('observed', 'backfilled')),
  created_at           timestamptz not null default now(),
  constraint uniq_ori_snapshots_daily unique (
    asset_key,
    snapshot_date,
    methodology_version,
    calculation_type
  )
);

create index if not exists idx_ori_snapshots_asset_date
  on public.ori_snapshots (asset_key, snapshot_date desc);

create index if not exists idx_ori_snapshots_version
  on public.ori_snapshots (methodology_version);

create index if not exists idx_ori_snapshots_type
  on public.ori_snapshots (calculation_type);

alter table public.ori_snapshots enable row level security;
-- No permissive policies: anon and authenticated cannot read/write snapshots.
-- Server-side snapshot jobs and history readers use the service-role key.
