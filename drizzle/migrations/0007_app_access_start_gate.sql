-- Manual App Access entitlement until secure checkout is implemented.
CREATE TABLE public.app_access_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_access_entitlements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.app_access_entitlements TO authenticated;
GRANT ALL ON public.app_access_entitlements TO service_role;

CREATE POLICY "Users can read their own App Access entitlement"
  ON public.app_access_entitlements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Only trusted service-role/admin operations can grant or revoke access.
REVOKE INSERT, UPDATE, DELETE ON public.app_access_entitlements FROM authenticated;

CREATE OR REPLACE FUNCTION public.enforce_robot_start_requirements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_running = true AND (TG_OP = 'INSERT' OR OLD.is_running IS DISTINCT FROM true) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.app_access_entitlements
      WHERE user_id = NEW.user_id AND enabled = true
    ) THEN
      RAISE EXCEPTION 'App Access is required before starting MOPSENTRY.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.trading_accounts
      WHERE user_id = NEW.user_id
        AND status = 'connected'
        AND last_heartbeat >= now() - interval '30 seconds'
    ) THEN
      RAISE EXCEPTION 'A fresh MT5/EA connection is required before starting MOPSENTRY.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER robot_settings_require_access_and_connection
  BEFORE INSERT OR UPDATE OF is_running ON public.robot_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_robot_start_requirements();