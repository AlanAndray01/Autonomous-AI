import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActionCard from "@/components/ActionCard";
import CommandHistoryItem from "@/components/CommandHistoryItem";
import GlowBackground from "@/components/GlowBackground";
import { CommandSession, useAssistant } from "@/context/AssistantContext";
import { useColors } from "@/hooks/useColors";
import { getAppColor } from "@/services/geminiService";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { commandHistory, clearHistory } = useAssistant();
  const [selected, setSelected] = useState<CommandSession | null>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 90;

  const handleClear = () => {
    Alert.alert("Clear History", "Remove all command history?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearHistory },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Command History</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {commandHistory.length} command{commandHistory.length !== 1 ? "s" : ""} executed
          </Text>
        </View>
        {commandHistory.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={[styles.clearBtn, { borderColor: colors.border }]}>
            <MaterialIcons name="delete-outline" size={18} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>

      {commandHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="history" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No commands yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Your executed commands will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={commandHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommandHistoryItem session={item} onPress={() => setSelected(item)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={commandHistory.length > 0}
        />
      )}

      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Command Details</Text>
                <Text style={[styles.modalApp, { color: getAppColor(selected.app) }]}>
                  {selected.app}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <MaterialIcons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={[styles.commandBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MaterialIcons name="format-quote" size={16} color={colors.mutedForeground} />
              <Text style={[styles.commandText, { color: colors.foreground }]}>{selected.rawText}</Text>
            </View>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              ACTIONS ({selected.actions.length})
            </Text>
            <FlatList
              data={selected.actions}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item, index }) => <ActionCard action={item} index={index} />}
              scrollEnabled={!!selected.actions.length}
            />
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    marginTop: 4,
  },
  list: { paddingHorizontal: 20 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 60,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptyDesc: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  modal: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalApp: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  commandBox: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 0.5,
  },
  commandText: { flex: 1, fontSize: 15, fontStyle: "italic", lineHeight: 22 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 10 },
});
