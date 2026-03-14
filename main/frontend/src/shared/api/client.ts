import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

type ExpoConstantsWithManifest2 = typeof Constants & {
  manifest2?: {
    extra?: {
      expoClient?: {
        hostUri?: string;
      };
    };
  };
};

type ApiSettingsFile = {
  baseUrl?: string;
};

const API_SETTINGS_PATH = `${FileSystem.documentDirectory || ''}timhood-api-settings.json`;

let apiBaseUrlCache: string | null = null;
let apiBaseUrlLoaded = false;

function resolveDefaultApiBaseUrl(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as ExpoConstantsWithManifest2).manifest2?.extra?.expoClient?.hostUri;
  const host = hostUri?.split(':')[0];

  if (host) {
    return `http://${host}:4000/api`;
  }

  return 'http://127.0.0.1:4000/api';
}

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    throw new Error('Backend URL is required.');
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('Backend URL must start with http:// or https://');
  }

  if (trimmed.endsWith('/api')) {
    return trimmed;
  }

  return `${trimmed}/api`;
}

async function ensureApiBaseUrlLoaded(): Promise<void> {
  if (apiBaseUrlLoaded) {
    return;
  }

  apiBaseUrlLoaded = true;

  try {
    const fileInfo = await FileSystem.getInfoAsync(API_SETTINGS_PATH);
    if (!fileInfo.exists) {
      apiBaseUrlCache = resolveDefaultApiBaseUrl();
      return;
    }

    const raw = await FileSystem.readAsStringAsync(API_SETTINGS_PATH);
    const parsed = JSON.parse(raw) as ApiSettingsFile;
    apiBaseUrlCache = parsed.baseUrl ? normalizeApiBaseUrl(parsed.baseUrl) : resolveDefaultApiBaseUrl();
  } catch {
    apiBaseUrlCache = resolveDefaultApiBaseUrl();
  }
}

export async function getApiBaseUrl(): Promise<string> {
  await ensureApiBaseUrlLoaded();
  return apiBaseUrlCache || resolveDefaultApiBaseUrl();
}

export async function saveApiBaseUrl(value: string): Promise<string> {
  const normalized = normalizeApiBaseUrl(value);
  await FileSystem.writeAsStringAsync(API_SETTINGS_PATH, JSON.stringify({ baseUrl: normalized }));
  apiBaseUrlCache = normalized;
  apiBaseUrlLoaded = true;
  return normalized;
}

export async function resetApiBaseUrl(): Promise<string> {
  const fallback = resolveDefaultApiBaseUrl();
  try {
    await FileSystem.deleteAsync(API_SETTINGS_PATH, { idempotent: true });
  } catch {
    // Ignore cleanup failures and fall back in memory.
  }
  apiBaseUrlCache = fallback;
  apiBaseUrlLoaded = true;
  return fallback;
}

export async function apiGet<T>(path: string, userId?: string): Promise<T> {
  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: userId ? { 'x-user-id': userId } : undefined
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, userId?: string): Promise<T> {
  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || `Request failed: ${response.status}`;
  } catch {
    return `Request failed: ${response.status}`;
  }
}
