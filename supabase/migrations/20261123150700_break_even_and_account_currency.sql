-- Add configurable account-wide break-even settings and MT5 account currency.
alter table public.robot_settings
  add column if not exists break_even_enabled boolean not null default false,
  add column if not exists break_even_trigger numeric not null default 10.00;

alter table public.trading_accounts
  add column if not exists account_currency text;

comment on column public.robot_settings.break_even_enabled is
  'Whether the EA should apply account-wide combined floating-profit break-even protection.';
comment on column public.robot_settings.break_even_trigger is
  'Combined floating profit threshold in the trading account deposit currency.';
comment on column public.trading_accounts.account_currency is
  'Three-letter deposit currency reported by the MT5 terminal.';
