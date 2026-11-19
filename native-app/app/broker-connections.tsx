import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette } from "../src/lib/theme";

type ConnectionKind = "mt5" | "direct-monitor" | "api" | "future";

const options: { id: ConnectionKind; title: string; subtitle: string; status: string; description: string }[] = [
  {
    id: "mt5",
    title: "MetaTrader 5 bridge",
    subtitle: "Keep using your existing MOPSENTRY EA bridge",
    status: "EXISTING SETUP",
    description: "Your existing MT5 EA connection continues to use its current connection key and check-in service. This update does not replace or alter that bridge. View its live status on the Overview screen.",
  },
  {
    id: "direct-monitor",
    title: "Direct MT5 account monitor",
    subtitle: "A separate read-only connection that is not deployed yet",
    status: "BRIDGE NOT READY",
    description: "This is not the existing EA bridge. The separate Windows read-only monitor is not deployed, so saving account details here will not establish a connection.",
  },
  {
    id: "api",
    title: "Direct broker API",
    subtitle: "Connect a broker through its official API",
    status: "COMING LATER",
    description: "The independent engine will support broker-specific integrations. Availability, account eligibility and any API fees will be checked for each broker before connection.",
  },
  {
    id: "future",
    title: "More broker connections",
    subtitle: "Different users can choose different supported brokers",
    status: "PLANNED",
    description: "Your broker choice will not need to match another user's choice. Each person will authorize their own account, and credentials will be stored securely on the server.",
  },
];

export default function BrokerConnectionsScreen() {
  const [selected, setSelected] = useState<ConnectionKind>("mt5");

  const selectedOption = options.find((option) => option.id === selected)!;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹  OVERVIEW</Text>
        </Pressable>

        <Text style={styles.eyebrow}>MOPSENTRY NATIVE</Text>
        <Text style={styles.title}>Broker connections</Text>
        <Text style={styles.intro}>
          Choose how MOPSENTRY will connect to a trading account. The strategy engine is being built separately from broker-specific connections.
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={styles.statusIcon}><Text style={styles.statusIconText}>↔</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>INDEPENDENT ENGINE</Text>
              <Text style={styles.statusTitle}>Independent broker API not linked</Text>
            </View>
            <View style={styles.notConnected}><View style={styles.dot} /><Text style={styles.notConnectedText}>NOT LINKED</Text></View>
          </View>
          <Text style={styles.body}>
            This screen does not replace your existing MT5 EA bridge. Your EA connection and heartbeat remain managed separately.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>CONNECTION METHODS</Text>
        {options.map((option) => {
          const active = selected === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSelected(option.id)}
              style={[styles.option, active && styles.optionActive]}
            >
              <View style={styles.optionTop}>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioInner} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
                <Text style={[styles.optionStatus, option.id === "mt5" ? styles.existing : styles.planned]}>{option.status}</Text>
              </View>
            </Pressable>
          );
        })}

        <View style={styles.detailCard}>
          <Text style={styles.cardLabel}>SELECTED CONNECTION</Text>
          <Text style={styles.detailTitle}>{selectedOption.title}</Text>
          <Text style={styles.body}>{selectedOption.description}</Text>
          {selectedOption.id === "mt5" ? (
            <Pressable onPress={() => router.replace("/home")} style={styles.primary}>
              <Text style={styles.primaryText}>VIEW EXISTING EA OVERVIEW</Text>
            </Pressable>
          ) : selectedOption.id === "direct-monitor" ? (
            <Pressable onPress={() => router.push("/direct-accounts")} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>VIEW READ-ONLY MONITOR SETUP</Text>
            </Pressable>
          ) : (
            <View style={styles.infoNotice}>
              <Text style={styles.infoNoticeText}>Connection setup will become available when the broker-neutral engine and its secure backend are ready. No API keys or passwords are needed at this stage.</Text>
            </View>
          )}
        </View>

        <View style={styles.securityCard}>
          <Text style={styles.cardLabel}>ACCOUNT SECURITY</Text>
          <Text style={styles.securityTitle}>Your account stays yours</Text>
          <Text style={styles.body}>
            Each user will connect their own broker account. Broker passwords, API secrets and signing keys must stay on the secure server, never inside the mobile app or GitHub.
          </Text>
        </View>
        <Text style={styles.footer}>BROKER CONNECTIONS ARE NOT ACTIVE UNTIL AN INTEGRATION IS CONFIGURED.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { padding: 22, paddingBottom: 44 },
  back: { paddingVertical: 12, marginBottom: 20 },
  backText: { color: palette.blueBright, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  eyebrow: { color: palette.blueBright, fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  title: { color: palette.text, fontSize: 29, fontWeight: "900", marginTop: 7 },
  intro: { color: palette.muted, fontSize: 13, lineHeight: 20, marginTop: 10, marginBottom: 22 },
  statusCard: { borderWidth: 1, borderColor: palette.borderStrong, backgroundColor: palette.surfaceBlue, borderRadius: 18, padding: 17, marginBottom: 25 },
  statusTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: palette.surfaceBlue, borderWidth: 1, borderColor: palette.borderStrong, alignItems: "center", justifyContent: "center" },
  statusIconText: { color: palette.blueBright, fontSize: 25, fontWeight: "700" },
  cardLabel: { color: palette.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "800" },
  statusTitle: { color: palette.text, fontSize: 16, fontWeight: "800", marginTop: 5 },
  notConnected: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: palette.borderStrong, backgroundColor: palette.surfaceRaised, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 7 },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: palette.subtle },
  notConnectedText: { color: "#A9BBCE", fontSize: 8, fontWeight: "900" },
  body: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 11 },
  sectionLabel: { color: palette.muted, fontSize: 10, letterSpacing: 1.6, fontWeight: "800", marginBottom: 11 },
  option: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 15, padding: 15, marginBottom: 10 },
  optionActive: { borderColor: "#168bff", backgroundColor: palette.surfaceBlue },
  optionTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  radio: { width: 18, height: 18, borderRadius: 10, borderWidth: 1.5, borderColor: "#607994", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: palette.blueBright },
  radioInner: { width: 8, height: 8, borderRadius: 5, backgroundColor: palette.blueBright },
  optionTitle: { color: palette.text, fontSize: 14, fontWeight: "800" },
  optionSubtitle: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  optionStatus: { fontSize: 8, fontWeight: "900", letterSpacing: 0.4 },
  existing: { color: palette.blueBright },
  planned: { color: "#d0a66a" },
  detailCard: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 18, padding: 18, marginTop: 10, marginBottom: 13 },
  detailTitle: { color: palette.text, fontSize: 18, fontWeight: "900", marginTop: 9 },
  primary: { minHeight: 48, borderRadius: 12, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center", marginTop: 17 },
  primaryText: { color: "#06101d", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  secondaryAction: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: palette.borderStrong, alignItems: "center", justifyContent: "center", marginTop: 15, paddingHorizontal: 12 },
  secondaryActionText: { color: "#A9BBCE", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  infoNotice: { backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 13, marginTop: 16 },
  infoNoticeText: { color: "#9db3cb", fontSize: 11, lineHeight: 17 },
  securityCard: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 18, padding: 18, marginTop: 1 },
  securityTitle: { color: palette.text, fontSize: 15, fontWeight: "800", marginTop: 8 },
  footer: { color: palette.subtle, fontSize: 9, lineHeight: 15, letterSpacing: 1, textAlign: "center", marginTop: 22 },
});