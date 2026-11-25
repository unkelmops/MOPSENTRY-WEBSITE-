import { z } from "zod";

export const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"] as const;
export const HIGHER_TIMEFRAMES = ["M5", "M15", "M30", "H1", "H4", "D1"] as const;
export const higherTimeframeSchema = z.enum(HIGHER_TIMEFRAMES);
export const timeframeSchema = z.enum(TIMEFRAMES);
export const scalperFrequencySchema = z.enum(["standard", "aggressive"]);

type SettingsPayload = {
  strategy: string; timeframe: string; higher_timeframe?: string; scalper_frequency: string;
  lot_size: number; risk_percent: number; max_trades: number;
  pairs: string[]; alerts_enabled: boolean; break_even_enabled?: boolean; break_even_trigger?: number;
};

export function eaSettingsPayload(settings: SettingsPayload) {
  return {
    strategy: settings.strategy === "scalp" ? "scalper" : settings.strategy,
    timeframe: timeframeSchema.parse(settings.timeframe),
    higher_timeframe: higherTimeframeSchema.parse(settings.higher_timeframe ?? "H4"),
    break_even_enabled: settings.break_even_enabled ?? false,
    break_even_trigger: Number(settings.break_even_trigger ?? 10),
    scalper_frequency: scalperFrequencySchema.parse(settings.scalper_frequency),
    lot_size: Number(settings.lot_size),
    risk_percent: Number(settings.risk_percent),
    max_trades: settings.max_trades,
    pairs: settings.pairs,
    alerts_enabled: settings.alerts_enabled,
  };
}