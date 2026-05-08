import { useEffect, type RefObject } from "react";

export function useAutoScrollToBottom<T extends HTMLElement>(
  ref: RefObject<T | null>,
  deps: ReadonlyArray<unknown>,
): void {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
