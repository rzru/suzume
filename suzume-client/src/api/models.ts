import { buildApiUrl } from "./url";
import { fetchJson } from "./fetchJson";

export type OllamaModel = {
  name: string;
  modified_at: string;
  size: number;
};

export type ModelsResponse = {
  models: OllamaModel[];
};

const getModelsUrl = (): string => buildApiUrl("/api/models");

export async function fetchAvailableModels(): Promise<ModelsResponse> {
  return fetchJson<ModelsResponse>(getModelsUrl(), "Available models");
}

export const FALLBACK_POPULAR_MODELS: string[] = [
  "llama3.1",
  "llama3.2",
  "llama3.3",
  "qwen3",
  "qwen2.5",
  "mistral",
  "gemma3",
  "phi4",
  "deepseek-r1",
  "gpt-oss",
];
