CREATE TABLE public.macro_source_observations (
  provider text NOT NULL,
  series_id text NOT NULL,
  period text NOT NULL,
  value numeric NOT NULL,
  prior_value numeric,
  revised_at timestamptz,
  source_url text NOT NULL,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, series_id, period)
);
GRANT SELECT ON public.macro_source_observations TO authenticated;
GRANT ALL ON public.macro_source_observations TO service_role;
ALTER TABLE public.macro_source_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read macro observations" ON public.macro_source_observations FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.track_macro_revision()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.value IS DISTINCT FROM OLD.value THEN
    NEW.prior_value := OLD.value;
    NEW.revised_at := now();
  ELSE
    NEW.prior_value := OLD.prior_value;
    NEW.revised_at := OLD.revised_at;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER macro_source_observations_revision BEFORE UPDATE ON public.macro_source_observations
  FOR EACH ROW EXECUTE FUNCTION public.track_macro_revision();

CREATE TABLE public.macro_event_analysis (
  event_id text PRIMARY KEY,
  payload jsonb NOT NULL,
  model text,
  generated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.macro_event_analysis TO authenticated;
GRANT ALL ON public.macro_event_analysis TO service_role;
ALTER TABLE public.macro_event_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read macro analysis" ON public.macro_event_analysis FOR SELECT TO authenticated USING (true);

CREATE TABLE public.macro_saved_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);
GRANT SELECT, INSERT, DELETE ON public.macro_saved_analyses TO authenticated;
GRANT ALL ON public.macro_saved_analyses TO service_role;
ALTER TABLE public.macro_saved_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved select" ON public.macro_saved_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own saved insert" ON public.macro_saved_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saved delete" ON public.macro_saved_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);