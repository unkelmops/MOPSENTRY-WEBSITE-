-- MOPSENTRY personal Supabase core backend foundation.
-- Applied to project zykswpgxfmpjllnlivkd as migration 20261111103450.
-- Additive only: existing ea_commands and ea_status data/tables are retained.
create table public.robot_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_running boolean not null default false,
  lot_size numeric not null default 0.10,
  risk_percent numeric not null default 1.0,
  max_trades integer not null default 5,
  strategy text not null default 'trend',
  pairs text[] not null default array['EURUSD','GBPUSD','XAUUSD'],
  alerts_enabled boolean not null default true,
  timeframe text not null default 'M5' check (timeframe in ('M1','M5','M15','M30','H1','H4','D1')),
  scalper_frequency text not null default 'standard' check (scalper_frequency in ('standard','aggressive')),
  updated_at timestamptz not null default now()
);
create table public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  platform text not null default 'mt5' check (platform in ('mt4','mt5')),
  broker_server text not null default '',
  login text not null default '',
  connection_key text not null unique default ('MSE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)) || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))),
  status text not null default 'pending' check (status in ('pending','connected','disconnected')),
  last_heartbeat timestamptz, balance numeric, equity numeric, ea_state text, ea_state_at timestamptz,
  ea_version text, open_trades jsonb, pending_orders jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.robot_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  command text not null check (command in ('START','STOP','CLOSE_ALL')),
  status text not null default 'pending' check (status in ('pending','delivered','confirmed','failed')),
  created_at timestamptz not null default now(), delivered_at timestamptz, confirmed_at timestamptz
);
create index robot_commands_user_status_idx on public.robot_commands(user_id,status,created_at);
create table public.fundamental_event_history (
  event_id text primary key, series_key text not null, currency text not null check (currency='USD'),
  impact text not null, title text not null, event_time timestamptz not null, period text,
  previous_value text not null default '', forecast_value text not null default '', actual_value text not null default '',
  event_status text not null default 'scheduled', source text not null default 'ShowMyTrades economic calendar',
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  actual_recorded_at timestamptz, updated_at timestamptz not null default now()
);
create index fundamental_event_history_series_time_idx on public.fundamental_event_history(series_key,event_time desc);
create table public.fundamental_sync_state (
  id text primary key check (id='usd-high-impact'), last_synced_at timestamptz not null default now()
);
insert into public.fundamental_sync_state(id,last_synced_at) values ('usd-high-impact',now()-interval '15 minutes');
create table public.macro_source_observations (
  provider text not null, series_id text not null, period text not null, value numeric not null,
  prior_value numeric, revised_at timestamptz, source_url text not null, retrieved_at timestamptz not null default now(),
  primary key(provider,series_id,period)
);
create table public.macro_event_analysis (
  event_id text primary key, payload jsonb not null, model text, generated_at timestamptz not null default now()
);
create table public.macro_saved_analyses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null, title text not null default '', created_at timestamptz not null default now(),
  unique(user_id,event_id)
);
create table public.app_access_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false, granted_at timestamptz, updated_at timestamptz not null default now()
);
alter table public.robot_settings enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.robot_commands enable row level security;
alter table public.fundamental_event_history enable row level security;
alter table public.fundamental_sync_state enable row level security;
alter table public.macro_source_observations enable row level security;
alter table public.macro_event_analysis enable row level security;
alter table public.macro_saved_analyses enable row level security;
alter table public.app_access_entitlements enable row level security;
create policy "robot settings own select" on public.robot_settings for select to authenticated using(auth.uid()=user_id);
create policy "robot settings own insert" on public.robot_settings for insert to authenticated with check(auth.uid()=user_id);
create policy "robot settings own update" on public.robot_settings for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "trading accounts own select" on public.trading_accounts for select to authenticated using(auth.uid()=user_id);
create policy "trading accounts own insert" on public.trading_accounts for insert to authenticated with check(auth.uid()=user_id);
create policy "trading accounts own update" on public.trading_accounts for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "trading accounts own delete" on public.trading_accounts for delete to authenticated using(auth.uid()=user_id);
create policy "robot commands own select" on public.robot_commands for select to authenticated using(auth.uid()=user_id);
create policy "robot commands own pending insert" on public.robot_commands for insert to authenticated with check(auth.uid()=user_id and status='pending' and delivered_at is null and confirmed_at is null);
create policy "fundamental events authenticated read" on public.fundamental_event_history for select to authenticated using(true);
create policy "macro observations authenticated read" on public.macro_source_observations for select to authenticated using(true);
create policy "macro analysis authenticated read" on public.macro_event_analysis for select to authenticated using(true);
create policy "macro saved own select" on public.macro_saved_analyses for select to authenticated using(auth.uid()=user_id);
create policy "macro saved own insert" on public.macro_saved_analyses for insert to authenticated with check(auth.uid()=user_id);
create policy "macro saved own delete" on public.macro_saved_analyses for delete to authenticated using(auth.uid()=user_id);
create policy "app access own select" on public.app_access_entitlements for select to authenticated using(auth.uid()=user_id);
grant select,insert,update,delete on public.robot_settings,public.trading_accounts to authenticated;
grant select,insert on public.robot_commands to authenticated;
grant select on public.fundamental_event_history,public.macro_source_observations,public.macro_event_analysis,public.app_access_entitlements to authenticated;
grant select,insert,delete on public.macro_saved_analyses to authenticated;
grant all on public.robot_settings,public.trading_accounts,public.robot_commands,public.fundamental_event_history,
 public.fundamental_sync_state,public.macro_source_observations,public.macro_event_analysis,
 public.macro_saved_analyses,public.app_access_entitlements to service_role;
revoke all on public.robot_settings,public.trading_accounts,public.robot_commands,public.fundamental_event_history,
 public.fundamental_sync_state,public.macro_source_observations,public.macro_event_analysis,
 public.macro_saved_analyses,public.app_access_entitlements from anon;
create or replace function public.preserve_fundamental_actual()
returns trigger language plpgsql set search_path=public as $$
begin
 if new.actual_value is null or new.actual_value='' then new.actual_value:=old.actual_value; new.actual_recorded_at:=old.actual_recorded_at;
 elsif old.actual_value is null or old.actual_value='' then new.actual_recorded_at:=now(); end if;
 new.first_seen_at:=old.first_seen_at; new.updated_at:=now(); return new;
end; $$;
create trigger fundamental_event_history_preserve_actual before update on public.fundamental_event_history
for each row execute function public.preserve_fundamental_actual();
create or replace function public.track_macro_revision()
returns trigger language plpgsql set search_path=public as $$
begin
 if new.value is distinct from old.value then new.prior_value:=old.value; new.revised_at:=now();
 else new.prior_value:=old.prior_value; new.revised_at:=old.revised_at; end if; return new;
end; $$;
create trigger macro_source_observations_revision before update on public.macro_source_observations
for each row execute function public.track_macro_revision();
create or replace function public.enforce_robot_start_requirements()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.is_running=true and (tg_op='INSERT' or old.is_running is distinct from true) then
  if not exists(select 1 from public.app_access_entitlements where user_id=new.user_id and enabled=true)
   then raise exception 'App Access is required before starting MOPSENTRY.'; end if;
  if not exists(select 1 from public.trading_accounts where user_id=new.user_id and status='connected'
    and last_heartbeat>=now()-interval '30 seconds')
   then raise exception 'A fresh MT5/EA connection is required before starting MOPSENTRY.'; end if;
 end if; return new;
end; $$;
create trigger robot_settings_require_access_and_connection before insert or update of is_running on public.robot_settings
for each row execute function public.enforce_robot_start_requirements();
comment on column public.robot_settings.timeframe is 'Single analysis timeframe requested from EA; EA must implement consumption.';
comment on column public.robot_settings.scalper_frequency is 'Scalper frequency preference only; must not raise lot size, risk percent, or max trades.';