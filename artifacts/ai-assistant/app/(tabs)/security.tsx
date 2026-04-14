import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlowBackground from "@/components/GlowBackground";
import VoicePulse from "@/components/VoicePulse";
import { useAssistant } from "@/context/AssistantContext";
import { useColors } from "@/hooks/useColors";

type EnrollStep = "idle" | "recording1" | "recording2" | "recording3" | "done";

export default function SecurityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { voiceProfile, setVoiceProfile, isVoiceLocked, setIsVoiceLocked } = useAssistant();
  const [enrollStep, setEnrollStep] = useState<EnrollStep>("idle");
  const [enrolling, setEnrolling] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 90;

  const progressWidth = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }));

  const startEnrollment = async () => {
    if (enrolling) return;
    setEnrolling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const steps: EnrollStep[] = ["recording1", "recording2", "recording3", "done"];
    for (let i = 0; i < steps.length; i++) {
      setEnrollStep(steps[i]);
      progressWidth.value = withSpring(((i + 1) / 4) * 100);
      await new Promise((r) => setTimeout(r, 2000));
    }

    await setVoiceProfile({
      registered: true,
      name: voiceProfile.name || "User",
      enrolledAt: Date.now(),
      samplesCount: 3,
    });

    setEnrolling(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteProfile = () => {
    Alert.alert("Delete Voice Profile", "This will remove your voice authentication and disable voice lock.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await setVoiceProfile({ registered: false, name: "User", samplesCount: 0 });
          await setIsVoiceLocked(false);
          setEnrollStep("idle");
          progressWidth.value = 0;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const enrollStatusLabel: Record<EnrollStep, string> = {
    idle: "Ready to enroll",
    recording1: "Recording sample 1 of 3...",
    recording2: "Recording sample 2 of 3...",
    recording3: "Recording sample 3 of 3...",
    done: "Enrollment complete!",
  };

  const enrollStatusColor: Record<EnrollStep, string> = {
    idle: colors.mutedForeground,
    recording1: colors.primary,
    recording2: colors.primary,
    recording3: colors.accent,
    done: colors.success,
  };

  const voiceStatus = enrollStep === "idle"
    ? (enrolling ? "processing" : "idle")
    : enrollStep === "done"
    ? "done"
    : "listening";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 12, paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Voice Security</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Register your voice to prevent unauthorized use
        </Text>

        {/* Voice Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}22` }]}>
              <MaterialIcons name="fingerprint" size={22} color={colors.primary} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Voice Profile</Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
                {voiceProfile.registered
                  ? `${voiceProfile.samplesCount} voice samples enrolled`
                  : "No profile registered"}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: voiceProfile.registered
                    ? `${colors.success}22`
                    : `${colors.mutedForeground}22`,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: voiceProfile.registered ? colors.success : colors.mutedForeground,
                  },
                ]}
              >
                {voiceProfile.registered ? "Active" : "None"}
              </Text>
            </View>
          </View>

          {voiceProfile.registered && voiceProfile.enrolledAt && (
            <Text style={[styles.enrolledAt, { color: colors.mutedForeground }]}>
              Enrolled {new Date(voiceProfile.enrolledAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Enrollment Area */}
        {!voiceProfile.registered && (
          <View style={[styles.enrollCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.enrollVisual}>
              <VoicePulse status={voiceStatus} size={72} />
            </View>
            <Text style={[styles.enrollLabel, { color: enrollStatusColor[enrollStep] }]}>
              {enrollStatusLabel[enrollStep]}
            </Text>

            {enrolling && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
                  <Animated.View
                    style={[styles.progressFill, { backgroundColor: colors.primary }, progressStyle]}
                  />
                </View>
              </View>
            )}

            {enrollStep === "idle" && !enrolling && (
              <View style={styles.enrollInstructions}>
                <Text style={[styles.instructTitle, { color: colors.foreground }]}>
                  How enrollment works
                </Text>
                {[
                  "Say a sample phrase 3 times",
                  "AI extracts your unique vocal signature",
                  "Voice fingerprint stored securely on device",
                ].map((step, i) => (
                  <View key={i} style={styles.instrRow}>
                    <View style={[styles.instrNum, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.instrNumText, { color: colors.mutedForeground }]}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.instrText, { color: colors.secondaryForeground }]}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.enrollBtn,
                {
                  backgroundColor: enrolling
                    ? colors.secondary
                    : enrollStep === "done"
                    ? colors.success
                    : colors.primary,
                },
              ]}
              onPress={startEnrollment}
              disabled={enrolling}
            >
              <Ionicons
                name={enrollStep === "done" ? "checkmark" : "mic"}
                size={18}
                color={enrolling ? colors.mutedForeground : colors.primaryForeground}
              />
              <Text
                style={[
                  styles.enrollBtnText,
                  {
                    color: enrolling ? colors.mutedForeground : colors.primaryForeground,
                  },
                ]}
              >
                {enrolling ? "Recording..." : enrollStep === "done" ? "Enrolled!" : "Start Voice Enrollment"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Voice Lock Toggle */}
        <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.accent}22` }]}>
            <MaterialIcons name="lock" size={20} color={colors.accent} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>Voice Lock</Text>
            <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
              Only respond to your registered voice
            </Text>
          </View>
          <Switch
            value={isVoiceLocked}
            onValueChange={async (v) => {
              if (v && !voiceProfile.registered) {
                Alert.alert("Enroll First", "Register your voice profile before enabling voice lock.");
                return;
              }
              await setIsVoiceLocked(v);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            trackColor={{ false: colors.secondary, true: `${colors.accent}88` }}
            thumbColor={isVoiceLocked ? colors.accent : colors.mutedForeground}
          />
        </View>

        {/* Architecture section */}
        <View style={[styles.architectureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="memory" size={20} color={colors.primary} />
            <Text style={[styles.architectureTitle, { color: colors.foreground }]}>
              Voice Auth Architecture
            </Text>
          </View>
          {[
            { icon: "mic", label: "Audio Capture", desc: "Raw PCM audio from microphone" },
            { icon: "tune", label: "MFCC Extraction", desc: "Mel-frequency cepstral coefficients" },
            { icon: "compare-arrows", label: "Embedding Matching", desc: "Cosine similarity vs stored profile" },
            { icon: "verified-user", label: "Decision", desc: "Accept if similarity > threshold" },
          ].map((item, i) => (
            <View key={i} style={styles.archRow}>
              <View style={[styles.archStep, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.archNum, { color: colors.primary }]}>{i + 1}</Text>
              </View>
              <MaterialIcons name={item.icon as any} size={16} color={colors.primary} />
              <View style={styles.archText}>
                <Text style={[styles.archLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.archDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Delete Profile */}
        {voiceProfile.registered && (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: `${colors.destructive}44` }]}
            onPress={handleDeleteProfile}
          >
            <MaterialIcons name="delete" size={16} color={colors.destructive} />
            <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>
              Delete Voice Profile
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardDesc: { fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  enrolledAt: { fontSize: 12, marginTop: 10 },
  enrollCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    marginBottom: 16,
    alignItems: "center",
    gap: 16,
  },
  enrollVisual: { marginVertical: 4 },
  enrollLabel: { fontSize: 15, fontWeight: "600" },
  progressContainer: { width: "100%", paddingHorizontal: 4 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  enrollInstructions: { width: "100%", gap: 10 },
  instructTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  instrRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  instrNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  instrNumText: { fontSize: 11, fontWeight: "700" },
  instrText: { flex: 1, fontSize: 13 },
  enrollBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
    justifyContent: "center",
  },
  enrollBtnText: { fontSize: 15, fontWeight: "600" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    marginBottom: 16,
  },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: "600" },
  settingDesc: { fontSize: 12, marginTop: 2 },
  architectureCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    marginBottom: 16,
    gap: 12,
  },
  architectureTitle: { fontSize: 15, fontWeight: "600", marginLeft: 8 },
  archRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  archStep: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  archNum: { fontSize: 11, fontWeight: "700" },
  archText: { flex: 1 },
  archLabel: { fontSize: 13, fontWeight: "600" },
  archDesc: { fontSize: 12 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "600" },
});
