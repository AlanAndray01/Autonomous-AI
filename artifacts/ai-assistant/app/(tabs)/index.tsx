import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActionCard from "@/components/ActionCard";
import AppShortcut from "@/components/AppShortcut";
import GlowBackground from "@/components/GlowBackground";
import VoicePulse from "@/components/VoicePulse";
import WaveformBar from "@/components/WaveformBar";
import { ParsedAction, useAssistant } from "@/context/AssistantContext";
import { useColors } from "@/hooks/useColors";
import { ParsedCommand, getAppColor, parseCommand } from "@/services/geminiService";

const SAMPLE_COMMANDS = [
  "Open YouTube, search Labon Ko, play it and set quality to 144p",
  "Turn on WiFi and open Settings",
  "Open Spotify and play lo-fi beats",
  "Set brightness to 80% and go back",
];

const APP_SHORTCUTS = [
  { name: "YouTube", icon: "smart-display", color: "#FF0000" },
  { name: "Settings", icon: "settings", color: "#8E8E93" },
  { name: "Spotify", icon: "music-note", color: "#1DB954" },
  { name: "Chrome", icon: "language", color: "#4285F4" },
  { name: "Maps", icon: "map", color: "#34A853" },
  { name: "WhatsApp", icon: "chat", color: "#25D366" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { status, setStatus, currentCommand, setCurrentCommand, parsedActions, setParsedActions, addToHistory, voiceProfile, isVoiceLocked } = useAssistant();
  const [inputText, setInputText] = useState("");
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const isIdle = status === "idle" || status === "done" || status === "error";

  const handleVoicePress = useCallback(() => {
    if (!isIdle) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isVoiceLocked && !voiceProfile.registered) {
      Alert.alert("Voice Lock Active", "Register your voice profile first in the Security tab.");
      return;
    }
    setIsTyping(false);
    setStatus("listening");
    setCurrentCommand("");
    setParsedActions([]);
    setParsedCommand(null);
    // Simulate voice capture for 3s
    setTimeout(() => {
      const sample = SAMPLE_COMMANDS[Math.floor(Math.random() * SAMPLE_COMMANDS.length)];
      setCurrentCommand(sample);
      handleExecuteCommand(sample);
    }, 3000);
  }, [isIdle, isVoiceLocked, voiceProfile]);

  const handleStopListening = useCallback(() => {
    if (status === "listening") {
      setStatus("idle");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [status]);

  const handleExecuteCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;
    setStatus("processing");
    setParsedActions([]);
    setInputText("");
    setIsTyping(false);
    try {
      const result = await parseCommand(cmd);
      setParsedCommand(result);
      const actions: ParsedAction[] = result.actions.map((a) => ({
        ...a,
        status: "pending",
      }));
      setParsedActions(actions);
      setStatus("executing");
      for (let i = 0; i < actions.length; i++) {
        setParsedActions((prev) =>
          prev.map((a, idx) => (idx === i ? { ...a, status: "running" } : a))
        );
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
        setParsedActions((prev) =>
          prev.map((a, idx) => (idx === i ? { ...a, status: "done" } : a))
        );
      }
      await addToHistory({
        id: Date.now().toString(),
        rawText: cmd,
        app: result.app,
        actions: actions.map((a) => ({ ...a, status: "done" })),
        timestamp: Date.now(),
        status: "success",
      });
      setStatus("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, []);

  const handleTypeSubmit = useCallback(() => {
    if (!inputText.trim()) return;
    const cmd = inputText.trim();
    setCurrentCommand(cmd);
    handleExecuteCommand(cmd);
  }, [inputText]);

  const handleShortcut = useCallback((appName: string) => {
    const cmd = `Open ${appName}`;
    setCurrentCommand(cmd);
    setIsTyping(false);
    handleExecuteCommand(cmd);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 90;

  const statusLabel = {
    idle: "Tap to speak",
    listening: "Listening...",
    processing: "Parsing command...",
    executing: "Executing actions",
    done: "Complete",
    error: "Command failed",
  }[status];

  const statusColor = {
    idle: colors.mutedForeground,
    listening: colors.primary,
    processing: colors.accent,
    executing: colors.accent,
    done: colors.success,
    error: colors.destructive,
  }[status];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlowBackground />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 12, paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {voiceProfile.registered ? `Hey, ${voiceProfile.name}` : "AI Assistant"}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              What can I do for you?
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: `${statusColor}44` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Voice button area */}
        <View style={styles.voiceArea}>
          <WaveformBar isActive={status === "listening"} />
          <Pressable
            onPress={status === "listening" ? handleStopListening : handleVoicePress}
            disabled={status === "processing" || status === "executing"}
            style={({ pressed }) => [styles.voiceButton, { opacity: pressed ? 0.85 : 1 }]}
          >
            <VoicePulse status={status} size={88} />
          </Pressable>
          <WaveformBar isActive={status === "listening"} />
        </View>

        {/* Current command display */}
        {currentCommand !== "" && (
          <View style={[styles.commandBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialIcons name="format-quote" size={18} color={colors.mutedForeground} style={{ marginRight: 6 }} />
            <Text style={[styles.commandText, { color: colors.foreground }]}>
              {currentCommand}
            </Text>
          </View>
        )}

        {/* Action plan */}
        {parsedActions.length > 0 && (
          <View style={styles.actionsSection}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="account-tree" size={14} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                ACTION PLAN {parsedCommand && `· ${parsedCommand.app}`}
              </Text>
              {parsedCommand && (
                <View style={[styles.appTag, { backgroundColor: `${getAppColor(parsedCommand.app)}22` }]}>
                  <Text style={[styles.appTagText, { color: getAppColor(parsedCommand.app) }]}>
                    {parsedCommand.app}
                  </Text>
                </View>
              )}
            </View>
            {parsedActions.map((action, i) => (
              <ActionCard key={i} action={action} index={i} />
            ))}
          </View>
        )}

        {/* Text input mode */}
        <TouchableOpacity
          style={[styles.typeToggle, { borderColor: colors.border }]}
          onPress={() => setIsTyping(!isTyping)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="keyboard" size={16} color={colors.mutedForeground} />
          <Text style={[styles.typeToggleText, { color: colors.mutedForeground }]}>
            {isTyping ? "Close keyboard" : "Type a command"}
          </Text>
        </TouchableOpacity>

        {isTyping && (
          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder='e.g. "Open YouTube and search lo-fi"'
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, { color: colors.foreground }]}
              multiline
              onSubmitEditing={handleTypeSubmit}
              returnKeyType="send"
              autoFocus
            />
            <TouchableOpacity
              onPress={handleTypeSubmit}
              disabled={!inputText.trim()}
              style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : colors.muted }]}
            >
              <Ionicons
                name="send"
                size={16}
                color={inputText.trim() ? colors.primaryForeground : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* App shortcuts */}
        {isIdle && parsedActions.length === 0 && (
          <View style={styles.shortcutsSection}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>QUICK LAUNCH</Text>
            <View style={styles.shortcutsGrid}>
              {APP_SHORTCUTS.map((app) => (
                <AppShortcut
                  key={app.name}
                  name={app.name}
                  icon={app.icon}
                  color={app.color}
                  onPress={() => handleShortcut(app.name)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Sample commands */}
        {isIdle && parsedActions.length === 0 && (
          <View style={styles.samplesSection}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>TRY SAYING</Text>
            {SAMPLE_COMMANDS.slice(0, 3).map((cmd, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.sampleCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => { setCurrentCommand(cmd); handleExecuteCommand(cmd); }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="mic" size={14} color={colors.primary} />
                <Text style={[styles.sampleText, { color: colors.secondaryForeground }]}>
                  {cmd}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  greeting: { fontSize: 13, fontWeight: "500", marginBottom: 2 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },
  voiceArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
    paddingVertical: 20,
  },
  voiceButton: { alignItems: "center", justifyContent: "center" },
  commandBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 0.5,
  },
  commandText: { flex: 1, fontSize: 15, fontStyle: "italic", lineHeight: 22 },
  actionsSection: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  appTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: "auto",
  },
  appTagText: { fontSize: 11, fontWeight: "600" },
  typeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.5,
    marginBottom: 12,
  },
  typeToggleText: { fontSize: 13, fontWeight: "500" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 0.5,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 100,
    minHeight: 24,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutsSection: { marginBottom: 20 },
  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  samplesSection: { marginBottom: 20 },
  sampleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 0.5,
  },
  sampleText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
