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

const PARSE_SYSTEM_PROMPT = `You are an advanced Android AI assistant command parser. The user may speak in English, Urdu, or a mix of both (Hinglish/Urdu-English). Understand both languages equally well.

Convert natural language voice commands into structured JSON action plans. Be PRECISE — do EXACTLY what the user says, nothing more, nothing less.

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
- make_call: {"type":"make_call","params":{"number":"03001234567"}}
- call_contact: {"type":"call_contact","params":{"contact":"Muaz Khan","name":"Muaz Khan"}}
- search_contact: {"type":"search_contact","params":{"name":"Muaz Khan"}}
- send_whatsapp: {"type":"send_whatsapp","params":{"contact":"Muaz Khan","message":"text optional"}}
- send_sms: {"type":"send_sms","params":{"number":"03001234567","message":"text"}}
- search_web: {"type":"search_web","params":{"query":"search term"}}
- open_camera: {"type":"open_camera","params":{"mode":"photo"}}
- lock_screen: {"type":"lock_screen","params":{}}
- wake_screen: {"type":"wake_screen","params":{}}
- dictate_text: {"type":"dictate_text","params":{"text":"dictated text"}}

CRITICAL EXAMPLES — follow these exactly:

"Open WhatsApp and call Muaz Khan":
{"app":"WhatsApp","intent":"Open WhatsApp and call Muaz Khan","confidence":0.98,"language":"english","actions":[{"type":"open_app","params":{"app":"WhatsApp"}},{"type":"call_contact","params":{"contact":"Muaz Khan","name":"Muaz Khan"}}]}

"Open YouTube, search Rise song, and play it":
{"app":"YouTube","intent":"Open YouTube and play Rise song","confidence":0.98,"language":"english","actions":[{"type":"open_app","params":{"app":"YouTube"}},{"type":"search_query","params":{"query":"Rise song"}},{"type":"play_video","params":{}}]}

"WhatsApp pe Muaz Khan ko call karo":
{"app":"WhatsApp","intent":"Call Muaz Khan on WhatsApp","confidence":0.97,"language":"mixed","actions":[{"type":"open_app","params":{"app":"WhatsApp"}},{"type":"call_contact","params":{"contact":"Muaz Khan","name":"Muaz Khan"}}]}

"YouTube kholo aur Labon Ko search karo":
{"app":"YouTube","intent":"Open YouTube and search Labon Ko","confidence":0.97,"language":"mixed","actions":[{"type":"open_app","params":{"app":"YouTube"}},{"type":"search_query","params":{"query":"Labon Ko"}}]}

"WiFi band karo":
{"app":"Settings","intent":"Turn off WiFi","confidence":0.99,"language":"urdu","actions":[{"type":"toggle_setting","params":{"setting":"WiFi","state":"off"}}]}

Return a JSON object with EXACTLY this structure (no markdown, no explanation, ONLY valid JSON):
{
  "app": "primary app name",
  "intent": "brief description",
  "confidence": 0.0-1.0,
  "language": "english|urdu|mixed",
  "actions": [/* sequential action objects from the list above */]
}

Rules:
- Do EXACTLY what the user said — no extra steps, no skipped steps
- Use call_contact (not make_call) when a contact name is mentioned
- For WhatsApp + call → open_app(WhatsApp) then call_contact
- For YouTube + play → open_app(YouTube) then search_query then play_video
- Return ONLY valid JSON, no other text`;

router.post("/assistant/parse", async (req, res) => {
  const { command } = req.body as { command?: string };
  if (!command || typeof command !== "string" || command.trim().length === 0) {
    res.status(400).json({ error: "command is required" });
    return;
  }

  try {
    const ai = makeAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
      model: "gemini-3-flash-preview",
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
