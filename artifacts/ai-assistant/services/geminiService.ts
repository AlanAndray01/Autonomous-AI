import { ParsedAction } from "@/context/AssistantContext";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export interface ParsedCommand {
  app: string;
  intent: string;
  actions: ParsedAction[];
  confidence: number;
}

const SYSTEM_PROMPT = `You are an advanced Android AI assistant command parser. Convert natural language voice commands into structured JSON action plans.

Given a voice command, parse it and return a JSON object with this EXACT structure:
{
  "app": "app name (YouTube, Settings, Spotify, Chrome, WhatsApp, etc.)",
  "intent": "brief description of overall intent",
  "confidence": 0.0-1.0,
  "actions": [
    {"type": "open_app", "params": {"app": "YouTube"}},
    {"type": "search_query", "params": {"query": "search term"}},
    {"type": "play_video", "params": {}},
    {"type": "set_quality", "params": {"quality": "144p"}},
    {"type": "enable_loop", "params": {"enabled": "true"}},
    {"type": "navigate", "params": {"destination": "Settings"}},
    {"type": "tap_element", "params": {"element": "element name"}},
    {"type": "set_volume", "params": {"level": "50"}},
    {"type": "toggle_setting", "params": {"setting": "WiFi", "state": "on"}},
    {"type": "type_text", "params": {"text": "text to type"}},
    {"type": "scroll", "params": {"direction": "down"}},
    {"type": "go_back", "params": {}},
    {"type": "take_screenshot", "params": {}},
    {"type": "set_brightness", "params": {"level": "80"}},
    {"type": "open_url", "params": {"url": "https://..."}}
  ]
}

Return ONLY valid JSON, no markdown, no explanation. Be precise about the action sequence.`;

export async function parseCommand(rawText: string): Promise<ParsedCommand> {
  const response = await fetch(`${BASE_URL}/api/assistant/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: rawText }),
  });

  if (!response.ok) {
    throw new Error(`Parse failed: ${response.status}`);
  }

  const data = await response.json();
  return data as ParsedCommand;
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
  };
  return map[app] ?? "#00d4ff";
}

export function getActionIcon(type: string): string {
  const map: Record<string, string> = {
    open_app: "apps",
    search_query: "search",
    play_video: "play-circle",
    set_quality: "settings",
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
      return `Set quality to ${params?.quality ?? "auto"}`;
    case "enable_loop":
      return params?.enabled === "true" ? "Enable loop" : "Disable loop";
    case "navigate":
      return `Go to ${params?.destination ?? "screen"}`;
    case "tap_element":
      return `Tap ${params?.element ?? "element"}`;
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
      return `Set brightness to ${params?.level ?? "50"}%`;
    case "open_url":
      return `Open URL`;
    default:
      return type.replace(/_/g, " ");
  }
}
