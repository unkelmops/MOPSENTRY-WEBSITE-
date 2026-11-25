-- Optimize VPS ownership policies so auth.uid() is evaluated once per statement.
drop policy if exists "VPS orders own read" on public.vps_orders;
create policy "VPS orders own read" on public.vps_orders
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "VPS instances own read" on public.vps_instances;
create policy "VPS instances own read" on public.vps_instances
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "VPS transactions own read" on public.vps_payment_transactions;
create policy "VPS transactions own read" on public.vps_payment_transactions
  for select to authenticated using (
    exists (
      select 1 from public.vps_orders o
      where o.id = order_id and o.user_id = (select auth.uid())
    )
  );
