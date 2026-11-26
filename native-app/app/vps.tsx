import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette } from "../src/lib/theme";
import { BrandHeader } from "../src/components/BrandHeader";
import { AmbientBackground } from "../src/components/AmbientBackground";

type Order = { id: string; status: string; amount_minor: number; currency: string; created_at: string; current_period_end: string | null };
type Instance = { status: string; region: string | null; hostname: string | null; mt5_terminal_count: number };
const plans = [
  { name: "STARTER", monthly: 189, spec: "1 vCPU · 1 GB RAM · 25 GB NVMe", fit: "One light MT5 setup", tag: "ENTRY" },
  { name: "PRO", monthly: 239, spec: "1 vCPU · 2 GB RAM · 35 GB NVMe", fit: "One MT5 terminal with room for charts and tools", tag: "ESSENTIAL" },
  { name: "TURBO", monthly: 299, spec: "2 vCPU · 3 GB RAM · 40 GB NVMe", fit: "MOPSENTRY EA and a busier MT5 workspace", tag: "POPULAR" },
  { name: "BOOST", monthly: 799, spec: "4 vCPU · 6 GB RAM · 80 GB NVMe", fit: "Heavier charts, indicators and multiple workloads", tag: "PERFORMANCE" },
  { name: "SUPER", monthly: 1269, spec: "4 vCPU · 12 GB RAM · 150 GB NVMe", fit: "High-memory MT5 and demanding workloads", tag: "PREMIUM" },
] as const;
type Term = 3 | 6 | 12;

export default function VpsScreen() {
  const [order, setOrder] = useState<Order | null>(null);
  const [instance, setInstance] = useState<Instance | null>(null);
  const [term, setTerm] = useState<Term>(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) { router.replace("/"); return; }
    const db = supabase as any;
    const { data: orders, error: orderError } = await db.from("vps_orders")
      .select("id,status,amount_minor,currency,created_at,current_period_end")
      .eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1);
    if (orderError) throw orderError;
    const current = orders?.[0] as Order | undefined;
    setOrder(current ?? null);
    if (current) {
      const { data, error: instanceError } = await db.from("vps_instances")
        .select("status,region,hostname,mt5_terminal_count").eq("order_id", current.id).maybeSingle();
      if (instanceError) throw instanceError;
      setInstance(data as Instance | null);
    } else setInstance(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    void load().catch(e => { if (mounted) setError(e instanceof Error ? e.message : "Unable to load VPS subscription."); })
      .finally(() => { if (mounted) setLoading(false); });
    const timer = setInterval(() => { if (mounted) void load().catch(e => setError(e instanceof Error ? e.message : "Unable to refresh VPS status.")); }, 15000);
    return () => { mounted = false; clearInterval(timer); };
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandHeader />
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹  ACCOUNT</Text></Pressable>
        <Text style={styles.eyebrow}>MOPSENTRY MANAGED HOSTING</Text>
        <Text style={styles.title}>VPS Packages</Text>
        <Text style={styles.description}>Keep your MT5 terminal running on a remote Windows VPS while your computer is off. One customer · One VPS · One primary MT5 terminal.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>YOUR SUBSCRIPTION</Text>
          {loading ? <ActivityIndicator color={palette.blue} style={{ marginTop: 15 }} /> : order ? <>
            <Text style={styles.packageTitle}>{order.status.replaceAll("_", " ").toUpperCase()}</Text>
            <Text style={styles.description}>Order created {new Date(order.created_at).toLocaleDateString()}</Text>
            {order.current_period_end ? <Text style={styles.description}>Period end: {new Date(order.current_period_end).toLocaleDateString()}</Text> : null}
            {instance ? <Text style={styles.description}>VPS: {instance.status} · {instance.mt5_terminal_count} MT5 terminal{instance.region ? " · " + instance.region : ""}</Text> : <Text style={styles.muted}>VPS assignment will appear after provisioning.</Text>}
          </> : <Text style={styles.muted}>No VPS subscription or order is linked to this account yet.</Text>}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        <Text style={styles.sectionTitle}>SELECT SUBSCRIPTION TERM</Text>
        <View style={styles.terms}>
          {([{value:3,label:"3 MONTHS"},{value:6,label:"6 MONTHS"},{value:12,label:"1 YEAR"}] as const).map(x =>
            <Pressable key={x.value} onPress={() => setTerm(x.value)} style={[styles.term,x.value===term && styles.termActive]}>
              <Text style={[styles.termText,x.value===term && styles.termTextActive]}>{x.label}</Text>
            </Pressable>
          )}
        </View>
        {plans.map(plan => <View key={plan.name} style={styles.plan}>
          <View style={styles.planHead}><Text style={styles.planName}>{plan.name}</Text><Text style={styles.tag}>{plan.tag}</Text></View>
          <Text style={styles.price}>R{plan.monthly.toLocaleString("en-ZA")}<Text style={styles.perMonth}> / month</Text></Text>
          <Text style={styles.total}>{term}-month total: R{(plan.monthly*term).toLocaleString("en-ZA")}</Text>
          <Text style={styles.spec}>{plan.spec}</Text>
          <Text style={styles.description}>{plan.fit}</Text>
          <Text style={styles.bullet}>✓ Windows Server · RDP access · One MT5 terminal</Text>
          <View style={styles.disabled}><Text style={styles.disabledText}>SUBSCRIPTIONS OPENING SOON</Text></View>
        </View>)}
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>PAYMENTS NOT ENABLED</Text>
          <Text style={styles.description}>These are provisional MOPSENTRY customer prices. Checkout remains disabled while supplier wholesale terms, final pricing, provisioning and PayFast setup are verified. No payment is taken here.</Text>
          <Text style={styles.description}>Once checkout opens, verified payment and VPS assignment status will appear in this screen. Supplier prices are not displayed.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
 safe:{flex:1,backgroundColor:palette.background},content:{padding:20,paddingBottom:48},
 back:{paddingVertical:12,marginBottom:14},backText:{color:palette.blueBright,fontSize:10,fontWeight:"900",letterSpacing:1.4},
 eyebrow:{color:palette.blueBright,fontSize:10,fontWeight:"900",letterSpacing:1.8},title:{color:palette.text,fontSize:30,fontWeight:"900",marginTop:7},
 description:{color:palette.muted,fontSize:12,lineHeight:19,marginTop:9},card:{borderWidth:1,borderColor:palette.border,backgroundColor:palette.surface,borderRadius:18,padding:17,marginVertical:18},
 label:{color:palette.blueBright,fontSize:10,fontWeight:"900",letterSpacing:1.3},packageTitle:{color:palette.text,fontSize:18,fontWeight:"900",marginTop:12},
 muted:{color:palette.muted,fontSize:12,marginTop:12},error:{color:palette.red,fontSize:12,marginTop:10},
 sectionTitle:{color:palette.blueBright,fontSize:10,fontWeight:"900",letterSpacing:1.3,marginTop:6},terms:{flexDirection:"row",gap:7,marginTop:12,marginBottom:15},
 term:{flex:1,borderWidth:1,borderColor:palette.border,borderRadius:9,paddingVertical:12,alignItems:"center",backgroundColor:palette.surface},
 termActive:{backgroundColor:palette.blue,borderColor:palette.blue},termText:{color:palette.muted,fontSize:9,fontWeight:"900"},termTextActive:{color:"#fff"},
 plan:{borderWidth:1,borderColor:palette.border,backgroundColor:palette.surface,borderRadius:17,padding:16,marginBottom:12},
 planHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},planName:{color:palette.text,fontSize:16,fontWeight:"900",letterSpacing:1.2},tag:{color:palette.blueBright,fontSize:9,fontWeight:"900"},
 price:{color:palette.text,fontSize:27,fontWeight:"900",marginTop:13},perMonth:{color:palette.muted,fontSize:11,fontWeight:"600"},total:{color:palette.blueBright,fontSize:12,fontWeight:"800",marginTop:3},
 spec:{color:palette.text,fontSize:12,fontWeight:"700",marginTop:12},bullet:{color:palette.blueBright,fontSize:10,fontWeight:"700",marginTop:12},
 disabled:{backgroundColor:"#243247",borderRadius:10,padding:13,alignItems:"center",marginTop:14},disabledText:{color:"#A8B5C8",fontSize:10,fontWeight:"900",letterSpacing:.8},
 notice:{borderWidth:1,borderColor:palette.border,backgroundColor:palette.surface,borderRadius:15,padding:16,marginTop:6},noticeTitle:{color:palette.amber,fontSize:11,fontWeight:"900",letterSpacing:1}
});
