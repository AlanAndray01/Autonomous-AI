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
    title: "Continuous Voice Listener",
    color: "#00d4ff",
    description:
      "Background foreground service captures audio 24/7. Uses Android AudioRecord with low-latency buffers. VAD engine fires instantly on speech — no manual trigger needed.",
    tech: "Android AudioRecord API · Foreground Service · expo-av",
    phase: 1,
  },
  {
    icon: "equalizer",
    title: "Voice Activity Detection (VAD)",
    color: "#10d48a",
    description:
      "Real-time silence detection via audio metering. Auto-stops recording after 1.5s of silence post-speech. No manual stop button required — fully autonomous execution trigger.",
    tech: "dB Metering · RMS Analysis · WebRTC VAD",
    phase: 1,
  },
  {
    icon: "record-voice-over",
    title: "Speech-to-Text Engine",
    color: "#7c3aed",
    description:
      "Converts voice audio to text via Gemini multimodal API. Supports English, Urdu, and mixed (Hinglish) speech. Noise-filtered, high accuracy for real-world environments.",
    tech: "Gemini Audio API · Whisper (native APK) · Google STT fallback",
    phase: 1,
  },
  {
    icon: "security",
    title: "Voice Fingerprint Auth",
    color: "#ef4444",
    description:
      "MFCC feature extraction → speaker embedding → cosine similarity check. Rejects all voices except the enrolled owner. 0.82 threshold — tunable per environment.",
    tech: "MFCC · Speaker Embeddings · Cosine Similarity · TFLite",
    phase: 4,
  },
  {
    icon: "memory",
    title: "AI Command Interpreter",
    color: "#f59e0b",
    description:
      "Gemini LLM converts raw transcript into structured JSON action plans. Handles multi-step chained commands in a single sentence. Understands Urdu intent and English execution.",
    tech: "Gemini 2.5 Flash · JSON Schema · Structured Output",
    phase: 2,
  },
  {
    icon: "account-tree",
    title: "Action Planner & Retry Engine",
    color: "#00d4ff",
    description:
      "Decomposes complex intent into atomic sequential steps. Retries failed actions up to 2x automatically. Marks partial success and continues remaining steps.",
    tech: "Custom State Machine · Sequential Executor · Retry Logic",
    phase: 2,
  },
  {
    icon: "settings-applications",
    title: "Accessibility Execution Engine",
    color: "#10d48a",
    description:
      "Full UI automation via Android Accessibility Service. Taps, scrolls, types, navigates — all apps including YouTube. No root required. Native APK only.",
    tech: "Android Accessibility Service · UI Automator · Kotlin",
    phase: 3,
  },
  {
    icon: "phone-android",
    title: "System Control Layer",
    color: "#7c3aed",
    description:
      "Controls WiFi, Bluetooth, brightness, volume, screen lock/wake via Android system APIs. Deep link + Intent-based for settings. PowerManager for screen wake.",
    tech: "PowerManager · WifiManager · IntentLauncher · expo-intent-launcher",
    phase: 3,
  },
  {
    icon: "notifications",
    title: "Feedback & Response System",
    color: "#f59e0b",
    description:
      "Haptic feedback on each action. Status overlay during execution. Optional TTS voice response. Execution summary in history.",
    tech: "expo-haptics · TTS · System Overlay · History Store",
    phase: 5,
  },
  {
    icon: "loop",
    title: "Background Watchdog",
    color: "#ef4444",
    description:
      "Auto-restarts the voice service if killed by Android. Boot receiver re-launches on device restart. Foreground notification keeps service alive even in battery saver mode.",
    tech: "BroadcastReceiver · RECEIVE_BOOT_COMPLETED · AlarmManager",
    phase: 5,
  },
];

const CODE_SNIPPETS: Record<string, string> = {
  "Foreground Voice Service": `// VoiceListenerService.kt
class VoiceListenerService : Service() {
  private lateinit var audioRecord: AudioRecord
  private val vadEngine = VoiceActivityDetector()

  override fun onStartCommand(intent: Intent?, flags: Int, id: Int): Int {
    startForeground(NOTIF_ID, buildNotification())
    startVoiceCapture()
    return START_STICKY  // Auto-restart if killed
  }

  private fun startVoiceCapture() {
    val bufferSize = AudioRecord.getMinBufferSize(
      16000, AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )
    audioRecord = AudioRecord(
      MediaRecorder.AudioSource.MIC, 16000,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT, bufferSize
    )
    audioRecord.startRecording()
    
    CoroutineScope(Dispatchers.IO).launch {
      val buffer = ShortArray(bufferSize)
      while (isActive) {
        val read = audioRecord.read(buffer, 0, bufferSize)
        val rms = calculateRMS(buffer, read)
        vadEngine.process(rms) { speech -> 
          if (speech) onSpeechDetected(buffer) 
        }
      }
    }
  }
}`,

  "Voice Activity Detection (VAD)": `// VoiceActivityDetector.kt
class VoiceActivityDetector {
  private val SPEECH_THRESHOLD = 0.015f
  private val SILENCE_MS = 1500L
  private var speechStart = 0L
  private var silenceStart = 0L
  private var speaking = false

  fun process(rms: Float, onTrigger: (Boolean) -> Unit) {
    val now = System.currentTimeMillis()
    if (rms > SPEECH_THRESHOLD) {
      if (!speaking) { speaking = true; speechStart = now }
      silenceStart = 0
    } else {
      if (speaking) {
        if (silenceStart == 0L) silenceStart = now
        val silenceDuration = now - silenceStart
        val speechDuration = silenceStart - speechStart
        if (silenceDuration >= SILENCE_MS && speechDuration >= 800) {
          speaking = false
          onTrigger(true)  // Trigger execution immediately
        }
      }
    }
  }

  fun calculateRMS(buffer: ShortArray, size: Int): Float {
    var sum = 0.0
    for (i in 0 until size) sum += buffer[i].toDouble().pow(2)
    return sqrt(sum / size).toFloat() / 32768f
  }
}`,

  "AI Command Parser": `// AICommandParser.kt
data class ParsedCommand(
  val app: String,
  val intent: String,
  val confidence: Float,
  val language: String,
  val actions: List<Action>
)

class AICommandParser(private val apiKey: String) {
  private val client = OkHttpClient()
  
  suspend fun parse(transcript: String): ParsedCommand {
    val prompt = buildPrompt(transcript)
    val response = geminiClient.generateContent(
      model = "gemini-2.5-flash",
      systemInstruction = SYSTEM_PROMPT,
      contents = listOf(Content("user", prompt)),
      responseMimeType = "application/json"
    )
    return Json.decodeFromString(response.text)
  }
}`,

  "Accessibility Execution Engine": `// ActionExecutor.kt
class ActionExecutor(private val service: AIAccessibilityService) {

  suspend fun execute(actions: List<Action>): ExecutionResult {
    for (action in actions) {
      var success = false
      repeat(2) {  // Retry up to 2 times
        if (!success) success = when(action.type) {
          "open_app"     -> openApp(action.params["app"]!!)
          "search_query" -> performSearch(action.params["query"]!!)
          "tap_element"  -> tapByText(action.params["element"]!!)
          "set_quality"  -> setVideoQuality(action.params["quality"]!!)
          "enable_loop"  -> enableLoop()
          "make_call"    -> makeCall(action.params["number"]!!)
          "send_whatsapp"-> sendWhatsApp(action.params)
          "lock_screen"  -> lockScreen()
          else           -> true
        }
      }
      if (!success) return ExecutionResult.PARTIAL
    }
    return ExecutionResult.SUCCESS
  }

  private fun tapByText(text: String): Boolean {
    val root = service.rootInActiveWindow ?: return false
    val nodes = root.findAccessibilityNodeInfosByText(text)
    return nodes.firstOrNull()?.let {
      it.performAction(AccessibilityNodeInfo.ACTION_CLICK)
      true
    } ?: false
  }
}`,

  "Voice Fingerprint Auth": `// VoiceAuthenticator.kt
class VoiceAuthenticator(context: Context) {
  private val THRESHOLD = 0.82f
  private val tflite: Interpreter
  private var enrolledEmbedding: FloatArray? = null

  init {
    val model = FileUtil.loadMappedFile(context, "speaker_encoder.tflite")
    tflite = Interpreter(model)
  }

  fun enroll(audioBuffer: FloatArray) {
    val mfcc = extractMFCC(audioBuffer)
    enrolledEmbedding = runEmbedding(mfcc)
  }

  fun authenticate(audioBuffer: FloatArray): Boolean {
    val stored = enrolledEmbedding ?: return false
    val mfcc = extractMFCC(audioBuffer)
    val embedding = runEmbedding(mfcc)
    return cosineSimilarity(embedding, stored) >= THRESHOLD
  }

  private fun cosineSimilarity(a: FloatArray, b: FloatArray): Float {
    val dot = a.zip(b).sumOf { (x,y) -> (x*y).toDouble() }
    val normA = sqrt(a.sumOf { (it*it).toDouble() })
    val normB = sqrt(b.sumOf { (it*it).toDouble() })
    return (dot / (normA * normB)).toFloat()
  }
}`,

  "Screen Wake & Lock": `// ScreenController.kt
class ScreenController(private val context: Context) {

  fun wakeScreen() {
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val wl = pm.newWakeLock(
      PowerManager.FULL_WAKE_LOCK or
      PowerManager.ACQUIRE_CAUSES_WAKEUP or
      PowerManager.ON_AFTER_RELEASE,
      "AIAssistant:wakelock"
    )
    wl.acquire(3000)  // 3 seconds
    wl.release()
  }

  fun lockScreen() {
    val admin = ComponentName(context, DeviceAdminReceiver::class.java)
    val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE)
                as DevicePolicyManager
    if (dpm.isAdminActive(admin)) {
      dpm.lockNow()
    }
  }
}

// AndroidManifest.xml
// <uses-permission android:name="android.permission.WAKE_LOCK"/>
// <receiver android:name=".DeviceAdminReceiver"
//   android:permission="android.permission.BIND_DEVICE_ADMIN">`,

  "Boot Receiver (Auto-Start)": `// BootReceiver.kt
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
      val serviceIntent = Intent(context, VoiceListenerService::class.java)
      ContextCompat.startForegroundService(context, serviceIntent)
    }
  }
}

// AndroidManifest.xml
// <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
// <receiver
//   android:name=".BootReceiver"
//   android:exported="true">
//   <intent-filter>
//     <action android:name="android.intent.action.BOOT_COMPLETED"/>
//   </intent-filter>
// </receiver>`,
};

const PHASES = [
  { num: 1, title: "Voice + STT", desc: "Capture & transcribe", color: "#00d4ff" },
  { num: 2, title: "AI Brain", desc: "LLM command parse", color: "#7c3aed" },
  { num: 3, title: "Execution", desc: "Accessibility control", color: "#10d48a" },
  { num: 4, title: "Voice Lock", desc: "Speaker auth", color: "#ef4444" },
  { num: 5, title: "Background", desc: "Always running", color: "#f59e0b" },
];

const PERMISSIONS = [
  { label: "BIND_ACCESSIBILITY_SERVICE", note: "UI automation inside apps" },
  { label: "RECORD_AUDIO", note: "Microphone capture" },
  { label: "FOREGROUND_SERVICE", note: "Background persistence" },
  { label: "RECEIVE_BOOT_COMPLETED", note: "Auto-start on boot" },
  { label: "SYSTEM_ALERT_WINDOW", note: "Overlay status display" },
  { label: "WAKE_LOCK", note: "Screen wake control" },
  { label: "BIND_DEVICE_ADMIN", note: "Screen lock control" },
  { label: "INTERNET", note: "Gemini AI API calls" },
  { label: "CHANGE_WIFI_STATE", note: "WiFi toggle" },
  { label: "CHANGE_NETWORK_STATE", note: "Mobile data control" },
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
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPadding + 12, paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Architecture</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          10-layer autonomous Android AI system
        </Text>

        {/* System flow */}
        <View style={[styles.flowCard, { backgroundColor: colors.card, borderColor: "#00d4ff33" }]}>
          <Text style={[styles.flowTitle, { color: "#00d4ff" }]}>
            🎤 FULL SYSTEM FLOW
          </Text>
          {[
            "Mic always on (Foreground Service)",
            "VAD detects speech → auto-triggers on silence",
            "Audio → Gemini STT → transcript",
            "Voice fingerprint verified",
            "LLM parses command → JSON actions",
            "Execution Engine runs each action",
            "Retry failed steps (max 2x)",
            "Feedback via haptics + history",
          ].map((step, i) => (
            <View key={i} style={styles.flowStep}>
              <View style={[styles.flowDot, { backgroundColor: "#00d4ff" }]}>
                <Text style={styles.flowNum}>{i + 1}</Text>
              </View>
              <Text style={[styles.flowText, { color: colors.secondaryForeground }]}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        {/* Development Phases */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          BUILD PHASES
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phasesScroll}>
          <View style={styles.phases}>
            {PHASES.map((phase) => (
              <View
                key={phase.num}
                style={[
                  styles.phaseCard,
                  { backgroundColor: `${phase.color}1a`, borderColor: `${phase.color}44` },
                ]}
              >
                <View style={[styles.phaseNum, { backgroundColor: phase.color }]}>
                  <Text style={styles.phaseNumText}>{phase.num}</Text>
                </View>
                <Text style={[styles.phaseTitle, { color: colors.foreground }]}>
                  {phase.title}
                </Text>
                <Text style={[styles.phaseDesc, { color: colors.mutedForeground }]}>
                  {phase.desc}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Architecture layers */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          SYSTEM LAYERS
        </Text>
        {ARCHITECTURE_LAYERS.map((layer, i) => (
          <View
            key={i}
            style={[
              styles.layerCard,
              { backgroundColor: colors.card, borderColor: layer.color + "33" },
            ]}
          >
            <View style={styles.layerHeader}>
              <View style={[styles.layerIcon, { backgroundColor: layer.color + "22" }]}>
                <MaterialIcons name={layer.icon as any} size={20} color={layer.color} />
              </View>
              <View style={styles.layerMeta}>
                <View style={styles.layerTitleRow}>
                  <Text style={[styles.layerTitle, { color: colors.foreground }]}>
                    {layer.title}
                  </Text>
                  <View style={[styles.phaseTag, { backgroundColor: `${layer.color}22` }]}>
                    <Text style={[styles.phaseTagText, { color: layer.color }]}>
                      Phase {layer.phase}
                    </Text>
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
          KOTLIN SOURCE CODE
        </Text>
        {Object.entries(CODE_SNIPPETS).map(([title, code]) => (
          <View
            key={title}
            style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <TouchableOpacity
              style={styles.codeHeader}
              onPress={() =>
                setExpandedSnippet(expandedSnippet === title ? null : title)
              }
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
        <View
          style={[styles.apkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.apkHeader}>
            <MaterialIcons name="android" size={22} color="#10d48a" />
            <Text style={[styles.apkTitle, { color: colors.foreground }]}>APK Build & Deploy</Text>
          </View>
          {[
            {
              step: "1",
              cmd: "cd android && ./gradlew assembleRelease",
              desc: "Build release APK",
            },
            {
              step: "2",
              cmd: "jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore my.keystore app-release-unsigned.apk alias_name",
              desc: "Sign with keystore",
            },
            {
              step: "3",
              cmd: "zipalign -v 4 unsigned.apk signed.apk",
              desc: "Byte-align the APK",
            },
            {
              step: "4",
              cmd: "adb install -r signed.apk",
              desc: "Install on Redmi 13C",
            },
          ].map((item) => (
            <View key={item.step} style={styles.apkStep}>
              <View style={[styles.apkNum, { backgroundColor: "#10d48a22" }]}>
                <Text style={[styles.apkNumText, { color: "#10d48a" }]}>{item.step}</Text>
              </View>
              <View style={styles.apkStepContent}>
                <Text style={[styles.apkCmd, { color: colors.primary }]}>{item.cmd}</Text>
                <Text style={[styles.apkDesc, { color: colors.mutedForeground }]}>
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Permissions */}
        <View
          style={[
            styles.permCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.apkHeader}>
            <MaterialIcons name="admin-panel-settings" size={20} color={colors.warning ?? "#f59e0b"} />
            <Text style={[styles.apkTitle, { color: colors.foreground }]}>
              Required Permissions
            </Text>
          </View>
          {PERMISSIONS.map((perm) => (
            <View key={perm.label} style={styles.permRow}>
              <MaterialIcons name="check-circle" size={14} color="#10d48a" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.permText, { color: colors.secondaryForeground }]}>
                  {perm.label}
                </Text>
                <Text style={[styles.permNote, { color: colors.mutedForeground }]}>
                  {perm.note}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Limitations note */}
        <View
          style={[
            styles.noteCard,
            { backgroundColor: "#f59e0b11", borderColor: "#f59e0b33" },
          ]}
        >
          <MaterialIcons name="info" size={18} color="#f59e0b" />
          <Text style={[styles.noteText, { color: colors.secondaryForeground }]}>
            <Text style={{ color: "#f59e0b", fontWeight: "700" }}>Expo Go limits: </Text>
            VAD + real STT via Gemini ✓ · App launching ✓ · Background recording and
            Accessibility Service require a standalone APK build. See code snippets above
            for full Kotlin implementation.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  flowCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  flowTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 },
  flowStep: { flexDirection: "row", alignItems: "center", gap: 10 },
  flowDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  flowNum: { color: "#000", fontSize: 11, fontWeight: "700" },
  flowText: { fontSize: 13, flex: 1 },
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
  phaseTitle: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  phaseDesc: { fontSize: 10, textAlign: "center" },
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
  layerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
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
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    lineHeight: 18,
  },
  apkCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    marginBottom: 12,
    gap: 12,
  },
  apkHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
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
  apkCmd: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 2,
  },
  apkDesc: { fontSize: 12 },
  permCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    marginBottom: 10,
    gap: 10,
  },
  permRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  permText: { fontSize: 13, fontWeight: "500" },
  permNote: { fontSize: 11 },
  noteCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 10,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
