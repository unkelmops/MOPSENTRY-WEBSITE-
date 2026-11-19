CREATE TABLE public.robot_settings (
  user_id uuid PRIMARY KEY,
  is_running boolean NOT NULL DEFAULT false,
  lot_size numeric NOT NULL DEFAULT 0.10,
  risk_percent numeric NOT NULL DEFAULT 1.0,
  max_trades integer NOT NULL DEFAULT 5,
  strategy text NOT NULL DEFAULT 'trend',
  pairs text[] NOT NULL DEFAULT ARRAY['EURUSD','GBPUSD','XAUUSD'],
  alerts_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.robot_settings TO authenticated;
GRANT ALL ON public.robot_settings TO service_role;
ALTER TABLE public.robot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.robot_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.robot_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.robot_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);