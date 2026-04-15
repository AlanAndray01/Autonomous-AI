import { Linking, Platform } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";
import * as Contacts from "expo-contacts";

/**
 * Deep link / intent map for common Android apps.
 * Tries the app URI scheme first, falls back to HTTPS if needed.
 */
const APP_DEEP_LINKS: Record<string, { android: string; fallback?: string }> = {
  YouTube: {
    android: "vnd.youtube://",
    fallback: "https://www.youtube.com",
  },
  Spotify: {
    android: "spotify://",
    fallback: "https://open.spotify.com",
  },
  WhatsApp: {
    android: "whatsapp://",
    fallback: "https://wa.me",
  },
  Chrome: {
    android: "googlechrome://",
    fallback: "https://www.google.com",
  },
  Maps: {
    android: "geo:0,0",
    fallback: "https://maps.google.com",
  },
  "Google Maps": {
    android: "geo:0,0",
    fallback: "https://maps.google.com",
  },
  Instagram: {
    android: "instagram://",
    fallback: "https://www.instagram.com",
  },
  Twitter: {
    android: "twitter://",
    fallback: "https://twitter.com",
  },
  Facebook: {
    android: "fb://",
    fallback: "https://www.facebook.com",
  },
  Gmail: {
    android: "googlegmail://",
    fallback: "https://mail.google.com",
  },
  Telegram: {
    android: "tg://",
    fallback: "https://telegram.org",
  },
  Netflix: {
    android: "nflx://",
    fallback: "https://www.netflix.com",
  },
  Amazon: {
    android: "amzn://",
    fallback: "https://www.amazon.com",
  },
  Snapchat: {
    android: "snapchat://",
    fallback: "https://www.snapchat.com",
  },
  TikTok: {
    android: "tiktok://",
    fallback: "https://www.tiktok.com",
  },
  LinkedIn: {
    android: "linkedin://",
    fallback: "https://www.linkedin.com",
  },
  Calculator: {
    android: "android.intent.action.MAIN",
    fallback: "https://www.google.com/search?q=calculator",
  },
  Clock: {
    android: "android.intent.action.MAIN",
    fallback: undefined,
  },
  Calendar: {
    android: "content://com.android.calendar/time/",
    fallback: "https://calendar.google.com",
  },
  Settings: {
    android: "settings://",
    fallback: undefined,
  },
  Phone: {
    android: "tel:",
    fallback: undefined,
  },
  Camera: {
    android: "android.media.action.STILL_IMAGE_CAMERA",
    fallback: undefined,
  },
  Messages: {
    android: "sms:",
    fallback: undefined,
  },
  Contacts: {
    android: "content://contacts/people",
    fallback: undefined,
  },
  Files: {
    android: "content://com.android.externalstorage.documents/",
    fallback: undefined,
  },
  Photos: {
    android: "content://media/external/images/media",
    fallback: undefined,
  },
  "Play Store": {
    android: "market://",
    fallback: "https://play.google.com",
  },
};

/**
 * Build a YouTube search URL that opens in the YouTube app
 */
export function buildYouTubeSearchURL(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://www.youtube.com/results?search_query=${encoded}`;
}

/**
 * Build a YouTube video URL for a specific video ID
 */
export function buildYouTubeVideoURL(videoId: string): string {
  return `vnd.youtube://${videoId}`;
}

/**
 * Open an app by name. Returns true if successful.
 */
export async function openApp(appName: string): Promise<boolean> {
  const normalised = appName.trim();

  // Special case: Settings uses expo-intent-launcher on Android
  if (normalised.toLowerCase() === "settings") {
    return openSettings();
  }

  const entry = findAppEntry(normalised);
  if (!entry) {
    // Last resort: try searching for it via browser
    try {
      await Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(appName + " app")}`);
      return true;
    } catch {
      return false;
    }
  }

  if (Platform.OS === "android" || Platform.OS === "ios") {
    try {
      const canOpen = await Linking.canOpenURL(entry.android);
      if (canOpen) {
        await Linking.openURL(entry.android);
        return true;
      }
    } catch {}

    // Try fallback URL
    if (entry.fallback) {
      try {
        await Linking.openURL(entry.fallback);
        return true;
      } catch {}
    }
  }

  // Web fallback
  if (entry.fallback) {
    try {
      await Linking.openURL(entry.fallback);
      return true;
    } catch {}
  }

  return false;
}

/**
 * Open Android Settings
 */
export async function openSettings(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.SETTINGS
      );
      return true;
    } else {
      await Linking.openSettings();
      return true;
    }
  } catch {
    try {
      await Linking.openSettings();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Perform a YouTube search — opens YouTube app directly on the search
 */
export async function searchYouTube(query: string): Promise<boolean> {
  const encoded = encodeURIComponent(query);
  // YouTube app intent for search
  const urls = [
    `vnd.youtube://results?search_query=${encoded}`,
    `https://www.youtube.com/results?search_query=${encoded}`,
  ];
  for (const url of urls) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    } catch {}
  }
  // Force open the search URL
  try {
    await Linking.openURL(urls[1]);
    return true;
  } catch {}
  return false;
}

/**
 * Open a URL in the default browser / app
 */
export async function openURL(url: string): Promise<boolean> {
  try {
    const finalUrl = url.startsWith("http") ? url : `https://${url}`;
    await Linking.openURL(finalUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Make a phone call
 */
export async function makeCall(number: string): Promise<boolean> {
  try {
    await Linking.openURL(`tel:${number}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Send a WhatsApp message
 */
export async function sendWhatsApp(number: string, message?: string): Promise<boolean> {
  const msg = message ? encodeURIComponent(message) : "";
  const cleanNumber = number.replace(/\D/g, "");
  const urls = [
    `whatsapp://send?phone=${cleanNumber}&text=${msg}`,
    `https://wa.me/${cleanNumber}?text=${msg}`,
  ];
  for (const url of urls) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    } catch {}
  }
  return false;
}

/**
 * Look up a contact by name and return their first phone number
 */
export async function lookupContactNumber(name: string): Promise<string | null> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") return null;
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });
    if (!data.length) return null;
    const lower = name.toLowerCase().trim();
    const match = data.find((c) => {
      const full = (c.name ?? "").toLowerCase();
      return full.includes(lower) || lower.includes(full.split(" ")[0]);
    });
    if (!match?.phoneNumbers?.length) return null;
    return match.phoneNumbers[0].number?.replace(/[^0-9+]/g, "") ?? null;
  } catch {
    return null;
  }
}

/**
 * Open a WhatsApp chat (or call) with a contact name or number
 */
export async function openWhatsAppContact(
  contactNameOrNumber: string
): Promise<boolean> {
  let number = contactNameOrNumber;
  // If it looks like a name (not digits/+), look up the contact
  if (!/^[0-9+]/.test(contactNameOrNumber.trim())) {
    const found = await lookupContactNumber(contactNameOrNumber);
    if (found) number = found;
    else {
      // Fallback: just open WhatsApp
      return openApp("WhatsApp");
    }
  }
  const clean = number.replace(/[^0-9+]/g, "");
  const urls = [
    `whatsapp://send?phone=${clean}`,
    `https://wa.me/${clean}`,
  ];
  for (const url of urls) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    } catch {}
  }
  try {
    await Linking.openURL(urls[1]);
    return true;
  } catch {}
  return false;
}

/**
 * Make a phone call to a contact name or number
 */
export async function callContact(contactNameOrNumber: string): Promise<boolean> {
  let number = contactNameOrNumber;
  if (!/^[0-9+]/.test(contactNameOrNumber.trim())) {
    const found = await lookupContactNumber(contactNameOrNumber);
    if (found) number = found;
    else return false;
  }
  return makeCall(number);
}

function findAppEntry(name: string): { android: string; fallback?: string } | null {
  // Exact match
  if (APP_DEEP_LINKS[name]) return APP_DEEP_LINKS[name];

  // Case-insensitive match
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(APP_DEEP_LINKS)) {
    if (key.toLowerCase() === lower) return val;
  }

  // Partial match
  for (const [key, val] of Object.entries(APP_DEEP_LINKS)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return val;
    }
  }

  return null;
}
