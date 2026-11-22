import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette } from "../src/lib/theme";
import { BrandHeader } from "../src/components/BrandHeader";
import { AmbientBackground } from "../src/components/AmbientBackground";
import { supabase } from "../src/lib/supabase";
import { buildFundamentalOutlook, fetchUsdEconomicCalendar, getEventGroup, getSeriesKey, type CalendarResponse, type EconomicEvent, type HistoricalEvent } from "../src/lib/fundamental-news";

type ViewMode = "upcoming" | "released";

const formatSast = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not confirmed";
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(date) + " SAST";
};
const directionLabel = (direction: string) => direction === "bullish" ? "USD may strengthen" : direction === "bearish" ? "USD may weaken" : direction === "neutral" ? "No clear direction" : "Not enough data";
const directionColor = (direction: string) => direction === "bullish" ? palette.green : direction === "bearish" ? palette.red : palette.amber;
const goldMeaning = (direction: string) => direction === "bullish" ? "Gold may face downward pressure if the market reacts this way." : direction === "bearish" ? "Gold may get support if the market reacts this way." : direction === "neutral" ? "These events give no clear direction for Gold." : "There is not enough information to suggest a Gold direction.";

export default function EventsScreen() {
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [history, setHistory] = useState<HistoricalEvent[]>([]);
  const [mode, setMode] = useState<ViewMode>("upcoming");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [historyNote, setHistoryNote] = useState("");

  const refresh = useCallback(async () => {
    try {
      const calendarPromise = fetchUsdEconomicCalendar();
      const historyPromise = supabase.functions.invoke("mopsentry-fundamental-history");
      const [calendarResult, historyResult] = await Promise.all([calendarPromise, historyPromise]);
      setCalendar(calendarResult);
      if (!historyResult.error && Array.isArray(historyResult.data?.events)) {
        setHistory(historyResult.data.events as HistoricalEvent[]);
        setHistoryNote("");
      } else {
        const fallback = await supabase.from("fundamental_event_history")
          .select("event_id,series_key,title,event_time,period,previous_value,forecast_value,actual_value,last_seen_at")
          .eq("currency", "USD").order("event_time", { ascending: false }).limit(300);
        if (fallback.error) throw fallback.error;
        setHistory((fallback.data ?? []) as HistoricalEvent[]);
        setHistoryNote("Past release history is using the saved event archive.");
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The economic calendar is unavailable.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const allEvents = useMemo(() => (calendar?.events ?? [])
    .filter(event => event.currency === "USD" && event.impact === "high")
    .sort((a, b) => a.ts - b.ts), [calendar]);
  const upcoming = allEvents.filter(event => event.ts * 1000 > Date.now());
  const released: EconomicEvent[] = history
    .filter(item => item.actual_value?.trim() && item.actual_value !== "—" && new Date(item.event_time).getTime() <= Date.now())
    .map(item => ({
      id: item.event_id, ts: Math.floor(new Date(item.event_time).getTime() / 1000), time: item.event_time,
      currency: "USD", impact: "high", title: item.title, previous: item.previous_value || "",
      forecast: item.forecast_value || "", actual: item.actual_value, status: "released",
      ...(item.period == null ? {} : { period: item.period }),
    })).sort((a, b) => b.ts - a.ts);
  const visible = mode === "upcoming" ? upcoming : released;
  const outlook = buildFundamentalOutlook(visible, history);
  const groups = useMemo(() => {
    const map = new Map<string, EconomicEvent[]>();
    for (const event of visible) {
      const label = getEventGroup(event.title);
      const list = map.get(label) ?? [];
      list.push(event);
      map.set(label, list);
    }
    return [...map.entries()].sort((a, b) => (a[1][0]?.ts ?? 0) - (b[1][0]?.ts ?? 0));
  }, [visible]);
  const activeItems = selectedGroup ? groups.find(([label]) => label === selectedGroup)?.[1] ?? [] : [];
  const activeOutlook = selectedGroup ? buildFundamentalOutlook(activeItems, history) : null;
  const lastUpdated = calendar?.generated_at ? formatSast(calendar.generated_at) : "Update time unavailable";

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientBackground />
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} tintColor={palette.blue} onRefresh={() => { setRefreshing(true); void refresh(); }} />} contentContainerStyle={styles.content}>
        <BrandHeader />
        <Text style={styles.eyebrow}>MOPSENTRY · ECONOMIC CALENDAR</Text>
        <View style={styles.headingRow}>
          <View><Text style={styles.title}>Events</Text><Text style={styles.subtitle}>High-impact USD releases · South African time</Text></View>
          <View style={styles.countPill}><Text style={styles.count}>{upcoming.length}</Text><Text style={styles.countLabel}>UPCOMING</Text></View>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>ⓘ Educational market commentary</Text>
          <Text style={styles.disclaimerText}>Bias is estimated from calendar figures and available history. It is not a prediction, guarantee or trade recommendation. Verify official releases and manage your own risk.</Text>
        </View>

        <View style={styles.modeRow}>
          <Pressable onPress={() => { setMode("upcoming"); setSelectedGroup(null); }} style={[styles.modeButton, mode === "upcoming" && styles.modeActive]}><Text style={[styles.modeText, mode === "upcoming" && styles.modeTextActive]}>Upcoming · {upcoming.length}</Text></Pressable>
          <Pressable onPress={() => { setMode("released"); setSelectedGroup(null); }} style={[styles.modeButton, mode === "released" && styles.modeActive]}><Text style={[styles.modeText, mode === "released" && styles.modeTextActive]}>Released · {released.length}</Text></Pressable>
        </View>

        {loading ? <View style={styles.loading}><ActivityIndicator color={palette.blue}/><Text style={styles.muted}>Loading economic events…</Text></View> : error && !calendar ? <View style={styles.empty}><Text style={styles.emptyTitle}>Events could not load</Text><Text style={styles.emptyText}>{error}</Text><Pressable onPress={() => { setRefreshing(true); void refresh(); }} style={styles.retry}><Text style={styles.retryText}>TRY AGAIN</Text></Pressable></View> : (
          <>
            {!selectedGroup ? <>
              <View style={styles.outlookCard}>
                <View style={styles.outlookTop}><View style={{ flex: 1 }}><Text style={styles.sectionMeta}>OVERALL USD OUTLOOK</Text><Text style={[styles.outlookTitle, { color: directionColor(outlook.direction) }]}>{directionLabel(outlook.direction)}</Text></View><View style={styles.scorePill}><Text style={styles.score}>{outlook.scoredCount}</Text><Text style={styles.scoreLabel}>ANALYSED</Text></View></View>
                <Text style={styles.outlookText}>{goldMeaning(outlook.direction)}</Text>
                {outlook.direction !== "unavailable" ? <View style={styles.biasRow}><View style={styles.biasCell}><Text style={styles.biasLabel}>USD BIAS</Text><Text style={[styles.biasValue, { color: directionColor(outlook.direction) }]}>{outlook.direction === "bullish" ? "BUY USD" : outlook.direction === "bearish" ? "SELL USD" : "WAIT"}</Text></View><View style={styles.biasCell}><Text style={styles.biasLabel}>GOLD BIAS</Text><Text style={[styles.biasValue, { color: directionColor(outlook.goldBias) }]}>{outlook.goldBias === "bullish" ? "BUY XAUUSD" : outlook.goldBias === "bearish" ? "SELL XAUUSD" : "WAIT"}</Text></View></View> : null}
              </View>
              <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{mode === "upcoming" ? "Upcoming economic calendar" : "Released events"}</Text><Text style={styles.sectionMeta}>HIGH IMPACT · USD</Text></View>
              {groups.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>{mode === "upcoming" ? "No upcoming high-impact USD events" : "No released events with actual figures"}</Text><Text style={styles.emptyText}>{mode === "upcoming" ? "The calendar has not returned any upcoming events for this period." : "Past releases will appear here once actual figures have been collected."}</Text></View> : groups.map(([label, items]) => {
                const groupOutlook = buildFundamentalOutlook(items, history);
                const first = items[0];
                return <Pressable key={label} onPress={() => setSelectedGroup(label)} style={styles.groupCard}>
                  <View style={styles.groupTop}><Text style={styles.groupTitle}>{label}</Text><Text style={[styles.groupDirection, { color: directionColor(groupOutlook.direction) }]}>{directionLabel(groupOutlook.direction)}</Text></View>
                  <Text style={styles.groupDescription}>{items.length === 1 ? items[0]?.title : `${items.length} related figures combined`}</Text>
                  <View style={styles.groupBottom}><Text style={styles.groupTime}>{first ? formatSast(first.time) : ""}</Text><Text style={styles.openGroup}>VIEW SIGNAL  ›</Text></View>
                </Pressable>;
              })}
              <Text style={styles.source}>Source: ShowMyTrades economic calendar · Updated {lastUpdated}</Text>
            </> : <>
              <Pressable onPress={() => setSelectedGroup(null)} style={styles.back}><Text style={styles.backText}>‹  ALL EVENT GROUPS</Text></Pressable>
              <Text style={styles.detailTitle}>{selectedGroup}</Text>
              <Text style={styles.muted}>{activeItems.length} related figures · Times shown in SAST</Text>
              {activeOutlook ? <View style={styles.outlookCard}><Text style={styles.sectionMeta}>GROUP USD OUTLOOK</Text><Text style={[styles.outlookTitle, { color: directionColor(activeOutlook.direction) }]}>{directionLabel(activeOutlook.direction)}</Text><View style={styles.biasRow}><View style={styles.biasCell}><Text style={styles.biasLabel}>USD BIAS</Text><Text style={[styles.biasValue, { color: directionColor(activeOutlook.direction) }]}>{activeOutlook.direction === "bullish" ? "BUY USD" : activeOutlook.direction === "bearish" ? "SELL USD" : "WAIT"}</Text></View><View style={styles.biasCell}><Text style={styles.biasLabel}>GOLD BIAS</Text><Text style={[styles.biasValue, { color: directionColor(activeOutlook.goldBias) }]}>{activeOutlook.goldBias === "bullish" ? "BUY XAUUSD" : activeOutlook.goldBias === "bearish" ? "SELL XAUUSD" : "WAIT"}</Text></View></View><Text style={styles.outlookText}>News direction only. Confirm with price action.</Text></View> : null}
              {activeItems.map(event => {
                const seriesKey = getSeriesKey(event.id);
                const past = seriesKey ? history.filter(item => item.series_key === seriesKey && item.actual_value && new Date(item.event_time).getTime() < event.ts * 1000).slice(0, 4) : [];
                return <View key={event.id ?? event.ts + event.title} style={styles.eventCard}>
                  <View style={styles.eventTop}><Text style={styles.impact}>HIGH IMPACT</Text>{mode === "released" ? <Text style={styles.releasedTag}>RELEASED</Text> : null}</View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>{formatSast(event.time)}</Text>
                  <View style={styles.values}><View style={styles.valueCell}><Text style={styles.valueLabel}>PREVIOUS</Text><Text style={styles.value}>{event.previous || "—"}</Text></View><View style={styles.valueCell}><Text style={styles.valueLabel}>EXPECTED</Text><Text style={styles.value}>{event.forecast || "—"}</Text></View><View style={styles.valueCell}><Text style={styles.valueLabel}>ACTUAL</Text><Text style={styles.value}>{event.actual?.trim() && event.actual !== "—" ? event.actual : "Not released"}</Text></View></View>
                  {mode === "released" ? <Text style={styles.assessment}>Post-news assessment compares the actual result with the forecast. Wait for price action to confirm the market reaction.</Text> : null}
                  <View style={styles.pastBox}><Text style={styles.pastTitle}>PAST RESULTS</Text>{past.length ? past.map(item => <View key={item.event_id} style={styles.pastRow}><Text style={styles.pastText}>{item.period || formatSast(item.event_time)}</Text><Text style={styles.pastText}>Actual {item.actual_value}</Text></View>) : <Text style={styles.pastText}>{historyNote || "Past results will appear as MOPSENTRY collects them."}</Text>}</View>
                </View>;
              })}
            </>}
          </>
        )}
        {error && calendar ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.footer}>News direction only. The actual result and market reaction can differ. This feature does not place trades.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { padding: 18, paddingBottom: 40 },
  eyebrow: { color: palette.blueBright, fontSize: 9, fontWeight: "900", letterSpacing: 1.8 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 18, gap: 10 },
  title: { color: palette.text, fontSize: 28, fontWeight: "900" },
  subtitle: { color: palette.muted, fontSize: 10, marginTop: 5 },
  countPill: { alignItems: "center", backgroundColor: palette.surfaceBlue, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  count: { color: palette.blueBright, fontSize: 18, fontWeight: "900" },
  countLabel: { color: palette.muted, fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  disclaimer: { borderWidth: 1, borderColor: "#705A2A", backgroundColor: "#2A2417", borderRadius: 13, padding: 12, marginBottom: 13 },
  disclaimerTitle: { color: "#F3C46D", fontSize: 10, fontWeight: "900" },
  disclaimerText: { color: palette.muted, fontSize: 9, lineHeight: 15, marginTop: 5 },
  modeRow: { flexDirection: "row", gap: 5, backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.border, borderRadius: 13, padding: 4, marginBottom: 17 },
  modeButton: { flex: 1, borderRadius: 9, paddingVertical: 10, alignItems: "center" },
  modeActive: { backgroundColor: palette.blue },
  modeText: { color: palette.muted, fontSize: 10, fontWeight: "800" },
  modeTextActive: { color: "#071321" },
  loading: { alignItems: "center", gap: 9, padding: 28 },
  muted: { color: palette.muted, fontSize: 10, lineHeight: 16 },
  empty: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 15, padding: 17 },
  emptyTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
  emptyText: { color: palette.muted, fontSize: 10, lineHeight: 16, marginTop: 6 },
  retry: { alignSelf: "flex-start", borderWidth: 1, borderColor: palette.borderStrong, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9, marginTop: 13 },
  retryText: { color: palette.blueBright, fontSize: 9, fontWeight: "900" },
  outlookCard: { backgroundColor: "#0B1A2B", borderWidth: 1, borderColor: palette.borderStrong, borderRadius: 16, padding: 15, marginBottom: 18 },
  outlookTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionMeta: { color: palette.muted, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  outlookTitle: { fontSize: 15, fontWeight: "900", marginTop: 6 },
  scorePill: { alignItems: "center", borderRadius: 10, backgroundColor: palette.surfaceRaised, paddingHorizontal: 10, paddingVertical: 7 },
  score: { color: palette.text, fontSize: 16, fontWeight: "900" },
  scoreLabel: { color: palette.subtle, fontSize: 7, fontWeight: "900" },
  outlookText: { color: palette.muted, fontSize: 10, lineHeight: 16, marginTop: 8 },
  biasRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  biasCell: { flex: 1, backgroundColor: palette.surfaceRaised, borderRadius: 11, padding: 10 },
  biasLabel: { color: palette.subtle, fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  biasValue: { fontSize: 11, fontWeight: "900", marginTop: 5 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
  groupCard: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 15, padding: 14, marginBottom: 9 },
  groupTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  groupTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
  groupDirection: { fontSize: 8, fontWeight: "900", textAlign: "right", flexShrink: 1 },
  groupDescription: { color: palette.muted, fontSize: 10, marginTop: 6 },
  groupBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 11 },
  groupTime: { color: palette.subtle, fontSize: 8, flex: 1 },
  openGroup: { color: palette.blueBright, fontSize: 8, fontWeight: "900" },
  source: { color: palette.subtle, fontSize: 8, textAlign: "center", marginTop: 12 },
  back: { alignSelf: "flex-start", paddingVertical: 10, marginBottom: 10 },
  backText: { color: palette.blueBright, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  detailTitle: { color: palette.text, fontSize: 21, fontWeight: "900", marginBottom: 4 },
  eventCard: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 15, padding: 14, marginTop: 10 },
  eventTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  impact: { color: palette.red, backgroundColor: "#321D2A", overflow: "hidden", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4, fontSize: 8, fontWeight: "900" },
  releasedTag: { color: palette.green, backgroundColor: "#10342C", overflow: "hidden", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4, fontSize: 8, fontWeight: "900" },
  eventTitle: { color: palette.text, fontSize: 13, fontWeight: "800", lineHeight: 19, marginTop: 10 },
  eventTime: { color: palette.muted, fontSize: 9, marginTop: 5 },
  values: { flexDirection: "row", gap: 7, marginTop: 13 },
  valueCell: { flex: 1, backgroundColor: palette.surfaceRaised, borderRadius: 9, padding: 9 },
  valueLabel: { color: palette.subtle, fontSize: 7, fontWeight: "900" },
  value: { color: palette.text, fontSize: 10, fontWeight: "800", marginTop: 5 },
  assessment: { color: palette.muted, backgroundColor: palette.surfaceBlue, borderRadius: 9, padding: 10, fontSize: 9, lineHeight: 15, marginTop: 11 },
  pastBox: { borderTopWidth: 1, borderTopColor: palette.border, marginTop: 12, paddingTop: 10 },
  pastTitle: { color: palette.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.7, marginBottom: 6 },
  pastRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  pastText: { color: palette.muted, fontSize: 9 },
  error: { color: palette.red, fontSize: 10, marginTop: 12 },
  footer: { color: palette.subtle, fontSize: 8, lineHeight: 14, textAlign: "center", marginTop: 18 },
});
