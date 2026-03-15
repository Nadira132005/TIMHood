const getApiBaseUrl = () => {
  return "https://a056-89-238-252-115.ngrok-free.app/api";
};

type AuthHeadersOptions = {
  userId?: string;
};

function buildHeaders(options?: AuthHeadersOptions): HeadersInit | undefined {
  if (options?.userId) {
    return {
      "x-user-id": options.userId,
    };
  }

  return undefined;
}

export async function apiGet<T>(path: string, userId?: string): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: buildHeaders({ userId }),
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
  userId?: string,
): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(buildHeaders({ userId }) ?? {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function apiDelete<T>(path: string, userId?: string): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "DELETE",
    headers: buildHeaders({ userId }),
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
