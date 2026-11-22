import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette } from "../src/lib/theme";
import { BrandHeader } from "../src/components/BrandHeader";
import { AmbientBackground } from "../src/components/AmbientBackground";

type EventRow = {
  event_id: string; title: string; currency: string; impact: string; event_time: string;
  period: string | null; previous_value: string; forecast_value: string; actual_value: string;
  event_status: string; source: string;
};
type NewsRow = { id: string; title: string; summary: string | null; country: string | null; currency: string | null; impact: string | null; published_at: string | null; event_at: string | null; instrument_symbols: string[]; url: string | null };

const dateLabel = (value: string) => new Date(value).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const impactColor = (value: string | null) => value?.toLowerCase() === "high" ? palette.red : value?.toLowerCase() === "medium" ? palette.amber : palette.blueBright;

export default function EventsScreen() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [eventResult, newsResult] = await Promise.all([
        supabase.from("fundamental_event_history")
          .select("event_id,title,currency,impact,event_time,period,previous_value,forecast_value,actual_value,event_status,source")
          .eq("currency", "USD").gte("event_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).lte("event_time", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()).order("event_time", { ascending: true }).limit(100),
        supabase.from("market_news")
          .select("id,title,summary,country,currency,impact,published_at,event_at,instrument_symbols,url")
          .order("published_at", { ascending: false, nullsFirst: false }).limit(20),
      ]);
      if (eventResult.error) throw eventResult.error;
      if (newsResult.error) throw newsResult.error;
      setEvents((eventResult.data ?? []) as EventRow[]);
      setNews((newsResult.data ?? []) as NewsRow[]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Events are temporarily unavailable.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 60_000); return () => clearInterval(timer); }, [refresh]);
  const visibleEvents = events.filter(item => filter === "all" || new Date(item.event_time).getTime() >= Date.now() - 60 * 60 * 1000);
  const upcomingCount = events.filter(item => new Date(item.event_time).getTime() >= Date.now()).length;

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientBackground />
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} tintColor={palette.blue} onRefresh={() => { setRefreshing(true); void refresh(); }} />} contentContainerStyle={styles.content}>
        <BrandHeader />
        <Text style={styles.eyebrow}>MOPSENTRY · CALENDAR</Text>
        <View style={styles.headingRow}><View><Text style={styles.title}>Events</Text><Text style={styles.subtitle}>USD economic calendar & market headlines</Text></View><View style={styles.countPill}><Text style={styles.count}>{upcomingCount}</Text><Text style={styles.countLabel}>UPCOMING</Text></View></View>
        <View style={styles.filterRow}>
          <Pressable onPress={() => setFilter("upcoming")} style={[styles.filter, filter === "upcoming" && styles.filterActive]}><Text style={[styles.filterText, filter === "upcoming" && styles.filterTextActive]}>Upcoming</Text></Pressable>
          <Pressable onPress={() => setFilter("all")} style={[styles.filter, filter === "all" && styles.filterActive]}><Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>All events</Text></Pressable>
        </View>
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Economic calendar</Text><Text style={styles.sectionMeta}>SOURCE: EVENT HISTORY</Text></View>
        {loading ? <ActivityIndicator color={palette.blue} style={styles.spinner} /> : visibleEvents.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No events to show</Text><Text style={styles.emptyCopy}>Verified calendar events will appear here when they are available.</Text></View> : visibleEvents.map(item => (
          <View key={item.event_id} style={styles.eventCard}>
            <View style={styles.eventTop}><Text style={styles.eventTime}>{dateLabel(item.event_time)}</Text><Text style={[styles.impact, { color: impactColor(item.impact) }]}>{item.impact.toUpperCase()} IMPACT</Text></View>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <View style={styles.metaRow}><Text style={styles.meta}>{item.currency} {item.period ? "· " + item.period : ""}</Text><Text style={styles.status}>{item.event_status.replaceAll("_", " ").toUpperCase()}</Text></View>
            <View style={styles.values}><View style={styles.valueCell}><Text style={styles.valueLabel}>PREVIOUS</Text><Text style={styles.value}>{item.previous_value || "—"}</Text></View><View style={styles.valueCell}><Text style={styles.valueLabel}>FORECAST</Text><Text style={styles.value}>{item.forecast_value || "—"}</Text></View><View style={styles.valueCell}><Text style={styles.valueLabel}>ACTUAL</Text><Text style={styles.value}>{item.actual_value || "—"}</Text></View></View>
          </View>
        ))}
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Market headlines</Text><Text style={styles.sectionMeta}>LATEST SAVED</Text></View>
        {news.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No headlines saved yet</Text><Text style={styles.emptyCopy}>News items will appear here after a verified provider sync.</Text></View> : news.map(item => (
          <View key={item.id} style={styles.newsCard}>
            <View style={styles.eventTop}><Text style={styles.meta}>{item.currency || item.country || "MARKET NEWS"}</Text>{item.impact ? <Text style={[styles.impact, { color: impactColor(item.impact) }]}>{item.impact.toUpperCase()}</Text> : null}</View>
            <Text style={styles.eventTitle}>{item.title}</Text>
            {item.summary ? <Text style={styles.newsSummary} numberOfLines={3}>{item.summary}</Text> : null}
            <Text style={styles.newsDate}>{item.published_at ? dateLabel(item.published_at) : item.event_at ? dateLabel(item.event_at) : "Publication time not supplied"}</Text>
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.footer}>Times are shown in your device's local timezone. Calendar data is displayed as received and is not a trade instruction.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { padding: 18, paddingBottom: 40 },
  eyebrow: { color: palette.blueBright, fontSize: 9, fontWeight: "900", letterSpacing: 1.8, marginTop: 10 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7, marginBottom: 20 },
  title: { color: palette.text, fontSize: 29, fontWeight: "900" },
  subtitle: { color: palette.muted, fontSize: 11, marginTop: 5 },
  countPill: { alignItems: "center", backgroundColor: palette.surfaceBlue, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  count: { color: palette.blueBright, fontSize: 18, fontWeight: "900" },
  countLabel: { color: palette.muted, fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 22 },
  filter: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  filterActive: { backgroundColor: palette.surfaceBlue, borderColor: palette.blue },
  filterText: { color: palette.muted, fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: palette.blueBright },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 11, marginTop: 8 },
  sectionTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
  sectionMeta: { color: palette.subtle, fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  spinner: { margin: 28 },
  eventCard: { backgroundColor: "#0B1929", borderColor: palette.border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  eventTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  eventTime: { color: palette.blueBright, fontSize: 10, fontWeight: "800" },
  impact: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  eventTitle: { color: palette.text, fontSize: 14, fontWeight: "800", lineHeight: 20, marginTop: 9 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 7 },
  meta: { color: palette.muted, fontSize: 9 },
  status: { color: palette.subtle, fontSize: 8, fontWeight: "800" },
  values: { flexDirection: "row", marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: palette.border },
  valueCell: { flex: 1 },
  valueLabel: { color: palette.subtle, fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  value: { color: palette.text, fontSize: 11, fontWeight: "800", marginTop: 5 },
  empty: { padding: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 15, marginBottom: 15 },
  emptyTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
  emptyCopy: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  newsCard: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 15, padding: 14, marginBottom: 9 },
  newsSummary: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
  newsDate: { color: palette.subtle, fontSize: 9, marginTop: 9 },
  error: { color: palette.red, fontSize: 11, marginVertical: 12 },
  footer: { color: palette.subtle, fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 18 },
});
