import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

function makeAI() {
  return new GoogleGenAI({
    apiKey: process.env["AI_INTEGRATIONS_GEMINI_API_KEY"] ?? "",
    httpOptions: {
      apiVersion: "",
      baseUrl: process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"] ?? "",
    },
  });
}

const PARSE_SYSTEM_PROMPT = `You are an advanced Android AI assistant command parser. The user may speak in English, Urdu, or a mix of both (Hinglish/Urdu-English code-switching). Understand both languages equally well.

Convert natural language voice commands into structured JSON action plans.

Available action types:
- open_app: {"type":"open_app","params":{"app":"YouTube"}}
- search_query: {"type":"search_query","params":{"query":"search term"}}
- play_video: {"type":"play_video","params":{}}
- set_quality: {"type":"set_quality","params":{"quality":"144p"}}
- enable_loop: {"type":"enable_loop","params":{"enabled":"true"}}
- navigate: {"type":"navigate","params":{"destination":"Settings"}}
- tap_element: {"type":"tap_element","params":{"element":"element name"}}
- set_volume: {"type":"set_volume","params":{"level":"50"}}
- toggle_setting: {"type":"toggle_setting","params":{"setting":"WiFi","state":"on"}}
- type_text: {"type":"type_text","params":{"text":"text to type"}}
- scroll: {"type":"scroll","params":{"direction":"down"}}
- go_back: {"type":"go_back","params":{}}
- take_screenshot: {"type":"take_screenshot","params":{}}
- set_brightness: {"type":"set_brightness","params":{"level":"80"}}
- open_url: {"type":"open_url","params":{"url":"https://..."}}
- make_call: {"type":"make_call","params":{"number":"03001234567","contact":"name optional"}}
- send_whatsapp: {"type":"send_whatsapp","params":{"number":"03001234567","contact":"name","message":"text"}}
- send_sms: {"type":"send_sms","params":{"number":"03001234567","message":"text"}}
- search_web: {"type":"search_web","params":{"query":"search term"}}
- open_camera: {"type":"open_camera","params":{"mode":"photo"}}
- lock_screen: {"type":"lock_screen","params":{}}
- wake_screen: {"type":"wake_screen","params":{}}
- dictate_text: {"type":"dictate_text","params":{"text":"dictated text"}}

Return a JSON object with EXACTLY this structure (no markdown, no explanation):
{
  "app": "primary app name",
  "intent": "brief description",
  "confidence": 0.0-1.0,
  "language": "english|urdu|mixed",
  "actions": [/* sequential action objects */]
}

Examples:
"YouTube kholo aur Labon Ko search karo" → open YouTube, search "Labon Ko"
"WiFi band karo" → toggle WiFi off
"Ammi ko call karo" → make_call with contact "Ammi"
"Lock karo phone" → lock_screen

Only include actions actually needed. Be precise and sequential. Return ONLY valid JSON.`;

router.post("/assistant/parse", async (req, res) => {
  const { command } = req.body as { command?: string };
  if (!command || typeof command !== "string" || command.trim().length === 0) {
    res.status(400).json({ error: "command is required" });
    return;
  }

  try {
    const ai = makeAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: [
        {
          role: "user",
          parts: [{ text: `Parse this voice command:\n\n"${command.trim()}"` }],
        },
      ],
      config: {
        systemInstruction: PARSE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
      },
    });

    const text = response.text ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { app: "Unknown", intent: command, confidence: 0.5, language: "english", actions: [] };
    }
    res.json(parsed);
  } catch (err) {
    req.log?.error({ err }, "Gemini parse error");
    const appGuess = command.match(/open\s+(\w+)/i)?.[1] ?? "Unknown";
    res.json({
      app: appGuess,
      intent: command,
      confidence: 0.4,
      language: "english",
      actions: [{ type: "open_app", params: { app: appGuess } }],
    });
  }
});

router.post("/assistant/transcribe", async (req, res) => {
  const { audio, mimeType } = req.body as { audio?: string; mimeType?: string };

  if (!audio || typeof audio !== "string") {
    res.status(400).json({ error: "audio base64 is required" });
    return;
  }

  try {
    const ai = makeAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: (mimeType as string) ?? "audio/mp4",
                data: audio,
              },
            },
            {
              text: `Transcribe this voice command accurately. The user may speak in English, Urdu, or a mix of both. Return ONLY the transcribed text — no explanations, no punctuation corrections, just the raw spoken words. If the audio is silent or unclear, return the empty string "".`,
            },
          ],
        },
      ],
      config: { maxOutputTokens: 512 },
    });

    const transcript = (response.text ?? "").trim();
    res.json({ transcript });
  } catch (err) {
    req.log?.error({ err }, "Transcription error");
    res.status(500).json({ error: "Transcription failed", transcript: "" });
  }
});

export default router;
