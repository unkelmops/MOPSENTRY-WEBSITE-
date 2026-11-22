import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { directAccountsApi, directAccountStatus, DirectAccountSignInRequired, pendingDirectAccount, type DirectAccount } from "../src/lib/direct-mt5";
import { directTheme as theme } from "../src/lib/direct-theme";
import { BrandHeader } from "../src/components/BrandHeader";

const api = directAccountsApi(supabase);

export default function DirectAccountsScreen() {
  const [accounts, setAccounts] = useState<DirectAccount[]>([]);
  const [server, setServer] = useState("");
  const [login, setLogin] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const active = useRef(false);

  function handleError(e: unknown, form = false) {
    if (e instanceof DirectAccountSignInRequired) { router.replace("/"); return; }
    const message = e instanceof Error ? e.message : "Unable to reach your account. Try again.";
    if (active.current) (form ? setFormError : setError)(message);
  }

  const refresh = useCallback(async () => {
    try {
      const rows = await api.list();
      if (active.current) { setAccounts(rows); setError(""); }
    } catch (e) { handleError(e); }
    finally { if (active.current) { setLoading(false); setRefreshing(false); } }
  }, []);

  useFocusEffect(useCallback(() => {
    active.current = true;
    void refresh();
    return () => { active.current = false; };
  }, [refresh]));

  async function save() {
    if (lock.current) return;
    setFormError(""); setNotice("");
    try { pendingDirectAccount("validation", server, login); }
    catch (e) { handleError(e, true); return; }
    lock.current = true; setBusy(true);
    try {
      await api.create(server, login);
      if (active.current) {
        setServer(""); setLogin("");
        setNotice("Account saved. Bridge setup is still required; no connection has been established.");
      }
      await refresh();
    } catch (e) { handleError(e, true); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }

  function confirmRemove(account: DirectAccount) {
    Alert.alert("Remove saved account?", `${account.broker_server} · ${account.account_login}\nThis removes the saved direct connection, not your broker account or EA connection.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => { void remove(account.id); } },
    ]);
  }

  async function remove(id: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      await api.remove(id);
      if (active.current) setAccounts(rows => rows.filter(row => row.id !== id));
    } catch (e) { handleError(e); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.primary} onRefresh={() =>
          <BrandHeader /> { setRefreshing(true); void refresh(); }} />}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to Overview" onPress={() => router.back()} style={styles.icon}><Text style={styles.arrow}>‹</Text></Pressable>
            <View style={styles.heading}><Text style={styles.eyebrow}>MOPSENTRY EA · DIRECT ACCOUNTS</Text><Text style={styles.title}>Connect MT5 Account</Text></View>
          </View>
          <Text style={styles.body}>Independent of MOPSENTRY EA. No EA needs to be attached or running for this read-only connection.</Text>
          <Text style={styles.warning}>Bridge setup required</Text>
          <Text style={styles.body}>The Windows MT5 bridge is not deployed yet. Save your account details now; monitoring will begin only after a real bridge connects. Only investor/read-only access is supported. No trades can be sent from this screen.</Text>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Account details</Text>
            <Text nativeID="server-label" style={styles.label}>Broker server</Text>
            <TextInput accessibilityLabel="Broker server" accessibilityLabelledBy="server-label" value={server} onChangeText={setServer} editable={!busy} autoCapitalize="none" autoCorrect={false} placeholder="Broker-Demo" placeholderTextColor={theme.muted} style={styles.input} returnKeyType="next" />
            <Text nativeID="login-label" style={styles.label}>MT5 account login</Text>
            <TextInput accessibilityLabel="MT5 account login" accessibilityLabelledBy="login-label" value={login} onChangeText={setLogin} editable={!busy} keyboardType="number-pad" autoCapitalize="none" autoCorrect={false} placeholder="Account number" placeholderTextColor={theme.muted} style={styles.input} />
            <Text style={styles.body}>Investor access only. Do not enter or send any password. Password setup is unavailable until the secure bridge is ready.</Text>
            {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => { void save(); }} style={[styles.save, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.saveText}>Save pending account</Text>}
            </Pressable>
            {notice ? <Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text> : null}
          </View>

          <View style={styles.listHeader}><Text style={styles.sectionTitle}>Saved direct accounts</Text><Pressable accessibilityRole="button" accessibilityLabel="Refresh direct accounts" disabled={refreshing || loading} onPress={() => { setRefreshing(true); void refresh(); }} style={styles.icon}><Text style={styles.arrow}>↻</Text></Pressable></View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {loading ? <ActivityIndicator accessibilityLabel="Loading saved accounts" color={theme.primary} style={styles.spinner} /> : accounts.length === 0 && !error ? <Text style={styles.body}>No direct accounts saved yet. Your EA-linked accounts remain separate.</Text> : null}
          {accounts.map(account => {
            const status = directAccountStatus(account);
            return <View key={account.id} style={styles.account}>
              <Text style={styles.accountTitle}>{account.account_name || account.broker_server}</Text>
              <Text selectable style={styles.body}>{account.broker_server} · Login {account.account_login}</Text>
              <Text style={[styles.status, status.confirmed ? styles.confirmed : styles.warning]}>{status.label}</Text>
              <Text style={styles.body}>Access: {account.access_mode === "investor" ? "Investor · read-only" : "Read-only setup needs review"}</Text>
              <Text style={styles.body}>Last bridge sync: {account.last_sync_at && Number.isFinite(Date.parse(account.last_sync_at)) ? new Date(account.last_sync_at).toLocaleString() : "Not received"}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove account ${account.account_login}`} disabled={busy} onPress={() => confirmRemove(account)} style={styles.remove}><Text style={styles.removeText}>Remove saved account</Text></Pressable>
            </View>;
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  content: { padding: 22, paddingBottom: 40, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  heading: { flex: 1 },
  eyebrow: { color: theme.cyan, fontSize: 10, fontWeight: "800" },
  title: { color: theme.text, fontSize: 25, fontWeight: "800", marginTop: 6 },
  icon: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  arrow: { color: theme.cyan, fontSize: 30 },
  body: { color: theme.muted, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  warning: { color: theme.warning, fontSize: 13, fontWeight: "700" },
  form: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 20, gap: 12, marginVertical: 8 },
  sectionTitle: { color: theme.text, fontSize: 18, fontWeight: "700", flexShrink: 1 },
  label: { color: theme.text, fontSize: 13, marginTop: 4 },
  input: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 8, color: theme.text, padding: 14, fontSize: 16, minHeight: 50 },
  save: { backgroundColor: theme.primary, borderRadius: 8, alignItems: "center", justifyContent: "center", minHeight: 50, padding: 14 },
  saveText: { color: theme.onPrimary, fontSize: 15, fontWeight: "800", textAlign: "center" },
  disabled: { opacity: 0.6 },
  error: { color: theme.error, fontSize: 13, lineHeight: 20 },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  spinner: { marginVertical: 20 },
  account: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 16, gap: 8 },
  accountTitle: { color: theme.text, fontSize: 16, fontWeight: "700" },
  status: { marginTop: 4 },
  confirmed: { color: theme.success, fontSize: 13, fontWeight: "700" },
  remove: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", marginTop: 4 },
  removeText: { color: theme.error, fontSize: 13, fontWeight: "600" },
});