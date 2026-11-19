-- Prevent signed-in clients from forging EA-owned heartbeat and trading telemetry.
-- The EA check-in Edge Function uses service_role to write these fields.
revoke all on public.trading_accounts from anon, authenticated;
grant select on public.trading_accounts to authenticated;
grant insert (user_id, platform, broker_server, login) on public.trading_accounts to authenticated;
grant update (platform, broker_server, login) on public.trading_accounts to authenticated;
grant all on public.trading_accounts to service_role;