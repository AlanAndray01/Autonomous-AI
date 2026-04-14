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
  level?: number;
}

function Bar({
  index,
  isActive,
  color,
  level,
  barCount,
}: {
  index: number;
  isActive: boolean;
  color: string;
  level: number;
  barCount: number;
}) {
  const height = useSharedValue(4);

  useEffect(() => {
    if (!isActive) {
      height.value = withTiming(4, { duration: 300 });
      return;
    }

    if (level > 0.05) {
      const center = barCount / 2;
      const distFromCenter = Math.abs(index - center) / center;
      const envelope = 1 - distFromCenter * 0.5;
      const noise = 0.7 + Math.random() * 0.3;
      const targetH = 4 + level * 32 * envelope * noise;
      height.value = withTiming(targetH, {
        duration: 80,
        easing: Easing.out(Easing.quad),
      });
    } else {
      const maxH = 6 + Math.random() * 12;
      const duration = 350 + Math.random() * 350;
      height.value = withRepeat(
        withSequence(
          withTiming(maxH, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(4, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [isActive, level]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: color,
          borderRadius: 2,
          opacity: isActive ? 0.7 + level * 0.3 : 0.5,
        },
        animStyle,
      ]}
    />
  );
}

export default function WaveformBar({ isActive, barCount = 22, level = 0 }: Props) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      {Array.from({ length: barCount }).map((_, i) => (
        <Bar
          key={i}
          index={i}
          isActive={isActive}
          color={colors.primary}
          level={level}
          barCount={barCount}
        />
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
