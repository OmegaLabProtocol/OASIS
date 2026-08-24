-- =============================================================================
-- OASIS Private Beta + Admin Control Center
-- Migration 0002 — activity actor attribution + RBAC / team management
--
-- SAFE TO REVIEW AND PASTE INTO THE SUPABASE SQL EDITOR (run AFTER 0001).
-- This migration is ADDITIVE and non-destructive. It:
--   (1) extends public.beta_access_events with nullable actor-attribution
--       columns so NEW events can identify who caused them
--       (admin / beta_user / system) and which invite they concern;
--   (2) expands the admin_profiles.role constraint to allow the new internal
--       role `analyst` (in addition to `owner` and `admin`); and
--   (3) adds an optional admin_profiles.display_name for Team / activity /
--       header attribution.
--
-- It does NOT modify migration 0001, drop tables, delete rows, change any
-- existing admin profile, or destroy historical activity. Existing events keep
-- NULL actor fields (unknown). Existing admin roles are preserved. The current
-- Owner account is untouched.
--
-- RLS is unchanged: these tables already have RLS enabled with NO permissive
-- anon/authenticated policies (except the admin self-read on admin_profiles
-- from 0001). Adding columns / relaxing a CHECK does not create any new access
-- path; all reads/writes remain server-side via the secret key.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (1) Activity actor attribution on beta_access_events
-- -----------------------------------------------------------------------------
alter table public.beta_access_events
  add column if not exists actor_type          text,
  add column if not exists actor_admin_user_id uuid,
  add column if not exists actor_invite_id      uuid,
  add column if not exists actor_email          text,
  add column if not exists actor_name           text,
  add column if not exists subject_invite_id    uuid;

-- Foreign keys (added separately so re-runs are safe via the existence guard).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'beta_access_events_actor_admin_user_id_fkey'
      and conrelid = 'public.beta_access_events'::regclass
  ) then
    alter table public.beta_access_events
      add constraint beta_access_events_actor_admin_user_id_fkey
      foreign key (actor_admin_user_id) references auth.users (id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'beta_access_events_actor_invite_id_fkey'
      and conrelid = 'public.beta_access_events'::regclass
  ) then
    alter table public.beta_access_events
      add constraint beta_access_events_actor_invite_id_fkey
      foreign key (actor_invite_id) references public.beta_invites (id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'beta_access_events_subject_invite_id_fkey'
      and conrelid = 'public.beta_access_events'::regclass
  ) then
    alter table public.beta_access_events
      add constraint beta_access_events_subject_invite_id_fkey
      foreign key (subject_invite_id) references public.beta_invites (id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'beta_access_events_actor_type_check'
      and conrelid = 'public.beta_access_events'::regclass
  ) then
    alter table public.beta_access_events
      add constraint beta_access_events_actor_type_check
      check (actor_type is null or actor_type in ('admin', 'beta_user', 'system'));
  end if;
end $$;

create index if not exists idx_beta_access_events_actor_type
  on public.beta_access_events (actor_type);
create index if not exists idx_beta_access_events_actor_admin
  on public.beta_access_events (actor_admin_user_id);
create index if not exists idx_beta_access_events_subject_invite
  on public.beta_access_events (subject_invite_id);

-- -----------------------------------------------------------------------------
-- (2) Expand admin_profiles.role to include the read-only `analyst` role
--
-- Migration 0001 created an inline CHECK (role in ('owner','admin')) which
-- Postgres auto-named `admin_profiles_role_check`. We drop that specific
-- constraint (if present) and re-add it with the expanded set. This does NOT
-- touch any row: all existing 'owner'/'admin' values remain valid.
-- -----------------------------------------------------------------------------
alter table public.admin_profiles
  drop constraint if exists admin_profiles_role_check;

alter table public.admin_profiles
  add constraint admin_profiles_role_check
  check (role in ('owner', 'admin', 'analyst'));

-- -----------------------------------------------------------------------------
-- (3) Optional display name for internal team members (Team / activity / header)
-- -----------------------------------------------------------------------------
alter table public.admin_profiles
  add column if not exists display_name text;

create index if not exists idx_admin_profiles_role on public.admin_profiles (role);
create index if not exists idx_admin_profiles_active on public.admin_profiles (active);
