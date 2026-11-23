-- Compact, cryptographically random MOPSENTRY EA connection keys.
-- 20 uppercase hexadecimal characters = 80 bits of randomness.
-- Existing keys remain valid until a user explicitly generates a new key.

create or replace function public.rotate_trading_account_key()
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_user_id uuid := auth.uid();
  v_key text;
  v_attempt integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_key := upper(pg_catalog.encode(extensions.gen_random_bytes(10), 'hex'));

    begin
      update public.trading_accounts
        set connection_key = v_key,
            status = 'pending',
            last_heartbeat = null,
            updated_at = now()
        where user_id = v_user_id
        returning connection_key into v_key;

      if v_key is not null then
        return v_key;
      end if;

      raise exception 'Create your trading account before generating a connection key.';
    exception
      when unique_violation then
        if v_attempt >= 5 then
          raise exception 'Could not generate a unique connection key. Please try again.';
        end if;
    end;
  end loop;
end;
$function$;

revoke all on function public.rotate_trading_account_key() from public, anon;
grant execute on function public.rotate_trading_account_key() to authenticated;
