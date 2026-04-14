import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlowBackground from "@/components/GlowBackground";
import { useColors } from "@/hooks/useColors";

const ARCHITECTURE_LAYERS = [
  {
    icon: "mic",
    title: "Voice Input Module",
    color: "#00d4ff",
    description: "Continuous audio capture from microphone. Button-triggered or always-on mode.",
    tech: "Android AudioRecord API, Expo Audio",
    phase: 1,
  },
  {
    icon: "record-voice-over",
    title: "Speech-to-Text Engine",
    color: "#7c3aed",
    description: "Converts voice audio to raw text. Supports offline mode via local Whisper model.",
    tech: "Google Speech API / Whisper",
    phase: 1,
  },
  {
    icon: "security",
    title: "Voice Verification Layer",
    color: "#ef4444",
    description: "MFCC extraction + speaker embedding matching. Rejects unauthorized voices before processing.",
    tech: "MFCC, Speaker Embeddings, Cosine Similarity",
    phase: 4,
  },
  {
    icon: "psychology",
    title: "AI Intent Parser (LLM)",
    color: "#10d48a",
    description: "Converts raw text into structured JSON action plans using Gemini. Understands multi-step chained commands.",
    tech: "Gemini 2.5 Flash, JSON Schema",
    phase: 2,
  },
  {
    icon: "account-tree",
    title: "Action Planner",
    color: "#f59e0b",
    description: "Decomposes complex intent into atomic sequential steps with retry logic.",
    tech: "Custom Rule Engine, JSON",
    phase: 2,
  },
  {
    icon: "settings-applications",
    title: "Execution Engine",
    color: "#00d4ff",
    description: "Performs actual Android system actions via Accessibility Service. Taps, scrolls, navigates UI elements.",
    tech: "Android Accessibility Service",
    phase: 3,
  },
  {
    icon: "notifications",
    title: "Feedback System",
    color: "#7c3aed",
    description: "Reports execution status via haptics, overlay notifications, or voice response.",
    tech: "TTS, Haptics, Overlay Permission",
    phase: 5,
  },
];

const CODE_SNIPPETS: Record<string, string> = {
  "Accessibility Service": `// AndroidManifest.xml
<service
  android:name=".AIAccessibilityService"
  android:exported="true"
  android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
  <intent-filter>
    <action android:name="android.accessibilityservice.AccessibilityService"/>
  </intent-filter>
  <meta-data
    android:name="android.accessibilityservice"
    android:resource="@xml/accessibility_service_config"/>
</service>`,
  "Command Parser": `// AICommandParser.kt
data class ParsedCommand(
  val app: String,
  val actions: List<Action>,
  val confidence: Float
)

class AICommandParser(private val geminiKey: String) {
  suspend fun parse(rawText: String): ParsedCommand {
    val response = geminiApi.generateContent(
      model = "gemini-2.5-flash",
      prompt = buildPrompt(rawText),
      responseMimeType = "application/json"
    )
    return Json.decodeFromString(response.text)
  }
}`,
  "Voice Auth": `// VoiceAuthenticator.kt  
class VoiceAuthenticator {
  private val threshold = 0.82f
  
  fun authenticate(audio: FloatArray): Boolean {
    val mfcc = extractMFCC(audio)
    val embedding = model.encode(mfcc)
    val similarity = cosineSimilarity(embedding, storedEmbedding)
    return similarity > threshold
  }
  
  private fun cosineSimilarity(a: FloatArray, b: FloatArray): Float {
    val dot = a.zip(b).sumOf { (x, y) -> (x * y).toDouble() }
    val normA = sqrt(a.sumOf { (it * it).toDouble() })
    val normB = sqrt(b.sumOf { (it * it).toDouble() })
    return (dot / (normA * normB)).toFloat()
  }
}`,
  "Action Executor": `// ActionExecutor.kt
class ActionExecutor(private val service: AIAccessibilityService) {
  
  suspend fun execute(actions: List<Action>): ExecutionResult {
    for (action in actions) {
      val result = when(action.type) {
        "open_app" -> openApp(action.params["app"]!!)
        "search_query" -> performSearch(action.params["query"]!!)
        "tap_element" -> tapElement(action.params["element"]!!)
        "set_quality" -> setVideoQuality(action.params["quality"]!!)
        "enable_loop" -> enableLoop()
        else -> ActionResult.UNSUPPORTED
      }
      if (result == ActionResult.FAILED) return ExecutionResult.PARTIAL
    }
    return ExecutionResult.SUCCESS
  }
}`,
};

const PHASES = [
  { num: 1, title: "Foundation", desc: "Voice input + STT", color: "#00d4ff" },
  { num: 2, title: "AI Brain", desc: "LLM parsing", color: "#7c3aed" },
  { num: 3, title: "Automation", desc: "Accessibility control", color: "#10d48a" },
  { num: 4, title: "Voice Lock", desc: "Auth system", color: "#ef4444" },
  { num: 5, title: "Advanced", desc: "Multi-app flows", color: "#f59e0b" },
];

export default function ArchitectureScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expandedSnippet, setExpandedSnippet] = useState<string | null>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 90;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding + 12, paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Architecture</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          7-layer autonomous AI system design
        </Text>

        {/* Development Phases */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>BUILD PHASES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phasesScroll}>
          <View style={styles.phases}>
            {PHASES.map((phase) => (
              <View
                key={phase.num}
                style={[styles.phaseCard, { backgroundColor: `${phase.color}1a`, borderColor: `${phase.color}44` }]}
              >
                <View style={[styles.phaseNum, { backgroundColor: phase.color }]}>
                  <Text style={styles.phaseNumText}>{phase.num}</Text>
                </View>
                <Text style={[styles.phaseTitle, { color: colors.foreground }]}>{phase.title}</Text>
                <Text style={[styles.phaseDesc, { color: colors.mutedForeground }]}>{phase.desc}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Architecture layers */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SYSTEM LAYERS</Text>
        {ARCHITECTURE_LAYERS.map((layer, i) => (
          <View key={i} style={[styles.layerCard, { backgroundColor: colors.card, borderColor: layer.color + "33" }]}>
            <View style={styles.layerHeader}>
              <View style={[styles.layerIcon, { backgroundColor: layer.color + "22" }]}>
                <MaterialIcons name={layer.icon as any} size={20} color={layer.color} />
              </View>
              <View style={styles.layerMeta}>
                <View style={styles.layerTitleRow}>
                  <Text style={[styles.layerTitle, { color: colors.foreground }]}>{layer.title}</Text>
                  <View style={[styles.phaseTag, { backgroundColor: `${layer.color}22` }]}>
                    <Text style={[styles.phaseTagText, { color: layer.color }]}>Phase {layer.phase}</Text>
                  </View>
                </View>
                <Text style={[styles.layerDesc, { color: colors.secondaryForeground }]}>
                  {layer.description}
                </Text>
                <Text style={[styles.layerTech, { color: colors.mutedForeground }]}>
                  {layer.tech}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Code Snippets */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
          ANDROID CODE
        </Text>
        {Object.entries(CODE_SNIPPETS).map(([title, code]) => (
          <View key={title} style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.codeHeader}
              onPress={() => setExpandedSnippet(expandedSnippet === title ? null : title)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="code" size={16} color={colors.primary} />
              <Text style={[styles.codeTitle, { color: colors.foreground }]}>{title}</Text>
              <MaterialIcons
                name={expandedSnippet === title ? "expand-less" : "expand-more"}
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
            {expandedSnippet === title && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.codeBlock, { backgroundColor: colors.background }]}>
                  <Text style={[styles.codeText, { color: colors.primary }]}>{code}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        ))}

        {/* APK Build Guide */}
        <View style={[styles.apkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.apkHeader}>
            <MaterialIcons name="android" size={22} color="#10d48a" />
            <Text style={[styles.apkTitle, { color: colors.foreground }]}>APK Build & Deploy</Text>
          </View>
          {[
            { step: "1", cmd: "cd android && ./gradlew assembleRelease", desc: "Build release APK" },
            { step: "2", cmd: "jarsigner -verbose -sigalg SHA256withRSA ...", desc: "Sign with keystore" },
            { step: "3", cmd: "zipalign -v 4 unsigned.apk signed.apk", desc: "Align APK bytes" },
            { step: "4", cmd: "adb install signed.apk", desc: "Install on device" },
          ].map((item) => (
            <View key={item.step} style={styles.apkStep}>
              <View style={[styles.apkNum, { backgroundColor: "#10d48a22" }]}>
                <Text style={[styles.apkNumText, { color: "#10d48a" }]}>{item.step}</Text>
              </View>
              <View style={styles.apkStepContent}>
                <Text style={[styles.apkCmd, { color: colors.primary }]}>{item.cmd}</Text>
                <Text style={[styles.apkDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Permissions required */}
        <View style={[styles.permCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.apkHeader}>
            <MaterialIcons name="admin-panel-settings" size={20} color={colors.warning} />
            <Text style={[styles.apkTitle, { color: colors.foreground }]}>Required Permissions</Text>
          </View>
          {[
            "BIND_ACCESSIBILITY_SERVICE",
            "RECORD_AUDIO",
            "SYSTEM_ALERT_WINDOW (Overlay)",
            "FOREGROUND_SERVICE",
            "RECEIVE_BOOT_COMPLETED",
            "INTERNET (for AI API)",
          ].map((perm) => (
            <View key={perm} style={styles.permRow}>
              <MaterialIcons name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.permText, { color: colors.secondaryForeground }]}>{perm}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 10 },
  phasesScroll: { marginBottom: 20 },
  phases: { flexDirection: "row", gap: 10, paddingRight: 20 },
  phaseCard: {
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    minWidth: 90,
  },
  phaseNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseNumText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  phaseTitle: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  phaseDesc: { fontSize: 11, textAlign: "center" },
  layerCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  layerHeader: { flexDirection: "row", gap: 12 },
  layerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  layerMeta: { flex: 1, gap: 4 },
  layerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  layerTitle: { fontSize: 15, fontWeight: "600" },
  phaseTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  phaseTagText: { fontSize: 10, fontWeight: "700" },
  layerDesc: { fontSize: 13, lineHeight: 18 },
  layerTech: { fontSize: 11, fontStyle: "italic" },
  codeCard: {
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 10,
    overflow: "hidden",
  },
  codeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
  },
  codeTitle: { flex: 1, fontSize: 14, fontWeight: "600" },
  codeBlock: { margin: 12, padding: 12, borderRadius: 8, minWidth: 300 },
  codeText: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 11, lineHeight: 18 },
  apkCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    marginBottom: 12,
    gap: 12,
  },
  apkHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  apkTitle: { fontSize: 16, fontWeight: "600" },
  apkStep: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  apkNum: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  apkNumText: { fontSize: 11, fontWeight: "700" },
  apkStepContent: { flex: 1 },
  apkCmd: { fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", marginBottom: 2 },
  apkDesc: { fontSize: 12 },
  permCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    marginBottom: 10,
    gap: 10,
  },
  permRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  permText: { fontSize: 13 },
});
