import { supabase } from "@/integrations/supabase/client";

export type MarketQuote = {
  source: "mt5_broker" | "independent";
  provider_symbol: string;
  bid: number | null;
  ask: number | null;
  last: number | null;
  observed_at: string;
};

export type MarketCandle = {
  candle_open_at: string;
  open: number;
  high: number;
  low: number;
  close: number;
  tick_volume: number | null;
};

export type MarketFeedHealth = {
  source: string;
  status: "healthy" | "delayed" | "stale" | "disconnected" | "error" | "not_configured";
  last_tick_at: string | null;
  last_success_at: string | null;
  latency_ms: number | null;
};

export async function loadMarketSnapshot(symbol: string, timeframe: string) {
  const syncResult = await supabase.functions.invoke("mopsentry-market-sync", { body: { symbol, timeframe } });
  const [quotesResult, candlesResult, healthResult] = await Promise.all([
    supabase.from("market_quotes").select("source,provider_symbol,bid,ask,last,observed_at").eq("instrument_symbol", symbol).order("observed_at", { ascending: false }).limit(10),
    supabase.from("market_candles").select("candle_open_at,open,high,low,close,tick_volume").eq("instrument_symbol", symbol).eq("source", "independent").eq("timeframe", timeframe).order("candle_open_at", { ascending: true }).limit(300),
    supabase.from("market_data_health").select("source,status,last_tick_at,last_success_at,latency_ms").in("source", ["mt5_broker", "independent"]).eq("instrument_symbol", symbol),
  ]);
  if (quotesResult.error) throw quotesResult.error;
  if (candlesResult.error) throw candlesResult.error;
  if (healthResult.error) throw healthResult.error;
  const latestBySource = new Map<string, MarketQuote>();
  for (const quote of (quotesResult.data ?? []) as MarketQuote[]) if (!latestBySource.has(quote.source)) latestBySource.set(quote.source, quote);
  return { quotes: [...latestBySource.values()], candles: (candlesResult.data ?? []) as MarketCandle[], health: (healthResult.data ?? []) as MarketFeedHealth[], syncError: syncResult.error?.message ?? null, fetchedAt: new Date().toISOString() };
}
