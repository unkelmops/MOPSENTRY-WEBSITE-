-- Per-user MOPSENTRY activity history for app actions and EA command lifecycle.
create table if not exists public.mopsentry_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 1 and 80),
  status text not null default 'saved' check (status in ('saved','queued','acknowledged','failed','info')),
  message text not null check (char_length(message) between 1 and 500),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mopsentry_activity_log_user_created_idx
  on public.mopsentry_activity_log(user_id, created_at desc);
alter table public.mopsentry_activity_log enable row level security;
drop policy if exists "MOPSENTRY activity own read" on public.mopsentry_activity_log;
create policy "MOPSENTRY activity own read"
  on public.mopsentry_activity_log for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "MOPSENTRY activity own insert" on public.mopsentry_activity_log;
create policy "MOPSENTRY activity own insert"
  on public.mopsentry_activity_log for insert to authenticated
  with check ((select auth.uid()) = user_id);
revoke all on public.mopsentry_activity_log from anon, authenticated;
grant select, insert on public.mopsentry_activity_log to authenticated;
grant all on public.mopsentry_activity_log to service_role;
comment on table public.mopsentry_activity_log is 'Per-user MOPSENTRY app activity history. EA acknowledgement events are written by trusted server-side flows.';
