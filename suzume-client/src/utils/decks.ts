import type { DeckNode } from "../api/decksTree";

export const deckHref = (id: number): string => `/decks/${id}`;

export const partsToFullName = (parts: string[]): string => parts.join("::");

export type DeckLookup = {
  deck: DeckNode;
  parents: string[];
};

export function findDeckById(nodes: DeckNode[], id: number): DeckLookup | null {
  for (const node of nodes) {
    if (node.id === id) {
      return { deck: node, parents: [] };
    }

    const childMatch = findDeckById(node.children, id);
    if (childMatch) {
      return { deck: childMatch.deck, parents: [node.name, ...childMatch.parents] };
    }
  }

  return null;
}
