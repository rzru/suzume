import { buildApiUrl } from "./url";
import { fetchJson } from "./fetchJson";

export type DeckNode = {
  name: string;
  id?: number;
  children: DeckNode[];
};

export type DeckTreeResponse = {
  decks: DeckNode[];
};

const getDecksTreeUrl = (): string => buildApiUrl("/anki/decks-tree");

export async function fetchDecksTree(): Promise<DeckTreeResponse> {
  return fetchJson<DeckTreeResponse>(getDecksTreeUrl(), "Decks tree");
}
