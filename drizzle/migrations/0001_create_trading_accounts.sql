CREATE TABLE public.trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'mt5' CHECK (platform IN ('mt4', 'mt5')),
  broker_server text NOT NULL DEFAULT '',
  login text NOT NULL DEFAULT '',
  connection_key text NOT NULL UNIQUE DEFAULT ('MSE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)) || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected')),
  last_heartbeat timestamptz,
  balance numeric,
  equity numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_accounts TO authenticated;
GRANT ALL ON public.trading_accounts TO service_role;

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own trading account"
  ON public.trading_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading account"
  ON public.trading_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading account"
  ON public.trading_accounts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trading account"
  ON public.trading_accounts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);