-- Separate read-only MT5 account metadata/snapshot table.
-- This is NOT the existing MOPSENTRY EA bridge. No broker passwords are stored here.

CREATE TABLE IF NOT EXISTS public.mt5_direct_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'MT5' CHECK (platform = 'MT5'),
  broker_server text NOT NULL,
  account_login text NOT NULL,
  account_name text,
  broker_name text,
  account_currency text,
  leverage text,
  connection_status text NOT NULL DEFAULT 'pending'
    CHECK (connection_status IN ('pending', 'connecting', 'connected', 'disconnected', 'error')),
  access_mode text NOT NULL DEFAULT 'investor' CHECK (access_mode = 'investor'),
  balance numeric,
  equity numeric,
  margin numeric,
  free_margin numeric,
  margin_level numeric,
  open_positions jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_orders jsonb NOT NULL DEFAULT '[]'::jsonb,
  recent_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  bridge_instance_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mt5_direct_connections_identity_unique UNIQUE (user_id, broker_server, account_login)
);

COMMENT ON TABLE public.mt5_direct_connections IS
  'Metadata and read-only snapshots for direct MT5 connections. Never store MT5 passwords or master credentials in this table. Worker updates use server-side credentials.';

ALTER TABLE public.mt5_direct_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can add their direct MT5 connections" ON public.mt5_direct_connections;
CREATE POLICY "Users can add their direct MT5 connections"
  ON public.mt5_direct_connections FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can remove their direct MT5 connections" ON public.mt5_direct_connections;
CREATE POLICY "Users can remove their direct MT5 connections"
  ON public.mt5_direct_connections FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their direct MT5 connections" ON public.mt5_direct_connections;
CREATE POLICY "Users can view their direct MT5 connections"
  ON public.mt5_direct_connections FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.mt5_direct_connections FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.mt5_direct_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mt5_direct_connections TO service_role;