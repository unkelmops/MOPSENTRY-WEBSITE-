-- Provision the fresh MOPSENTRY profile automatically for every new Supabase Auth user.
-- App Access remains disabled until an administrator explicitly enables it.
alter table public.trading_accounts
  alter column connection_key set default (
    'MSE-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );

create or replace function public.provision_mopsentry_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.robot_settings(user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.trading_accounts(user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.app_access_entitlements(user_id, enabled) values (new.id, false)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.provision_mopsentry_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_mopsentry on auth.users;
create trigger on_auth_user_created_mopsentry
after insert on auth.users
for each row execute function public.provision_mopsentry_user();