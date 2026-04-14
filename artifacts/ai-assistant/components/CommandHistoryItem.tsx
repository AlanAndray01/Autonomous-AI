import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { CommandSession } from "@/context/AssistantContext";
import { getAppColor } from "@/services/geminiService";

interface Props {
  session: CommandSession;
  onPress: () => void;
}

export default function CommandHistoryItem({ session, onPress }: Props) {
  const colors = useColors();
  const appColor = getAppColor(session.app);
  const timeAgo = formatTimeAgo(session.timestamp);

  const statusColor =
    session.status === "success"
      ? colors.success
      : session.status === "partial"
      ? colors.warning
      : colors.destructive;

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.appDot, { backgroundColor: `${appColor}33`, borderColor: `${appColor}66` }]}>
        <View style={[styles.dot, { backgroundColor: appColor }]} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.command, { color: colors.foreground }]} numberOfLines={1}>
          {session.rawText}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.app, { color: appColor }]}>{session.app}</Text>
          <Text style={[styles.dot2, { color: colors.mutedForeground }]}> · </Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo}</Text>
          <Text style={[styles.dot2, { color: colors.mutedForeground }]}> · </Text>
          <Text style={[styles.steps, { color: colors.mutedForeground }]}>
            {session.actions.length} step{session.actions.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>
      <MaterialIcons name="circle" size={8} color={statusColor} />
    </TouchableOpacity>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    gap: 12,
  },
  appDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  command: {
    fontSize: 14,
    fontWeight: "500",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
  },
  app: {
    fontSize: 12,
    fontWeight: "600",
  },
  dot2: {
    fontSize: 12,
  },
  time: {
    fontSize: 12,
  },
  steps: {
    fontSize: 12,
  },
});
