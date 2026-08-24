-- =============================================================================
-- OASIS Private Beta + Admin Control Center
-- Migration 0001 — schema, constraints, indexes, RLS, and seed Terms v1.0
--
-- SAFE TO REVIEW AND PASTE INTO THE SUPABASE SQL EDITOR.
-- This migration is ADDITIVE only. It creates new tables in the `public`
-- schema and does not modify or drop any existing tables or data.
--
-- Design notes:
--  * All administrative reads/writes are performed by trusted server code
--    using the Supabase secret (service-role) key, which bypasses RLS.
--  * RLS is ENABLED on every table with NO permissive anon/authenticated
--    policies, except a single self-read policy on admin_profiles so an
--    authenticated admin can confirm their own authorization without the
--    secret key. This means the public/anon and normal authenticated roles
--    cannot read invites, codes, hashes, emails, requests, acceptances, or
--    activity.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- admin_profiles
-- -----------------------------------------------------------------------------
create table if not exists public.admin_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  email       text,
  role        text not null default 'admin' check (role in ('owner', 'admin')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- beta_access_requests
-- -----------------------------------------------------------------------------
create table if not exists public.beta_access_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  company      text,
  role         text,
  reason       text,
  source       text,
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'denied', 'cancelled')),
  reviewed_by  uuid references auth.users (id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_beta_access_requests_status
  on public.beta_access_requests (status);
create index if not exists idx_beta_access_requests_created_at
  on public.beta_access_requests (created_at desc);
create index if not exists idx_beta_access_requests_email
  on public.beta_access_requests (lower(email));

-- -----------------------------------------------------------------------------
-- beta_invites
-- -----------------------------------------------------------------------------
create table if not exists public.beta_invites (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid references public.beta_access_requests (id) on delete set null,
  label             text,
  recipient_name    text,
  recipient_email   text not null,
  company           text,
  source            text,
  -- Credentials are NOT stored in plaintext. The access code and private-link
  -- token are deterministically DERIVED (keyed HMAC) from (id, credential_version)
  -- and the server-only signing secret, so the current link/code can be
  -- reproduced for copy/resend without storing a raw bearer token. Bumping
  -- credential_version (via "Regenerate Invite") invalidates all prior links/codes.
  code_hash          text not null,          -- lookup hash of the current derived access code
  code_suffix        text not null,          -- last 4 chars for masked display
  public_id          text not null unique,   -- stable keyed handle (HMAC of id) for invite-link lookup
  credential_version integer not null default 1,
  status            text not null default 'active'
                      check (status in ('active', 'expired', 'revoked', 'exhausted')),
  created_by        uuid references auth.users (id),
  created_at        timestamptz not null default now(),
  expires_at        timestamptz,
  max_uses          integer,                 -- null = unlimited
  use_count         integer not null default 0,
  first_access_at   timestamptz,
  last_access_at    timestamptz,
  email_status      text not null default 'not_sent'
                      check (email_status in ('not_sent', 'sending', 'sent', 'failed', 'resent')),
  email_sent_at     timestamptz,
  email_provider_id text,
  revoked_at        timestamptz,
  notes             text
);

create index if not exists idx_beta_invites_status on public.beta_invites (status);
create index if not exists idx_beta_invites_email on public.beta_invites (lower(recipient_email));
create index if not exists idx_beta_invites_code_hash on public.beta_invites (code_hash);
create index if not exists idx_beta_invites_created_at on public.beta_invites (created_at desc);
create index if not exists idx_beta_invites_expires_at on public.beta_invites (expires_at);
create index if not exists idx_beta_invites_source on public.beta_invites (source);

-- -----------------------------------------------------------------------------
-- beta_terms
-- -----------------------------------------------------------------------------
create table if not exists public.beta_terms (
  id           uuid primary key default gen_random_uuid(),
  version      text not null unique,
  title        text not null,
  content      text not null,
  effective_at timestamptz not null default now(),
  active       boolean not null default false,
  created_at   timestamptz not null default now()
);

-- At most one active Terms version at a time.
create unique index if not exists uniq_beta_terms_single_active
  on public.beta_terms (active)
  where active = true;

-- -----------------------------------------------------------------------------
-- beta_terms_acceptances  (append-only; never overwrite historical records)
-- -----------------------------------------------------------------------------
create table if not exists public.beta_terms_acceptances (
  id                  uuid primary key default gen_random_uuid(),
  invite_id           uuid not null references public.beta_invites (id) on delete cascade,
  terms_id            uuid not null references public.beta_terms (id),
  terms_version       text not null,
  recipient_email     text not null,
  recipient_name      text,
  accepted_at         timestamptz not null default now(),
  acceptance_event_id uuid not null default gen_random_uuid(),
  user_agent          text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_terms_acceptances_invite
  on public.beta_terms_acceptances (invite_id);
create index if not exists idx_terms_acceptances_version
  on public.beta_terms_acceptances (terms_version);

-- -----------------------------------------------------------------------------
-- beta_access_events  (activity log)
-- -----------------------------------------------------------------------------
create table if not exists public.beta_access_events (
  id         uuid primary key default gen_random_uuid(),
  invite_id  uuid references public.beta_invites (id) on delete set null,
  event_type text not null,
  route      text,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_beta_access_events_invite
  on public.beta_access_events (invite_id);
create index if not exists idx_beta_access_events_type
  on public.beta_access_events (event_type);
create index if not exists idx_beta_access_events_created_at
  on public.beta_access_events (created_at desc);

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_profiles_updated_at on public.admin_profiles;
create trigger trg_admin_profiles_updated_at
  before update on public.admin_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_beta_access_requests_updated_at on public.beta_access_requests;
create trigger trg_beta_access_requests_updated_at
  before update on public.beta_access_requests
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.admin_profiles          enable row level security;
alter table public.beta_access_requests     enable row level security;
alter table public.beta_invites             enable row level security;
alter table public.beta_terms               enable row level security;
alter table public.beta_terms_acceptances   enable row level security;
alter table public.beta_access_events       enable row level security;

-- Allow an authenticated admin to read ONLY their own admin_profiles row.
-- (All other access happens via the service-role key, which bypasses RLS.)
drop policy if exists "admins read own profile" on public.admin_profiles;
create policy "admins read own profile"
  on public.admin_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- No other permissive policies: anon and normal authenticated roles are fully
-- denied on every beta table. Trusted server code uses the secret key.

-- =============================================================================
-- Seed: Private Beta Terms v1.0 (INTERIM — requires attorney review)
-- =============================================================================
insert into public.beta_terms (version, title, content, active, effective_at)
values (
  '1.0',
  'OASIS Private Beta Terms',
  $terms$# OASIS Private Beta Terms

**Version 1.0 — Interim**

_INTERIM PRODUCT LANGUAGE. This document has not yet been reviewed by legal counsel and does not constitute legal advice. It will be replaced by attorney-reviewed final terms without changing the acceptance architecture._

## 1. Ownership
OASIS and the Omega Risk Index (ORI) are proprietary products of Omega Labs Protocol. All rights, title, and interest in and to OASIS, including its methodology, scoring frameworks, analyses, interfaces, and related materials, remain with Omega Labs Protocol.

## 2. Limited Evaluation License
Access to the OASIS Private Beta is provided solely for evaluation purposes. You are granted a limited, revocable, non-exclusive, non-transferable right to access non-public OASIS features made available to you during the Private Beta.

## 3. Confidentiality & Proprietary Information
Non-public OASIS methodology, scoring frameworks, category weights, thresholds, platform structures, analyses, and other proprietary information disclosed through the Private Beta are confidential. You agree not to disclose such information to any third party.

## 4. Restrictions
You agree not to reproduce, copy, distribute, disclose, reverse engineer, decompile, or otherwise attempt to derive non-public OASIS methodology or proprietary information, and not to use such information to develop or support a competing product or service.

## 5. Intellectual Property
No rights or licenses are granted except as expressly stated. All feedback you provide may be used by Omega Labs Protocol without restriction or obligation.

## 6. Beta Product Status & Availability
OASIS is provided on a Private Beta, "as is" and "as available" basis. Features may change, be interrupted, or be discontinued at any time without notice.

## 7. Analytical Information Disclaimer — Not Financial Advice
OASIS provides informational analytics only and does not provide financial, investment, legal, or tax advice. ORI scores are informational and do not constitute investment recommendations. You are solely responsible for your own decisions and should not rely on OASIS as the basis for any transaction.

## 8. Termination of Access
Omega Labs Protocol may suspend or terminate your access at any time, including upon expiration, usage limits, or revocation of your invitation. Unauthorized use may result in termination of access and the exercise of rights or remedies available under applicable law.

## 9. Governing Terms & Updates
These interim terms govern your Private Beta access until replaced by final terms. If a materially updated version becomes active, continued access requires acceptance of the updated version.

**Effective date:** upon acceptance. **Version:** 1.0 (interim).
$terms$,
  true,
  now()
)
on conflict (version) do nothing;
