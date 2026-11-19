-- Store the EA version reported by the authenticated app check-in.
ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS ea_version text;

-- Allow the already-supported CLOSE_ALL remote command.
ALTER TABLE public.robot_commands
  DROP CONSTRAINT IF EXISTS robot_commands_command_check;

ALTER TABLE public.robot_commands
  ADD CONSTRAINT robot_commands_command_check
  CHECK (command IN ('START', 'STOP', 'CLOSE_ALL'));