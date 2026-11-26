-- MOPSENTRY manual VPS order requests (no checkout or provisioning).
alter table public.vps_orders
  add column if not exists order_reference text,
  add column if not exists customer_email text,
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists package_code text,
  add column if not exists package_name text,
  add column if not exists term_months smallint,
  add column if not exists monthly_amount_minor integer,
  add column if not exists customer_notes text,
  add column if not exists email_status text not null default 'not_configured';
alter table public.vps_orders alter column status set default 'request_received';
alter table public.vps_orders drop constraint if exists vps_orders_status_check;
alter table public.vps_orders add constraint vps_orders_status_check
 check (status in ('request_received','under_review','awaiting_payment','payment_verified','pending_payment','paid','provisioning','active','past_due','suspended','cancelled','rejected','failed'));
alter table public.vps_orders add constraint vps_orders_term_months_check check (term_months is null or term_months in (3,6,12));
alter table public.vps_orders add constraint vps_orders_monthly_amount_minor_check check (monthly_amount_minor is null or monthly_amount_minor > 0);
alter table public.vps_orders add constraint vps_orders_email_status_check check (email_status in ('not_configured','sent','failed'));
update public.vps_orders set order_reference='MOPS-'||upper(substr(replace(id::text,'-',''),1,10)) where order_reference is null;
alter table public.vps_orders alter column order_reference set not null;
alter table public.vps_orders alter column order_reference set default ('MOPS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)));
create unique index if not exists vps_orders_order_reference_uidx on public.vps_orders(order_reference);
drop index if exists public.vps_orders_one_current_per_user_idx;
create unique index vps_orders_one_current_per_user_idx on public.vps_orders(user_id)
 where status in ('request_received','under_review','awaiting_payment','payment_verified','pending_payment','paid','provisioning','active','past_due','suspended');
create table if not exists public.vps_order_events (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.vps_orders(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 event_type text not null,
 from_status text,
 to_status text,
 message text,
 actor_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists vps_order_events_order_created_idx on public.vps_order_events(order_id,created_at desc);
alter table public.vps_order_events enable row level security;
drop policy if exists "VPS order events own read" on public.vps_order_events;
create policy "VPS order events own read" on public.vps_order_events for select to authenticated using (auth.uid()=user_id);
revoke all on public.vps_order_events from anon,authenticated;
grant select on public.vps_order_events to authenticated;
grant all on public.vps_order_events to service_role;
grant select on public.vps_orders to authenticated;
comment on table public.vps_order_events is 'Immutable customer-visible VPS order status history; writes are server-side only.';
