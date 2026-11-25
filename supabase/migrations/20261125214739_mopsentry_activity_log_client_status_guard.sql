drop policy if exists "MOPSENTRY activity own insert" on public.mopsentry_activity_log;
create policy "MOPSENTRY activity own insert"
  on public.mopsentry_activity_log for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status in ('saved','queued','failed','info')
  );