import { useEffect, useState } from "react";
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { palette, radius } from "../src/lib/theme";
import { mopsentryLogo } from "../src/lib/brand";
import { AmbientBackground } from "../src/components/AmbientBackground";

type AuthMode = "sign-in" | "sign-up" | "forgot";

const websiteResetUrl = "https://unkelmops.github.io/MOPSENTRY-WEBSITE-/auth?mode=recovery";
const websiteConfirmUrl = "https://unkelmops.github.io/MOPSENTRY-WEBSITE-/dashboard";

export default function SignInScreen() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) router.replace("/home");
    });
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        redirectTimer = setTimeout(() => router.replace("/home"), 0);
      }
    });
    return () => {
      mounted = false;
      if (redirectTimer) clearTimeout(redirectTimer);
      data.subscription.unsubscribe();
    };
  }, []);

  async function submit() {
    setBusy(true); setMessage("");
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) { setMessageKind("error"); setMessage(error.message); }
      } else if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: websiteConfirmUrl },
        });
        if (error) { setMessageKind("error"); setMessage(error.message); }
        else if (!data.session) {
          setMessageKind("success");
          setMessage("Account request received. Check your inbox and spam folder for the confirmation email. Once confirmed, return here to sign in.");
        } else router.replace("/home");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: websiteResetUrl });
        if (error) { setMessageKind("error"); setMessage(error.message); }
        else {
          setMessageKind("success");
          setMessage("If an account exists for this email, a reset link will be sent. Open it to reset your password on the secure MOPSENTRY page, then return here to sign in.");
        }
      }
    } catch (e) {
      setMessageKind("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  const title = mode === "sign-in" ? "Welcome back." : mode === "sign-up" ? "Create your account." : "Reset your password.";
  const hint = mode === "sign-in" ? "Sign in to your MOPSENTRY workspace and monitor your connected EA." : mode === "sign-up" ? "Create your MOPSENTRY account. We will send a confirmation email." : "Enter your account email and we will send you a secure reset link.";
  const canSubmit = Boolean(email.trim()) && (mode === "forgot" || password.length >= 6);

  return (
    <SafeAreaView style={styles.safe}>
      <AmbientBackground />
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brandBlock}>
            <Image source={{ uri: mopsentryLogo }} resizeMode="contain" style={styles.loginLogo} accessibilityLabel="MOPSENTRY logo"/>
            <Text style={styles.tagline}>INTELLIGENCE. CONTROL. PRECISION.</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelTop}><View style={styles.liveDot}/><Text style={styles.panelEyebrow}>SECURE ACCESS PORTAL</Text></View>
            <Text style={styles.heading}>{title}</Text>
            <Text style={styles.hint}>{hint}</Text>

            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input} value={email} onChangeText={setEmail}
              placeholder="you@example.com" placeholderTextColor={palette.subtle}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              textContentType="emailAddress" autoComplete="email"
            />
            {mode !== "forgot" ? <>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <TextInput
                style={styles.input} value={password} onChangeText={setPassword}
                placeholder="Enter your password" placeholderTextColor={palette.subtle}
                secureTextEntry textContentType={mode === "sign-up" ? "newPassword" : "password"}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                onSubmitEditing={() => { if (canSubmit && !busy) void submit(); }}
                returnKeyType="go"
              />
            </> : null}
            {mode === "sign-in" ? <Pressable onPress={() => { setMode("forgot"); setMessage(""); }} style={styles.forgot}><Text style={styles.forgotText}>Forgot password?</Text></Pressable> : null}
            {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, messageKind === "error" ? styles.messageError : styles.messageSuccess]}>{message}</Text> : null}
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed, (busy || !canSubmit) && styles.disabled]} onPress={() => void submit()} disabled={busy || !canSubmit}>
              {busy ? <ActivityIndicator color={palette.background}/> : <Text style={styles.primaryText}>{mode === "sign-in" ? "SIGN IN  ↗" : mode === "sign-up" ? "CREATE ACCOUNT" : "SEND RESET LINK"}</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setPassword(""); setMessage(""); }} disabled={busy} style={styles.secondary}>
              <Text style={styles.secondaryText}>{mode === "sign-in" ? "New to MOPSENTRY? " : "Already have an account? "}<Text style={styles.createText}>{mode === "sign-in" ? "Create account" : "Sign in"}</Text></Text>
            </Pressable>
            {mode === "forgot" ? <Pressable onPress={() => { setMode("sign-in"); setMessage(""); }} style={styles.back}><Text style={styles.forgotText}>Back to sign in</Text></Pressable> : null}
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
  brandBlock: { alignItems: "center", marginBottom: 30 },
  loginLogo: { width: 190, height: 62 },
  tagline: { color: palette.muted, fontSize: 9, letterSpacing: 2.2, marginTop: 8 },
  panel: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: radius.xl, padding: 22 },
  panelTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  liveDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: palette.blue, shadowColor: palette.blue, shadowOpacity: 0.9, shadowRadius: 8 },
  panelEyebrow: { color: palette.blueBright, fontSize: 9, fontWeight: "900", letterSpacing: 1.7 },
  heading: { color: palette.text, fontSize: 27, fontWeight: "900", letterSpacing: -0.6 },
  hint: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 22 },
  fieldLabel: { color: palette.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8 },
  input: { color: palette.text, backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, paddingHorizontal: 15, paddingVertical: 15, fontSize: 14, marginBottom: 17 },
  forgot: { alignSelf: "flex-end", marginTop: -8, marginBottom: 15 },
  forgotText: { color: palette.blueBright, fontSize: 11, fontWeight: "700" },
  message: { fontSize: 11, lineHeight: 17, marginBottom: 13 },
  messageError: { color: palette.red },
  messageSuccess: { color: palette.blueBright },
  primary: { minHeight: 54, borderRadius: radius.md, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center", marginTop: 5 },
  primaryText: { color: palette.background, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.42 },
  secondary: { alignItems: "center", paddingTop: 20, paddingBottom: 4 },
  secondaryText: { color: palette.muted, fontSize: 11 },
  createText: { color: palette.blueBright, fontWeight: "800" },
  back: { alignItems: "center", paddingTop: 15 },
  footer: { alignItems: "center", marginTop: 28 },
  footerTitle: { color: palette.text, fontSize: 9, fontWeight: "900", letterSpacing: 1.6 },
  footerCopy: { color: palette.subtle, fontSize: 10, marginTop: 7 },
  footerMeta: { color: palette.subtle, fontSize: 8, letterSpacing: 1.2, marginTop: 24 },
});
