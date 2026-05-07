import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../api/health";

export function useHealthQuery() {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 3000,
    staleTime: 2000,
    retry: 1,
  });
}
