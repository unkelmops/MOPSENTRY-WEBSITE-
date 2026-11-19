import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette, radius, spacing } from "../src/lib/theme";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) router.replace("/home");
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/home");
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signIn() {
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) setMessage(error.message);
    setBusy(false);
  }

  async function signUp() {
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) setMessage(error.message);
    else if (!data.session) setMessage("Check your email to confirm your account.");
    else router.replace("/home");
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBlock}>
            <View style={styles.brandMark}><Text style={styles.markText}>M</Text></View>
            <Text style={styles.brand}>MOPSENTRY</Text>
            <Text style={styles.tagline}>INTELLIGENCE. CONTROL. PRECISION.</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelTop}>
              <View style={styles.liveDot} />
              <Text style={styles.panelEyebrow}>SECURE ACCESS PORTAL</Text>
            </View>
            <Text style={styles.heading}>Welcome back.</Text>
            <Text style={styles.hint}>Sign in to your MOPSENTRY workspace and monitor your connected EA.</Text>

            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={palette.subtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
            />
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={palette.subtle}
              secureTextEntry
              textContentType="password"
              autoComplete="current-password"
              onSubmitEditing={() => { if (email.trim() && password.length >= 6 && !busy) void signIn(); }}
              returnKeyType="go"
            />
            {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}
              onPress={() => void signIn()}
              disabled={busy || !email.trim() || password.length < 6}
            >
              {busy ? <ActivityIndicator color={palette.background} /> : <Text style={styles.primaryText}>SIGN IN  ↗</Text>}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void signUp()}
              disabled={busy || !email.trim() || password.length < 6}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>New to MOPSENTRY? <Text style={styles.createText}>Create account</Text></Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerTitle}>PRIVATE BY DESIGN</Text>
            <Text style={styles.footerCopy}>Your session is protected with encrypted device storage.</Text>
            <Text style={styles.footerMeta}>MOPSENTRY MOBILE  ·  SECURE CONNECTION</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 34 },
  brandBlock: { alignItems: "center", marginBottom: 34 },
  brandMark: {
    width: 68, height: 68, borderRadius: 22, borderWidth: 1,
    borderColor: palette.borderStrong, backgroundColor: palette.surfaceBlue,
    alignItems: "center", justifyContent: "center",
    shadowColor: palette.blue, shadowOpacity: 0.28, shadowRadius: 22, elevation: 9,
  },
  markText: { color: palette.blueBright, fontSize: 37, fontWeight: "900", letterSpacing: -2 },
  brand: { color: palette.text, fontSize: 25, fontWeight: "900", letterSpacing: 4, marginTop: 16 },
  tagline: { color: palette.muted, fontSize: 9, letterSpacing: 2.2, marginTop: 8 },
  panel: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: radius.xl, padding: 22 },
  panelTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  liveDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: palette.blue, shadowColor: palette.blue, shadowOpacity: 0.9, shadowRadius: 8 },
  panelEyebrow: { color: palette.blueBright, fontSize: 9, fontWeight: "900", letterSpacing: 1.7 },
  heading: { color: palette.text, fontSize: 27, fontWeight: "900", letterSpacing: -0.6 },
  hint: { color: palette.muted, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 25 },
  fieldLabel: { color: palette.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8 },
  input: { color: palette.text, backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, paddingHorizontal: 15, paddingVertical: 15, fontSize: 14, marginBottom: 18 },
  message: { color: palette.red, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  primary: { minHeight: 54, borderRadius: radius.md, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center", marginTop: 5 },
  primaryText: { color: palette.background, fontSize: 12, fontWeight: "900", letterSpacing: 1.4 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.42 },
  secondary: { alignItems: "center", paddingTop: 20, paddingBottom: 4 },
  secondaryText: { color: palette.muted, fontSize: 12 },
  createText: { color: palette.blueBright, fontWeight: "800" },
  footer: { alignItems: "center", marginTop: 28 },
  footerTitle: { color: palette.text, fontSize: 9, fontWeight: "900", letterSpacing: 1.6 },
  footerCopy: { color: palette.subtle, fontSize: 10, marginTop: 7 },
  footerMeta: { color: palette.subtle, fontSize: 8, letterSpacing: 1.2, marginTop: 24 },
});