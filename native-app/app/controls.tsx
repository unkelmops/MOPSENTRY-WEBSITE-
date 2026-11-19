import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette } from "../src/lib/theme";

type Settings = { is_running: boolean };
type Account = { status: string; last_heartbeat: string | null };
type Command = { id: string; command: string; status: string; created_at: string; confirmed_at: string | null };

function freshHeartbeat(account: Account | null) {
  const at = account?.last_heartbeat ? new Date(account.last_heartbeat).getTime() : 0;
  return account?.status === "connected" && Number.isFinite(at) && Date.now() - at >= 0 && Date.now() - at < 30_000;
}

export default function ControlsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [access, setAccess] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [command, setCommand] = useState<Command | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      router.replace("/");
      return;
    }
    const [accessResult, accountResult, settingsResult, commandResult] = await Promise.all([
      supabase.from("app_access_entitlements").select("enabled").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("trading_accounts").select("status,last_heartbeat").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("robot_settings").select("is_running").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("robot_commands").select("id,command,status,created_at,confirmed_at").eq("user_id", auth.user.id).eq("command", "CLOSE_ALL").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    for (const result of [accessResult, accountResult, settingsResult, commandResult]) {
      if (result.error) throw result.error;
    }
    let currentSettings = settingsResult.data;
    if (!currentSettings) {
      const { data: created, error: createError } = await supabase
        .from("robot_settings")
        .insert({ user_id: auth.user.id })
        .select("is_running")
        .single();
      if (createError) throw createError;
      currentSettings = created;
    }
    setAccess(accessResult.data?.enabled === true);
    setAccount(accountResult.data as Account | null);
    setSettings(currentSettings as Settings);
    setCommand(commandResult.data as Command | null);
    setUpdatedAt(new Date());
    setError("");
  }, []);

  useEffect(() => {
    let mounted = true;
    let running = false;
    const load = async () => {
      if (running) return;
      running = true;
      try { await refresh(); }
      catch (e) { if (mounted) setError(e instanceof Error ? e.message : "Unable to load robot controls."); }
      finally { if (mounted) setLoading(false); running = false; }
    };
    void load();
    const timer = setInterval(() => { if (mounted) void load(); }, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, [refresh]);

  async function toggleRobot() {
    if (!settings || busy) return;
    const next = !settings.is_running;
    if (next && !access) {
      setError("App Access is required before MOPSENTRY can start.");
      return;
    }
    if (next && !freshHeartbeat(account)) {
      setError("A fresh MT5/EA heartbeat is required before MOPSENTRY can start.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in again.");
      const { data, error: updateError } = await supabase
        .from("robot_settings")
        .update({ is_running: next, updated_at: new Date().toISOString() })
        .eq("user_id", auth.user.id)
        .select("is_running")
        .single();
      if (updateError) throw updateError;
      setSettings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The robot setting could not be changed.");
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  function confirmCloseAll() {
    if (busy) return;
    if (!freshHeartbeat(account)) {
      setError("Close All is unavailable because the MT5/EA heartbeat is not fresh.");
      return;
    }
    if (command && ["pending", "delivered"].includes(command.status)) {
      setError("A Close All request is already awaiting acknowledgement.");
      return;
    }
    Alert.alert(
      "Close all positions?",
      "This sends a CLOSE_ALL command to the connected MOPSENTRY EA. It does not cancel pending orders.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send command", style: "destructive", onPress: () => { void sendCloseAll(); } },
      ],
    );
  }

  async function sendCloseAll() {
    setBusy(true);
    setError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in again.");
      const { data: latest, error: latestError } = await supabase
        .from("robot_commands")
        .select("id,command,status,created_at,confirmed_at")
        .eq("user_id", auth.user.id)
        .eq("command", "CLOSE_ALL")
        .in("status", ["pending", "delivered"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) throw latestError;
      if (latest) throw new Error("A Close All request is already awaiting acknowledgement.");
      const { data, error: insertError } = await supabase
        .from("robot_commands")
        .insert({ user_id: auth.user.id, command: "CLOSE_ALL", status: "pending" })
        .select("id,command,status,created_at,confirmed_at")
        .single();
      if (insertError) throw insertError;
      setCommand(data as Command);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The Close All command could not be queued.");
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  const connected = freshHeartbeat(account);
  const waiting = command ? ["pending", "delivered"].includes(command.status) : false;

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color=palette.blue /><Text style={styles.muted}>Loading robot controls…</Text></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹  OVERVIEW</Text></Pressable>
        <Text style={styles.eyebrow}>MOPSENTRY NATIVE</Text>
        <Text style={styles.title}>Robot controls</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View><Text style={styles.label}>ROBOT STATUS</Text><Text style={styles.value}>{settings?.is_running ? "Running" : "Stopped"}</Text></View>
            <View style={[styles.pill, connected ? styles.pillOn : styles.pillOff]}><Text style={styles.pillText}>{connected ? "MT5 CONNECTED" : "OFFLINE"}</Text></View>
          </View>
          <Text style={styles.description}>Start requires App Access and a fresh EA heartbeat. The database also enforces these requirements.</Text>
          <Pressable disabled={busy || !settings || (!settings.is_running && (!access || !connected))} onPress={() => void toggleRobot()} style={[styles.primary, (busy || !settings || (!settings.is_running && (!access || !connected))) && styles.disabled]}>
            {busy ? <ActivityIndicator color="#06101d" /> : <Text style={styles.primaryText}>{settings?.is_running ? "STOP MOPSENTRY" : "START MOPSENTRY"}</Text>}
          </Pressable>
          {!access ? <Text style={styles.warning}>App Access is not enabled for this account.</Text> : null}
          {!connected ? <Text style={styles.warning}>Connect MT5 and wait for a fresh EA heartbeat before starting or sending Close All.</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>POSITION MANAGEMENT</Text>
          <Text style={styles.sectionTitle}>Close all positions</Text>
          <Text style={styles.description}>Sends the existing CLOSE_ALL command to the EA. Pending orders are not cancelled.</Text>
          <Pressable disabled={busy || !connected || waiting} onPress={confirmCloseAll} style={[styles.danger, (busy || !connected || waiting) && styles.disabled]}>
            <Text style={styles.dangerText}>{waiting ? "WAITING FOR EA ACKNOWLEDGEMENT" : "CLOSE ALL POSITIONS"}</Text>
          </Pressable>
          {command ? <View style={styles.commandBox}>
            <Text style={styles.label}>LATEST COMMAND</Text>
            <Text style={styles.commandStatus}>{command.status.replaceAll("_", " ").toUpperCase()}</Text>
            <Text style={styles.description}>Created {new Date(command.created_at).toLocaleString()}{command.confirmed_at ? " · Confirmed " + new Date(command.confirmed_at).toLocaleString() : ""}</Text>
          </View> : <Text style={styles.muted}>No Close All command has been sent.</Text>}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.refreshText}>Control status refreshes every 5 seconds{updatedAt ? " · Updated " + updatedAt.toLocaleTimeString() : ""}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { padding: 22, paddingBottom: 42 },
  loading: { flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center", gap: 14 },
  back: { paddingVertical: 12, marginBottom: 20 },
  backText: { color: palette.blueBright, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  eyebrow: { color: palette.blueBright, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: palette.text, fontSize: 29, fontWeight: "900", marginTop: 7, marginBottom: 22 },
  card: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 18, padding: 18, marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  label: { color: palette.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "800" },
  value: { color: palette.text, fontSize: 23, fontWeight: "900", marginTop: 8 },
  pill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  pillOn: { borderColor: palette.green, backgroundColor: "#0D302A" },
  pillOff: { borderColor: palette.borderStrong, backgroundColor: palette.surfaceRaised },
  pillText: { color: "#b7c9dc", fontSize: 9, fontWeight: "800" },
  description: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 10 },
  primary: { minHeight: 52, borderRadius: 12, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center", marginTop: 18 },
  primaryText: { color: "#06101d", fontSize: 12, fontWeight: "900", letterSpacing: 1.3 },
  disabled: { opacity: 0.4 },
  warning: { color: palette.amber, fontSize: 11, lineHeight: 17, marginTop: 12 },
  sectionTitle: { color: palette.text, fontSize: 18, fontWeight: "800", marginTop: 10 },
  danger: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: "#703344", backgroundColor: "#291722", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, marginTop: 17 },
  dangerText: { color: "#FF9BA8", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  commandBox: { borderTopWidth: 1, borderTopColor: palette.border, marginTop: 17, paddingTop: 14 },
  commandStatus: { color: palette.text, fontSize: 15, fontWeight: "800", marginTop: 7 },
  muted: { color: palette.muted, fontSize: 12, marginTop: 12 },
  error: { color: "#FF9BA8", fontSize: 12, marginVertical: 10 },
  refreshText: { color: palette.subtle, fontSize: 10, textAlign: "center", marginTop: 8 },
});