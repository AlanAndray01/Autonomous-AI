import { ParsedAction } from "@/context/AssistantContext";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export interface ParsedCommand {
  app: string;
  intent: string;
  actions: ParsedAction[];
  confidence: number;
  language?: string;
}

export async function parseCommand(rawText: string): Promise<ParsedCommand> {
  const response = await fetch(`${BASE_URL}/api/assistant/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: rawText }),
  });
  if (!response.ok) throw new Error(`Parse failed: ${response.status}`);
  return response.json();
}

export async function transcribeAudio(
  base64Audio: string,
  mimeType = "audio/mp4"
): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/assistant/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: base64Audio, mimeType }),
  });
  if (!response.ok) throw new Error(`Transcription failed: ${response.status}`);
  const data = await response.json();
  return (data.transcript as string) ?? "";
}

export function getAppColor(app: string): string {
  const map: Record<string, string> = {
    YouTube: "#FF0000",
    Spotify: "#1DB954",
    WhatsApp: "#25D366",
    Chrome: "#4285F4",
    Settings: "#8E8E93",
    Maps: "#34A853",
    Instagram: "#E1306C",
    Twitter: "#1DA1F2",
    Gmail: "#EA4335",
    Camera: "#FF9500",
    Photos: "#FF2D55",
    Messages: "#34C759",
    Phone: "#34C759",
    Contacts: "#5856D6",
    Calendar: "#FF3B30",
    Clock: "#FF9500",
    Files: "#007AFF",
    Calculator: "#FF9500",
    Notes: "#FFCC00",
    Netflix: "#E50914",
    TikTok: "#000000",
    Telegram: "#2AABEE",
  };
  return map[app] ?? "#00d4ff";
}

export function getActionIcon(type: string): string {
  const map: Record<string, string> = {
    open_app: "apps",
    search_query: "search",
    play_video: "play-circle",
    set_quality: "hd",
    enable_loop: "repeat",
    navigate: "navigation",
    tap_element: "touch-app",
    set_volume: "volume-up",
    toggle_setting: "toggle-on",
    type_text: "keyboard",
    scroll: "swipe",
    go_back: "arrow-back",
    take_screenshot: "screenshot",
    set_brightness: "brightness-6",
    open_url: "link",
    make_call: "call",
    send_whatsapp: "chat",
    send_sms: "sms",
    search_web: "travel-explore",
    open_camera: "camera-alt",
    lock_screen: "lock",
    wake_screen: "phone-android",
    dictate_text: "record-voice-over",
  };
  return map[type] ?? "play-arrow";
}

export function formatActionLabel(action: ParsedAction): string {
  const { type, params } = action;
  switch (type) {
    case "open_app":
      return `Open ${params?.app ?? "app"}`;
    case "search_query":
      return `Search: "${params?.query ?? ""}"`;
    case "play_video":
      return "Play video";
    case "set_quality":
      return `Set quality → ${params?.quality ?? "auto"}`;
    case "enable_loop":
      return params?.enabled === "true" ? "Enable loop" : "Disable loop";
    case "navigate":
      return `Go to ${params?.destination ?? "screen"}`;
    case "tap_element":
      return `Tap "${params?.element ?? "element"}"`;
    case "set_volume":
      return `Set volume to ${params?.level ?? "50"}%`;
    case "toggle_setting":
      return `Turn ${params?.state ?? "on"} ${params?.setting ?? "setting"}`;
    case "type_text":
      return `Type: "${params?.text ?? ""}"`;
    case "scroll":
      return `Scroll ${params?.direction ?? "down"}`;
    case "go_back":
      return "Go back";
    case "take_screenshot":
      return "Take screenshot";
    case "set_brightness":
      return `Set brightness → ${params?.level ?? "50"}%`;
    case "open_url":
      return `Open: ${params?.url ?? "URL"}`;
    case "make_call":
      return `Call ${params?.contact ?? params?.number ?? "contact"}`;
    case "send_whatsapp":
      return `WhatsApp ${params?.contact ?? params?.number ?? "contact"}${params?.message ? `: "${params.message}"` : ""}`;
    case "send_sms":
      return `SMS to ${params?.contact ?? params?.number ?? "contact"}`;
    case "search_web":
      return `Search web: "${params?.query ?? ""}"`;
    case "open_camera":
      return `Open camera (${params?.mode ?? "photo"})`;
    case "lock_screen":
      return "Lock screen";
    case "wake_screen":
      return "Wake screen";
    case "dictate_text":
      return `Dictate: "${params?.text ?? ""}"`;
    default:
      return type.replace(/_/g, " ");
  }
}
