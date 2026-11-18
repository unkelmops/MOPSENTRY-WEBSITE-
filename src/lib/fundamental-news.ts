
export type EconomicEvent = {
  id?: string;
  ts: number;
  time: string;
  currency: string;
  impact: string;
  title: string;
  forecast: string;
  previous: string;
  actual: string;
  status?: string;
  confidence?: string;
  period?: string;
};

export type CalendarResponse = {
  server_time: number;
  server_time_iso: string;
  generated_at: string;
  count: number;
  events: EconomicEvent[];
  attribution?: { text?: string; url?: string };
};

export type HistoricalEvent = {
  event_id: string;
  series_key: string;
  title: string;
  event_time: string;
  period: string | null;
  previous_value: string;
  forecast_value: string;
  actual_value: string;
  last_seen_at: string;
};

export type UsdDirection = "bullish" | "bearish" | "neutral" | "unavailable";

export type XauDailyHistory = { points: { d: string; c: number; h: number; l: number }[]; updated_at?: string; data_state?: { status: "fresh" | "stale" | "unavailable"; as_of?: string | null; age_seconds?: number | null } };

export type XauMarketData = {
  data_state: { status: "fresh" | "stale" | "unavailable"; as_of: string | null; source: string | null; age_seconds: number | null };
  updated_at: string;
  points: { t: number; p: number }[];
  coverage_seconds?: number;
};

type IndicatorRule = {
  pattern: RegExp;
  higherIsUsdBullish: boolean;
  weight: number;
  explanation: string;
};

const RULES: IndicatorRule[] = [
  { pattern: /non.?farm payroll|payroll employment|employment change/i, higherIsUsdBullish: true, weight: 3, explanation: "Stronger job creation generally supports the dollar." },
  { pattern: /unemployment rate/i, higherIsUsdBullish: false, weight: 3, explanation: "A lower unemployment rate generally supports the dollar." },
  { pattern: /initial jobless claims|continuing jobless claims|unemployment claims/i, higherIsUsdBullish: false, weight: 2, explanation: "Fewer claims generally indicate a stronger labour market and support the dollar." },
  { pattern: /average hourly earnings|employment cost index|wage/i, higherIsUsdBullish: true, weight: 2, explanation: "Stronger wage growth can support the dollar through inflation and Fed-rate expectations." },
  { pattern: /consumer price index|\bcpi\b|producer price index|\bppi\b|pce price/i, higherIsUsdBullish: true, weight: 3, explanation: "Hotter inflation can support a more hawkish Fed outlook; the effect depends on the inflation trend and Fed reaction." },
  { pattern: /gross domestic product|\bgdp\b/i, higherIsUsdBullish: true, weight: 3, explanation: "Stronger growth generally supports the dollar through relative economic strength." },
  { pattern: /retail sales|personal spending/i, higherIsUsdBullish: true, weight: 2, explanation: "Stronger consumer spending generally supports the dollar." },
  { pattern: /ism .*pmi|pmi|manufacturing index|services index/i, higherIsUsdBullish: true, weight: 2, explanation: "A stronger activity reading generally supports the dollar." },
  { pattern: /jolts|job openings/i, higherIsUsdBullish: true, weight: 2, explanation: "More job openings generally indicate labour-market strength." },
  { pattern: /federal funds rate|fed funds rate|interest rate decision|target rate/i, higherIsUsdBullish: true, weight: 3, explanation: "A higher expected policy rate can support the dollar; interpret alongside Fed guidance and inflation." },
];

export function parseEconomicValue(raw: string | null | undefined): number | null {
  if (!raw || !raw.trim()) return null;
  const normalized = raw.trim().replace(/,/g, "").replace(/[$€£%\s]/g, "");
  const match = normalized.match(/^(-?\d+(?:\.\d+)?)([KMB])?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const suffix = match[2]?.toUpperCase();
  const multiplier = suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : suffix === "B" ? 1_000_000_000 : 1;
  return Number.isFinite(amount) ? amount * multiplier : null;
}

export function classifyEvent(event: EconomicEvent, history: HistoricalEvent[] = []): {
  direction: UsdDirection;
  reason: string;
  score: number;
  weight: number;
} {
  const rule = RULES.find((candidate) => candidate.pattern.test(event.title));
  if (!rule) return { direction: "unavailable", reason: "No validated interpretation rule is configured for this event yet.", score: 0, weight: 0 };
  const previous = parseEconomicValue(event.previous);
  const forecast = parseEconomicValue(event.forecast);
  if (previous === null || forecast === null) {
    return { direction: "unavailable", reason: "A usable previous or forecast figure is not published yet.", score: 0, weight: rule.weight };
  }
  if (forecast === previous) {
    return { direction: "neutral", reason: "Forecast matches the previous figure, so this comparison gives no directional edge.", score: 0, weight: rule.weight };
  }
  const forecastHigher = forecast > previous;
  const usdBullish = forecastHigher === rule.higherIsUsdBullish;
  const seriesKey = getSeriesKey(event.id);
  const past = seriesKey ? history.filter((item) => item.series_key === seriesKey && item.actual_value && new Date(item.event_time).getTime() < event.ts * 1000).sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime()).slice(0, 6) : [];
  const actuals = past.map((item) => parseEconomicValue(item.actual_value)).filter((value): value is number => value !== null);
  let historyNote = past.length >= 4 && actuals.length >= 4 ? "Recent release history is available." : "Historical archive is still warming up.";
  let historyMultiplier = 1;
  if (actuals.length >= 4) {
    const recent = actuals.slice(0, 3).reduce((sum, value) => sum + value, 0) / Math.min(3, actuals.length);
    const olderValues = actuals.slice(3, 6);
    const older = olderValues.reduce((sum, value) => sum + value, 0) / olderValues.length;
    const historyHigher = recent > older;
    const historyUsdBullish = historyHigher === rule.higherIsUsdBullish;
    const trend = recent === older ? "flat" : historyUsdBullish ? "USD-supportive" : "USD-negative";
    const avg = actuals.reduce((sum, value) => sum + value, 0) / actuals.length;
    const forecastVsAverage = forecast > avg ? "above" : forecast < avg ? "below" : "at";
    historyNote = `Last ${actuals.length} releases: ${trend} trend; this forecast is ${forecastVsAverage} their average.`;
    historyMultiplier = historyUsdBullish === usdBullish ? 1.2 : 0.8;
  }
  return {
    direction: usdBullish ? "bullish" : "bearish",
    reason: `Forecast is ${forecastHigher ? "higher" : "lower"} than previous. ${rule.explanation} ${historyNote}`,
    score: (usdBullish ? 1 : -1) * rule.weight * historyMultiplier,
    weight: rule.weight * historyMultiplier,
  };
}

export function buildFundamentalOutlook(events: EconomicEvent[], history: HistoricalEvent[] = []) {
  const analysed = events.filter((event) => event.currency === "USD" && event.impact === "high")
    .map((event) => {
      const actualAvailable = Boolean(event.actual && event.actual.trim() && event.actual !== "—");
      const analysisEvent = actualAvailable
        ? { ...event, previous: event.forecast, forecast: event.actual, actual: "" }
        : event;
      return { event, analysis: classifyEvent(analysisEvent, history) };
    });
  const scored = analysed.filter(({ analysis }) => analysis.direction === "bullish" || analysis.direction === "bearish");
  const totalWeight = scored.reduce((sum, item) => sum + item.analysis.weight, 0);
  const netScore = totalWeight ? scored.reduce((sum, item) => sum + item.analysis.score, 0) / totalWeight : 0;
  const bullishWeight = scored.filter(({ analysis }) => analysis.direction === "bullish").reduce((sum, item) => sum + item.analysis.weight, 0);
  const bearishWeight = scored.filter(({ analysis }) => analysis.direction === "bearish").reduce((sum, item) => sum + item.analysis.weight, 0);
  const agreement = totalWeight ? Math.max(bullishWeight, bearishWeight) / totalWeight : 0;
  const direction: UsdDirection = !scored.length ? "unavailable" : Math.abs(netScore) < 0.15 ? "neutral" : netScore > 0 ? "bullish" : "bearish";
  const sampleCoverage = Math.min(1, scored.length / 4);
  const confidence = scored.length ? Math.round(Math.abs(netScore) * agreement * sampleCoverage * 100) : 0;
  return {
    analysed, direction,
    goldBias: direction === "unavailable" ? "unavailable" as const : direction === "bullish" ? "bearish" as const : direction === "bearish" ? "bullish" as const : "neutral" as const,
    confidence, scoredCount: scored.length, unavailableCount: analysed.length - scored.length, netScore,
  };
}

export function getSeriesKey(eventId: string | undefined): string | null {
  if (!eventId) return null;
  const separator = eventId.lastIndexOf(".");
  return separator > 0 ? eventId.slice(0, separator) : null;
}

export function analyseXauMarket(data: XauMarketData, daily?: XauDailyHistory) {
  const points = data.points.filter((point) => Number.isFinite(point.p) && point.p > 0).sort((a, b) => a.t - b.t);
  if (points.length < 55) {
    return { direction: "unavailable" as const, close: points.at(-1)?.p ?? null, rsi: null, ema20: null, ema50: null, reason: "Not enough valid five-minute price samples for the trend and momentum checks." };
  }
  const closes = points.map((point) => point.p);
  const ema = (period: number) => {
    const alpha = 2 / (period + 1);
    return closes.slice(1).reduce((value, close) => value + alpha * (close - value), closes[0] ?? 0);
  };
  const ema20 = ema(20);
  const ema50 = ema(50);
  const changes = closes.slice(-15).map((close, index, values) => index === 0 ? 0 : close - (values[index - 1] ?? close));
  const gains = changes.reduce((sum, value) => sum + Math.max(0, value), 0) / 14;
  const losses = changes.reduce((sum, value) => sum + Math.max(0, -value), 0) / 14;
  const rsi = losses === 0 ? 100 : 100 - 100 / (1 + gains / losses);
  const close = closes.at(-1)!;
  const bullish = close > ema20 && ema20 > ema50 && rsi >= 55;
  const bearish = close < ema20 && ema20 < ema50 && rsi <= 45;
  const direction = bullish ? "bullish" as const : bearish ? "bearish" as const : "mixed" as const;
  const dailyCloses = (daily?.points ?? []).map((point) => point.c).filter((value) => Number.isFinite(value) && value > 0);
  let dailyDirection: "bullish" | "bearish" | "mixed" | "unavailable" = "unavailable";
  if (dailyCloses.length >= 50) {
    const sma20 = dailyCloses.slice(-20).reduce((sum, value) => sum + value, 0) / 20;
    const sma50 = dailyCloses.slice(-50).reduce((sum, value) => sum + value, 0) / 50;
    const dailyClose = dailyCloses.at(-1)!;
    dailyDirection = dailyClose > sma20 && sma20 > sma50 ? "bullish" : dailyClose < sma20 && sma20 < sma50 ? "bearish" : "mixed";
  }
  const combinedDirection = dailyDirection === "unavailable" ? direction : dailyDirection === direction ? direction : "mixed";
  const reason = `${bullish ? "Intraday trend and RSI are bullish." : bearish ? "Intraday trend and RSI are bearish." : "Intraday EMA trend and RSI are mixed."} ${dailyDirection === "unavailable" ? "Longer daily history is not yet available." : `Daily 20/50 moving-average trend is ${dailyDirection}.`}`;
  return { direction: combinedDirection, intradayDirection: direction, dailyDirection, close, rsi: Math.round(rsi * 10) / 10, ema20, ema50, reason };
}

export async function fetchUsdEconomicCalendar(): Promise<CalendarResponse> {
  const response = await fetch("https://showmytrades.com/api/public/calendar/v1?currency=USD&impact=high&days=30", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Economic calendar request failed (HTTP ${response.status}).`);
  const payload = await response.json() as CalendarResponse;
  if (!Array.isArray(payload.events) || typeof payload.server_time !== "number") throw new Error("Economic calendar returned an unexpected response.");
  return payload;
}

export async function fetchXauMarketData(): Promise<XauMarketData> {
  const response = await fetch("https://xaus.com/api/v1/intraday?symbol=xau&hours=48", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Gold market data request failed (HTTP ${response.status}).`);
  const payload = await response.json() as XauMarketData;
  if (!Array.isArray(payload.points) || !payload.data_state) throw new Error("Gold market data returned an unexpected response.");
  return payload;
}

export async function fetchXauDailyHistory(): Promise<XauDailyHistory> {
  const response = await fetch("https://xaus.com/api/v1/history", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Gold daily history request failed (HTTP ${response.status}).`);
  const payload = await response.json() as XauDailyHistory;
  if (!Array.isArray(payload.points)) throw new Error("Gold daily history returned an unexpected response.");
  return payload;
}
