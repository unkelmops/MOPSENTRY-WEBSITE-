import { describe, expect, it } from "vitest";
import { analyseMarketCandles } from "./market-analysis";

const candles = Array.from({ length: 25 }, (_, index) => ({
  candle_open_at: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
  open: 100,
  high: index === 24 ? 112 : 110,
  low: 90,
  close: index === 24 ? 111 : 100,
}));

describe("analyseMarketCandles", () => {
  it("does not invent analysis when history is insufficient", () => {
    expect(analyseMarketCandles(candles.slice(0, 10)).trend).toBe("unavailable");
    expect(analyseMarketCandles(candles.slice(0, 10)).rangeState).toBe("unavailable");
  });

  it("calculates a prior 20-candle range and compares the latest close against it", () => {
    const result = analyseMarketCandles(candles);
    expect(result.rangeHigh).toBe(110);
    expect(result.rangeLow).toBe(90);
    expect(result.rangeMid).toBe(100);
    expect(result.rangeState).toBe("above range");
  });

  it("ignores malformed candles", () => {
    const result = analyseMarketCandles([...candles.slice(0, 24), { ...candles[24]!, high: 1 }]);
    expect(result.rangeState).toBe("unavailable");
  });
});
