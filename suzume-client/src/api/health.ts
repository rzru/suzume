export type HealthResponse = {
  ollama_connected: boolean
  anki_connected: boolean
}

export const getHealthUrl = (): string =>
  import.meta.env.VITE_HEALTH_URL ??
  `${window.location.protocol}//${window.location.hostname}:18080/status`

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(getHealthUrl())
  if (!response.ok) {
    throw new Error(`Health request failed (${response.status})`)
  }
  return response.json() as Promise<HealthResponse>
}
