-- User-authenticated connection-key rotation.
-- This is the only client-facing operation allowed to change an EA connection key.
create or replace function public.rotate_trading_account_key()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text;
begin
  if v_user_id is null then raise exception 'Authentication is required.'; end if;
  v_key := 'MSE-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  update public.trading_accounts
    set connection_key = v_key, status = 'pending', last_heartbeat = null, updated_at = now()
    where user_id = v_user_id
    returning connection_key into v_key;
  if v_key is null then raise exception 'Create your trading account before rotating its connection key.'; end if;
  return v_key;
end;
$$;
revoke all on function public.rotate_trading_account_key() from public, anon;
grant execute on function public.rotate_trading_account_key() to authenticated;