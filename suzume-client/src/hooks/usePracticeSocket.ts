import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildWsUrl } from "../api/url";
import type {
  CardScope,
  PracticeMode,
  ProficiencyLevel,
  TranslateDirection,
} from "../utils/practice";

export type PracticeMessage =
  | { id: string; role: "assistant"; content: string; card: AssistantCard }
  | { id: string; role: "user"; content: string };

export type AssistantCard = {
  id: number;
  target: string;
  fields: Record<string, string>;
};

export type SocketStatus = "connecting" | "open" | "closed" | "error";

type ServerFrame =
  | { type: "assistant"; content: string; card: AssistantCard }
  | { type: "error"; message: string };

type UsePracticeSocketParams = {
  deckName: string;
  mode: PracticeMode;
  level: ProficiencyLevel;
  scope: CardScope;
  direction: TranslateDirection | null;
};

const buildPracticeUrl = (params: UsePracticeSocketParams): string => {
  const search = new URLSearchParams({
    deck: params.deckName,
    mode: params.mode,
    level: params.level,
    scope: params.scope,
  });
  if (params.direction) {
    search.set("direction", params.direction);
  }
  return buildWsUrl(`/ws/practice?${search.toString()}`);
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `msg-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export function usePracticeSocket(params: UsePracticeSocketParams) {
  const { deckName, mode, level, scope, direction } = params;

  const [messages, setMessages] = useState<PracticeMessage[]>([]);
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [isAwaitingReply, setIsAwaitingReply] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);

  const url = useMemo(
    () => buildPracticeUrl({ deckName, mode, level, scope, direction }),
    [deckName, mode, level, scope, direction],
  );

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;
    setMessages([]);
    setError(null);
    setStatus("connecting");
    setIsAwaitingReply(true);

    const isActive = () => socketRef.current === socket;

    socket.addEventListener("open", () => {
      if (!isActive()) return;
      setStatus("open");
    });

    socket.addEventListener("message", (event) => {
      if (!isActive()) return;
      try {
        const parsed: ServerFrame = JSON.parse(event.data);
        if (parsed.type === "assistant") {
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: parsed.content,
              card: parsed.card,
            },
          ]);
          setIsAwaitingReply(false);
        } else if (parsed.type === "error") {
          setError(parsed.message);
          setIsAwaitingReply(false);
        }
      } catch {
        setError("Received an unexpected message from the server.");
        setIsAwaitingReply(false);
      }
    });

    socket.addEventListener("error", () => {
      if (!isActive()) return;
      setStatus("error");
      setIsAwaitingReply(false);
    });

    socket.addEventListener("close", () => {
      if (!isActive()) return;
      setStatus("closed");
      setIsAwaitingReply(false);
    });

    return () => {
      socketRef.current = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, "navigation");
      }
    };
  }, [url]);

  const send = useCallback((content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({ type: "user", content: trimmed }));
    setMessages((prev) => [...prev, { id: newId(), role: "user", content: trimmed }]);
    setIsAwaitingReply(true);
    setError(null);
  }, []);

  return { messages, status, error, send, isAwaitingReply };
}
