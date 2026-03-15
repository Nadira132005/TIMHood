import { Platform } from "react-native";

import { AuthSession, FixedIdentityProfile, SessionState } from "./session";

type PersistedSession = {
  auth: AuthSession;
  profile: FixedIdentityProfile;
};

const STORAGE_KEY = "timhood.session";

let memorySession: PersistedSession | null = null;

function getSecureStore():
  | {
      getItemAsync(key: string): Promise<string | null>;
      setItemAsync(key: string, value: string): Promise<void>;
      deleteItemAsync(key: string): Promise<void>;
    }
  | null {
  try {
    // Optional dependency. Prefer secure device storage when available.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-secure-store");
  } catch {
    return null;
  }
}

function readWebStorage(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem(STORAGE_KEY);
}

function writeWebStorage(value: string) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, value);
}

function clearWebStorage() {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

function toSessionState(session: PersistedSession | null): SessionState {
  if (!session) {
    return {
      userId: null,
      auth: null,
      profile: null,
    };
  }

  return {
    userId: session.profile.userId,
    auth: session.auth,
    profile: session.profile,
  };
}

export async function loadPersistedSession(): Promise<SessionState> {
  const secureStore = getSecureStore();
  const raw = secureStore
    ? await secureStore.getItemAsync(STORAGE_KEY)
    : Platform.OS === "web"
      ? readWebStorage()
      : memorySession
        ? JSON.stringify(memorySession)
        : null;

  if (!raw) {
    return toSessionState(null);
  }

  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    memorySession = parsed;
    return toSessionState(parsed);
  } catch {
    await clearPersistedSession();
    return toSessionState(null);
  }
}

export async function persistSession(
  auth: AuthSession,
  profile: FixedIdentityProfile,
): Promise<SessionState> {
  const nextSession: PersistedSession = { auth, profile };
  const serialized = JSON.stringify(nextSession);
  memorySession = nextSession;

  const secureStore = getSecureStore();
  if (secureStore) {
    await secureStore.setItemAsync(STORAGE_KEY, serialized);
  } else if (Platform.OS === "web") {
    writeWebStorage(serialized);
  }

  return toSessionState(nextSession);
}

export async function clearPersistedSession(): Promise<void> {
  memorySession = null;

  const secureStore = getSecureStore();
  if (secureStore) {
    await secureStore.deleteItemAsync(STORAGE_KEY);
  } else if (Platform.OS === "web") {
    clearWebStorage();
  }
}
