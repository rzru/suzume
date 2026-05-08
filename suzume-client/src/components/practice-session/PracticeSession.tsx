import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  ScrollArea,
  Spinner,
  Text,
  TextArea,
} from "@radix-ui/themes";
import { ExclamationTriangleIcon, PaperPlaneIcon, StackIcon } from "@radix-ui/react-icons";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { usePracticeSocket } from "../../hooks/usePracticeSocket";
import type {
  CardScope,
  PracticeMode,
  ProficiencyLevel,
  TranslateDirection,
} from "../../utils/practice";
import { MessageBubble } from "./MessageBubble";
import styles from "./PracticeSession.module.css";

type PracticeSessionProps = {
  deckName: string;
  deckLabel: string;
  parents: string[];
  mode: PracticeMode;
  level: ProficiencyLevel;
  scope: CardScope;
  direction: TranslateDirection | null;
};

const SCOPE_LABELS: Record<CardScope, string> = {
  today: "Reviewed today",
  all: "All known",
};

const DIRECTION_LABELS: Record<TranslateDirection, string> = {
  from: "From card language",
  to: "Into another language",
};

export function PracticeSession({
  deckName,
  deckLabel,
  parents,
  mode,
  level,
  scope,
  direction,
}: PracticeSessionProps) {
  const { messages, status, error, send, skip, isAwaitingReply } = usePracticeSocket({
    deckName,
    mode,
    level,
    scope,
    direction,
  });

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isAwaitingReply]);

  useEffect(() => {
    if (status === "open" && !isAwaitingReply) {
      inputRef.current?.focus();
    }
  }, [status, isAwaitingReply]);

  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== "open" || isAwaitingReply) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    send(trimmed);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const breadcrumb = parents.length > 0 ? parents.join(" / ") : "Top-level deck";
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

  const composerDisabled = status !== "open" || isAwaitingReply;

  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantIndex = i;
      break;
    }
  }
  const canSkip = !composerDisabled && lastAssistantIndex !== -1;

  const handleSkip = () => {
    if (!canSkip) return;
    setDraft("");
    skip();
  };

  return (
    <Flex justify="center" align={{ initial: "stretch", md: "center" }} height="100%">
      <Card size="3" className={styles.session}>
        <Flex direction="column" gap="4" height="100%" minHeight="0">
          <Box>
            <Flex align="center" gap="2">
              <StackIcon />
              <Heading size="5">{deckLabel}</Heading>
            </Flex>
            <Text size="2" color="gray">
              {breadcrumb}
            </Text>
          </Box>

          <Flex align="center" gap="2" wrap="wrap">
            <Badge color="iris" variant="soft">
              {modeLabel}
            </Badge>
            <Badge color="gray" variant="soft">
              {level.toUpperCase()}
            </Badge>
            <Badge color="grass" variant="soft">
              {SCOPE_LABELS[scope]}
            </Badge>
            {direction && (
              <Badge color="amber" variant="soft">
                {DIRECTION_LABELS[direction]}
              </Badge>
            )}
            <SocketStatusBadge status={status} />
          </Flex>

          {error !== null && (
            <Callout.Root color="amber" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <ScrollArea type="auto" scrollbars="vertical" className={styles.scroller} ref={scrollRef}>
            <Flex direction="column" gap="3" pr="3">
              {messages.length === 0 && status === "connecting" && (
                <Flex justify="center" align="center" gap="2">
                  <Spinner size="2" />
                  <Text color="gray">Connecting to practice session...</Text>
                </Flex>
              )}
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onSkip={index === lastAssistantIndex && canSkip ? handleSkip : undefined}
                />
              ))}
              {isAwaitingReply && status === "open" && (
                <Flex align="center" gap="2">
                  <Spinner size="1" />
                  <Text size="2" color="gray">
                    Thinking...
                  </Text>
                </Flex>
              )}
            </Flex>
          </ScrollArea>

          <form ref={formRef} onSubmit={handleSubmit} className={styles.composer}>
            <TextArea
              ref={inputRef}
              size="3"
              placeholder={composerPlaceholder(mode, direction)}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={composerDisabled}
              resize="none"
              rows={1}
              className={styles.composerInput}
            />
            <Button type="submit" size="3" disabled={composerDisabled || draft.trim().length === 0}>
              <PaperPlaneIcon />
              <span className={styles.composerSendLabel}>Send</span>
            </Button>
          </form>
        </Flex>
      </Card>
    </Flex>
  );
}

function composerPlaceholder(mode: PracticeMode, direction: TranslateDirection | null): string {
  if (mode === "construct") {
    return "Write a sentence using the target word...";
  }
  if (mode === "translate" && direction === "to") {
    return "Translate the sentence back...";
  }
  return "Type your reply...";
}

function SocketStatusBadge({ status }: { status: ReturnType<typeof usePracticeSocket>["status"] }) {
  switch (status) {
    case "connecting":
      return (
        <Badge color="gray" variant="surface">
          Connecting
        </Badge>
      );
    case "open":
      return (
        <Badge color="grass" variant="surface">
          Connected
        </Badge>
      );
    case "closed":
      return (
        <Badge color="gray" variant="surface">
          Disconnected
        </Badge>
      );
    case "error":
      return (
        <Badge color="red" variant="surface">
          Connection error
        </Badge>
      );
  }
}
