import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Linking,
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
import {
  ParsedCommand,
  getAppColor,
  parseCommand,
  transcribeAudio,
} from "@/services/geminiService";
import {
  makeCall,
  openApp,
  openSettings,
  openURL,
  searchYouTube,
  sendWhatsApp,
} from "@/services/appLauncher";

const SAMPLE_COMMANDS = [
  "Open YouTube, search Labon Ko, play it and set quality to 144p",
  "WiFi band karo aur Settings kholo",
  "Open Spotify and play lo-fi beats",
  "Set brightness to 80%",
  "WhatsApp kholo aur message bhejo",
  "Open Chrome and search latest Pakistan news",
];

const APP_SHORTCUTS = [
  { name: "YouTube", icon: "smart-display", color: "#FF0000" },
  { name: "Settings", icon: "settings", color: "#8E8E93" },
  { name: "Spotify", icon: "music-note", color: "#1DB954" },
  { name: "Chrome", icon: "language", color: "#4285F4" },
  { name: "Maps", icon: "map", color: "#34A853" },
  { name: "WhatsApp", icon: "chat", color: "#25D366" },
];

const VAD_SILENCE_THRESHOLD_DB = -42;
const VAD_SPEECH_THRESHOLD_DB = -35;
const VAD_SILENCE_DURATION_MS = 1500;
const VAD_MIN_SPEECH_MS = 800;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    status,
    setStatus,
    currentCommand,
    setCurrentCommand,
    parsedActions,
    setParsedActions,
    addToHistory,
    voiceProfile,
    isVoiceLocked,
  } = useAssistant();

  const [inputText, setInputText] = useState("");
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [vadStatus, setVadStatus] = useState<"idle" | "listening" | "speech" | "silence">("idle");
  const [transcribing, setTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const scrollRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);
  const levelAnim = useRef(new Animated.Value(0)).current;

  const isIdle = status === "idle" || status === "done" || status === "error";

  useEffect(() => {
    Animated.timing(levelAnim, {
      toValue: audioLevel,
      duration: 100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [audioLevel]);

  const clearVAD = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    silenceStartRef.current = null;
    speechStartRef.current = null;
  }, []);

  const stopRecordingAndTranscribe = useCallback(async () => {
    clearVAD();
    const recording = recordingRef.current;
    recordingRef.current = null;
    setAudioLevel(0);
    setVadStatus("idle");

    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error("No audio URI");

      setTranscribing(true);
      setStatus("processing");
      setLiveTranscript("Transcribing...");

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let transcript = "";
      try {
        transcript = await transcribeAudio(base64, "audio/mp4");
      } catch {
        transcript = "";
      }

      setTranscribing(false);
      setLiveTranscript("");

      if (!transcript || transcript.trim().length === 0) {
        setStatus("idle");
        Alert.alert("No speech detected", "Please speak clearly and try again.");
        return;
      }

      setCurrentCommand(transcript);
      await handleExecuteCommand(transcript);
    } catch {
      setTranscribing(false);
      setLiveTranscript("");
      setStatus("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [clearVAD]);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Microphone Required",
          "Please allow microphone access in Settings to use voice commands."
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await recording.startAsync();
      recordingRef.current = recording;
      speechStartRef.current = null;
      silenceStartRef.current = null;
      setVadStatus("listening");
      setLiveTranscript("Listening...");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      vadIntervalRef.current = setInterval(async () => {
        const rec = recordingRef.current;
        if (!rec) return;
        try {
          const st = await rec.getStatusAsync();
          if (!st.isRecording) return;

          const db = st.metering ?? -160;
          const normalized = Math.max(0, Math.min(1, (db + 60) / 55));
          setAudioLevel(normalized);

          const now = Date.now();
          if (db > VAD_SPEECH_THRESHOLD_DB) {
            if (!speechStartRef.current) speechStartRef.current = now;
            silenceStartRef.current = null;
            setVadStatus("speech");
            setLiveTranscript("Speaking...");
          } else {
            if (speechStartRef.current) {
              if (!silenceStartRef.current) {
                silenceStartRef.current = now;
                setVadStatus("silence");
                setLiveTranscript("Silence detected...");
              } else {
                const silenceDuration = now - silenceStartRef.current;
                const speechDuration = silenceStartRef.current - speechStartRef.current;
                if (
                  silenceDuration >= VAD_SILENCE_DURATION_MS &&
                  speechDuration >= VAD_MIN_SPEECH_MS
                ) {
                  stopRecordingAndTranscribe();
                }
              }
            } else if (db > VAD_SILENCE_THRESHOLD_DB) {
              setLiveTranscript("Listening...");
            }
          }
        } catch {}
      }, 120);
    } catch {
      setStatus("idle");
      Alert.alert("Recording Error", "Could not start microphone. Please try again.");
    }
  }, [stopRecordingAndTranscribe]);

  const handleVoicePress = useCallback(() => {
    if (!isIdle) return;
    if (isVoiceLocked && !voiceProfile.registered) {
      Alert.alert(
        "Voice Lock Active",
        "Register your voice profile first in the Security tab."
      );
      return;
    }
    setIsTyping(false);
    setStatus("listening");
    setCurrentCommand("");
    setParsedActions([]);
    setParsedCommand(null);
    startRecording();
  }, [isIdle, isVoiceLocked, voiceProfile, startRecording]);

  const handleStopListening = useCallback(() => {
    if (status === "listening") {
      if (recordingRef.current) {
        stopRecordingAndTranscribe();
      } else {
        clearVAD();
        setStatus("idle");
        setLiveTranscript("");
        setAudioLevel(0);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [status, stopRecordingAndTranscribe, clearVAD]);

  const executeAction = useCallback(
    async (action: ParsedAction, appContext: string): Promise<boolean> => {
      const params = action.params ?? {};
      try {
        switch (action.type) {
          case "open_app": {
            const appName = params.app ?? appContext;
            if (appName.toLowerCase() === "settings") return openSettings();
            return openApp(appName);
          }
          case "search_query": {
            const query = params.query ?? "";
            if (!query) return true;
            if (appContext.toLowerCase().includes("youtube")) return searchYouTube(query);
            await Linking.openURL(
              `https://www.google.com/search?q=${encodeURIComponent(query)}`
            );
            return true;
          }
          case "search_web": {
            const q = params.query ?? "";
            await Linking.openURL(
              `https://www.google.com/search?q=${encodeURIComponent(q)}`
            );
            return true;
          }
          case "open_url":
            return openURL(params.url ?? "");
          case "navigate": {
            const dest = params.destination ?? "";
            if (dest.toLowerCase().includes("settings")) return openSettings();
            return openApp(dest);
          }
          case "make_call": {
            const number = params.number ?? "";
            if (!number) return true;
            return makeCall(number);
          }
          case "send_whatsapp": {
            const number = params.number ?? "";
            const message = params.message ?? "";
            if (!number) return true;
            return sendWhatsApp(number, message);
          }
          case "send_sms": {
            const number = params.number ?? "";
            const msg = params.message ?? "";
            await Linking.openURL(
              `sms:${number}${msg ? `?body=${encodeURIComponent(msg)}` : ""}`
            );
            return true;
          }
          case "open_camera": {
            if (Platform.OS === "android") {
              try {
                const { startActivityAsync, ActivityAction } = await import(
                  "expo-intent-launcher"
                );
                await startActivityAsync(ActivityAction.IMAGE_CAPTURE);
                return true;
              } catch {}
            }
            return openApp("Camera");
          }
          case "lock_screen": {
            if (Platform.OS === "android") {
              try {
                const { startActivityAsync, ActivityAction } = await import(
                  "expo-intent-launcher"
                );
                await startActivityAsync(ActivityAction.SECURITY_SETTINGS);
                return true;
              } catch {}
            }
            return openSettings();
          }
          case "wake_screen":
            await new Promise((r) => setTimeout(r, 200));
            return true;
          case "toggle_setting": {
            const setting = params.setting?.toLowerCase() ?? "";
            if (Platform.OS === "android") {
              try {
                const { startActivityAsync, ActivityAction } = await import(
                  "expo-intent-launcher"
                );
                if (setting.includes("wifi") || setting.includes("wi-fi")) {
                  await startActivityAsync(ActivityAction.WIFI_SETTINGS);
                  return true;
                }
                if (setting.includes("bluetooth")) {
                  await startActivityAsync(ActivityAction.BLUETOOTH_SETTINGS);
                  return true;
                }
                if (setting.includes("brightness") || setting.includes("display")) {
                  await startActivityAsync(ActivityAction.DISPLAY_SETTINGS);
                  return true;
                }
                if (setting.includes("sound") || setting.includes("volume")) {
                  await startActivityAsync(ActivityAction.SOUND_SETTINGS);
                  return true;
                }
                if (setting.includes("data") || setting.includes("mobile")) {
                  await startActivityAsync(ActivityAction.DATA_ROAMING_SETTINGS);
                  return true;
                }
              } catch {}
            }
            return openSettings();
          }
          case "set_brightness":
            if (Platform.OS === "android") {
              try {
                const { startActivityAsync, ActivityAction } = await import(
                  "expo-intent-launcher"
                );
                await startActivityAsync(ActivityAction.DISPLAY_SETTINGS);
                return true;
              } catch {}
            }
            return true;
          case "set_volume":
            if (Platform.OS === "android") {
              try {
                const { startActivityAsync, ActivityAction } = await import(
                  "expo-intent-launcher"
                );
                await startActivityAsync(ActivityAction.SOUND_SETTINGS);
                return true;
              } catch {}
            }
            return true;
          case "play_video":
          case "set_quality":
          case "enable_loop":
          case "tap_element":
          case "scroll":
          case "go_back":
          case "type_text":
          case "dictate_text":
          case "take_screenshot":
            await new Promise((r) => setTimeout(r, 400));
            return true;
          default:
            await new Promise((r) => setTimeout(r, 300));
            return true;
        }
      } catch {
        return false;
      }
    },
    []
  );

  const handleExecuteCommand = useCallback(
    async (cmd: string) => {
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

        let anyFailed = false;
        for (let i = 0; i < actions.length; i++) {
          setParsedActions((prev) =>
            prev.map((a, idx) => (idx === i ? { ...a, status: "running" } : a))
          );
          await new Promise((r) => setTimeout(r, 250));

          let success = false;
          let retries = 0;
          while (!success && retries < 2) {
            success = await executeAction(actions[i], result.app);
            if (!success) retries++;
          }

          if (actions[i].type === "open_app" || actions[i].type === "navigate") {
            await new Promise((r) => setTimeout(r, 700));
          }

          if (!success) anyFailed = true;
          setParsedActions((prev) =>
            prev.map((a, idx) =>
              idx === i ? { ...a, status: success ? "done" : "failed" } : a
            )
          );
        }

        await addToHistory({
          id: Date.now().toString(),
          rawText: cmd,
          app: result.app,
          actions: actions.map((a) => ({ ...a, status: "done" })),
          timestamp: Date.now(),
          status: anyFailed ? "partial" : "success",
        });

        setStatus("done");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setStatus("idle"), 2500);
      } catch {
        setStatus("error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => setStatus("idle"), 2000);
      }
    },
    [executeAction]
  );

  const handleTypeSubmit = useCallback(() => {
    if (!inputText.trim()) return;
    const cmd = inputText.trim();
    setCurrentCommand(cmd);
    handleExecuteCommand(cmd);
  }, [inputText, handleExecuteCommand]);

  const handleShortcut = useCallback(
    (appName: string) => {
      const cmd = `Open ${appName}`;
      setCurrentCommand(cmd);
      setIsTyping(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      handleExecuteCommand(cmd);
    },
    [handleExecuteCommand]
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 90;

  const statusLabel = {
    idle: "Tap to speak",
    listening: transcribing ? "Transcribing..." : liveTranscript || "Listening...",
    processing: "Parsing command...",
    executing: "Executing actions",
    done: "Complete ✓",
    error: "Command failed",
  }[status];

  const statusColor = {
    idle: colors.mutedForeground,
    listening: vadStatus === "speech" ? "#10d48a" : colors.primary,
    processing: colors.accent,
    executing: colors.accent,
    done: colors.success,
    error: colors.destructive,
  }[status];

  const levelScale = levelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlowBackground />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPadding + 12, paddingBottom: bottomPadding },
        ]}
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
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}22`, borderColor: `${statusColor}44` },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Voice button area */}
        <View style={styles.voiceArea}>
          <WaveformBar isActive={status === "listening"} level={audioLevel} />
          <Animated.View style={{ transform: [{ scale: levelScale }] }}>
            <Pressable
              onPress={status === "listening" ? handleStopListening : handleVoicePress}
              disabled={status === "processing" || status === "executing"}
              style={({ pressed }) => [styles.voiceButton, { opacity: pressed ? 0.85 : 1 }]}
            >
              <VoicePulse status={status} size={88} />
            </Pressable>
          </Animated.View>
          <WaveformBar isActive={status === "listening"} level={audioLevel} />
        </View>

        {/* VAD status pill during listening */}
        {status === "listening" && (
          <View style={styles.vadRow}>
            <View
              style={[
                styles.vadPill,
                {
                  backgroundColor:
                    vadStatus === "speech"
                      ? "#10d48a22"
                      : vadStatus === "silence"
                      ? "#f59e0b22"
                      : "#00d4ff22",
                  borderColor:
                    vadStatus === "speech"
                      ? "#10d48a55"
                      : vadStatus === "silence"
                      ? "#f59e0b55"
                      : "#00d4ff55",
                },
              ]}
            >
              <MaterialIcons
                name={
                  vadStatus === "speech"
                    ? "graphic-eq"
                    : vadStatus === "silence"
                    ? "timer"
                    : "mic"
                }
                size={14}
                color={
                  vadStatus === "speech"
                    ? "#10d48a"
                    : vadStatus === "silence"
                    ? "#f59e0b"
                    : "#00d4ff"
                }
              />
              <Text
                style={[
                  styles.vadText,
                  {
                    color:
                      vadStatus === "speech"
                        ? "#10d48a"
                        : vadStatus === "silence"
                        ? "#f59e0b"
                        : "#00d4ff",
                  },
                ]}
              >
                {vadStatus === "speech"
                  ? "Voice detected — keep talking"
                  : vadStatus === "silence"
                  ? "Silence detected — processing soon..."
                  : "VAD active — waiting for voice"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleStopListening}
              style={[styles.stopBtn, { borderColor: colors.border }]}
            >
              <MaterialIcons name="stop" size={14} color={colors.mutedForeground} />
              <Text style={[styles.stopBtnText, { color: colors.mutedForeground }]}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Current command display */}
        {currentCommand !== "" && (
          <View
            style={[
              styles.commandBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <MaterialIcons
              name="format-quote"
              size={18}
              color={colors.mutedForeground}
              style={{ marginRight: 6 }}
            />
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
                <View
                  style={[
                    styles.appTag,
                    { backgroundColor: `${getAppColor(parsedCommand.app)}22` },
                  ]}
                >
                  <Text
                    style={[
                      styles.appTagText,
                      { color: getAppColor(parsedCommand.app) },
                    ]}
                  >
                    {parsedCommand.app}
                    {parsedCommand.language === "urdu" || parsedCommand.language === "mixed"
                      ? " · اردو"
                      : ""}
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
          <View
            style={[
              styles.inputRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder='e.g. "YouTube kholo aur lo-fi search karo"'
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
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() ? colors.primary : colors.muted,
                },
              ]}
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
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              QUICK LAUNCH
            </Text>
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
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              TRY SAYING
            </Text>
            {SAMPLE_COMMANDS.slice(0, 4).map((cmd, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.sampleCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => {
                  setCurrentCommand(cmd);
                  handleExecuteCommand(cmd);
                }}
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
    marginBottom: 12,
    paddingVertical: 20,
  },
  voiceButton: { alignItems: "center", justifyContent: "center" },
  vadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  vadPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
  },
  vadText: { fontSize: 12, fontWeight: "500", flex: 1 },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  stopBtnText: { fontSize: 12, fontWeight: "500" },
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
  appTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: "auto" },
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
  shortcutsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
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
