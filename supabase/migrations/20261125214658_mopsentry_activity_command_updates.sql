create or replace function public.log_mopsentry_robot_command_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  activity_status text;
begin
  if new.status is distinct from old.status then
    activity_status := case
      when lower(new.status) in ('confirmed','completed','executed','success','done','acknowledged') then 'acknowledged'
      when lower(new.status) in ('failed','error','rejected','cancelled') then 'failed'
      when lower(new.status) in ('pending','delivered','processing') then 'queued'
      else 'info'
    end;
    insert into public.mopsentry_activity_log (user_id, event_type, status, message, details)
    values (
      new.user_id,
      'robot_command_status',
      activity_status,
      new.command || ' command status: ' || upper(replace(new.status, '_', ' ')),
      jsonb_build_object('command_id', new.id, 'command', new.command, 'command_status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists mopsentry_robot_command_activity on public.robot_commands;
create trigger mopsentry_robot_command_activity
after update of status on public.robot_commands
for each row execute function public.log_mopsentry_robot_command_status();
