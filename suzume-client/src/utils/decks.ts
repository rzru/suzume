import type { DeckNode } from "../api/decksTree";

export const deckHref = (parts: string[]): string =>
  `/decks/${parts.map(encodeURIComponent).join("/")}`;

export const splatToParts = (splat: string | undefined): string[] =>
  splat ? splat.split("/").filter(Boolean).map(decodeURIComponent) : [];

export const partsToFullName = (parts: string[]): string => parts.join("::");

export function findDeckByPath(nodes: DeckNode[], parts: string[]): DeckNode | null {
  let level = nodes;
  let found: DeckNode | null = null;

  for (const part of parts) {
    found = level.find((node) => node.name === part) ?? null;

    if (!found) {
      return null;
    }

    level = found.children;
  }

  return found;
}
