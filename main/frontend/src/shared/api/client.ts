const API_BASE_URL = 'http://localhost:4000/api';

export async function apiGet<T>(path: string, userId?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: userId ? { 'x-user-id': userId } : undefined
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
