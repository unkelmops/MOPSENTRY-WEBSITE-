import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette } from "../src/lib/theme";
import { BrandHeader } from "../src/components/BrandHeader";
import { AmbientBackground } from "../src/components/AmbientBackground";
import { analyseMarketCandles } from "../src/lib/market-analysis";

type Quote = { source: string; provider_symbol: string; bid: number | null; ask: number | null; last: number | null; observed_at: string };
type Candle = { candle_open_at: string; open: number; high: number; low: number; close: number; tick_volume: number | null };
type FeedHealth = { source: string; status: string; last_tick_at: string | null; last_success_at: string | null; latency_ms: number | null };
type SymbolOption = { symbol: string; name: string };
const symbols: SymbolOption[] = [
  { symbol: "XAUUSD", name: "Gold" },
  { symbol: "US30", name: "Dow Jones" },
  { symbol: "NAS100", name: "Nasdaq 100" },
];
const timeframes = ["M5", "M15", "H1", "H4"] as const;
const sections = [
  { id: "news", title: "News & Economic Events", detail: "Headlines, economic events and session outlook will appear when verified sources are connected." },
  { id: "structure", title: "Market Structure & Trend", detail: "Trend direction, BOS and CHoCH require validated swing points and price history." },
  { id: "crt", title: "CRT Analysis", detail: "Range highs, lows and midpoint are pending a validated candle range." },
  { id: "liquidity", title: "Liquidity & Sweeps", detail: "Liquidity pools, sweep status and reclaim levels have not yet been confirmed." },
  { id: "strategies", title: "Strategy Scanner", detail: "The strategy engine has not run. No buy, sell or wait consensus is being implied." },
  { id: "setup", title: "Trade Setup", detail: "Entry, stop loss and targets will only appear when a setup is supported by validated data." },
  { id: "history", title: "Prediction History", detail: "Past calls and accuracy require recorded predictions evaluated against later prices." },
] as const;

const price = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 5 }).format(value);
const time = (value: string | null | undefined) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "No tick received";

function CandlePlot({ candles }: { candles: Candle[] }) {
  const rows = candles.slice(-44);
  if (rows.length < 2) return <View style={styles.chartEmpty}><ActivityIndicator color={palette.blue} /><Text style={styles.muted}>Waiting for verified candle history.</Text></View>;
  const max = Math.max(...rows.map(c => c.high));
  const min = Math.min(...rows.map(c => c.low));
  const range = Math.max(max - min, 0.000001);
  return (
    <View style={styles.chart}>
      <View style={styles.chartGrid}><Text style={styles.axis}>{price(max)}</Text><Text style={styles.axis}>{price((max + min) / 2)}</Text><Text style={styles.axis}>{price(min)}</Text></View>
      <View style={styles.candles}>
        {rows.map((candle, index) => {
          const top = ((max - candle.high) / range) * 100;
          const bottom = ((max - candle.low) / range) * 100;
          const open = ((max - candle.open) / range) * 100;
          const close = ((max - candle.close) / range) * 100;
          const up = candle.close >= candle.open;
          const color = up ? palette.green : palette.red;
          const bodyTop = Math.min(open, close);
          const bodyHeight = Math.max(1.5, Math.abs(close - open));
          return (
            <View key={candle.candle_open_at + index} style={styles.candleSlot}>
              <View style={[styles.wick, { top: (top + "%") as `${number}%`, height: (Math.max(1, bottom - top) + "%") as `${number}%`, backgroundColor: color }]} />
              <View style={[styles.candleBody, { top: (bodyTop + "%") as `${number}%`, height: (bodyHeight + "%") as `${number}%`, backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function MarketReportScreen() {
  const [symbol, setSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState<(typeof timeframes)[number]>("H1");
  const [settingsNotice, setSettingsNotice] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [health, setHealth] = useState<FeedHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) return;
        const { data, error } = await supabase.from("robot_settings").select("timeframe,pairs").eq("user_id", auth.user.id).maybeSingle();
        if (error) throw error;
        if (!active || !data) return;
        if (timeframes.includes(data.timeframe as (typeof timeframes)[number])) setTimeframe(data.timeframe as (typeof timeframes)[number]);
        const savedPairs = Array.isArray(data.pairs) ? data.pairs : [];
        const preferredSymbol = savedPairs.find((value: unknown) => typeof value === "string" && symbols.some(option => option.symbol === value));
        if (typeof preferredSymbol === "string") setSymbol(preferredSymbol);
      } catch (error) {
        if (active) setSettingsNotice(error instanceof Error ? error.message : "Saved EA preferences could not be loaded.");
      }
    })();
    return () => { active = false; };
  }, []);

  async function saveEaSelection(next: { symbol?: string; timeframe?: (typeof timeframes)[number] }) {
    setSettingsNotice("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in again to save EA preferences.");
      const { data: existing, error: readError } = await supabase.from("robot_settings").select("pairs").eq("user_id", auth.user.id).maybeSingle();
      if (readError) throw readError;
      const existingPairs = Array.isArray(existing?.pairs) ? existing.pairs.filter((value: unknown): value is string => typeof value === "string") : [];
      const pairs = next.symbol ? [next.symbol, ...existingPairs.filter(value => value !== next.symbol)] : existingPairs;
      const payload: { user_id: string; updated_at: string; pairs?: string[]; timeframe?: string } = {
        user_id: auth.user.id,
        updated_at: new Date().toISOString(),
      };
      if (next.symbol) payload.pairs = pairs;
      if (next.timeframe) payload.timeframe = next.timeframe;
      const { error: saveError } = await supabase.from("robot_settings").upsert(payload, { onConflict: "user_id" });
      if (saveError) throw saveError;
      setSettingsNotice("Saved to EA preferences. The EA can apply it on its next check-in once its settings reader is updated.");
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : "Could not save the EA preference.");
    }
  }

  const refresh = useCallback(async () => {
    try {
      await supabase.functions.invoke("mopsentry-market-sync", { body: { symbol, timeframe } });
      const [quoteResult, candleResult, healthResult] = await Promise.all([
        supabase.from("market_quotes").select("source,provider_symbol,bid,ask,last,observed_at").eq("instrument_symbol", symbol).order("observed_at", { ascending: false }).limit(10),
        supabase.from("market_candles").select("candle_open_at,open,high,low,close,tick_volume").eq("instrument_symbol", symbol).eq("source", "independent").eq("timeframe", timeframe).order("candle_open_at", { ascending: true }).limit(300),
        supabase.from("market_data_health").select("source,status,last_tick_at,last_success_at,latency_ms").in("source", ["mt5_broker", "independent"]).eq("instrument_symbol", symbol),
      ]);
      if (quoteResult.error) throw quoteResult.error;
      if (candleResult.error) throw candleResult.error;
      if (healthResult.error) throw healthResult.error;
      const latest = new Map<string, Quote>();
      for (const quote of (quoteResult.data ?? []) as Quote[]) if (!latest.has(quote.source)) latest.set(quote.source, quote);
      setQuotes([...latest.values()]);
      setCandles((candleResult.data ?? []) as Candle[]);
      setHealth((healthResult.data ?? []) as FeedHealth[]);
      setUpdatedAt(new Date().toISOString());
      setRefreshError("");
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Market data is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const run = async () => { if (active) await refresh(); };
    void run();
    const timer = setInterval(() => { void run(); }, 15_000);
    return () => { active = false; clearInterval(timer); };
  }, [refresh]);

  const reference = quotes.find(q => q.source === "independent") ?? null;
  const broker = quotes.find(q => q.source === "mt5_broker") ?? null;
  const referenceHealth = health.find(h => h.source === "independent");
  const brokerHealth = health.find(h => h.source === "mt5_broker");
  const brokerFresh = Boolean(broker && brokerHealth?.status === "healthy" && Date.now() - new Date(broker.observed_at).getTime() >= 0 && Date.now() - new Date(broker.observed_at).getTime() < 60_000);
  const selected = useMemo(() => symbols.find(item => item.symbol === symbol), [symbol]);
  const analysis = useMemo(() => analyseMarketCandles(candles), [candles]);
  const analysisDetails: Record<string, string> = {
    news: "The high-impact USD calendar is available in Events and Signals. A verified headline and session-news feed is not connected to this report yet.",
    structure: analysis.trend.toUpperCase() + " trend. " + analysis.trendNote + " Structure: " + analysis.structure + ". Latest swing high: " + price(analysis.swingHigh) + " · swing low: " + price(analysis.swingLow) + ".",
    crt: "Recent 20-candle range: high " + price(analysis.rangeHigh) + " · low " + price(analysis.rangeLow) + " · midpoint " + price(analysis.rangeMid) + ". Current close is " + analysis.rangeState + ".",
    liquidity: analysis.liquidity.toUpperCase() + (analysis.liquidityLevel === null ? "" : " near " + price(analysis.liquidityLevel)) + ". Calculated from validated swing pivots; this is not an order instruction.",
    strategies: "The full 30-check strategy consensus engine is not yet connected to the native app. No consensus or direction is fabricated.",
    setup: "No entry, stop-loss or take-profit is issued by this report. A verified strategy engine and execution-ready setup validation are required first.",
    history: "Prediction history and accuracy are unavailable until timestamped predictions are stored and evaluated against later verified prices.",
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandHeader />
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>MOPSENTRY · INTELLIGENCE</Text><Text style={styles.title}>Market Report</Text></View>
          <View style={styles.liveBadge}><View style={styles.liveDot}/><Text style={styles.liveText}>LIVE DATA</Text></View>
        </View>

        <View style={styles.pricePanel}>
          <Text style={styles.panelEyebrow}>SHARED MARKET FEED · {symbol}</Text>
          <Text style={styles.bigPrice}>{price(reference?.last)}</Text>
          <View style={styles.quoteRow}><Text style={styles.quoteText}>BID  <Text style={styles.quoteStrong}>{price(reference?.bid)}</Text></Text><Text style={styles.quoteText}>ASK  <Text style={styles.quoteStrong}>{price(reference?.ask)}</Text></Text></View>
          <View style={styles.panelFooter}><Text style={styles.feedStatus}>{referenceHealth?.status?.replace("_", " ").toUpperCase() ?? "WAITING FOR FEED"}</Text><Text style={styles.timestamp}>Updated {time(reference?.observed_at)}</Text></View>
          {brokerFresh && broker ? <View style={styles.brokerBox}><Text style={styles.brokerLabel}>YOUR BROKER PRICE</Text><Text style={styles.brokerPrice}>{price(broker.last)}</Text><Text style={styles.timestamp}>Bid {price(broker.bid)} · Ask {price(broker.ask)}</Text></View> : null}
        </View>

        {refreshError ? <Text style={styles.warning}>Feed refresh issue. Showing the latest verified data available.</Text> : null}

        <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>{selected?.name ?? symbol} · {timeframe}</Text><Text style={styles.muted}>Shared reference · Candlestick chart</Text></View><Text style={styles.count}>{candles.length} CANDLES</Text></View>
        <CandlePlot candles={candles}/>
        <Text style={styles.chartCaption}>OHLC candles · {candles.length ? "Verified history" : "No verified candle history yet"}</Text>

        <View style={styles.symbolRow}>
          {symbols.map(item => <Pressable key={item.symbol} onPress={() => { setSymbol(item.symbol); setExpanded(null); void saveEaSelection({ symbol: item.symbol }); }} style={[styles.symbolButton, symbol === item.symbol && styles.symbolSelected]}><Text style={[styles.symbolText, symbol === item.symbol && styles.symbolTextSelected]}>{item.symbol}</Text><Text style={styles.symbolName}>{item.name}</Text></Pressable>)}
        </View>
        <View style={styles.timeRow}>{timeframes.map(tf => <Pressable key={tf} onPress={() => { setTimeframe(tf); void saveEaSelection({ timeframe: tf }); }} style={[styles.timeButton, timeframe === tf && styles.timeSelected]}><Text style={[styles.timeText, timeframe === tf && styles.timeTextSelected]}>{tf}</Text></Pressable>)}</View>
        {settingsNotice ? <Text style={styles.settingsNotice}>{settingsNotice}</Text> : null}

        <View style={styles.reportHeader}><View><Text style={styles.sectionTitle}>Analysis</Text><Text style={styles.muted}>{symbol} · {timeframe}</Text></View><Text style={styles.timestamp}>Checked {time(updatedAt)}</Text></View>
        {sections.map((section, index) => {
          const open = expanded === section.id;
          return <Pressable key={section.id} onPress={() => setExpanded(open ? null : section.id)} style={[styles.analysisCard, open && styles.analysisCardOpen]}>
            <View style={styles.analysisTop}><View style={styles.analysisIcon}><Text style={styles.analysisNumber}>0{index + 1}</Text></View><Text style={styles.analysisTitle}>{section.title}</Text><Text style={styles.chevron}>{open ? "−" : "+"}</Text></View>
            {open ? <Text style={styles.analysisDetail}>{analysisDetails[section.id] ?? section.detail}</Text> : <Text style={styles.analysisHint}>Tap to explore this section</Text>}
          </Pressable>;
        })}
        {loading && <View style={styles.loadingRow}><ActivityIndicator color={palette.blue}/><Text style={styles.muted}>Refreshing market data…</Text></View>}
        <Text style={styles.disclaimer}>Market information is for analysis only. No trade levels are invented and this report does not send trading commands.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { padding: 18, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 18 },
  eyebrow: { color: palette.blueBright, fontSize: 9, fontWeight: "900", letterSpacing: 1.8 },
  title: { color: palette.text, fontSize: 28, fontWeight: "900", marginTop: 5 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#1C765E", backgroundColor: "#0C2A29", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green },
  liveText: { color: palette.green, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  pricePanel: { borderWidth: 1, borderColor: palette.borderStrong, borderRadius: 22, padding: 18, backgroundColor: "#0B1A2B", overflow: "hidden", marginBottom: 18 },
  panelEyebrow: { color: palette.blueBright, fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  bigPrice: { color: palette.text, fontSize: 36, fontWeight: "900", letterSpacing: -1, marginTop: 12 },
  quoteRow: { flexDirection: "row", gap: 22, marginTop: 8 },
  quoteText: { color: palette.muted, fontSize: 10 },
  quoteStrong: { color: palette.text, fontWeight: "800" },
  panelFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 8 },
  feedStatus: { color: palette.green, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  timestamp: { color: palette.subtle, fontSize: 9 },
  brokerBox: { marginTop: 14, padding: 12, borderWidth: 1, borderColor: "#1C765E", borderRadius: 13, backgroundColor: "#0D302A" },
  brokerLabel: { color: palette.green, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  brokerPrice: { color: palette.text, fontSize: 22, fontWeight: "900", marginTop: 5 },
  warning: { color: palette.amber, fontSize: 11, marginBottom: 12 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
  muted: { color: palette.muted, fontSize: 10, marginTop: 4 },
  count: { color: palette.blueBright, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  chart: { height: 220, flexDirection: "row", borderWidth: 1, borderColor: palette.border, borderRadius: 15, backgroundColor: "#091522", padding: 12, overflow: "hidden" },
  chartGrid: { width: 58, justifyContent: "space-between", paddingVertical: 2 },
  axis: { color: palette.subtle, fontSize: 8 },
  candles: { flex: 1, flexDirection: "row", alignItems: "stretch", justifyContent: "space-around", position: "relative" },
  candleSlot: { flex: 1, maxWidth: 10, position: "relative", height: "100%" },
  wick: { position: "absolute", left: "45%", width: 1, opacity: 0.95 },
  candleBody: { position: "absolute", left: "12%", right: "12%", minHeight: 2, borderRadius: 1 },
  chartEmpty: { height: 220, alignItems: "center", justifyContent: "center", gap: 12, borderWidth: 1, borderColor: palette.border, borderRadius: 15, backgroundColor: palette.surface },
  chartCaption: { color: palette.subtle, fontSize: 9, marginTop: 8, marginBottom: 16 },
  symbolRow: { flexDirection: "row", gap: 7, marginBottom: 10 },
  symbolButton: { flex: 1, minHeight: 52, borderWidth: 1, borderColor: palette.border, borderRadius: 11, padding: 8, justifyContent: "center", alignItems: "center", backgroundColor: palette.surface },
  symbolSelected: { borderColor: palette.blue, backgroundColor: "#102B46" },
  symbolText: { color: palette.muted, fontSize: 10, fontWeight: "900" },
  symbolTextSelected: { color: palette.blueBright },
  symbolName: { color: palette.subtle, fontSize: 8, marginTop: 3 },
  timeRow: { flexDirection: "row", gap: 7, marginBottom: 20 },
  timeButton: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center", backgroundColor: palette.surfaceRaised },
  timeSelected: { backgroundColor: palette.blueGlow, borderWidth: 1, borderColor: palette.borderStrong },
  timeText: { color: palette.muted, fontSize: 10, fontWeight: "800" },
  timeTextSelected: { color: palette.blueBright },
  settingsNotice: { color: palette.amber, fontSize: 9, lineHeight: 14, marginTop: -12, marginBottom: 16 },
  reportHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  analysisCard: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 14, padding: 14, marginBottom: 9 },
  analysisCardOpen: { borderColor: palette.borderStrong, backgroundColor: "#0D1D30" },
  analysisTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  analysisIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: palette.surfaceBlue, alignItems: "center", justifyContent: "center" },
  analysisNumber: { color: palette.blueBright, fontSize: 9, fontWeight: "900" },
  analysisTitle: { color: palette.text, fontSize: 12, fontWeight: "800", flex: 1 },
  chevron: { color: palette.blueBright, fontSize: 20, fontWeight: "300" },
  analysisHint: { color: palette.subtle, fontSize: 9, marginLeft: 40, marginTop: 5 },
  analysisDetail: { color: palette.muted, fontSize: 11, lineHeight: 18, marginTop: 12, marginLeft: 40 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 14 },
  disclaimer: { color: palette.subtle, fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 18 },
});
