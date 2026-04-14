import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { CommandStatus } from "@/context/AssistantContext";

interface Props {
  status: CommandStatus;
  size?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

function PulseRing({ index, color, isActive }: { index: number; color: string; isActive: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      const delay = index * 400;
      scale.value = 1;
      opacity.value = 0;
      setTimeout(() => {
        scale.value = withRepeat(
          withTiming(2.5 + index * 0.4, { duration: 1200, easing: Easing.out(Easing.ease) }),
          -1,
          false
        );
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.4, { duration: 200 }),
            withTiming(0, { duration: 1000 })
          ),
          -1,
          false
        );
      }, delay);
    } else {
      scale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isActive]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 80,
          height: 80,
          borderRadius: 40,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: "transparent",
        },
        style,
      ]}
    />
  );
}

export default function VoicePulse({ status, size = 80 }: Props) {
  const colors = useColors();
  const isListening = status === "listening";
  const isProcessing = status === "processing";
  const isExecuting = status === "executing";

  const innerScale = useSharedValue(1);
  const innerOpacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      innerScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (isProcessing) {
      innerScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 400 }),
          withTiming(0.98, { duration: 400 })
        ),
        -1,
        true
      );
      rotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    } else if (isExecuting) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      innerScale.value = withSpring(1);
      rotation.value = withTiming(0, { duration: 300 });
    }
  }, [isListening, isProcessing, isExecuting]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const glowColor =
    isListening
      ? colors.primary
      : isProcessing || isExecuting
      ? colors.accent
      : colors.primary;

  const iconName =
    isProcessing
      ? "sync"
      : isExecuting
      ? "flash"
      : status === "done"
      ? "checkmark"
      : status === "error"
      ? "alert-circle"
      : "mic";

  const iconColor =
    isListening
      ? colors.background
      : isProcessing || isExecuting
      ? "#ffffff"
      : status === "done"
      ? colors.success
      : status === "error"
      ? colors.destructive
      : colors.primary;

  return (
    <View style={styles.container}>
      <PulseRing index={0} color={glowColor} isActive={isListening} />
      <PulseRing index={1} color={glowColor} isActive={isListening} />
      <PulseRing index={2} color={glowColor} isActive={isListening} />

      <Animated.View style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }, orbStyle]}>
        <Animated.View
          style={[
            styles.core,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: isListening
                ? colors.primary
                : isProcessing || isExecuting
                ? colors.accent
                : "transparent",
              borderWidth: isListening || isProcessing || isExecuting ? 0 : 2,
              borderColor: glowColor,
              elevation: 10,
            },
            coreStyle,
          ]}
        >
          <Ionicons name={iconName as any} size={size * 0.42} color={iconColor} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    alignItems: "center",
    justifyContent: "center",
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
  },
});
