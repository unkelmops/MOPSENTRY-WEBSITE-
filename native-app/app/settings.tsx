import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette } from "../src/lib/theme";
import { AmbientBackground } from "../src/components/AmbientBackground";

export default function SettingsScreen() {
  const [email, setEmail] = useState("");
  const [access, setAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) {
          router.replace("/");
          return;
        }
        const { data, error: accessError } = await supabase
          .from("app_access_entitlements")
          .select("enabled")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (accessError) throw accessError;
        if (mounted) {
          setEmail(auth.user.email ?? "");
          setAccess(data?.enabled === true);
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Unable to load settings.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  async function signOut() {
    setLoading(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      setLoading(false);
      return;
    }
    router.replace("/");
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={palette.blue} /><Text style={styles.muted}>Loading settings…</Text></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹  BACK</Text></Pressable>
        <Text style={styles.eyebrow}>MOPSENTRY NATIVE</Text>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.card}>
          <Text style={styles.label}>SIGNED-IN ACCOUNT</Text>
          <Text style={styles.value}>{email || "—"}</Text>
          <Text style={styles.label}>APP ACCESS</Text>
          <Text style={[styles.access, access ? styles.enabled : styles.disabled]}>{access === null ? "UNKNOWN" : access ? "ENABLED" : "NOT ENABLED"}</Text>
        </View>
        <Pressable onPress={() => router.push("/broker-connections")} style={styles.connectionLink}>
          <View style={{ flex: 1 }}>
            <Text style={styles.connectionTitle}>Broker connections</Text>
            <Text style={styles.body}>Manage how MOPSENTRY will connect to supported brokers</Text>
          </View>
          <Text style={styles.connectionArrow}>›</Text>
        </Pressable>
        <View style={styles.card}>
          <Text style={styles.label}>SECURITY</Text>
          <Text style={styles.body}>Your session is stored using the device's secure storage. The app uses your signed-in Supabase session and does not contain a service-role key.</Text>
          <Text style={styles.body}>Robot Start and remote commands remain subject to the server-side access checks and EA connection state.</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={() => void signOut()} style={styles.signOut}><Text style={styles.signOutText}>SIGN OUT</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { padding: 22, paddingBottom: 42 },
  loading: { flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center", gap: 14 },
  muted: { color: palette.muted, fontSize: 13 },
  back: { paddingVertical: 12, marginBottom: 20 },
  backText: { color: palette.blueBright, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  eyebrow: { color: palette.blueBright, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: palette.text, fontSize: 29, fontWeight: "900", marginTop: 7, marginBottom: 22 },
  card: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 18, padding: 18, marginBottom: 14 },
  connectionLink: { borderWidth: 1, borderColor: "#168bff", backgroundColor: palette.surfaceBlue, borderRadius: 16, padding: 17, marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  connectionTitle: { color: palette.text, fontSize: 15, fontWeight: "800" },
  connectionArrow: { color: palette.blueBright, fontSize: 28, fontWeight: "300" },
  label: { color: palette.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "800" },
  value: { color: palette.text, fontSize: 16, fontWeight: "700", marginTop: 9, marginBottom: 22 },
  access: { fontSize: 13, fontWeight: "900", marginTop: 9 },
  enabled: { color: palette.green },
  disabled: { color: palette.amber },
  body: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 10 },
  error: { color: "#FF9BA8", fontSize: 12, marginVertical: 10 },
  signOut: { borderWidth: 1, borderColor: "#703344", backgroundColor: "#291722", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  signOutText: { color: "#FF9BA8", fontSize: 12, fontWeight: "900", letterSpacing: 1.2 },
});