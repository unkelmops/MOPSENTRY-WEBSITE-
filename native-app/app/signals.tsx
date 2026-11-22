import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette } from "../src/lib/theme";
import { BrandHeader } from "../src/components/BrandHeader";
import { AmbientBackground } from "../src/components/AmbientBackground";
import { buildFundamentalOutlook, fetchUsdEconomicCalendar, type EconomicEvent, type HistoricalEvent } from "../src/lib/fundamental-news";

type Tab = "news" | "trades" | "orders";
type LiveTrade = { ticket?: number; symbol: string; side: string; lots: number; open_price: number; current_price?: number };
type PendingOrder = { ticket: number; symbol: string; type: string; volume: number; entry_price: number; sl?: number; tp?: number; expiration?: string };
type TradingSnapshot = { open_trades: unknown; pending_orders: unknown };

const money = (value: number | undefined) => value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
const biasLabel = (direction: string) => direction === "bullish" ? "USD may strengthen" : direction === "bearish" ? "USD may weaken" : direction === "neutral" ? "No clear direction" : "Not enough data";
const biasColor = (direction: string) => direction === "bullish" ? palette.green : direction === "bearish" ? palette.red : palette.amber;
const formatSast = (value: string) => new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) + " SAST";

export default function SignalsScreen() {
  const [tab, setTab] = useState<Tab>("news");
  const [account, setAccount] = useState<TradingSnapshot | null>(null);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [history, setHistory] = useState<HistoricalEvent[]>([]);
  const [accountLoading, setAccountLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [newsError, setNewsError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const live = Array.isArray(account?.open_trades) ? account.open_trades as LiveTrade[] : [];
  const orders = Array.isArray(account?.pending_orders) ? account.pending_orders as PendingOrder[] : [];

  const refreshAccount = useCallback(async () => {
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) { router.replace("/"); return; }
      const { data, error } = await supabase.from("trading_accounts")
        .select("open_trades,pending_orders").eq("user_id", auth.user.id).maybeSingle();
      if (error) throw error;
      setAccount(data as TradingSnapshot | null);
      setAccountError("");
      setUpdatedAt(new Date());
    } catch (e) {
      setAccountError(e instanceof Error ? e.message : "Live account data is unavailable.");
    } finally { setAccountLoading(false); setRefreshing(false); }
  }, []);

  const refreshNews = useCallback(async () => {
    try {
      const [calendarResult, historyResult] = await Promise.all([
        fetchUsdEconomicCalendar(),
        supabase.functions.invoke("mopsentry-fundamental-history"),
      ]);
      setEvents(calendarResult.events.filter(event => event.currency === "USD" && event.impact === "high").sort((a, b) => a.ts - b.ts));
      if (!historyResult.error && Array.isArray(historyResult.data?.events)) {
        setHistory(historyResult.data.events as HistoricalEvent[]);
      } else {
        const fallback = await supabase.from("fundamental_event_history")
          .select("event_id,series_key,title,event_time,period,previous_value,forecast_value,actual_value,last_seen_at")
          .eq("currency", "USD").order("event_time", { ascending: false }).limit(300);
        if (fallback.error) throw fallback.error;
        setHistory((fallback.data ?? []) as HistoricalEvent[]);
      }
      setNewsError("");
    } catch (e) {
      setNewsError(e instanceof Error ? e.message : "Economic news is unavailable.");
    } finally { setNewsLoading(false); }
  }, []);

  useEffect(() => {
    void refreshAccount();
    const timer = setInterval(() => void refreshAccount(), 10_000);
    return () => clearInterval(timer);
  }, [refreshAccount]);

  useEffect(() => {
    void refreshNews();
    const timer = setInterval(() => void refreshNews(), 60_000);
    return () => clearInterval(timer);
  }, [refreshNews]);

  const upcoming = useMemo(() => events.filter(event => event.ts * 1000 > Date.now()), [events]);
  const outlook = useMemo(() => buildFundamentalOutlook(upcoming, history), [upcoming, history]);

  const refreshAll = () => {
    setRefreshing(true);
    void Promise.all([refreshAccount(), refreshNews()]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientBackground />
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} tintColor={palette.blue} onRefresh={refreshAll} />} contentContainerStyle={styles.content}>
        <BrandHeader />
        <Text style={styles.eyebrow}>MOPSENTRY · INTELLIGENCE</Text>
        <View style={styles.headingRow}><View><Text style={styles.title}>Signals</Text><Text style={styles.subtitle}>News, live trades and pending orders</Text></View><View style={styles.statusPill}><View style={styles.liveDot}/><Text style={styles.statusText}>MONITOR</Text></View></View>

        <View style={styles.summaryRow}>
          <Pressable onPress={() => setTab("trades")} style={styles.summaryCard}><Text style={styles.summaryValue}>{live.length}</Text><Text style={styles.summaryLabel}>LIVE TRADES</Text></Pressable>
          <Pressable onPress={() => setTab("orders")} style={styles.summaryCard}><Text style={styles.summaryValue}>{orders.length}</Text><Text style={styles.summaryLabel}>PENDING ORDERS</Text></Pressable>
          <Pressable onPress={() => setTab("news")} style={styles.summaryCard}><Text style={styles.summaryValue}>{upcoming.length}</Text><Text style={styles.summaryLabel}>USD EVENTS</Text></Pressable>
        </View>

        <View style={styles.tabs}>
          {([{ id: "news", label: "News" }, { id: "trades", label: "Live trades" }, { id: "orders", label: "Pending" }] as const).map(item => (
            <Pressable key={item.id} onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && styles.tabActive]}>
              <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}{item.id === "trades" ? " " + live.length : item.id === "orders" ? " " + orders.length : ""}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "news" ? (
          <View>
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>USD news outlook</Text><Text style={styles.sectionMeta}>HIGH IMPACT</Text></View>
            {newsLoading ? <ActivityIndicator color={palette.blue} style={styles.spinner}/> : newsError && events.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>News signals could not load</Text><Text style={styles.body}>{newsError}</Text></View> : (
              <View style={styles.outlookCard}>
                <Text style={styles.cardLabel}>OVERALL USD BIAS</Text>
                <Text style={[styles.outlookTitle, { color: biasColor(outlook.direction) }]}>{biasLabel(outlook.direction)}</Text>
                <View style={styles.biasRow}>
                  <View style={styles.biasCell}><Text style={styles.biasLabel}>USD</Text><Text style={[styles.biasValue, { color: biasColor(outlook.direction) }]}>{outlook.direction === "bullish" ? "BUY USD" : outlook.direction === "bearish" ? "SELL USD" : "WAIT"}</Text></View>
                  <View style={styles.biasCell}><Text style={styles.biasLabel}>GOLD</Text><Text style={[styles.biasValue, { color: biasColor(outlook.goldBias) }]}>{outlook.goldBias === "bullish" ? "BUY XAUUSD" : outlook.goldBias === "bearish" ? "SELL XAUUSD" : "WAIT"}</Text></View>
                </View>
                <Text style={styles.body}>{outlook.scoredCount} events analysed · {outlook.unavailableCount} without enough usable figures.</Text>
                <Text style={styles.disclaimer}>News direction only. Confirm with price action. This is not a trade entry or guarantee.</Text>
              </View>
            )}
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Next high-impact events</Text><Text style={styles.sectionMeta}>SAST</Text></View>
            {upcoming.slice(0, 5).map(event => <View key={event.id ?? event.ts + event.title} style={styles.eventCard}>
              <View style={styles.eventTop}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.impact}>HIGH</Text></View>
              <Text style={styles.eventTime}>{formatSast(event.time)}</Text>
              <View style={styles.values}><Text style={styles.value}>Previous  {event.previous || "—"}</Text><Text style={styles.value}>Forecast  {event.forecast || "—"}</Text></View>
            </View>)}
            {!newsLoading && upcoming.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No upcoming high-impact USD events</Text><Text style={styles.body}>Open Events to review released history and the full calendar view.</Text></View> : null}
            <Pressable onPress={() => router.push("/events")} style={styles.openEvents}><Text style={styles.openEventsText}>OPEN FULL EVENTS CALENDAR  ›</Text></Pressable>
          </View>
        ) : tab === "trades" ? (
          <View>
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Live trades</Text><Text style={styles.sectionMeta}>{live.length} OPEN</Text></View>
            {accountLoading ? <ActivityIndicator color={palette.blue} style={styles.spinner}/> : live.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No open trades right now</Text><Text style={styles.body}>When the EA reports an open position, it will appear here.</Text></View> : live.map((trade, index) => {
              const buy = trade.side !== "SELL";
              return <View key={trade.ticket ?? index} style={styles.tradeCard}>
                <View style={styles.eventTop}><Text style={styles.tradeTitle}>{trade.symbol} · {buy ? "BUY" : "SELL"}</Text><Text style={styles.tradeLots}>{money(trade.lots)} lots</Text></View>
                <View style={styles.tradeMetrics}><View style={styles.metric}><Text style={styles.valueLabel}>ENTRY</Text><Text style={styles.metricValue}>{money(trade.open_price)}</Text></View><View style={styles.metric}><Text style={styles.valueLabel}>CURRENT</Text><Text style={styles.metricValue}>{money(trade.current_price)}</Text></View></View>
              </View>;
            })}
          </View>
        ) : (
          <View>
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Pending orders</Text><Text style={styles.sectionMeta}>{orders.length} WAITING</Text></View>
            {accountLoading ? <ActivityIndicator color={palette.blue} style={styles.spinner}/> : orders.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No pending orders</Text><Text style={styles.body}>Pending orders reported by the EA will appear here.</Text></View> : orders.map(order => <View key={order.ticket} style={styles.tradeCard}>
              <Text style={styles.tradeTitle}>{order.symbol} · {order.type.replace(/_/g, " ")}</Text>
              <View style={styles.orderMetrics}><View style={styles.metric}><Text style={styles.valueLabel}>ENTRY</Text><Text style={styles.metricValue}>{money(order.entry_price)}</Text></View><View style={styles.metric}><Text style={styles.valueLabel}>STOP LOSS</Text><Text style={styles.metricValue}>{money(order.sl)}</Text></View><View style={styles.metric}><Text style={styles.valueLabel}>TAKE PROFIT</Text><Text style={styles.metricValue}>{money(order.tp)}</Text></View></View>
            </View>)}
          </View>
        )}

        {accountError ? <Text style={styles.error}>{accountError}</Text> : null}
        <Text style={styles.refreshText}>Account data refreshes every 10 seconds{updatedAt ? " · Updated " + updatedAt.toLocaleTimeString() : ""}</Text>
        <Text style={styles.footer}>News signals are possibilities, not guarantees. Live trade and pending-order information is displayed as reported by the connected EA. This screen does not place trades.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { padding: 18, paddingBottom: 40 },
  eyebrow: { color: palette.blueBright, fontSize: 9, fontWeight: "900", letterSpacing: 1.8 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7, marginBottom: 16 },
  title: { color: palette.text, fontSize: 28, fontWeight: "900" },
  subtitle: { color: palette.muted, fontSize: 10, marginTop: 5 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: "#1C765E", backgroundColor: "#0C2A29", borderRadius: 18, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.blue },
  statusText: { color: palette.blueBright, fontSize: 8, fontWeight: "900" },
  summaryRow: { flexDirection: "row", gap: 7, marginBottom: 17 },
  summaryCard: { flex: 1, backgroundColor: "#0B1A2B", borderWidth: 1, borderColor: palette.border, borderRadius: 13, padding: 11 },
  summaryValue: { color: palette.text, fontSize: 19, fontWeight: "900" },
  summaryLabel: { color: palette.subtle, fontSize: 6, fontWeight: "900", letterSpacing: 0.5, marginTop: 4 },
  tabs: { flexDirection: "row", gap: 5, backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 4, marginBottom: 18 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 9 },
  tabActive: { backgroundColor: palette.blue },
  tabText: { color: palette.muted, fontSize: 9, fontWeight: "800" },
  tabTextActive: { color: "#061321" },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
  sectionMeta: { color: palette.subtle, fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  spinner: { margin: 24 },
  outlookCard: { backgroundColor: "#0B1A2B", borderWidth: 1, borderColor: palette.borderStrong, borderRadius: 16, padding: 15, marginBottom: 17 },
  cardLabel: { color: palette.muted, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  outlookTitle: { fontSize: 17, fontWeight: "900", marginTop: 7 },
  biasRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  biasCell: { flex: 1, backgroundColor: palette.surfaceRaised, borderRadius: 10, padding: 10 },
  biasLabel: { color: palette.subtle, fontSize: 7, fontWeight: "900" },
  biasValue: { fontSize: 11, fontWeight: "900", marginTop: 5 },
  body: { color: palette.muted, fontSize: 10, lineHeight: 16, marginTop: 7 },
  disclaimer: { color: palette.muted, fontSize: 9, lineHeight: 14, marginTop: 10 },
  eventCard: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 12, marginBottom: 8 },
  eventTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  eventTitle: { color: palette.text, fontSize: 11, fontWeight: "800", flex: 1 },
  impact: { color: palette.red, fontSize: 7, fontWeight: "900" },
  eventTime: { color: palette.muted, fontSize: 8, marginTop: 6 },
  values: { flexDirection: "row", gap: 14, marginTop: 9 },
  value: { color: palette.muted, fontSize: 8 },
  openEvents: { borderWidth: 1, borderColor: palette.borderStrong, backgroundColor: palette.surfaceBlue, borderRadius: 12, padding: 13, alignItems: "center", marginTop: 7 },
  openEventsText: { color: palette.blueBright, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  empty: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 15, padding: 16 },
  emptyTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
  tradeCard: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 14, marginBottom: 9 },
  tradeTitle: { color: palette.text, fontSize: 13, fontWeight: "900" },
  tradeLots: { color: palette.muted, fontSize: 9, fontWeight: "800" },
  tradeMetrics: { flexDirection: "row", gap: 8, marginTop: 12 },
  orderMetrics: { flexDirection: "row", gap: 7, marginTop: 12 },
  metric: { flex: 1, backgroundColor: palette.surfaceRaised, borderRadius: 9, padding: 9 },
  valueLabel: { color: palette.subtle, fontSize: 7, fontWeight: "900" },
  metricValue: { color: palette.text, fontSize: 10, fontWeight: "800", marginTop: 5 },
  error: { color: palette.red, fontSize: 10, marginTop: 10 },
  refreshText: { color: palette.subtle, fontSize: 8, textAlign: "center", marginTop: 10 },
  footer: { color: palette.subtle, fontSize: 8, lineHeight: 14, textAlign: "center", marginTop: 16 },
});
