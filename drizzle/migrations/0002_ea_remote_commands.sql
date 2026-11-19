ALTER TABLE public.trading_accounts ADD COLUMN IF NOT EXISTS ea_state text, ADD COLUMN IF NOT EXISTS ea_state_at timestamptz;

CREATE TABLE public.robot_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  command text NOT NULL CHECK (command IN ('START','STOP')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','confirmed','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  confirmed_at timestamptz
);
CREATE INDEX robot_commands_user_status_idx ON public.robot_commands(user_id, status, created_at);
GRANT SELECT, INSERT ON public.robot_commands TO authenticated;
GRANT ALL ON public.robot_commands TO service_role;
ALTER TABLE public.robot_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.robot_commands FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert pending" ON public.robot_commands FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending' AND delivered_at IS NULL AND confirmed_at IS NULL);