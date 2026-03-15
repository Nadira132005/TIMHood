const getApiBaseUrl = () => {
  return "https://9f47-89-123-41-212.ngrok-free.app/api";
};

type AuthHeadersOptions = {
  fallbackUserId?: string;
};

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

function buildHeaders(options?: AuthHeadersOptions): HeadersInit | undefined {
  if (authToken) {
    return {
      Authorization: `Bearer ${authToken}`,
    };
  }

  if (options?.fallbackUserId) {
    return {
      "x-user-id": options.fallbackUserId,
    };
  }

  return undefined;
}

export async function apiGet<T>(path: string, fallbackUserId?: string): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: buildHeaders({ fallbackUserId }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  fallbackUserId?: string,
): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(buildHeaders({ fallbackUserId }) ?? {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function apiDelete<T>(path: string, fallbackUserId?: string): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "DELETE",
    headers: buildHeaders({ fallbackUserId }),
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
