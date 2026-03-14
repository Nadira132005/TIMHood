import Constants from 'expo-constants';

type ExpoConstantsWithManifest2 = typeof Constants & {
  manifest2?: {
    extra?: {
      expoClient?: {
        hostUri?: string;
      };
    };
  };
};

function resolveApiBaseUrl(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as ExpoConstantsWithManifest2).manifest2?.extra?.expoClient?.hostUri;
  const host = hostUri?.split(':')[0];

  if (host) {
    return `http://${host}:4000/api`;
  }

  return 'http://localhost:4000/api';
}

const API_BASE_URL = resolveApiBaseUrl();

export async function apiGet<T>(path: string, userId?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: userId ? { 'x-user-id': userId } : undefined
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, userId?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
