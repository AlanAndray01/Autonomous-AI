import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

const SYSTEM_PROMPT = `You are an advanced Android AI assistant command parser. Convert natural language voice commands into structured JSON action plans.

Given a voice command, return a JSON object with EXACTLY this structure (no markdown, no explanation):
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

Only include actions that are actually needed. Be precise and sequential. Return ONLY valid JSON.`;

router.post("/assistant/parse", async (req, res) => {
  const { command } = req.body as { command?: string };

  if (!command || typeof command !== "string" || command.trim().length === 0) {
    res.status(400).json({ error: "command is required" });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env["AI_INTEGRATIONS_GEMINI_API_KEY"] ?? "",
      baseURL: process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"] ?? undefined,
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: "user", parts: [{ text: `Parse this voice command into a JSON action plan:\n\n"${command.trim()}"` }] },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const text = response.text ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { app: "Unknown", intent: command, confidence: 0.5, actions: [] };
    }

    res.json(parsed);
  } catch (err) {
    req.log?.error({ err }, "Gemini parse error");
    // Fallback: return a basic parsed structure so the app doesn't break
    const appGuess = command.match(/open\s+(\w+)/i)?.[1] ?? "Unknown";
    res.json({
      app: appGuess,
      intent: command,
      confidence: 0.4,
      actions: [
        { type: "open_app", params: { app: appGuess } },
      ],
    });
  }
});

export default router;
