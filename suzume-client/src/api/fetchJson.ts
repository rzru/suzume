export async function fetchJson<T>(url: string, label: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${label} request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}
