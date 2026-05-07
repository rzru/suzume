import { buildApiUrl } from "./url";
import { fetchJson } from "./fetchJson";

export type HealthResponse = {
  ollama_connected: boolean;
  anki_connected: boolean;
};

export const getHealthUrl = (): string => buildApiUrl("/status", import.meta.env.VITE_HEALTH_URL);

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>(getHealthUrl(), "Health");
}
