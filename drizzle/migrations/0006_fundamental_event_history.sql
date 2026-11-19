CREATE TABLE IF NOT EXISTS public.fundamental_event_history (
  event_id text PRIMARY KEY,
  series_key text NOT NULL,
  currency text NOT NULL CHECK (currency = 'USD'),
  impact text NOT NULL,
  title text NOT NULL,
  event_time timestamptz NOT NULL,
  period text,
  previous_value text NOT NULL DEFAULT '',
  forecast_value text NOT NULL DEFAULT '',
  actual_value text NOT NULL DEFAULT '',
  event_status text NOT NULL DEFAULT 'scheduled',
  source text NOT NULL DEFAULT 'ShowMyTrades economic calendar',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  actual_recorded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fundamental_event_history_series_time_idx
  ON public.fundamental_event_history (series_key, event_time DESC);

CREATE OR REPLACE FUNCTION public.preserve_fundamental_actual()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.actual_value IS NULL OR NEW.actual_value = '' THEN
    NEW.actual_value := OLD.actual_value;
    NEW.actual_recorded_at := OLD.actual_recorded_at;
  ELSIF OLD.actual_value IS NULL OR OLD.actual_value = '' THEN
    NEW.actual_recorded_at := now();
  END IF;
  NEW.first_seen_at := OLD.first_seen_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fundamental_event_history_preserve_actual ON public.fundamental_event_history;
CREATE TRIGGER fundamental_event_history_preserve_actual
  BEFORE UPDATE ON public.fundamental_event_history
  FOR EACH ROW EXECUTE FUNCTION public.preserve_fundamental_actual();

ALTER TABLE public.fundamental_event_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.fundamental_event_history TO authenticated;
GRANT ALL ON public.fundamental_event_history TO service_role;

DROP POLICY IF EXISTS "Authenticated users can read fundamental event history" ON public.fundamental_event_history;
CREATE POLICY "Authenticated users can read fundamental event history"
  ON public.fundamental_event_history FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.fundamental_sync_state (
  id text PRIMARY KEY CHECK (id = 'usd-high-impact'),
  last_synced_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.fundamental_sync_state (id, last_synced_at)
VALUES ('usd-high-impact', now() - interval '15 minutes')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.fundamental_sync_state ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.fundamental_sync_state TO service_role;