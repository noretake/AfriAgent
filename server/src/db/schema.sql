-- AfriAgent PostgreSQL / Supabase schema
-- Apply with: psql "$DATABASE_URL" -f server/src/db/schema.sql
-- or paste into the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  max_transaction_usd numeric(18, 2) not null,
  daily_limit_usd numeric(18, 2) not null,
  max_portfolio_exposure numeric(5, 2) not null,
  allowed_assets jsonb not null default '[]'::jsonb,
  require_approval boolean not null default true,
  risk_tolerance text not null default 'conservative',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references agent_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  message_id uuid references agent_messages(id) on delete set null,
  type text not null,
  payload jsonb not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references intents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
  summary jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  approved_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  intent_id uuid not null references intents(id) on delete cascade,
  external_transaction_id text,
  action text not null check (action in ('BUY', 'SELL')),
  asset text not null,
  quote_asset text not null,
  amount numeric(28, 10) not null default 0,
  amount_usd numeric(18, 2) not null,
  price numeric(18, 4),
  status text not null check (
    status in ('PENDING', 'APPROVED', 'EXECUTING', 'EXECUTED', 'REJECTED', 'BLOCKED', 'FAILED', 'EXPIRED')
  ),
  execution_label text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists security_state (
  user_id uuid primary key references users(id) on delete cascade,
  emergency_stop boolean not null default false,
  activated_at timestamptz,
  reason text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_created on transactions (user_id, created_at desc);
create index if not exists idx_audit_logs_user_created on audit_logs (user_id, created_at desc);
create index if not exists idx_approvals_user_status on approvals (user_id, status);
create index if not exists idx_intents_user_created on intents (user_id, created_at desc);
create index if not exists idx_agent_messages_session on agent_messages (session_id, created_at);

-- The server uses the service_role key; grant it full access (RLS is not used because
-- authorization is enforced server-side).
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
