import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette } from "../src/lib/theme";
import { AmbientBackground } from "../src/components/AmbientBackground";

type Report = {
  id: string; instrument_symbol: string; timeframe: string; status: string; verdict: string | null;
  generated_at: string | null; data_as_of: string | null; report_content: Record<string, unknown>;
};
type Prediction = { id: string; report_id: string; predicted_direction: string; outcome: string | null; created_at: string; evaluation_due_at: string | null };
type Strategy = { id: string; report_id: string; strategy_key: string; direction: string; result_status: string; calculated_at: string };

const stamp = (value: string | null) => value ? new Date(value).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Not supplied";
const verdictColor = (value: string | null) => value === "bullish" ? palette.green : value === "bearish" ? palette.red : palette.amber;

export default function SignalsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const reportResult = await supabase.from("market_reports")
        .select("id,instrument_symbol,timeframe,status,verdict,generated_at,data_as_of,report_content")
        .in("status", ["generated", "partial"]).order("generated_at", { ascending: false }).limit(30);
      if (reportResult.error) throw reportResult.error;
      const rows = (reportResult.data ?? []) as Report[];
      setReports(rows);
      const ids = rows.map(row => row.id);
      if (ids.length) {
        const [predictionResult, strategyResult] = await Promise.all([
          supabase.from("market_predictions").select("id,report_id,predicted_direction,outcome,created_at,evaluation_due_at").in("report_id", ids).order("created_at", { ascending: false }),
          supabase.from("market_strategy_results").select("id,report_id,strategy_key,direction,result_status,calculated_at").in("report_id", ids).order("calculated_at", { ascending: false }),
        ]);
        if (predictionResult.error) throw predictionResult.error;
        if (strategyResult.error) throw strategyResult.error;
        setPredictions((predictionResult.data ?? []) as Prediction[]);
        setStrategies((strategyResult.data ?? []) as Strategy[]);
      } else { setPredictions([]); setStrategies([]); }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signals are temporarily unavailable.");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 30_000); return () => clearInterval(timer); }, [refresh]);

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientBackground />
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} tintColor={palette.blue} onRefresh={() => { setRefreshing(true); void refresh(); }} />} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>MOPSENTRY · MARKET INTELLIGENCE</Text>
        <Text style={styles.title}>Signals</Text>
        <Text style={styles.subtitle}>Confirmed report outputs and recorded prediction history</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summary}><Text style={styles.summaryValue}>{reports.length}</Text><Text style={styles.summaryLabel}>REPORTS</Text></View>
          <View style={styles.summary}><Text style={styles.summaryValue}>{predictions.length}</Text><Text style={styles.summaryLabel}>PREDICTIONS</Text></View>
          <View style={styles.summary}><Text style={styles.summaryValue}>{strategies.length}</Text><Text style={styles.summaryLabel}>STRATEGIES</Text></View>
        </View>
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Latest market reports</Text><Text style={styles.sectionMeta}>XAUUSD · US30 · NAS100</Text></View>
        {loading ? <ActivityIndicator color={palette.blue} style={styles.spinner} /> : reports.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>◎</Text></View>
            <Text style={styles.emptyTitle}>No confirmed reports yet</Text>
            <Text style={styles.emptyCopy}>When the report engine saves a generated or partial report, its verified verdict, strategy results and prediction history will appear here. Nothing is generated or guessed by this screen.</Text>
          </View>
        ) : reports.map(report => {
          const open = expanded === report.id;
          const reportPredictions = predictions.filter(item => item.report_id === report.id);
          const reportStrategies = strategies.filter(item => item.report_id === report.id);
          return (
            <Pressable key={report.id} onPress={() => setExpanded(open ? null : report.id)} style={styles.reportCard}>
              <View style={styles.reportTop}><View><Text style={styles.symbol}>{report.instrument_symbol}</Text><Text style={styles.timeframe}>{report.timeframe} · {stamp(report.generated_at)}</Text></View><View style={[styles.verdictPill, { borderColor: verdictColor(report.verdict) }]}><Text style={[styles.verdict, { color: verdictColor(report.verdict) }]}>{(report.verdict || report.status).replaceAll("_", " ").toUpperCase()}</Text></View></View>
              <Text style={styles.asOf}>DATA AS OF {stamp(report.data_as_of)}</Text>
              {open ? <>
                <View style={styles.divider}/>
                <Text style={styles.detailHeading}>Strategy results</Text>
                {reportStrategies.length ? reportStrategies.map(item => <View key={item.id} style={styles.detailRow}><Text style={styles.detailName}>{item.strategy_key.replaceAll("_", " ")}</Text><Text style={styles.detailValue}>{item.direction.toUpperCase()} · {item.result_status.replaceAll("_", " ").toUpperCase()}</Text></View>) : <Text style={styles.emptyCopy}>No strategy results recorded for this report.</Text>}
                <Text style={styles.detailHeading}>Prediction history</Text>
                {reportPredictions.length ? reportPredictions.map(item => <View key={item.id} style={styles.detailRow}><Text style={styles.detailName}>{item.predicted_direction.toUpperCase()}</Text><Text style={styles.detailValue}>{item.outcome ? item.outcome.toUpperCase() : "PENDING EVALUATION"}</Text></View>) : <Text style={styles.emptyCopy}>No prediction record attached to this report.</Text>}
              </> : <Text style={styles.tapHint}>Tap to view recorded strategy results and predictions</Text>}
            </Pressable>
          );
        })}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.footer}>Signals are shown only when a report or prediction has been saved by the backend. No trading commands are sent from this screen.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { padding: 18, paddingBottom: 40 },
  eyebrow: { color: palette.blueBright, fontSize: 9, fontWeight: "900", letterSpacing: 1.8, marginTop: 10 },
  title: { color: palette.text, fontSize: 29, fontWeight: "900", marginTop: 7 },
  subtitle: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  summaryRow: { flexDirection: "row", gap: 8, marginTop: 20, marginBottom: 25 },
  summary: { flex: 1, backgroundColor: "#0B1A2B", borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 12 },
  summaryValue: { color: palette.text, fontSize: 21, fontWeight: "900" },
  summaryLabel: { color: palette.subtle, fontSize: 7, fontWeight: "900", letterSpacing: 0.9, marginTop: 4 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
  sectionMeta: { color: palette.subtle, fontSize: 7, fontWeight: "900" },
  spinner: { margin: 28 },
  empty: { alignItems: "center", backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 18, padding: 23 },
  emptyMark: { width: 48, height: 48, borderRadius: 16, backgroundColor: palette.surfaceBlue, borderWidth: 1, borderColor: palette.borderStrong, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyMarkText: { color: palette.blueBright, fontSize: 25 },
  emptyTitle: { color: palette.text, fontSize: 15, fontWeight: "900", textAlign: "center" },
  emptyCopy: { color: palette.muted, fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 8 },
  reportCard: { backgroundColor: "#0B1929", borderWidth: 1, borderColor: palette.border, borderRadius: 16, padding: 15, marginBottom: 10 },
  reportTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  symbol: { color: palette.text, fontSize: 17, fontWeight: "900" },
  timeframe: { color: palette.muted, fontSize: 9, marginTop: 4 },
  verdictPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6 },
  verdict: { fontSize: 8, fontWeight: "900" },
  asOf: { color: palette.subtle, fontSize: 8, marginTop: 13 },
  tapHint: { color: palette.blueBright, fontSize: 9, marginTop: 12 },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: 13 },
  detailHeading: { color: palette.blueBright, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: 8, marginBottom: 7 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border },
  detailName: { color: palette.text, fontSize: 10, flex: 1 },
  detailValue: { color: palette.muted, fontSize: 9, textAlign: "right", flex: 1 },
  error: { color: palette.red, fontSize: 11, marginVertical: 12 },
  footer: { color: palette.subtle, fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 18 },
});
