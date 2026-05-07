import { useQuery } from "@tanstack/react-query";
import { fetchDeckCounts } from "../api/deckCounts";

export function useDeckCountsQuery(deckId: number, deckName: string) {
  return useQuery({
    queryKey: ["anki", "deck-counts", deckId],
    queryFn: () => fetchDeckCounts(deckName),
    staleTime: 30_000,
    retry: 1,
  });
}
