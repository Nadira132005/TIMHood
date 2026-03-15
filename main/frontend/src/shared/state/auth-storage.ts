import { Platform } from "react-native";

import { SessionState } from "./session";

const STORAGE_KEY = "timhood.session";

let memoryUserId: string | null = null;

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

function toSessionState(userId: string | null): SessionState {
  return {
    userId,
    profile: null,
  };
}

export async function loadPersistedSession(): Promise<SessionState> {
  const secureStore = getSecureStore();
  const raw = secureStore
    ? await secureStore.getItemAsync(STORAGE_KEY)
    : Platform.OS === "web"
      ? readWebStorage()
      : memoryUserId;

  if (!raw) {
    return toSessionState(null);
  }

  memoryUserId = raw;
  return toSessionState(raw);
}

export async function persistSession(userId: string): Promise<SessionState> {
  memoryUserId = userId;

  const secureStore = getSecureStore();
  if (secureStore) {
    await secureStore.setItemAsync(STORAGE_KEY, userId);
  } else if (Platform.OS === "web") {
    writeWebStorage(userId);
  }

  return toSessionState(userId);
}

export async function clearPersistedSession(): Promise<void> {
  memoryUserId = null;

  const secureStore = getSecureStore();
  if (secureStore) {
    await secureStore.deleteItemAsync(STORAGE_KEY);
  } else if (Platform.OS === "web") {
    clearWebStorage();
  }
}
