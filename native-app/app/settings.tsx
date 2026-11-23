import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette } from "../src/lib/theme";
import { BrandHeader } from "../src/components/BrandHeader";
import { AmbientBackground } from "../src/components/AmbientBackground";

type TradingAccount = {
  platform: string; broker_server: string; login: string; connection_key: string;
  status: string; last_heartbeat: string | null; balance: number | null; equity: number | null;
};

const freshConnection = (account: TradingAccount | null) => {
  if (!account?.last_heartbeat || account.status !== "connected") return false;
  const age = Date.now() - new Date(account.last_heartbeat).getTime();
  return Number.isFinite(age) && age >= 0 && age < 30_000;
};

export default function SettingsScreen() {
  const [email, setEmail] = useState("");
  const [access, setAccess] = useState<boolean | null>(null);
  const [account, setAccount] = useState<TradingAccount | null>(null);
  const [platform, setPlatform] = useState("mt5");
  const [server, setServer] = useState("");
  const [login, setLogin] = useState("");
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [displayCurrency, setDisplayCurrency] = useState("ZAR");

  useEffect(() => {
    void SecureStore.getItemAsync("mopsentry-display-currency").then(value => {
      if (value && /^[A-Z]{3}$/.test(value)) setDisplayCurrency(value);
    }).catch(() => {});
    let mounted = true;
    async function load() {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) { router.replace("/"); return; }
        const [accessResult, accountResult] = await Promise.all([
          supabase.from("app_access_entitlements").select("enabled").eq("user_id", auth.user.id).maybeSingle(),
          supabase.from("trading_accounts").select("platform,broker_server,login,connection_key,status,last_heartbeat,balance,equity").eq("user_id", auth.user.id).maybeSingle(),
        ]);
        if (accessResult.error) throw accessResult.error;
        if (accountResult.error) throw accountResult.error;
        let row = accountResult.data as TradingAccount | null;
        if (!row) {
          const created = await supabase.from("trading_accounts").insert({ user_id: auth.user.id }).select("platform,broker_server,login,connection_key,status,last_heartbeat,balance,equity").single();
          if (created.error) throw created.error;
          row = created.data as TradingAccount;
        }
        if (mounted) {
          setEmail(auth.user.email ?? "");
          setAccess(accessResult.data?.enabled === true);
          setAccount(row);
          setPlatform(row.platform || "mt5");
          setServer(row.broker_server || "");
          setLogin(row.login || "");
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Unable to load account settings.");
      } finally { if (mounted) setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  async function saveAccount() {
    setSaving(true); setError(""); setNotice("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again.");
      const { error: saveError } = await supabase.from("trading_accounts")
        .update({ platform, broker_server: server.trim(), login: login.trim() })
        .eq("user_id", auth.user.id);
      if (saveError) throw saveError;
      setNotice("Account details saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save account details."); }
    finally { setSaving(false); }
  }

  async function copyKey() {
    if (!account?.connection_key) return;
    try {
      await Clipboard.setStringAsync(account.connection_key, { android: { isSensitive: true } });
      setCopied(true);
      setKeyRevealed(false);
      setNotice("Connection key copied. It has been hidden again.");
    } catch { setError("Could not copy the connection key."); }
  }

  async function rotateKey() {
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await (supabase.rpc.bind(supabase) as unknown as (fn: string) => Promise<{ data: unknown; error: Error | null }>)("rotate_trading_account_key");
      if (result.error) throw result.error;
      if (typeof result.data !== "string" || !result.data) throw new Error("The new connection key was not returned.");
      setAccount(previous => previous ? { ...previous, connection_key: result.data as string, status: "pending", last_heartbeat: null } : previous);
      setKeyRevealed(false); setCopied(false);
      setNotice("A new connection key has been created. Update the EA with this key when you are ready.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create a new connection key."); }
    finally { setSaving(false); }
  }

  function confirmRotate() {
    Alert.alert("Create a new connection key?", "The current key will stop working. Only do this when you are ready to update the EA on your demo setup.", [
      { text: "Cancel", style: "cancel" },
      { text: "Create new key", style: "destructive", onPress: () => { void rotateKey(); } },
    ]);
  }

  async function signOut() {
    setLoading(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) { setError(signOutError.message); setLoading(false); return; }
    router.replace("/");
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator color={palette.blue}/><Text style={styles.muted}>Loading account…</Text></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <BrandHeader />
        <Text style={styles.eyebrow}>MOPSENTRY · ACCOUNT</Text>
        <Text style={styles.title}>Account</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Display currency</Text>
          <Text style={styles.body}>Choose how balance, equity and profit are displayed. Your MT5 account currency and actual account values are not changed.</Text>
          <View style={styles.currencyOptions}>
            {["ZAR", "USD", "EUR", "GBP", "AUD", "CAD"].map(code => <Pressable key={code} onPress={() => { setDisplayCurrency(code); void SecureStore.setItemAsync("mopsentry-display-currency", code); }} style={[styles.currencyOption, displayCurrency === code && styles.currencyOptionActive]}><Text style={[styles.currencyOptionText, displayCurrency === code && styles.currencyOptionTextActive]}>{code}</Text></Pressable>)}
          </View>
          <Text style={styles.body}>Selected: {displayCurrency}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>SIGNED-IN ACCOUNT</Text>
          <Text style={styles.value}>{email || "—"}</Text>
          <View style={styles.row}><Text style={styles.label}>APP ACCESS</Text><Text style={[styles.access, access ? styles.enabled : styles.disabled]}>{access === null ? "UNKNOWN" : access ? "ENABLED" : "NOT ENABLED"}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trading account</Text>
          <Text style={styles.body}>Use demo account details for testing. Do not enter broker passwords here.</Text>
          <View style={styles.platformRow}>
            {["mt5", "mt4"].map(value => <Pressable key={value} onPress={() => setPlatform(value)} style={[styles.platformButton, platform === value && styles.platformActive]}><Text style={[styles.platformText, platform === value && styles.platformTextActive]}>{value.toUpperCase()}</Text></Pressable>)}
          </View>
          <Text style={styles.inputLabel}>BROKER SERVER</Text>
          <TextInput value={server} onChangeText={setServer} placeholder="Broker-Demo" placeholderTextColor={palette.subtle} autoCapitalize="none" autoCorrect={false} style={styles.input}/>
          <Text style={styles.inputLabel}>ACCOUNT LOGIN</Text>
          <TextInput value={login} onChangeText={setLogin} placeholder="Demo account number" placeholderTextColor={palette.subtle} keyboardType="number-pad" style={styles.input}/>
          <Pressable disabled={saving} onPress={() => void saveAccount()} style={[styles.saveButton, saving && styles.disabledButton]}><Text style={styles.saveText}>{saving ? "SAVING…" : "SAVE ACCOUNT DETAILS"}</Text></Pressable>
          <View style={styles.connectionStatus}><View style={[styles.dot, freshConnection(account) ? styles.dotOn : styles.dotOff]}/><Text style={styles.connectionText}>{freshConnection(account) ? "CONNECTED · FRESH HEARTBEAT" : account?.status === "connected" ? "LAST CONNECTION IS STALE" : (account?.status || "PENDING").toUpperCase()}</Text></View>
        </View>

        <View style={styles.card}>
          <View style={styles.keyHeader}><Text style={styles.sectionTitle}>Your connection key</Text><Pressable disabled={saving} onPress={confirmRotate}><Text style={styles.newKey}>NEW KEY</Text></Pressable></View>
          <Text style={styles.body}>This key links the robot on your VPS to your account. Keep it private.</Text>
          <View style={styles.keyBox}>
            <Text selectable={keyRevealed} style={styles.keyValue}>{keyRevealed ? account?.connection_key : "••••••••••••••••••••"}</Text>
            <Pressable onPress={() => { setKeyRevealed(value => !value); setCopied(false); }} style={styles.keyAction}><Text style={styles.keyActionText}>{keyRevealed ? "HIDE" : "SHOW"}</Text></Pressable>
            <Pressable onPress={() => void copyKey()} style={styles.keyAction}><Text style={styles.keyActionText}>{copied ? "COPIED" : "COPY"}</Text></Pressable>
          </View>
          <Text style={styles.body}>Hidden by default. Copying hides it again and marks the Android clipboard entry as sensitive.</Text>
        </View>

        <Pressable onPress={() => router.push("/broker-connections")} style={styles.connectionLink}><View style={{ flex: 1 }}><Text style={styles.connectionTitle}>Broker connections</Text><Text style={styles.body}>View available connection methods and setup status.</Text></View><Text style={styles.connectionArrow}>›</Text></Pressable>

        <View style={styles.card}>
          <Text style={styles.label}>SECURITY</Text>
          <Text style={styles.body}>Your session is stored using the device's secure storage. Never share your connection key, broker password or API secret. Robot Start remains subject to server-side App Access and fresh EA connection checks.</Text>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={() => void signOut()} style={styles.signOut}><Text style={styles.signOutText}>SIGN OUT</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, paddingBottom: 42 },
  loading: { flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center", gap: 14 },
  muted: { color: palette.muted, fontSize: 13 },
  eyebrow: { color: palette.blueBright, fontSize: 9, letterSpacing: 1.8, fontWeight: "900" },
  title: { color: palette.text, fontSize: 29, fontWeight: "900", marginTop: 7, marginBottom: 18 },
  card: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 17, padding: 16, marginBottom: 12 },
  label: { color: palette.muted, fontSize: 8, letterSpacing: 1.2, fontWeight: "900" },
  value: { color: palette.text, fontSize: 14, fontWeight: "700", marginTop: 8, marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  access: { fontSize: 9, fontWeight: "900" },
  enabled: { color: palette.green },
  disabled: { color: palette.amber },
  sectionTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
  body: { color: palette.muted, fontSize: 10, lineHeight: 16, marginTop: 7 },
  currencyOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13 },
  currencyOption: { minWidth: 66, borderWidth: 1, borderColor: palette.border, borderRadius: 9, paddingVertical: 10, alignItems: "center" },
  currencyOptionActive: { borderColor: palette.blue, backgroundColor: palette.surfaceBlue },
  currencyOptionText: { color: palette.muted, fontSize: 10, fontWeight: "900" },
  currencyOptionTextActive: { color: palette.blueBright },
  platformRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  platformButton: { flex: 1, borderWidth: 1, borderColor: palette.border, borderRadius: 9, padding: 10, alignItems: "center" },
  platformActive: { borderColor: palette.blue, backgroundColor: palette.surfaceBlue },
  platformText: { color: palette.muted, fontSize: 9, fontWeight: "900" },
  platformTextActive: { color: palette.blueBright },
  inputLabel: { color: palette.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.8, marginTop: 13, marginBottom: 6 },
  input: { backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border, borderRadius: 10, color: palette.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 12 },
  saveButton: { backgroundColor: palette.blue, borderRadius: 10, alignItems: "center", padding: 13, marginTop: 14 },
  saveText: { color: "#061321", fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  disabledButton: { opacity: 0.5 },
  connectionStatus: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },
  dot: { width: 7, height: 7, borderRadius: 5 },
  dotOn: { backgroundColor: palette.green },
  dotOff: { backgroundColor: palette.amber },
  connectionText: { color: palette.muted, fontSize: 8, fontWeight: "900" },
  keyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  newKey: { color: palette.blueBright, fontSize: 9, fontWeight: "900" },
  keyBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: palette.surfaceBlue, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: 11, padding: 11, marginTop: 12 },
  keyValue: { color: palette.blueBright, fontSize: 11, fontWeight: "900", flex: 1, letterSpacing: 1 },
  keyAction: { borderWidth: 1, borderColor: palette.borderStrong, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 },
  keyActionText: { color: palette.blueBright, fontSize: 8, fontWeight: "900" },
  connectionLink: { borderWidth: 1, borderColor: palette.blue, backgroundColor: palette.surfaceBlue, borderRadius: 15, padding: 15, marginBottom: 12, flexDirection: "row", alignItems: "center" },
  connectionTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
  connectionArrow: { color: palette.blueBright, fontSize: 27 },
  notice: { color: palette.green, fontSize: 10, lineHeight: 15, marginBottom: 10 },
  error: { color: palette.red, fontSize: 10, lineHeight: 15, marginBottom: 10 },
  signOut: { borderWidth: 1, borderColor: "#703344", backgroundColor: "#291722", borderRadius: 12, padding: 15, alignItems: "center", marginTop: 5 },
  signOutText: { color: "#FF9BA8", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
});
