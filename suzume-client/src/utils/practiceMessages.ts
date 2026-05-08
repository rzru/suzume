import type { PracticeMessage } from "../hooks/usePracticeSocket";
import type { PracticeMode, TranslateDirection } from "./practice";

export function findLastAssistantIndex(messages: PracticeMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      return i;
    }
  }
  return -1;
}

export function composerPlaceholder(
  mode: PracticeMode,
  direction: TranslateDirection | null,
): string {
  if (mode === "construct") {
    return "Write a sentence using the target word...";
  }
  if (mode === "translate" && direction === "to") {
    return "Translate the sentence back...";
  }
  return "Type your reply...";
}
