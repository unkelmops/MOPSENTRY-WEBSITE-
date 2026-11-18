
import { describe, expect, it } from "vitest";
import { analyseXauMarket, buildFundamentalOutlook, classifyEvent, getSeriesKey, parseEconomicValue, type EconomicEvent } from "./fundamental-news";

const event = (title: string, previous: string, forecast: string): EconomicEvent => ({
  id: "usd-nonfarm-payrolls.20261106T1330", ts: Math.floor(Date.parse("2026-11-10T13:30:00Z") / 1000), time: "2026-11-10T13:30:00Z",
  currency: "USD", impact: "high", title, previous, forecast, actual: "",
});

describe("fundamental news analysis", () => {
  it("parses values with suffixes and percentages", () => {
    expect(parseEconomicValue("1.25M")).toBe(1_250_000);
    expect(parseEconomicValue("4.2%")).toBe(4.2);
    expect(parseEconomicValue("1,250")).toBe(1250);
  });
  it("treats higher forecast payrolls as USD bullish", () => {
    expect(classifyEvent(event("Nonfarm Payrolls", "100K", "150K")).direction).toBe("bullish");
  });
  it("treats higher forecast unemployment as USD bearish", () => {
    expect(classifyEvent(event("Unemployment Rate", "4.1%", "4.3%")).direction).toBe("bearish");
  });
  it("treats lower forecast jobless claims as USD bullish", () => {
    expect(classifyEvent(event("Initial Jobless Claims", "220K", "205K")).direction).toBe("bullish");
  });
  it("does not invent a direction when figures are missing", () => {
    expect(classifyEvent(event("CPI", "", "3.0%")).direction).toBe("unavailable");
    expect(buildFundamentalOutlook([event("CPI", "", "")]).direction).toBe("unavailable");
  });
  it("aggregates conflicting releases", () => {
    const outlook = buildFundamentalOutlook([event("Nonfarm Payrolls", "100K", "150K"), event("Unemployment Rate", "4.1%", "4.3%")]);
    expect(outlook.scoredCount).toBe(2);
    expect(outlook.direction).toBe("neutral");
  });
  it("uses the last four archived actuals to qualify the forecast", () => {
    const history = [0, 1, 2, 3].map((index) => ({
      event_id: `usd-nonfarm-payrolls.${index}`,
      series_key: "usd-nonfarm-payrolls",
      title: "Nonfarm Payrolls",
      event_time: new Date(Date.parse("2026-10-01T00:00:00Z") - index * 30 * 86400000).toISOString(),
      period: null, previous_value: "", forecast_value: "", actual_value: String(110 - index * 10), last_seen_at: new Date().toISOString(),
    }));
    const result = classifyEvent(event("Nonfarm Payrolls", "100K", "150K"), history);
    expect(result.reason).toContain("Last 4 releases");
    expect(result.weight).toBeGreaterThan(3);
  });
  it("scores released results against forecasts for every event group", () => {
    const hotterCpi = { ...event("CPI", "2.8%", "3.0%"), actual: "3.2%" };
    const coolerPpi = { ...event("PPI", "2.5%", "2.7%"), actual: "2.4%" };
    expect(buildFundamentalOutlook([hotterCpi]).direction).toBe("bullish");
    expect(buildFundamentalOutlook([coolerPpi]).direction).toBe("bearish");
  });
  it("returns one neutral combined outlook when related figures conflict", () => {
    const hotter = { ...event("CPI MoM", "2.8%", "3.0%"), actual: "3.2%" };
    const cooler = { ...event("Core CPI MoM", "3.0%", "3.1%"), actual: "2.9%" };
    expect(buildFundamentalOutlook([hotter, cooler]).direction).toBe("neutral");
  });
  it("extracts stable series identifiers", () => {
    expect(getSeriesKey("usd-nonfarm-payrolls.20261106T1330")).toBe("usd-nonfarm-payrolls");
    expect(getSeriesKey(undefined)).toBeNull();
  });
  it("confirms a bullish intraday and daily Gold trend when both time horizons agree", () => {
    const points = Array.from({ length: 60 }, (_, index) => ({ t: index * 300, p: 3000 + index }));
    const daily = { points: Array.from({ length: 60 }, (_, index) => ({ d: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`, c: 2800 + index * 2, h: 2805 + index * 2, l: 2795 + index * 2 })) };
    const result = analyseXauMarket({ data_state: { status: "fresh", as_of: null, source: null, age_seconds: 0 }, updated_at: new Date().toISOString(), points }, daily);
    expect(result.direction).toBe("bullish");
    expect(result.dailyDirection).toBe("bullish");
  });
  it("does not claim a market confirmation with too few price samples", () => {
    const result = analyseXauMarket({ data_state: { status: "fresh", as_of: null, source: null, age_seconds: 0 }, updated_at: new Date().toISOString(), points: [] });
    expect(result.direction).toBe("unavailable");
  });
});
