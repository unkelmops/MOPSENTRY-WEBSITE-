-- Security hardening applied to personal Supabase project zykswpgxfmpjllnlivkd.
-- Existing legacy EA tables are preserved but no longer exposed to anon/authenticated clients.
drop policy if exists "App command insert" on public.ea_commands;
drop policy if exists "EA command select" on public.ea_commands;
drop policy if exists "EA command update" on public.ea_commands;
drop policy if exists "Allow EA status insert" on public.ea_status;
drop policy if exists "Allow EA status select" on public.ea_status;
drop policy if exists "Allow EA status update" on public.ea_status;
drop policy if exists "Enable insert for authenticated users only" on public.ea_status;
drop policy if exists "Enable read access for all users" on public.ea_status;
revoke all on public.ea_commands,public.ea_status from anon,authenticated;
grant all on public.ea_commands,public.ea_status to service_role;
revoke usage,select,update on sequence public.ea_commands_id_seq from anon,authenticated;
grant usage,select,update on sequence public.ea_commands_id_seq to service_role;
revoke all on public.fundamental_sync_state from anon,authenticated;
grant all on public.fundamental_sync_state to service_role;
revoke execute on function public.enforce_robot_start_requirements() from public,anon,authenticated;
revoke execute on function public.preserve_fundamental_actual() from public,anon,authenticated;
revoke execute on function public.track_macro_revision() from public,anon,authenticated;