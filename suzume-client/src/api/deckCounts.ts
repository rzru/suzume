import { buildApiUrl } from "./url";
import { fetchJson } from "./fetchJson";

export type DeckCounts = {
  today: number;
  all: number;
  learned: number;
};

const getDeckCountsUrl = (deckName: string): string =>
  buildApiUrl(`/anki/decks/counts?name=${encodeURIComponent(deckName)}`);

export async function fetchDeckCounts(deckName: string): Promise<DeckCounts> {
  return fetchJson<DeckCounts>(getDeckCountsUrl(deckName), "Deck counts");
}
