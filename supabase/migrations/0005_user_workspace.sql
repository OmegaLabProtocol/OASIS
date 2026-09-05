-- =============================================================================
-- OASIS User Workspace
-- Migration 0005 — saved screens, watchlists, portfolios
--
-- ADDITIVE ONLY. Does not modify or drop existing tables or data.
-- Does not touch ori_snapshots (0003) or analytics tables (0004).
--
-- Ownership model:
--  * user_id (auth.users) is the CANONICAL owner for authenticated users.
--  * invite_id is a TRANSITIONAL owner only (invite-cookie sessions that have
--    not completed passwordless Auth yet). After identity linking, rows are
--    claimed onto user_id and invite_id remains as attribution.
--  * A row must have user_id and/or invite_id (CHECK).
--  * RLS: authenticated users access only rows where user_id = auth.uid().
--    Invite-only rows (user_id IS NULL) are invisible via RLS and are read/
--    written solely by trusted server code with the service-role key.
--  * Holdings are authorized through the parent portfolio.
-- =============================================================================

create table if not exists public.saved_screens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  invite_id   uuid references public.beta_invites (id) on delete set null,
  name        text not null,
  filters     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint saved_screens_has_owner
    check (user_id is not null or invite_id is not null)
);

create index if not exists idx_saved_screens_user
  on public.saved_screens (user_id);
create index if not exists idx_saved_screens_invite
  on public.saved_screens (invite_id);

create table if not exists public.watchlist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  invite_id   uuid references public.beta_invites (id) on delete set null,
  asset_key   text not null,
  symbol      text not null,
  created_at  timestamptz not null default now(),
  constraint watchlist_items_has_owner
    check (user_id is not null or invite_id is not null)
);

create unique index if not exists uniq_watchlist_user_asset
  on public.watchlist_items (user_id, asset_key)
  where user_id is not null;
create unique index if not exists uniq_watchlist_invite_asset
  on public.watchlist_items (invite_id, asset_key)
  where user_id is null and invite_id is not null;
create index if not exists idx_watchlist_items_user
  on public.watchlist_items (user_id);
create index if not exists idx_watchlist_items_invite
  on public.watchlist_items (invite_id);

create table if not exists public.portfolios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  invite_id   uuid references public.beta_invites (id) on delete set null,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint portfolios_has_owner
    check (user_id is not null or invite_id is not null)
);

create index if not exists idx_portfolios_user
  on public.portfolios (user_id);
create index if not exists idx_portfolios_invite
  on public.portfolios (invite_id);

create table if not exists public.portfolio_holdings (
  id            uuid primary key default gen_random_uuid(),
  portfolio_id  uuid not null references public.portfolios (id) on delete cascade,
  asset_key     text not null,
  symbol        text not null,
  weight        numeric not null check (weight >= 0 and weight <= 100),
  created_at    timestamptz not null default now(),
  unique (portfolio_id, asset_key)
);

create index if not exists idx_portfolio_holdings_portfolio
  on public.portfolio_holdings (portfolio_id);

create trigger trg_saved_screens_updated_at
  before update on public.saved_screens
  for each row execute function public.set_updated_at();

create trigger trg_portfolios_updated_at
  before update on public.portfolios
  for each row execute function public.set_updated_at();

alter table public.saved_screens enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.portfolios enable row level security;
alter table public.portfolio_holdings enable row level security;

-- Authenticated users own their rows. Invite-only (user_id IS NULL) rows are
-- not visible through these policies — service-role handles the transition.

create policy "users select own saved_screens"
  on public.saved_screens for select to authenticated
  using (user_id = auth.uid());
create policy "users insert own saved_screens"
  on public.saved_screens for insert to authenticated
  with check (user_id = auth.uid());
create policy "users update own saved_screens"
  on public.saved_screens for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "users delete own saved_screens"
  on public.saved_screens for delete to authenticated
  using (user_id = auth.uid());

create policy "users select own watchlist_items"
  on public.watchlist_items for select to authenticated
  using (user_id = auth.uid());
create policy "users insert own watchlist_items"
  on public.watchlist_items for insert to authenticated
  with check (user_id = auth.uid());
create policy "users update own watchlist_items"
  on public.watchlist_items for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "users delete own watchlist_items"
  on public.watchlist_items for delete to authenticated
  using (user_id = auth.uid());

create policy "users select own portfolios"
  on public.portfolios for select to authenticated
  using (user_id = auth.uid());
create policy "users insert own portfolios"
  on public.portfolios for insert to authenticated
  with check (user_id = auth.uid());
create policy "users update own portfolios"
  on public.portfolios for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "users delete own portfolios"
  on public.portfolios for delete to authenticated
  using (user_id = auth.uid());

create policy "users select own portfolio_holdings"
  on public.portfolio_holdings for select to authenticated
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = auth.uid()
    )
  );
create policy "users insert own portfolio_holdings"
  on public.portfolio_holdings for insert to authenticated
  with check (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = auth.uid()
    )
  );
create policy "users update own portfolio_holdings"
  on public.portfolio_holdings for update to authenticated
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = auth.uid()
    )
  );
create policy "users delete own portfolio_holdings"
  on public.portfolio_holdings for delete to authenticated
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = auth.uid()
    )
  );
