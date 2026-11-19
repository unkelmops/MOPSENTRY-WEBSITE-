import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette } from "../src/lib/theme";

type Account = {
  status: string;
  broker_server: string | null;
  login: string | null;
  balance: number | null;
  equity: number | null;
  last_heartbeat: string | null;
  open_trades: unknown;
  pending_orders: unknown;
  ea_state: string | null;
  ea_version: string | null;
};

function records(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item));
  if (value && typeof value === "object") return [value as Record<string, unknown>];
  return [];
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function money(value: number | null) {
  return value === null ? "—" : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DataList({ title, value }: { title: string; value: unknown }) {
  const items = records(value);
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.cardLabel}>{title}</Text>
        <Text style={styles.count}>{items.length}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.muted}>No {title.toLowerCase()} reported by the EA.</Text>
      ) : items.map((item, index) => (
        <View key={String(item.ticket ?? item.order ?? item.id ?? index)} style={styles.tradeRow}>
          {Object.entries(item).slice(0, 7).map(([key, val]) => (
            <View key={key} style={styles.tradeField}>
              <Text style={styles.fieldLabel}>{key.replaceAll("_", " ")}</Text>
              <Text style={styles.fieldValue} numberOfLines={2}>{displayValue(val)}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const [email, setEmail] = useState("");
  const [access, setAccess] = useState<boolean | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      router.replace("/");
      return;
    }
    setEmail(auth.user.email ?? "");
    const [entitlement, trading] = await Promise.all([
      supabase.from("app_access_entitlements").select("enabled").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("trading_accounts").select("status,broker_server,login,balance,equity,last_heartbeat,open_trades,pending_orders,ea_state,ea_version").eq("user_id", auth.user.id).maybeSingle(),
    ]);
    if (entitlement.error) throw entitlement.error;
    if (trading.error) throw trading.error;
    setAccess(entitlement.data?.enabled === true);
    setAccount(trading.data as Account | null);
    setUpdatedAt(new Date());
    setError("");
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try { await refresh(); }
      catch (e) { if (mounted) setError(e instanceof Error ? e.message : "Unable to refresh account data."); }
      finally { if (mounted) setLoading(false); }
    };
    void load();
    const timer = setInterval(() => { if (mounted) void load(); }, 5000);
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) router.replace("/");
    });
    return () => { mounted = false; clearInterval(timer); data.subscription.unsubscribe(); };
  }, [refresh]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const heartbeat = account?.last_heartbeat ? new Date(account.last_heartbeat).getTime() : 0;
  const connected = account?.status === "connected" && Number.isFinite(heartbeat) && Date.now() - heartbeat >= 0 && Date.now() - heartbeat < 30000;

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color=palette.blue /><Text style={styles.muted}>Loading your secure session…</Text></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>MOPSENTRY NATIVE</Text><Text style={styles.title}>Overview</Text></View>
          <View style={[styles.statusPill, connected ? styles.connected : styles.disconnected]}><View style={[styles.dot, connected ? styles.dotOn : styles.dotOff]} /><Text style={styles.statusText}>{connected ? "MT5 CONNECTED" : "NOT CONNECTED"}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ACCOUNT</Text>
          <Text style={styles.email}>{email || "Signed in"}</Text>
          {account ? <>
            <Text style={styles.description}>{account.broker_server || "Broker not reported"} · Login {account.login || "—"}</Text>
            <View style={styles.metrics}>
              <View style={styles.metric}><Text style={styles.fieldLabel}>BALANCE</Text><Text style={styles.metricValue}>{money(account.balance)}</Text></View>
              <View style={styles.metric}><Text style={styles.fieldLabel}>EQUITY</Text><Text style={styles.metricValue}>{money(account.equity)}</Text></View>
            </View>
            <Text style={styles.description}>EA state: {account.ea_state || "Not reported"} · Version: {account.ea_version || "—"}</Text>
            <Text style={styles.description}>Last EA heartbeat: {account.last_heartbeat ? new Date(account.last_heartbeat).toLocaleString() : "Not received"}</Text>
          </> : <Text style={styles.description}>No MT5 account has been linked to this user yet. Account details will appear after the EA connects.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>APP ACCESS</Text>
          <Text style={styles.moduleTitle}>{access === true ? "Enabled" : access === false ? "Not enabled" : "Checking…"}</Text>
          <Text style={styles.description}>App Access is checked against your signed-in account. Starting the robot remains protected by the server-side access and fresh-heartbeat checks.</Text>
        </View>

        <Pressable onPress={() => router.push("/controls")} style={styles.controlsLink}>
          <View><Text style={styles.controlsTitle}>Robot controls</Text><Text style={styles.description}>Start, stop and manage open positions</Text></View>
          <Text style={styles.controlsArrow}>›</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Broker connections" onPress={() => router.push("/broker-connections")} style={styles.settingsLink}>
          <View style={{ flex: 1 }}><Text style={styles.controlsTitle}>Broker connections</Text><Text style={styles.description}>Choose a supported broker connection method</Text></View>
          <Text style={styles.controlsArrow}>›</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/settings")} style={styles.settingsLink}>
          <View><Text style={styles.controlsTitle}>Account & settings</Text><Text style={styles.description}>Account access and security information</Text></View>
          <Text style={styles.controlsArrow}>›</Text>
        </Pressable>

        {account ? <>
          <DataList title="Open positions" value={account.open_trades} />
          <DataList title="Pending orders" value={account.pending_orders} />
        </> : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.refreshText}>Auto-refreshes every 5 seconds{updatedAt ? " · Updated " + updatedAt.toLocaleTimeString() : ""}</Text>
        <Pressable onPress={signOut} style={styles.signOut}><Text style={styles.signOutText}>SIGN OUT</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { padding: 22, paddingBottom: 40 },
  loading: { flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center", gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 24, gap: 10 },
  eyebrow: { color: palette.blueBright, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: palette.text, fontSize: 30, fontWeight: "900", marginTop: 6 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  connected: { borderColor: palette.green, backgroundColor: "#0D302A" },
  disconnected: { borderColor: palette.borderStrong, backgroundColor: palette.surfaceRaised },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { backgroundColor: palette.green },
  dotOff: { backgroundColor: palette.subtle },
  statusText: { color: "#b7c9dc", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  card: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 18, padding: 18, marginBottom: 13 },
  cardLabel: { color: palette.muted, fontSize: 10, letterSpacing: 1.7, fontWeight: "800" },
  email: { color: palette.text, fontSize: 17, fontWeight: "700", marginTop: 12 },
  moduleTitle: { color: palette.text, fontSize: 19, fontWeight: "800", marginTop: 10 },
  description: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 9 },
  metrics: { flexDirection: "row", gap: 12, marginTop: 18, marginBottom: 4 },
  metric: { flex: 1, backgroundColor: palette.background, borderRadius: 12, padding: 12 },
  metricValue: { color: palette.text, fontSize: 17, fontWeight: "800", marginTop: 7 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  count: { color: palette.blueBright, fontSize: 12, fontWeight: "800" },
  muted: { color: palette.muted, fontSize: 13 },
  tradeRow: { borderTopWidth: 1, borderTopColor: palette.border, marginTop: 12, paddingTop: 12, gap: 9 },
  tradeField: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  fieldLabel: { color: palette.muted, fontSize: 10, textTransform: "capitalize", flex: 1 },
  fieldValue: { color: "#DCE8F6", fontSize: 11, flex: 2, textAlign: "right" },
  error: { color: "#FF9BA8", fontSize: 12, marginVertical: 10 },
  refreshText: { color: palette.subtle, fontSize: 10, textAlign: "center", marginTop: 4 },
  signOut: { borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 15, alignItems: "center", marginTop: 16 },
  signOutText: { color: palette.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1.5 },
  controlsLink: { borderWidth: 1, borderColor: "#168bff", backgroundColor: palette.surfaceBlue, borderRadius: 16, padding: 17, marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  controlsTitle: { color: palette.text, fontSize: 15, fontWeight: "800" },
  controlsArrow: { color: palette.blueBright, fontSize: 28, fontWeight: "300" },
  settingsLink: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 16, padding: 17, marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});