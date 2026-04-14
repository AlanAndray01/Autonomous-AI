import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { ParsedAction } from "@/context/AssistantContext";
import { formatActionLabel, getActionIcon } from "@/services/geminiService";

interface Props {
  action: ParsedAction;
  index: number;
}

export default function ActionCard({ action, index }: Props) {
  const colors = useColors();
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    translateY.value = withDelay(index * 80, withSpring(0, { damping: 15 }));
    opacity.value = withDelay(index * 80, withTiming(1, { duration: 200 }));
    scale.value = withDelay(index * 80, withSpring(1, { damping: 15 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const statusColor =
    action.status === "done"
      ? colors.success
      : action.status === "running"
      ? colors.primary
      : action.status === "failed"
      ? colors.destructive
      : colors.mutedForeground;

  const statusIcon =
    action.status === "done"
      ? "check-circle"
      : action.status === "running"
      ? "radio-button-checked"
      : action.status === "failed"
      ? "error"
      : "radio-button-unchecked";

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor:
            action.status === "running" ? colors.primary : colors.border,
          borderWidth: action.status === "running" ? 1 : 0.5,
        },
        animStyle,
      ]}
    >
      <View
        style={[
          styles.stepNum,
          {
            backgroundColor:
              action.status === "running" ? colors.primary : colors.secondary,
          },
        ]}
      >
        <Text
          style={[
            styles.stepText,
            {
              color:
                action.status === "running"
                  ? colors.primaryForeground
                  : colors.mutedForeground,
            },
          ]}
        >
          {index + 1}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <MaterialIcons
            name={getActionIcon(action.type) as any}
            size={14}
            color={colors.mutedForeground}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.typeLabel, { color: colors.mutedForeground }]}>
            {action.type.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {formatActionLabel(action)}
        </Text>
      </View>

      <MaterialIcons name={statusIcon as any} size={18} color={statusColor} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
});
