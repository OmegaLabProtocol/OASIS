-- =============================================================================
-- OASIS Product Analytics (first-party)
-- Migration 0004 — sessions, events, and invite↔Auth identity links
--
-- ADDITIVE ONLY. Does not modify or drop existing tables or data.
-- Does not touch ori_snapshots (0003).
--
-- Identity model:
--  * user_id (auth.users) is the CANONICAL identity once a beta user has
--    authenticated via passwordless email OTP / magic link.
--  * invite_id is ATTRIBUTION: which invite/access path admitted them.
--    It is retained even after authentication and is never a substitute
--    for user_id in retention / cohorts / adoption once user_id exists.
--  * Invite-only sessions (cookie, no Auth yet) remain valid: user_id is
--    nullable so existing beta access is not blocked during the transition.
--  * Admin/dev activity is marked is_internal and excluded from beta metrics
--    by default.
-- =============================================================================

create table if not exists public.beta_identity_links (
  id          uuid primary key default gen_random_uuid(),
  invite_id   uuid not null references public.beta_invites (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_beta_identity_links_invite
  on public.beta_identity_links (invite_id);

create table if not exists public.product_sessions (
  id                      uuid primary key default gen_random_uuid(),
  session_id              text not null unique,
  -- Canonical authenticated identity (null while the visitor is invite-only).
  user_id                 uuid references auth.users (id) on delete set null,
  -- Invite attribution (retained after auth; used only as a fallback key
  -- when user_id is still null).
  invite_id               uuid references public.beta_invites (id) on delete set null,
  is_internal             boolean not null default false,
  started_at              timestamptz not null default now(),
  last_activity_at        timestamptz not null default now(),
  ended_at                timestamptz,
  engaged_seconds         integer not null default 0,
  page_count              integer not null default 0,
  meaningful_action_count integer not null default 0,
  created_at              timestamptz not null default now()
);

create index if not exists idx_product_sessions_user
  on public.product_sessions (user_id);
create index if not exists idx_product_sessions_invite
  on public.product_sessions (invite_id);
create index if not exists idx_product_sessions_started
  on public.product_sessions (started_at desc);
create index if not exists idx_product_sessions_internal
  on public.product_sessions (is_internal);

create table if not exists public.product_events (
  id              uuid primary key default gen_random_uuid(),
  session_id      text not null,
  user_id         uuid references auth.users (id) on delete set null,
  invite_id       uuid references public.beta_invites (id) on delete set null,
  is_internal     boolean not null default false,
  event_name      text not null,
  page            text,
  asset_id        text,
  portfolio_id    uuid,
  saved_screen_id uuid,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_product_events_user
  on public.product_events (user_id);
create index if not exists idx_product_events_session
  on public.product_events (session_id);
create index if not exists idx_product_events_invite
  on public.product_events (invite_id);
create index if not exists idx_product_events_name
  on public.product_events (event_name);
create index if not exists idx_product_events_created
  on public.product_events (created_at desc);
create index if not exists idx_product_events_page
  on public.product_events (page);
create index if not exists idx_product_events_internal
  on public.product_events (is_internal);

alter table public.beta_identity_links enable row level security;
alter table public.product_sessions enable row level security;
alter table public.product_events enable row level security;
-- No permissive policies. Beta users cannot query analytics or identity-link
-- tables directly. Trusted server code uses the service-role key.

-- Atomic session counter increment. Sets user_id/invite_id on first write and
-- fills a previously-null user_id once the visitor authenticates.
create or replace function public.increment_product_session(
  p_session_id text,
  p_engaged integer,
  p_pages integer,
  p_actions integer,
  p_invite_id uuid,
  p_user_id uuid,
  p_is_internal boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.product_sessions (
    session_id, invite_id, user_id, is_internal,
    engaged_seconds, page_count, meaningful_action_count
  ) values (
    p_session_id, p_invite_id, p_user_id, coalesce(p_is_internal, false),
    greatest(coalesce(p_engaged, 0), 0),
    greatest(coalesce(p_pages, 0), 0),
    greatest(coalesce(p_actions, 0), 0)
  )
  on conflict (session_id) do update set
    last_activity_at = now(),
    engaged_seconds = public.product_sessions.engaged_seconds
      + greatest(coalesce(p_engaged, 0), 0),
    page_count = public.product_sessions.page_count
      + greatest(coalesce(p_pages, 0), 0),
    meaningful_action_count = public.product_sessions.meaningful_action_count
      + greatest(coalesce(p_actions, 0), 0),
    invite_id = coalesce(public.product_sessions.invite_id, excluded.invite_id),
    user_id = coalesce(public.product_sessions.user_id, excluded.user_id);
end;
$$;

revoke all on function public.increment_product_session(
  text, integer, integer, integer, uuid, uuid, boolean
) from public, anon, authenticated;
