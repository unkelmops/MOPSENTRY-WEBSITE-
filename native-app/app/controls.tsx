import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette } from "../src/lib/theme";
import { BrandHeader } from "../src/components/BrandHeader";
import { AmbientBackground } from "../src/components/AmbientBackground";
import { recordActivity } from "../src/lib/activity-log";

const PAIRS = ["XAUUSD","US30","NAS100","BTCUSD","GER30","EURUSD","GBPUSD","USDJPY","GBPJPY","AUDUSD","USDCAD"];
const TIMEFRAMES = ["M1","M5","M15","M30","H1","H4","D1"];
const HIGHER_TIMEFRAMES = ["M5","M15","M30","H1","H4","D1"];
const PANELS = ["SETUP","RISK","PROTECTION","PAIRS","ACTIVITY"] as const;
type Panel = typeof PANELS[number];
type Settings = {
  is_running: boolean; strategy: string; timeframe: string; higher_timeframe: string;
  scalper_frequency: string; lot_size: number; risk_percent: number; max_trades: number;
  pairs: string[]; alerts_enabled: boolean; break_even_enabled: boolean; break_even_trigger: number;
};
type Account = { status: string; last_heartbeat: string | null };
type Command = { id: string; command: string; status: string; created_at: string; confirmed_at: string | null };
type ActivityRow = { id: string; event_type: string; status: string; message: string; created_at: string };
const defaults: Settings = { is_running:false,strategy:"trend",timeframe:"M5",higher_timeframe:"H4",scalper_frequency:"standard",lot_size:0.01,risk_percent:1,max_trades:3,pairs:["XAUUSD"],alerts_enabled:true,break_even_enabled:false,break_even_trigger:10 };
const fresh = (a: Account | null) => { const t=a?.last_heartbeat?new Date(a.last_heartbeat).getTime():0; return a?.status==="connected" && Number.isFinite(t) && Date.now()-t>=0 && Date.now()-t<30000; };

export default function ControlsScreen() {
 const [s,setS]=useState<Settings>(defaults),[saved,setSaved]=useState<Settings>(defaults);
 const [account,setAccount]=useState<Account|null>(null),[access,setAccess]=useState(false),[owner,setOwner]=useState(false),[vpsReady,setVpsReady]=useState(false);
 const [command,setCommand]=useState<Command|null>(null),[activity,setActivity]=useState<ActivityRow[]>([]);
 const [panel,setPanel]=useState<Panel>("SETUP"),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(""),[updated,setUpdated]=useState<Date|null>(null);
 const dirty=useMemo(()=>JSON.stringify(s)!==JSON.stringify(saved),[s,saved]);
 const connected=fresh(account),waiting=!!command&&["pending","delivered"].includes(command.status);
 const refresh=useCallback(async()=>{
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user){router.replace("/");return;}
  const appMeta=auth.user.app_metadata??{};\n  const isOwner=appMeta.role==="owner"||appMeta.is_owner===true||appMeta.vps_entitled===true||(Array.isArray(appMeta.roles)&&appMeta.roles.includes("owner"));\n  setOwner(isOwner);\n  const db=supabase as any;
  const [ar,tr,sr,cr,vr,lr]=await Promise.all([
   db.from("app_access_entitlements").select("enabled").eq("user_id",auth.user.id).maybeSingle(),
   db.from("trading_accounts").select("status,last_heartbeat").eq("user_id",auth.user.id).maybeSingle(),
   db.from("robot_settings").select("*").eq("user_id",auth.user.id).maybeSingle(),
   db.from("robot_commands").select("id,command,status,created_at,confirmed_at").eq("user_id",auth.user.id).eq("command","CLOSE_ALL").order("created_at",{ascending:false}).limit(1).maybeSingle(),
   db.from("vps_orders").select("id").eq("user_id",auth.user.id).eq("status","active").order("created_at",{ascending:false}).limit(1).maybeSingle(),
   db.from("mopsentry_activity_log").select("id,event_type,status,message,created_at").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(15)
  ]);
  for(const x of [ar,tr,sr,cr,vr,lr]) if(x.error) throw x.error;
  let row=sr.data;
  if(!row){const created=await db.from("robot_settings").insert({user_id:auth.user.id}).select("*").single();if(created.error)throw created.error;row=created.data;}
  const normalized:Settings={...defaults,...row,pairs:Array.isArray(row.pairs)?row.pairs:defaults.pairs};
  setS(normalized);setSaved(normalized);setAccess(ar.data?.enabled===true);setAccount(tr.data);setCommand(cr.data);setActivity(lr.data??[]);
  if(vr.data){const ir=await db.from("vps_instances").select("id").eq("order_id",vr.data.id).eq("status","active").maybeSingle();if(ir.error)throw ir.error;setVpsReady(!!ir.data);}else setVpsReady(false);
  setUpdated(new Date());setError("");
 },[]);
 useEffect(()=>{let active=true;let running=false;const load=async()=>{if(running)return;running=true;try{await refresh();}catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load robot controls.");}finally{if(active)setLoading(false);running=false;}};void load();const timer=setInterval(()=>{if(active)void load();},5000);return()=>{active=false;clearInterval(timer);};},[refresh]);

 async function saveAll(){
  if(saving||!dirty)return;
  if(!s.pairs.length){setError("Select at least one trading pair.");return;}
  if(!TIMEFRAMES.includes(s.timeframe)||!HIGHER_TIMEFRAMES.includes(s.higher_timeframe)){setError("Choose valid timeframes.");return;}
  if(!Number.isFinite(Number(s.lot_size))||s.lot_size<=0||!Number.isFinite(Number(s.risk_percent))||s.risk_percent<=0||!Number.isInteger(Number(s.max_trades))||s.max_trades<1){setError("Check lot size, risk and maximum trades.");return;}
  if(!Number.isFinite(Number(s.break_even_trigger))||s.break_even_trigger<=0){setError("Break-even trigger must be greater than zero.");return;}
  setSaving(true);setError("");
  try{const {data:auth,error:ae}=await supabase.auth.getUser();if(ae||!auth.user)throw new Error("Please sign in again.");
   const patch={strategy:s.strategy,timeframe:s.timeframe,higher_timeframe:s.higher_timeframe,scalper_frequency:s.scalper_frequency,lot_size:Number(s.lot_size),risk_percent:Number(s.risk_percent),max_trades:Number(s.max_trades),pairs:s.pairs,alerts_enabled:s.alerts_enabled,break_even_enabled:s.break_even_enabled,break_even_trigger:Number(s.break_even_trigger),updated_at:new Date().toISOString()};
   const {error:e}=await (supabase as any).from("robot_settings").update(patch).eq("user_id",auth.user.id);if(e)throw e;
   await recordActivity("settings_saved","saved","Robot settings saved",patch);
   const next={...s};setSaved(next);Alert.alert("Settings saved","MOPSENTRY EA will receive the saved settings on its next check-in.");
  }catch(e){setError(e instanceof Error?e.message:"Could not save settings.");}finally{setSaving(false);void refresh();}
 }
 async function toggleRobot(){
  if(!s||busy)return;const next=!s.is_running;
  if(next&&!access){setError("App Access is required before MOPSENTRY can start.");return;}
  if(next&&!owner&&!vpsReady){setError("An active MOPSENTRY VPS subscription is required before starting.");router.push("/vps");return;}
  if(next&&!connected){setError("A fresh MT5/EA heartbeat is required before MOPSENTRY can start.");return;}
  if(next&&dirty){setError("Save your settings first, then press Start.");return;}
  setBusy(true);setError("");
  try{const {data:auth,error:ae}=await supabase.auth.getUser();if(ae||!auth.user)throw new Error("Please sign in again.");
   const {error:e}=await (supabase as any).from("robot_settings").update({is_running:next,updated_at:new Date().toISOString()}).eq("user_id",auth.user.id);if(e)throw e;
   setS(p=>({...p,is_running:next}));setSaved(p=>({...p,is_running:next}));
   await recordActivity(next?"robot_started":"robot_stopped","saved",next?"Robot start setting saved":"Robot stop setting saved",{is_running:next});
  }catch(e){setError(e instanceof Error?e.message:"Could not change robot state.");}finally{setBusy(false);void refresh();}
 }
 function closeAllConfirm(){
  if(busy)return;if(!connected){setError("Close All requires a fresh MT5/EA heartbeat.");return;}if(waiting){setError("A Close All request is already awaiting acknowledgement.");return;}
  Alert.alert("Close all positions?","This sends CLOSE_ALL to your connected EA. Pending orders are not cancelled.",[{text:"Cancel",style:"cancel"},{text:"Send command",style:"destructive",onPress:()=>void sendCloseAll()}]);
 }
 async function sendCloseAll(){
  setBusy(true);setError("");try{const {data:auth,error:ae}=await supabase.auth.getUser();if(ae||!auth.user)throw new Error("Please sign in again.");
   const db=supabase as any;const {data:latest,error:le}=await db.from("robot_commands").select("id").eq("user_id",auth.user.id).eq("command","CLOSE_ALL").in("status",["pending","delivered"]).limit(1).maybeSingle();if(le)throw le;if(latest)throw new Error("A Close All request is already awaiting acknowledgement.");
   const {data,error:e}=await db.from("robot_commands").insert({user_id:auth.user.id,command:"CLOSE_ALL",status:"pending"}).select("id,command,status,created_at,confirmed_at").single();if(e)throw e;setCommand(data);await recordActivity("close_all","queued","Close All command queued",{command_id:data.id});
  }catch(e){setError(e instanceof Error?e.message:"Could not queue Close All.");}finally{setBusy(false);void refresh();}
 }
 const set=(patch:Partial<Settings>)=>setS(p=>({...p,...patch}));
 const chip=(label:string,active:boolean,onPress:()=>void)=><Pressable key={label} onPress={onPress} style={[styles.chip,active&&styles.chipActive]}><Text style={[styles.chipText,active&&styles.chipTextActive]}>{label}</Text></Pressable>;

 if(loading)return <View style={styles.loading}><ActivityIndicator color={palette.blue}/><Text style={styles.muted}>Loading MOPSENTRY control deck…</Text></View>;
 return <SafeAreaView style={styles.safe}><AmbientBackground/><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
  <BrandHeader/><Text style={styles.eyebrow}>MOPSENTRY / CONTROL DECK</Text><Text style={styles.title}>Robot controls</Text>
  <View style={styles.hero}><View style={styles.heroRow}><View><Text style={styles.label}>EXECUTION STATUS</Text><Text style={styles.heroTitle}>{s.is_running?"Robot running":"Robot stopped"}</Text><Text style={styles.body}>{connected?"MT5 heartbeat fresh":"MT5 connection offline"}</Text></View><View style={[styles.pill,connected?styles.pillOn:styles.pillOff]}><Text style={styles.pillText}>{connected?"CONNECTED":"OFFLINE"}</Text></View></View>
   <Pressable disabled={busy||(!s.is_running&&(!access||!connected||(!owner&&!vpsReady)||dirty))} onPress={()=>void toggleRobot()} style={[styles.startButton,s.is_running&&styles.stopButton,(!s.is_running&&(!access||!connected||(!owner&&!vpsReady)||dirty))&&styles.disabled]}>{busy?<ActivityIndicator color="#fff"/>:<Text style={styles.startText}>{s.is_running?"STOP MOPSENTRY":"START MOPSENTRY"}</Text>}</Pressable>
   {!access?<Text style={styles.warning}>App Access is not enabled.</Text>:null}{owner?<Text style={styles.success}>MOPSENTRY VPS ACCESS ACTIVE · APPROVED ACCOUNT</Text>:null}{!owner&&!vpsReady?<Pressable onPress={()=>router.push("/vps")}><Text style={styles.warning}>Active MOPSENTRY VPS required · VIEW PACKAGES ›</Text></Pressable>:null}{!connected?<Text style={styles.warning}>Connect MT5 and wait for a fresh EA heartbeat.</Text>:null}{dirty?<Text style={styles.warning}>Save your settings before starting.</Text>:null}
  </View>
  <View style={styles.panelTabs}>{PANELS.map(p=>chip(p,panel===p,()=>setPanel(p)))}</View>
  {panel==="SETUP"?<>
   <View style={styles.card}><Text style={styles.sectionTitle}>STRATEGY ENGINE</Text><View style={styles.wrap}>{chip("TREND",s.strategy==="trend",()=>set({strategy:"trend"}))}{chip("SCALPER",s.strategy==="scalp"||s.strategy==="scalper",()=>set({strategy:"scalp"}))}{chip("GRID",s.strategy==="grid",()=>set({strategy:"grid"}))}</View>
    <Text style={styles.body}>{s.strategy==="trend"?"Fibonacci retracement entries with trend filtering and candle-close confirmation.":s.strategy==="scalp"||s.strategy==="scalper"?"Faster Fibonacci-based entries without waiting for candle-close confirmation.":"Liquidity-sweep logic around previous swing levels, using pending orders."}</Text>
   </View>
   <View style={styles.card}><Text style={styles.sectionTitle}>TIMEFRAME MATRIX</Text><Text style={styles.label}>HIGHER TIMEFRAME · TREND FILTER</Text><View style={styles.wrap}>{HIGHER_TIMEFRAMES.map(t=>chip(t,s.higher_timeframe===t,()=>set({higher_timeframe:t})))}</View><Text style={styles.label}>REQUESTED / ENTRY TIMEFRAME</Text><View style={styles.wrap}>{TIMEFRAMES.map(t=>chip(t,s.timeframe===t,()=>set({timeframe:t})))}</View></View>
   {(s.strategy==="scalp"||s.strategy==="scalper")?<View style={styles.card}><Text style={styles.sectionTitle}>SCALPER ENTRY FREQUENCY</Text><View style={styles.wrap}>{chip("STANDARD",s.scalper_frequency==="standard",()=>set({scalper_frequency:"standard"}))}{chip("AGGRESSIVE",s.scalper_frequency==="aggressive",()=>set({scalper_frequency:"aggressive"}))}</View><Text style={styles.body}>Aggressive frequency can increase entry frequency and risk. Lot size and trade cap remain unchanged.</Text></View>:null}
  </>:null}
  {panel==="RISK"?<View style={styles.card}><Text style={styles.sectionTitle}>RISK & EXECUTION</Text>{([["Lot size","lot_size","0.01"],["Risk percent","risk_percent","1"],["Maximum trades","max_trades","3"]] as const).map(([label,key,placeholder])=><View key={key} style={styles.field}><Text style={styles.label}>{label.toUpperCase()}</Text><TextInput value={String(s[key])} onChangeText={v=>set({[key]:Number(v)||0} as Partial<Settings>)} keyboardType="decimal-pad" placeholder={placeholder} placeholderTextColor={palette.subtle} style={styles.input}/></View>)}<Text style={styles.body}>Maximum trades is the total EA trade cap, including positions and pending orders.</Text></View>:null}
  {panel==="PROTECTION"?<View style={styles.card}><Text style={styles.sectionTitle}>BREAK-EVEN PROTECTION</Text><View style={styles.switchRow}><View style={{flex:1}}><Text style={styles.itemTitle}>Enable break-even</Text><Text style={styles.body}>Move stop loss to entry when the floating-profit threshold is reached.</Text></View><Switch value={s.break_even_enabled} onValueChange={v=>set({break_even_enabled:v})} trackColor={{false:palette.borderStrong,true:palette.green}} thumbColor="#fff"/></View><Text style={styles.label}>FLOATING-PROFIT TRIGGER</Text><TextInput value={String(s.break_even_trigger)} onChangeText={v=>set({break_even_trigger:Number(v)||0})} keyboardType="decimal-pad" style={styles.input} placeholder="10.00" placeholderTextColor={palette.subtle}/><View style={styles.switchRow}><View style={{flex:1}}><Text style={styles.itemTitle}>Trading alerts</Text><Text style={styles.body}>Allow MOPSENTRY alerts to be enabled in the app.</Text></View><Switch value={s.alerts_enabled} onValueChange={v=>set({alerts_enabled:v})} trackColor={{false:palette.borderStrong,true:palette.green}} thumbColor="#fff"/></View></View>:null}
  {panel==="PAIRS"?<View style={styles.card}><Text style={styles.sectionTitle}>TRADING INSTRUMENTS</Text><Text style={styles.body}>The EA must only trade the pairs selected here. Select at least one instrument.</Text><View style={styles.wrap}>{PAIRS.map(p=>chip(p,s.pairs.includes(p),()=>set({pairs:s.pairs.includes(p)?s.pairs.filter(x=>x!==p):[...s.pairs,p]})))}</View><Text style={styles.label}>{s.pairs.length} PAIR(S) SELECTED</Text></View>:null}
  {panel==="ACTIVITY"?<View style={styles.card}><Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>{activity.length?activity.map(a=><View key={a.id} style={styles.activityRow}><View style={[styles.activityDot,{backgroundColor:a.status==="failed"?palette.red:a.status==="queued"?palette.amber:palette.green}]}/><View style={{flex:1}}><Text style={styles.itemTitle}>{a.message}</Text><Text style={styles.body}>{a.status.toUpperCase()} · {new Date(a.created_at).toLocaleString()}</Text></View></View>):<Text style={styles.body}>No recent activity has been recorded.</Text>}</View>:null}
  <View style={styles.saveCard}><View style={{flex:1}}><Text style={styles.itemTitle}>{dirty?"UNSAVED CHANGES":"ALL SETTINGS SAVED"}</Text><Text style={styles.body}>EA applies saved settings on its next check-in.</Text></View><Pressable disabled={!dirty||saving} onPress={()=>void saveAll()} style={[styles.saveButton,(!dirty||saving)&&styles.disabled]}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.saveText}>SAVE</Text>}</Pressable></View>
  <View style={styles.card}><Text style={styles.sectionTitle}>POSITION MANAGEMENT</Text><Text style={styles.body}>Close All sends a command to the connected EA. It does not cancel pending orders.</Text><Pressable disabled={busy||!connected||waiting} onPress={closeAllConfirm} style={[styles.closeButton,(!connected||waiting||busy)&&styles.disabled]}><Text style={styles.closeText}>{waiting?"WAITING FOR EA ACKNOWLEDGEMENT":"CLOSE ALL POSITIONS"}</Text></Pressable>{command?<Text style={styles.body}>Latest command: {command.status.toUpperCase()} · {new Date(command.created_at).toLocaleString()}</Text>:null}</View>
  {error?<Text style={styles.error}>{error}</Text>:null}<Text style={styles.footer}>Refreshes every 5 seconds · {updated?.toLocaleTimeString()??"—"}</Text>
 </ScrollView></SafeAreaView>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:palette.background},content:{padding:18,paddingBottom:45},loading:{flex:1,backgroundColor:palette.background,alignItems:"center",justifyContent:"center",gap:12},
 eyebrow:{color:palette.blueBright,fontSize:10,fontWeight:"900",letterSpacing:2,marginTop:10},title:{color:palette.text,fontSize:29,fontWeight:"900",marginTop:7,marginBottom:16},
 hero:{borderWidth:1,borderColor:palette.borderStrong,backgroundColor:palette.surfaceBlue,borderRadius:18,padding:16,marginBottom:14},heroRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
 label:{color:palette.muted,fontSize:9,fontWeight:"900",letterSpacing:1.2},heroTitle:{color:palette.text,fontSize:21,fontWeight:"900",marginTop:7},body:{color:palette.muted,fontSize:11,lineHeight:18,marginTop:7},
 pill:{borderRadius:18,borderWidth:1,paddingHorizontal:10,paddingVertical:7},pillOn:{borderColor:palette.green},pillOff:{borderColor:palette.border},pillText:{color:palette.text,fontSize:8,fontWeight:"900"},
 startButton:{height:48,backgroundColor:palette.blue,borderRadius:11,alignItems:"center",justifyContent:"center",marginTop:15},stopButton:{backgroundColor:"#A63249"},startText:{color:"#fff",fontSize:11,fontWeight:"900",letterSpacing:1.2},
 warning:{color:palette.amber,fontSize:10,fontWeight:"700",marginTop:9},disabled:{opacity:.4},panelTabs:{flexDirection:"row",flexWrap:"wrap",gap:6,marginBottom:12},
 chip:{borderWidth:1,borderColor:palette.border,borderRadius:9,paddingHorizontal:11,paddingVertical:9,backgroundColor:palette.surface},chipActive:{borderColor:palette.blue,backgroundColor:palette.surfaceBlue},chipText:{color:palette.muted,fontSize:9,fontWeight:"800"},chipTextActive:{color:palette.blueBright},
 card:{borderWidth:1,borderColor:palette.border,backgroundColor:palette.surface,borderRadius:16,padding:16,marginBottom:12},sectionTitle:{color:palette.text,fontSize:12,fontWeight:"900",letterSpacing:1.1,marginBottom:12},
 wrap:{flexDirection:"row",flexWrap:"wrap",gap:7,marginVertical:10},field:{marginTop:13},input:{borderWidth:1,borderColor:palette.borderStrong,backgroundColor:palette.surfaceRaised,borderRadius:10,paddingHorizontal:13,paddingVertical:11,color:palette.text,fontSize:14,marginTop:7},
 switchRow:{flexDirection:"row",alignItems:"center",gap:10,marginVertical:12},itemTitle:{color:palette.text,fontSize:12,fontWeight:"800"},activityRow:{flexDirection:"row",alignItems:"flex-start",gap:10,borderTopWidth:1,borderTopColor:palette.border,paddingVertical:11},activityDot:{width:7,height:7,borderRadius:4,marginTop:5},
 saveCard:{flexDirection:"row",alignItems:"center",gap:12,borderWidth:1,borderColor:palette.borderStrong,backgroundColor:"#09182A",borderRadius:15,padding:13,marginBottom:12},saveButton:{backgroundColor:palette.blue,borderRadius:9,paddingHorizontal:19,paddingVertical:12},saveText:{color:"#fff",fontSize:10,fontWeight:"900",letterSpacing:1},
 closeButton:{borderWidth:1,borderColor:"#703344",backgroundColor:"#291722",borderRadius:10,padding:14,alignItems:"center",marginTop:13},closeText:{color:"#FF9BA8",fontSize:10,fontWeight:"900",letterSpacing:.8},
 error:{color:palette.red,fontSize:11,marginVertical:10},muted:{color:palette.muted,fontSize:12},footer:{color:palette.subtle,fontSize:9,textAlign:"center",marginVertical:10}
});
