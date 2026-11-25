import { describe, expect, it } from "vitest";
import { eaSettingsPayload, higherTimeframeSchema, timeframeSchema } from "./robot-options";

describe("robot options", () => {
  it("accepts one timeframe and rejects several at once", () => {
    expect(timeframeSchema.parse("M15")).toBe("M15");
    expect(timeframeSchema.safeParse(["M1", "M5"]).success).toBe(false);
    expect(timeframeSchema.safeParse("M2").success).toBe(false);
  });
  it("validates a separate higher timeframe", () => {
    expect(higherTimeframeSchema.parse("H4")).toBe("H4");
    expect(higherTimeframeSchema.safeParse("M1").success).toBe(false);
  });
  it("delivers aggressive entry frequency without raising trade size or safety limits", () => {
    const input = { strategy: "scalp", timeframe: "M1", scalper_frequency: "aggressive", lot_size: 0.01, risk_percent: 1, max_trades: 3, pairs: ["EURUSD"], alerts_enabled: true };
    expect(eaSettingsPayload(input)).toEqual({ ...input, strategy: "scalper", higher_timeframe: "H4", break_even_enabled: false, break_even_trigger: 10 });
    expect(eaSettingsPayload({ ...input, scalper_frequency: "standard" }).lot_size).toBe(0.01);
  });
});