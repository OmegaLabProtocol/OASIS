-- =============================================================================
-- OASIS Investor Preview attribution
-- Migration 0006 — additive columns on product analytics
--
-- Does not modify or drop existing tables, data, or functions from 0001–0005.
-- Does not change the beta identity model (user_id canonical, invite_id attribution).
--
-- Investor Preview sessions are anonymous. They never write user_id.
-- session_type / anonymous_session_id / investor_ref are analytics metadata only
-- and never grant authorization.
-- =============================================================================

alter table public.product_sessions
  add column if not exists session_type text not null default 'beta';

alter table public.product_sessions
  add column if not exists anonymous_session_id text;

alter table public.product_sessions
  add column if not exists investor_ref text;

alter table public.product_events
  add column if not exists session_type text not null default 'beta';

alter table public.product_events
  add column if not exists anonymous_session_id text;

alter table public.product_events
  add column if not exists investor_ref text;

create index if not exists idx_product_sessions_type
  on public.product_sessions (session_type);
create index if not exists idx_product_sessions_investor_ref
  on public.product_sessions (investor_ref);
create index if not exists idx_product_sessions_anonymous
  on public.product_sessions (anonymous_session_id);

create index if not exists idx_product_events_type
  on public.product_events (session_type);
create index if not exists idx_product_events_investor_ref
  on public.product_events (investor_ref);
create index if not exists idx_product_events_anonymous
  on public.product_events (anonymous_session_id);

-- increment_product_session is unchanged. Trusted ingest stamps
-- session_type / anonymous_session_id / investor_ref after the RPC.

-- RLS remains enabled with no permissive policies (service-role only).
