import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette } from "../src/lib/theme";
import { mopsentryLogo } from "../src/lib/brand";
import { AmbientBackground } from "../src/components/AmbientBackground";

type Account = {
  status: string;
  broker_server: string | null;
  login: string | null;
  balance: number | null;
  account_currency: string | null;
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

function money(value: number | null, currency: string | null) {
  if (value === null) return "—";
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "code" }).format(value); } catch { /* use plain amount below */ }
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DataList({ title, value }: { title: string; value: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const items = records(value);
  const pending = title.toLowerCase().includes("pending");
  return (
    <View style={[styles.folderCard, pending ? styles.pendingFolder : styles.positionsFolder]}>
      <Pressable onPress={() => setExpanded(current => !current)} style={styles.folderHeader} accessibilityRole="button" accessibilityState={{ expanded }}>
        <View style={[styles.folderIcon, pending ? styles.pendingIcon : styles.positionsIcon]}><Text style={styles.folderGlyph}>{pending ? "⌁" : "↗"}</Text></View>
        <View style={styles.folderCopy}>
          <Text style={[styles.folderEyebrow, pending ? styles.pendingAccent : styles.positionsAccent]}>{pending ? "EXECUTION QUEUE" : "LIVE EXPOSURE"}</Text>
          <Text style={styles.folderTitle}>{title}</Text>
          <Text style={styles.folderSubtitle}>{pending ? "Orders waiting for activation" : "Your active market positions"}</Text>
        </View>
        <View style={[styles.folderCount, pending ? styles.pendingCount : styles.positionsCount]}><Text style={[styles.folderCountNumber, pending ? styles.pendingAccent : styles.positionsAccent]}>{items.length}</Text><Text style={styles.folderCountLabel}>{pending ? "WAITING" : "OPEN"}</Text></View>
        <View style={[styles.folderChevron, pending ? styles.pendingChevron : styles.positionsChevron]}><Text style={styles.folderChevronText}>{expanded ? "−" : "+"}</Text></View>
      </Pressable>
      {expanded ? items.length === 0 ? (
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
      )) : null}
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
  const [robotSettings, setRobotSettings] = useState<{ break_even_enabled: boolean; break_even_trigger: number } | null>(null);
  const [breakEvenDraft, setBreakEvenDraft] = useState("10");
  const [savingBreakEven, setSavingBreakEven] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState("ZAR");
  const [conversionRate, setConversionRate] = useState<number | null>(1);
  const [accountDetailsExpanded, setAccountDetailsExpanded] = useState(false);
  const [breakEvenModalOpen, setBreakEvenModalOpen] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync("mopsentry-display-currency").then(value => {
      if (value && /^[A-Z]{3}$/.test(value)) setDisplayCurrency(value);
    }).catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      router.replace("/");
      return;
    }
    setEmail(auth.user.email ?? "");
    const [entitlement, trading, settings] = await Promise.all([
      supabase.from("app_access_entitlements").select("enabled").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("trading_accounts").select("status,broker_server,login,balance,equity,account_currency,last_heartbeat,open_trades,pending_orders,ea_state,ea_version").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("robot_settings").select("break_even_enabled,break_even_trigger").eq("user_id", auth.user.id).maybeSingle(),
    ]);
    if (entitlement.error) throw entitlement.error;
    if (trading.error) throw trading.error;
    setAccess(entitlement.data?.enabled === true);
    setAccount(trading.data as Account | null);
    setRobotSettings(settings.data as { break_even_enabled: boolean; break_even_trigger: number } | null);
    if (settings.data?.break_even_trigger != null) setBreakEvenDraft(String(settings.data.break_even_trigger));
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
    const refreshTimer = setInterval(() => { if (mounted) void load(); }, 5000);
    const redirectTimers = new Set<ReturnType<typeof setTimeout>>();
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        const redirectTimer = setTimeout(() => {
          redirectTimers.delete(redirectTimer);
          router.replace("/");
        }, 0);
        redirectTimers.add(redirectTimer);
      }
    });
    return () => {
      mounted = false;
      clearInterval(refreshTimer);
      redirectTimers.forEach(clearTimeout);
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const heartbeat = account?.last_heartbeat ? new Date(account.last_heartbeat).getTime() : 0;
  const connected = account?.status === "connected" && Number.isFinite(heartbeat) && Date.now() - heartbeat >= 0 && Date.now() - heartbeat < 30000;
  useEffect(() => {
    let active = true;
    const loadRate = async () => {
      const base = account?.account_currency?.toUpperCase();
      if (!base || !/^[A-Z]{3}$/.test(base)) { setConversionRate(null); return; }
      if (base === displayCurrency) { setConversionRate(1); return; }
      setConversionRate(null);
      try {
        const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${displayCurrency}`);
        if (response.ok) {
          const data = await response.json();
          const rate = Number(data?.rates?.[displayCurrency]);
          if (Number.isFinite(rate) && rate > 0) { if (active) setConversionRate(rate); return; }
        }
      } catch { /* fallback provider below */ }
      try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
        if (!response.ok) throw new Error("FX provider unavailable");
        const data = await response.json();
        const rate = Number(data?.rates?.[displayCurrency]);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error("FX rate missing");
        if (active) setConversionRate(rate);
      } catch { if (active) setConversionRate(null); }
    };
    void loadRate();
    return () => { active = false; };
  }, [account?.account_currency, displayCurrency]);
  const displayMoney = (value: number | null) => {
    if (value == null) return "—";
    const base = account?.account_currency?.toUpperCase();
    const currency = conversionRate == null ? base : displayCurrency;
    const converted = conversionRate == null ? value : value * conversionRate;
    try { return new Intl.NumberFormat("en-ZA", { style: "currency", currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : "ZAR", currencyDisplay: "symbol" }).format(converted); }
    catch { return `${converted.toFixed(2)} ${currency || "MT5"}`; }
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={palette.blue} /><Text style={styles.muted}>Loading your secure session…</Text></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image source={{ uri: "mopsentryLogo" }} resizeMode="contain" style={styles.brandLogo} accessibilityLabel="MOPSENTRY" />
            <Text style={styles.title}>Overview</Text>
          </View>
          <View style={styles.headerActions}><View style={[styles.statusPill, connected ? styles.connected : styles.disconnected]}><View style={[styles.dot, connected ? styles.dotOn : styles.dotOff]} /><Text style={styles.statusText}>{connected ? "MT5 CONNECTED" : "NOT CONNECTED"}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push("/settings")} style={styles.moreButton}><Text style={styles.moreGlyph}>⋮</Text></Pressable></View>
        </View>


        <View style={[styles.card, { padding: 0, overflow: "hidden", backgroundColor: "#081321", borderColor: "#24527B" }]}>
          <View style={{ paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#20364e", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><View><Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "900", letterSpacing: 1 }}>TRADE</Text><Text style={{ color: "#8FA3BA", fontSize: 9, marginTop: 3, letterSpacing: 1 }}>MOPSENTRY · MT5 TERMINAL</Text></View><Text style={{ color: connected ? "#39D69A" : "#8FA3BA", fontSize: 9, fontWeight: "900" }}>{connected ? "CONNECTED" : "OFFLINE"}</Text></View>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#20364e" }}>{[[ "BALANCE",connected?displayMoney(account?.balance??null):"—" ],[ "EQUITY",connected?displayMoney(account?.equity??null):"—" ],[ "FLOATING P/L",connected?displayMoney(Number(account?.equity??0)-Number(account?.balance??0)):"—" ]].map(([label,value],index)=><View key={label} style={{ flex: 1, paddingHorizontal: 9, paddingVertical: 12, borderRightWidth: index===2?0:1, borderRightColor: "#20364e" }}><Text style={{ color: "#8FA3BA", fontSize: 9, fontWeight: "700" }}>{label}</Text><Text numberOfLines={1} style={{ color: label==="FLOATING P/L"?(Number(account?.equity??0)-Number(account?.balance??0))>=0?"#39D69A":"#FF7184":"#FFFFFF", fontSize: 11, fontWeight: "900", marginTop: 5 }}>{value}</Text></View>)}</View>
          <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 5, flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 11 }}>POSITIONS</Text><Text style={{ color: "#66C2FF", fontSize: 9, fontWeight: "900" }}>{connected?records(account?.open_trades).length:"—"} OPEN</Text></View>
          {connected&&records(account?.open_trades).length>0?records(account?.open_trades).map((trade,index)=>{const side=String(trade.side??trade.type??"BUY").toUpperCase();const pnl=Number(trade.profit??trade.pnl??0);return <View key={String(trade.ticket??index)} style={{ marginHorizontal: 10, borderTopWidth: 1, borderTopColor: "#20364e", paddingVertical: 11, gap: 8 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><View><Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 13 }}>{String(trade.symbol??trade.pair??"—")}</Text><Text style={{ color: side.includes("SELL")?"#FF7184":"#39D69A", fontSize: 9, fontWeight: "900", marginTop: 3 }}>{side}</Text></View><Text style={{ color: pnl>=0?"#39D69A":"#FF7184", fontWeight: "900", fontSize: 13 }}>{displayMoney(pnl)}</Text></View><View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>{[[ "VOLUME",Number(trade.lots??trade.volume??0).toFixed(2) ],[ "PRICE",String(trade.open_price??trade.open??"—") ],[ "MARKET",String(trade.current_price??trade.current??"—") ],[ "S/L",String(trade.sl??trade.stop_loss??"—") ],[ "T/P",String(trade.tp??trade.take_profit??"—") ]].map(([label,value])=><View key={label} style={{ minWidth: "28%" }}><Text style={{ color: "#8FA3BA", fontSize: 9, fontWeight: "700" }}>{label}</Text><Text style={{ color: "#E6EEF8", fontSize: 11, marginTop: 3 }}>{value}</Text></View>)}</View></View>}) : <Text style={[styles.description,{paddingHorizontal:14,paddingBottom:14,color:"#8FA3BA"}]}>{connected?"No open positions.":"Live positions appear here when MT5 reconnects."}</Text>}
          <View style={{ borderTopWidth: 1, borderTopColor: "#20364e", paddingHorizontal: 14, paddingVertical: 11 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><Text style={{ color: "#C7D8EA", fontSize: 10, fontWeight: "900", letterSpacing: 1 }}>PENDING ORDERS</Text><Text style={{ color: "#B7A0FF", fontSize: 9, fontWeight: "900" }}>{connected ? records(account?.pending_orders).length : "—"} WAITING</Text></View>
            {connected && records(account?.pending_orders).length ? records(account?.pending_orders).map((order,index)=><View key={String(order.ticket??index)} style={{ borderTopWidth: 1, borderTopColor: "#20364e", paddingVertical: 9, flexDirection: "row", justifyContent: "space-between", gap: 10 }}><View><Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12 }}>{String(order.symbol??"—")}</Text><Text style={{ color: "#B7A0FF", fontSize: 9, marginTop: 3 }}>{String(order.type??"PENDING").replaceAll("_"," ")} · {Number(order.volume??0).toFixed(2)} lots</Text><Text style={{ color: "#8FA3BA", fontSize: 9, marginTop: 3 }}>SL {displayValue(order.sl)} · TP {displayValue(order.tp)}</Text></View><Text style={{ color: "#E6EEF8", fontSize: 11, fontWeight: "700" }}>@ {displayValue(order.entry_price)}</Text></View>) : <Text style={{ color: "#8FA3BA", fontSize: 10, paddingVertical: 6 }}>{connected ? "No pending orders." : "Pending orders appear when MT5 reconnects."}</Text>}
          </View>
        </View>
        <Pressable onPress={() => setAccountDetailsExpanded(value => !value)} style={[styles.settingsLink, { paddingVertical: 12 }]}>
          <View style={{ flex: 1 }}><Text style={styles.controlsTitle}>Trade account connected</Text><Text style={styles.description}>{connected ? `${account?.broker_server || "MT5"} · Login ${account?.login || "—"}` : "Connection details and account status"}</Text></View><Text style={styles.controlsArrow}>{accountDetailsExpanded ? "−" : "+"}</Text>
        </Pressable>
        {accountDetailsExpanded ? <View style={[styles.card, { marginTop: -5 }]}>
          <Text style={styles.email}>{email || "Signed in"}</Text>
          <Text style={styles.description}>Broker: {account?.broker_server || "Not reported"} · Login: {account?.login || "—"}</Text>
          <Text style={styles.description}>MT5 currency: {account?.account_currency || "Waiting for MT5 currency data"}</Text>
          <Text style={styles.description}>{!account?.account_currency ? "Waiting for MT5 to report account currency." : account.account_currency === displayCurrency ? `Source currency ${account.account_currency} · no conversion needed.` : conversionRate == null ? `Showing original ${account.account_currency} values until an exchange rate is available.` : `Approx. converted from ${account.account_currency} · rate ${conversionRate.toFixed(4)}.`}</Text>
          <Text style={styles.description}>EA state: {account?.ea_state || "Not reported"} · Version: {account?.ea_version || "—"}</Text>
          <Text style={styles.description}>Last EA heartbeat: {account?.last_heartbeat ? new Date(account.last_heartbeat).toLocaleString() : "Not received"}</Text>
        </View> : null}

        <Pressable onPress={() => setBreakEvenModalOpen(true)} style={[styles.settingsLink,{borderWidth:1,borderColor:"#2B789C",borderRadius:16,padding:15,backgroundColor:"#0B2032"}]}>
          <View style={{flex:1}}><Text style={styles.controlsTitle}>Break-Even Protection</Text><Text style={[styles.description,{color:robotSettings?.break_even_enabled?"#39D69A":"#8FA3BA"}]}>{robotSettings?.break_even_enabled?"ON":"OFF"} · Tap to configure</Text></View><Text style={styles.controlsArrow}>›</Text>
        </Pressable>

        <Modal visible={breakEvenModalOpen} transparent animationType="fade" onRequestClose={() => setBreakEvenModalOpen(false)}>
          <View style={{flex:1,backgroundColor:"rgba(0,0,0,.72)",justifyContent:"center",padding:22}}>
            <View style={{backgroundColor:"#102235",borderRadius:20,borderWidth:1,borderColor:"#2B789C",padding:20}}>
              <Text style={{color:"#FFFFFF",fontSize:18,fontWeight:"900"}}>Break-Even Protection</Text>
              <Text style={{color:"#8FA3BA",fontSize:12,marginTop:5}}>Configure your profit target and protection.</Text>
              <Text style={styles.fieldLabel}>Profit target · {account?.account_currency || "account currency"}</Text>
              <TextInput value={breakEvenDraft} onChangeText={setBreakEvenDraft} keyboardType="decimal-pad" style={styles.breakEvenInput} placeholder="10.00" placeholderTextColor={palette.muted}/>
              <View style={{flexDirection:"row",gap:10,marginTop:16}}>
                <Pressable onPress={()=>setBreakEvenModalOpen(false)} style={[styles.breakEvenSave,{flex:1,backgroundColor:"#26394C"}]}><Text style={styles.breakEvenSaveText}>CANCEL</Text></Pressable>
                <Pressable disabled={!robotSettings||savingBreakEven} onPress={async()=>{
                  const amount=Number(breakEvenDraft);
                  if(!Number.isFinite(amount)||amount<=0){setError("Enter a profit target greater than zero.");return;}
                  setSavingBreakEven(true);
                  const {data:auth}=await supabase.auth.getUser();
                  const enabled=!robotSettings!.break_even_enabled;
                  const result=auth.user?await supabase.from("robot_settings").update({break_even_enabled:enabled,break_even_trigger:amount,updated_at:new Date().toISOString()}).eq("user_id",auth.user.id):{error:new Error("Please sign in again.")};
                  if(result.error)setError(result.error.message);else{setRobotSettings({break_even_enabled:enabled,break_even_trigger:amount});setBreakEvenModalOpen(false);}
                  setSavingBreakEven(false);
                }} style={[styles.breakEvenSave,{flex:1,opacity:savingBreakEven?0.5:1}]}><Text style={styles.breakEvenSaveText}>{savingBreakEven?"SAVING…":"SAVE & "+(robotSettings?.break_even_enabled?"TURN OFF":"TURN ON")}</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>

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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  moreButton: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, alignItems: "center", justifyContent: "center" },
  moreGlyph: { color: palette.text, fontSize: 23, lineHeight: 25, fontWeight: "900" },
  headerBrand: { flex: 1, alignItems: "flex-start", gap: 5 },
  brandLogo: { width: 148, height: 36 },
  eyebrow: { color: palette.blueBright, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: palette.text, fontSize: 30, fontWeight: "900", marginTop: 6 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  connected: { borderColor: palette.green, backgroundColor: "#0D302A" },
  disconnected: { borderColor: palette.borderStrong, backgroundColor: palette.surfaceRaised },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { backgroundColor: palette.green },
  dotOff: { backgroundColor: palette.subtle },
  statusText: { color: "#b7c9dc", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  folderCard: { borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 13, overflow: "hidden" },
  positionsFolder: { borderColor: "#1A91B8", backgroundColor: "#0A2130" },
  pendingFolder: { borderColor: "#7655B8", backgroundColor: "#1A1730" },
  folderHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  folderIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  positionsIcon: { backgroundColor: "#123B4C", borderColor: "#287E9D" },
  pendingIcon: { backgroundColor: "#30254C", borderColor: "#7255A8" },
  folderGlyph: { fontSize: 24, fontWeight: "800", color: "#D9F5FF" },
  folderCopy: { flex: 1, minWidth: 0 },
  folderEyebrow: { fontSize: 8, letterSpacing: 1.5, fontWeight: "900" },
  positionsAccent: { color: "#56D5F5" },
  pendingAccent: { color: "#C2A3FF" },
  folderTitle: { color: palette.text, fontSize: 15, fontWeight: "900", marginTop: 3 },
  folderSubtitle: { color: palette.muted, fontSize: 9, marginTop: 3 },
  folderCount: { minWidth: 54, alignItems: "center", borderRadius: 12, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 8 },
  positionsCount: { backgroundColor: "#103749", borderColor: "#287E9D" },
  pendingCount: { backgroundColor: "#30254C", borderColor: "#7255A8" },
  folderCountNumber: { fontSize: 16, fontWeight: "900" },
  folderCountLabel: { color: palette.muted, fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  folderChevron: { width: 27, height: 27, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  positionsChevron: { backgroundColor: "#16475B" },
  pendingChevron: { backgroundColor: "#3A2C5D" },
  folderChevronText: { color: palette.text, fontSize: 17, fontWeight: "700", marginTop: -2 },
  card: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 18, padding: 18, marginBottom: 13 },
  cardLabel: { color: palette.muted, fontSize: 10, letterSpacing: 1.7, fontWeight: "800" },
  email: { color: palette.text, fontSize: 17, fontWeight: "700", marginTop: 12 },
  moduleTitle: { color: palette.text, fontSize: 19, fontWeight: "800", marginTop: 10 },
  description: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 9 },
  metrics: { flexDirection: "row", gap: 12, marginTop: 18, marginBottom: 4 },
  currencyRow: { flexDirection: "row", gap: 7, marginTop: 8 },
  currencyButton: { borderWidth: 1, borderColor: palette.border, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  currencyActive: { borderColor: palette.blue, backgroundColor: palette.surfaceBlue },
  currencyText: { color: palette.muted, fontSize: 10, fontWeight: "800" },
  currencyTextActive: { color: palette.blueBright },
  metric: { flex: 1, backgroundColor: palette.background, borderRadius: 12, padding: 12 },
  metricValue: { color: palette.text, fontSize: 17, fontWeight: "800", marginTop: 7 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakEvenRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 14 },
  breakEvenToggle: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 9 },
  breakEvenOn: { borderColor: palette.green, backgroundColor: "#0D302A" },
  breakEvenOff: { borderColor: palette.borderStrong, backgroundColor: palette.surfaceRaised },
  breakEvenToggleText: { color: palette.text, fontSize: 11, fontWeight: "900" },
  breakEvenInput: { borderWidth: 1, borderColor: palette.border, borderRadius: 10, padding: 12, color: palette.text, marginTop: 7, backgroundColor: palette.background },
  breakEvenSave: { alignItems: "center", padding: 12, borderRadius: 10, backgroundColor: palette.surfaceBlue, marginTop: 9 },
  breakEvenSaveText: { color: palette.blueBright, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
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