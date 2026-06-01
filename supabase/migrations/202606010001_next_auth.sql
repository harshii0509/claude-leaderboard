-- ============================================================
-- Schema for NextAuth adapter tables
-- ============================================================

create schema if not exists next_auth;

grant usage on schema next_auth to postgres, anon, authenticated, service_role;
alter default privileges in schema next_auth grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema next_auth grant all on sequences to postgres, anon, authenticated, service_role;

create table if not exists next_auth.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text
);

create table if not exists next_auth.accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references next_auth.users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique(provider, "providerAccountId")
);

create table if not exists next_auth.sessions (
  id uuid primary key default gen_random_uuid(),
  "sessionToken" text unique not null,
  "userId" uuid not null references next_auth.users(id) on delete cascade,
  expires timestamptz not null
);

create table if not exists next_auth.verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);
