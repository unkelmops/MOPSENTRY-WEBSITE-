import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const particles = [
  { x: "8%", y: "12%", size: 3, phase: 0 },
  { x: "23%", y: "29%", size: 2, phase: 0.14 },
  { x: "82%", y: "18%", size: 3, phase: 0.28 },
  { x: "68%", y: "39%", size: 2, phase: 0.42 },
  { x: "13%", y: "61%", size: 2, phase: 0.56 },
  { x: "91%", y: "72%", size: 3, phase: 0.7 },
  { x: "43%", y: "83%", size: 2, phase: 0.84 },
  { x: "56%", y: "9%", size: 2, phase: 0.35 },
] as const;

export function AmbientBackground() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.topGlow} />
      <View style={styles.lowerGlow} />
      {particles.map((particle, index) => {
        const offset = particle.phase;
        const opacity = progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.18 + offset * 0.2, 0.5, 0.18 + offset * 0.2],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [12 + index * 2, -16 - index * 2],
        });
        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  topGlow: { position: "absolute", top: -170, right: -120, width: 330, height: 330, borderRadius: 200, backgroundColor: "#0D2B49", opacity: 0.45 },
  lowerGlow: { position: "absolute", bottom: -220, left: -150, width: 360, height: 360, borderRadius: 200, backgroundColor: "#111C3A", opacity: 0.38 },
  particle: { position: "absolute", borderRadius: 5, backgroundColor: "#69C7FF", shadowColor: "#38A7FF", shadowOpacity: 0.9, shadowRadius: 8, elevation: 3 },
});
