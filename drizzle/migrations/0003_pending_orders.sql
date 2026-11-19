ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS pending_orders jsonb;