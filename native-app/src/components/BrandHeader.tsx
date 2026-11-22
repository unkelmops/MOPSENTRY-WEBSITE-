import { Image, StyleSheet, View } from "react-native";
import { mopsentryLogo } from "../lib/brand";

export function BrandHeader() {
  return (
    <View style={styles.wrap} accessibilityLabel="MOPSENTRY">
      <Image source={{ uri: mopsentryLogo }} resizeMode="contain" style={styles.logo} accessibilityLabel="MOPSENTRY logo" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 38, justifyContent: "center", alignItems: "flex-start", marginBottom: 12 },
  logo: { width: 142, height: 34 },
});
