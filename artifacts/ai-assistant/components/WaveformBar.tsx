import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

interface Props {
  isActive: boolean;
  barCount?: number;
}

function Bar({ index, isActive, color }: { index: number; isActive: boolean; color: string }) {
  const height = useSharedValue(4);

  useEffect(() => {
    if (isActive) {
      const maxH = 8 + Math.random() * 24;
      const duration = 300 + Math.random() * 400;
      const delay = index * 60;
      setTimeout(() => {
        height.value = withRepeat(
          withSequence(
            withTiming(maxH, { duration, easing: Easing.inOut(Easing.ease) }),
            withTiming(4, { duration, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      }, delay);
    } else {
      height.value = withTiming(4, { duration: 300 });
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: color, borderRadius: 2 },
        animStyle,
      ]}
    />
  );
}

export default function WaveformBar({ isActive, barCount = 24 }: Props) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      {Array.from({ length: barCount }).map((_, i) => (
        <Bar key={i} index={i} isActive={isActive} color={colors.primary} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 40,
    paddingHorizontal: 4,
  },
  bar: {
    width: 3,
    minHeight: 4,
  },
});
