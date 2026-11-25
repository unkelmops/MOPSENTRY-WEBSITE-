-- Store the EA's independent higher-timeframe trend-bias setting.
ALTER TABLE public.robot_settings
  ADD COLUMN IF NOT EXISTS higher_timeframe text NOT NULL DEFAULT 'H4';

ALTER TABLE public.robot_settings
  DROP CONSTRAINT IF EXISTS robot_settings_higher_timeframe_check;

ALTER TABLE public.robot_settings
  ADD CONSTRAINT robot_settings_higher_timeframe_check
  CHECK (higher_timeframe IN ('M5', 'M15', 'M30', 'H1', 'H4', 'D1'));
