import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");

export default function GlowBackground() {
  const colors = useColors();
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <View
        style={[
          styles.glow,
          {
            top: -100,
            left: -60,
            width: 300,
            height: 300,
            backgroundColor: colors.glowCyan,
            borderRadius: 150,
          },
        ]}
      />
      <View
        style={[
          styles.glow,
          {
            top: height * 0.3,
            right: -80,
            width: 260,
            height: 260,
            backgroundColor: colors.glowPurple,
            borderRadius: 130,
          },
        ]}
      />
      <View
        style={[
          styles.glow,
          {
            bottom: 80,
            left: width * 0.3,
            width: 180,
            height: 180,
            backgroundColor: colors.glowCyan,
            borderRadius: 90,
            opacity: 0.5,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    opacity: 0.6,
  },
});
