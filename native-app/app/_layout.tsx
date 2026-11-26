import { Tabs, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { palette } from "../src/lib/theme";

const destinations = [
  { name: "home", href: "/home", label: "OVERVIEW", glyph: "⌂" },
  { name: "market-report", href: "/market-report", label: "MARKET", glyph: "⌁" },
  { name: "events", href: "/events", label: "EVENTS", glyph: "◷" },
  { name: "signals", href: "/signals", label: "SIGNALS", glyph: "⌖" },
  { name: "controls", href: "/controls", label: "ROBOT", glyph: "◈" },
  { name: "settings", href: "/settings", label: "ACCOUNT", glyph: "◎" },
] as const;

function AppTabs() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: palette.background },
          animation: "fade",
        }}
        tabBar={({ state }) => {
          const activeRoute = state.routes[state.index]?.name;
          if (!destinations.some(item => item.name === activeRoute)) return null;

          return (
            <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              {destinations.map(item => {
                const active = activeRoute === item.name;
                return (
                  <Pressable
                    key={item.name}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={item.label}
                    onPress={() => router.navigate(item.href)}
                    style={styles.item}
                  >
                    <Text style={[styles.glyph, active && styles.glyphActive]}>{item.glyph}</Text>
                    <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
                    {active ? <View style={styles.indicator} /> : <View style={styles.indicatorSpacer} />}
                  </Pressable>
                );
              })}
            </View>
          );
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="home" options={{ title: "Overview" }} />
        <Tabs.Screen name="market-report" options={{ title: "Market Report" }} />
        <Tabs.Screen name="events" options={{ title: "Events" }} />
        <Tabs.Screen name="signals" options={{ title: "Signals" }} />
        <Tabs.Screen name="controls" options={{ title: "Robot" }} />
        <Tabs.Screen name="settings" options={{ title: "Account" }} />
        <Tabs.Screen name="broker-connections" options={{ href: null }} />
        <Tabs.Screen name="direct-accounts" options={{ href: null }} />
        <Tabs.Screen name="vps" options={{ href: null }} />
        <Tabs.Screen name="auth/callback" options={{ href: null }} />
        <Tabs.Screen name="auth/reset-password" options={{ href: null }} />
      </Tabs>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppTabs />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", backgroundColor: "#091321", borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 10, paddingHorizontal: 7 },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  glyph: { color: palette.subtle, fontSize: 21, lineHeight: 24 },
  glyphActive: { color: palette.blueBright },
  label: { color: palette.subtle, fontSize: 7, fontWeight: "800", letterSpacing: 0.5 },
  labelActive: { color: palette.blueBright },
  indicator: { width: 18, height: 2, borderRadius: 2, backgroundColor: palette.blue, marginTop: 3 },
  indicatorSpacer: { width: 18, height: 2, marginTop: 3 },
});
