import { useQuery } from "@tanstack/react-query";
import { fetchDecksTree } from "../api/decksTree";

export function useDecksTreeQuery() {
  return useQuery({
    queryKey: ["anki", "decks-tree"],
    queryFn: fetchDecksTree,
    refetchInterval: 3000,
    staleTime: 2000,
    retry: 1,
  });
}
