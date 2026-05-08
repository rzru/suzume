import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildWsUrl } from "../api/url";
import { useAppSettings } from "./useAppSettings";
import type {
  CardScope,
  PracticeMode,
  ProficiencyLevel,
  TranslateDirection,
} from "../utils/practice";

export type DiffSegment = {
  kind: "equal" | "removed" | "added";
  text: string;
};

export type PracticeFeedback = {
  has_mistakes: boolean;
  original: string;
  corrected: string;
  diff_original: DiffSegment[];
  diff_corrected: DiffSegment[];
};

export type PracticeMessage =
  | {
      id: string;
      role: "assistant";
      content: string;
      card: AssistantCard;
      feedback: PracticeFeedback | null;
      skipped?: boolean;
    }
  | { id: string; role: "user"; content: string };

export type AssistantCard = {
  id: number;
  target: string;
  fields: Record<string, string>;
};

export type SocketStatus = "connecting" | "open" | "closed" | "error";

type ServerFrame =
  | {
      type: "assistant";
      content: string;
      card: AssistantCard;
      feedback?: PracticeFeedback | null;
    }
  | { type: "error"; message: string }
  | { type: "scope_exhausted"; feedback?: PracticeFeedback | null };

type UsePracticeSocketParams = {
  deckName: string;
  mode: PracticeMode;
  level: ProficiencyLevel;
  scope: CardScope;
  direction: TranslateDirection | null;
};

type BuildPracticeUrlParams = UsePracticeSocketParams & {
  model: string | null;
  targetLanguage: string | null;
  think: boolean;
};

const buildPracticeUrl = (params: BuildPracticeUrlParams): string => {
  const search = new URLSearchParams({
    deck: params.deckName,
    mode: params.mode,
    level: params.level,
    scope: params.scope,
  });
  if (params.direction) {
    search.set("direction", params.direction);
  }
  if (params.model) {
    search.set("model", params.model);
  }
  if (params.targetLanguage) {
    search.set("target_language", params.targetLanguage);
  }
  search.set("think", String(params.think));
  return buildWsUrl(`/ws/practice?${search.toString()}`);
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `msg-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export function usePracticeSocket(params: UsePracticeSocketParams) {
  const { deckName, mode, level, scope, direction } = params;
  const { model, targetLanguage, think } = useAppSettings();

  const [messages, setMessages] = useState<PracticeMessage[]>([]);
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [isAwaitingReply, setIsAwaitingReply] = useState(true);
  const [scopeExhausted, setScopeExhausted] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState<PracticeFeedback | null>(null);
  const [restartKey, setRestartKey] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);

  const url = useMemo(
    () =>
      buildPracticeUrl({
        deckName,
        mode,
        level,
        scope,
        direction,
        model,
        targetLanguage,
        think,
      }),
    [deckName, mode, level, scope, direction, model, targetLanguage, think],
  );

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;
    setMessages([]);
    setError(null);
    setStatus("connecting");
    setIsAwaitingReply(true);
    setScopeExhausted(false);
    setFinalFeedback(null);

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
              feedback: parsed.feedback ?? null,
            },
          ]);
          setIsAwaitingReply(false);
        } else if (parsed.type === "error") {
          setError(parsed.message);
          setIsAwaitingReply(false);
        } else if (parsed.type === "scope_exhausted") {
          setScopeExhausted(true);
          setFinalFeedback(parsed.feedback ?? null);
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
  }, [url, restartKey]);

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

  const skip = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({ type: "skip" }));
    setMessages((prev) => {
      let marked = false;
      const next: PracticeMessage[] = [];
      for (let i = prev.length - 1; i >= 0; i--) {
        const message = prev[i];
        if (!marked && message.role === "assistant") {
          next.unshift({ ...message, skipped: true });
          marked = true;
        } else {
          next.unshift(message);
        }
      }
      return next;
    });
    setIsAwaitingReply(true);
    setError(null);
  }, []);

  const restart = useCallback(() => {
    setRestartKey((value) => value + 1);
  }, []);

  return {
    messages,
    status,
    error,
    send,
    skip,
    isAwaitingReply,
    scopeExhausted,
    finalFeedback,
    restart,
  };
}
