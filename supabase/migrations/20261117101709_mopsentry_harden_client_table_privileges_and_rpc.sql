-- MOPSENTRY least-privilege API grants.
-- Preserve the existing MT5 EA bridge: its check-in worker uses service_role,
-- while signed-in app users retain only operations covered by owner RLS policies.

REVOKE ALL ON TABLE public.ea_commands, public.ea_status FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ea_commands, public.ea_status TO service_role;

REVOKE ALL ON TABLE public.fundamental_sync_state FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fundamental_sync_state TO service_role;

REVOKE ALL ON TABLE public.app_access_entitlements FROM anon, authenticated;
GRANT SELECT ON TABLE public.app_access_entitlements TO authenticated;

REVOKE ALL ON TABLE public.fundamental_event_history FROM anon, authenticated;
GRANT SELECT ON TABLE public.fundamental_event_history TO authenticated;

REVOKE ALL ON TABLE public.mt5_direct_connections FROM anon;
REVOKE ALL ON TABLE public.mt5_direct_connections FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.mt5_direct_connections TO authenticated;

REVOKE ALL ON TABLE public.robot_commands FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.robot_commands TO authenticated;

REVOKE ALL ON TABLE public.robot_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.robot_settings TO authenticated;

-- The old EA bridge tables remain server-only. The active bridge is
-- trading_accounts + mopsentry-ea-checkin and is deliberately untouched.

-- Keep the authenticated key-rotation RPC, but prevent object-shadowing.
-- SECURITY DEFINER remains intentional because clients have no direct UPDATE
-- permission on trading_accounts; the function checks auth.uid() ownership.
ALTER FUNCTION public.rotate_trading_account_key()
  SET search_path = pg_catalog;