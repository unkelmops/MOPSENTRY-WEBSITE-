-- Restore the USD economic calendar history used by Signals; this is not Macro Intelligence.
create table public.fundamental_event_history (
 event_id text primary key, series_key text not null, currency text not null check(currency='USD'),
 impact text not null, title text not null, event_time timestamptz not null, period text,
 previous_value text not null default '', forecast_value text not null default '', actual_value text not null default '',
 event_status text not null default 'scheduled', source text not null default 'ShowMyTrades economic calendar',
 first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 actual_recorded_at timestamptz, updated_at timestamptz not null default now()
);
create index fundamental_event_history_series_time_idx on public.fundamental_event_history(series_key,event_time desc);
create table public.fundamental_sync_state (
 id text primary key check(id='usd-high-impact'), last_synced_at timestamptz not null default now()
);
insert into public.fundamental_sync_state(id,last_synced_at) values ('usd-high-impact',now()-interval '15 minutes');
alter table public.fundamental_event_history enable row level security;
alter table public.fundamental_sync_state enable row level security;
create policy "fundamental events authenticated read" on public.fundamental_event_history for select to authenticated using(true);
grant select on public.fundamental_event_history to authenticated;
grant all on public.fundamental_event_history,public.fundamental_sync_state to service_role;
revoke all on public.fundamental_event_history,public.fundamental_sync_state from anon;