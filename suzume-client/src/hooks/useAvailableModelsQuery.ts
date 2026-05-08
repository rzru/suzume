import { useQuery } from "@tanstack/react-query";
import { fetchAvailableModels } from "../api/models";

export function useAvailableModelsQuery(enabled = true) {
  return useQuery({
    queryKey: ["ollama", "models"],
    queryFn: fetchAvailableModels,
    enabled,
    staleTime: 30_000,
    retry: 0,
  });
}
