-- MOPSENTRY managed VPS subscriptions and payment ledger.
-- Additive foundation only. No checkout is enabled until a payment provider is configured.
create table if not exists public.vps_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null default 'managed_vps_monthly' check (product_code = 'managed_vps_monthly'),
  amount_minor integer not null default 20000 check (amount_minor > 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  billing_interval text not null default 'month' check (billing_interval = 'month'),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','provisioning','active','past_due','suspended','cancelled','failed')),
  payment_provider text,
  provider_checkout_id text,
  provider_payment_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vps_orders_user_created_idx on public.vps_orders(user_id, created_at desc);
create unique index if not exists vps_orders_one_current_per_user_idx
  on public.vps_orders(user_id)
  where status in ('pending_payment','paid','provisioning','active','past_due','suspended');

create table if not exists public.vps_instances (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.vps_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_name text,
  provider_instance_id text,
  region text,
  hostname text,
  status text not null default 'requested'
    check (status in ('requested','provisioning','active','suspended','cancelled','error')),
  mt5_terminal_count smallint not null default 1 check (mt5_terminal_count = 1),
  provisioned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vps_instances_user_created_idx on public.vps_instances(user_id, created_at desc);

create table if not exists public.vps_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.vps_orders(id) on delete cascade,
  provider text not null,
  provider_reference text,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  status text not null default 'created'
    check (status in ('created','pending','paid','failed','refunded','cancelled')),
  checkout_url text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create unique index if not exists vps_payment_transactions_provider_ref_idx
  on public.vps_payment_transactions(provider, provider_reference)
  where provider_reference is not null;
create index if not exists vps_payment_transactions_order_idx
  on public.vps_payment_transactions(order_id, created_at desc);

-- Store verified webhook event IDs to make payment processing idempotent.
create table if not exists public.vps_payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique(provider, provider_event_id)
);

alter table public.vps_orders enable row level security;
alter table public.vps_instances enable row level security;
alter table public.vps_payment_transactions enable row level security;
alter table public.vps_payment_events enable row level security;

drop policy if exists "VPS orders own read" on public.vps_orders;
create policy "VPS orders own read" on public.vps_orders
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "VPS instances own read" on public.vps_instances;
create policy "VPS instances own read" on public.vps_instances
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "VPS transactions own read" on public.vps_payment_transactions;
create policy "VPS transactions own read" on public.vps_payment_transactions
  for select to authenticated using (
    exists (select 1 from public.vps_orders o where o.id = order_id and o.user_id = auth.uid())
  );

revoke all on public.vps_orders, public.vps_instances,
  public.vps_payment_transactions, public.vps_payment_events from anon, authenticated;
grant select on public.vps_orders, public.vps_instances, public.vps_payment_transactions to authenticated;
grant all on public.vps_orders, public.vps_instances,
  public.vps_payment_transactions, public.vps_payment_events to service_role;

comment on table public.vps_orders is 'MOPSENTRY-managed VPS customer subscriptions; only trusted server functions may create or update orders.';
comment on table public.vps_instances is 'One managed Windows VPS assignment per VPS order; credentials must never be stored in this table.';
comment on table public.vps_payment_events is 'Verified provider webhook event ledger, including private recurring tokens; service-role access only.';

