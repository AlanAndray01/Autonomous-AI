import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type CommandStatus =
  | "idle"
  | "listening"
  | "processing"
  | "executing"
  | "done"
  | "error";

export interface ParsedAction {
  type: string;
  params?: Record<string, string>;
  status: "pending" | "running" | "done" | "failed";
}

export interface CommandSession {
  id: string;
  rawText: string;
  app: string;
  actions: ParsedAction[];
  timestamp: number;
  status: "success" | "failed" | "partial";
}

export interface VoiceProfile {
  registered: boolean;
  name: string;
  enrolledAt?: number;
  samplesCount: number;
}

interface AssistantContextType {
  status: CommandStatus;
  setStatus: (s: CommandStatus) => void;
  currentCommand: string;
  setCurrentCommand: (c: string) => void;
  parsedActions: ParsedAction[];
  setParsedActions: (a: ParsedAction[]) => void;
  commandHistory: CommandSession[];
  addToHistory: (session: CommandSession) => void;
  clearHistory: () => void;
  voiceProfile: VoiceProfile;
  setVoiceProfile: (p: VoiceProfile) => void;
  activeApp: string | null;
  setActiveApp: (a: string | null) => void;
  isVoiceLocked: boolean;
  setIsVoiceLocked: (v: boolean) => void;
}

const AssistantContext = createContext<AssistantContextType | null>(null);

const HISTORY_KEY = "@assistant_history";
const PROFILE_KEY = "@assistant_profile";
const LOCKED_KEY = "@assistant_locked";

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<CommandStatus>("idle");
  const [currentCommand, setCurrentCommand] = useState("");
  const [parsedActions, setParsedActions] = useState<ParsedAction[]>([]);
  const [commandHistory, setCommandHistory] = useState<CommandSession[]>([]);
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [isVoiceLocked, setIsVoiceLocked] = useState(false);
  const [voiceProfile, setVoiceProfileState] = useState<VoiceProfile>({
    registered: false,
    name: "User",
    samplesCount: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        if (raw) setCommandHistory(JSON.parse(raw));
        const profileRaw = await AsyncStorage.getItem(PROFILE_KEY);
        if (profileRaw) setVoiceProfileState(JSON.parse(profileRaw));
        const lockedRaw = await AsyncStorage.getItem(LOCKED_KEY);
        if (lockedRaw) setIsVoiceLocked(JSON.parse(lockedRaw));
      } catch {}
    })();
  }, []);

  const addToHistory = useCallback(async (session: CommandSession) => {
    setCommandHistory((prev) => {
      const updated = [session, ...prev].slice(0, 50);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setCommandHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);
  }, []);

  const setVoiceProfile = useCallback(async (p: VoiceProfile) => {
    setVoiceProfileState(p);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  }, []);

  const handleSetVoiceLocked = useCallback(async (v: boolean) => {
    setIsVoiceLocked(v);
    await AsyncStorage.setItem(LOCKED_KEY, JSON.stringify(v));
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        status,
        setStatus,
        currentCommand,
        setCurrentCommand,
        parsedActions,
        setParsedActions,
        commandHistory,
        addToHistory,
        clearHistory,
        voiceProfile,
        setVoiceProfile,
        activeApp,
        setActiveApp,
        isVoiceLocked,
        setIsVoiceLocked: handleSetVoiceLocked,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used inside AssistantProvider");
  return ctx;
}
