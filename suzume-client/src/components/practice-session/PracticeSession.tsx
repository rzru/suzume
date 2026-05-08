import {
  Badge,
  Box,
  Button,
  Callout,
  Flex,
  Heading,
  ScrollArea,
  Spinner,
  Text,
  TextField,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  PaperPlaneIcon,
  StackIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  const { messages, status, error, send, isAwaitingReply } = usePracticeSocket({
    deckName,
    mode,
    level,
    scope,
    direction,
  });

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isAwaitingReply]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== "open" || isAwaitingReply) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    send(trimmed);
    setDraft("");
  };

  const breadcrumb = parents.length > 0 ? parents.join(" / ") : "Top-level deck";
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const currentTarget =
    lastAssistant && lastAssistant.role === "assistant" ? lastAssistant.card.target : "";

  const composerDisabled = status !== "open" || isAwaitingReply;

  return (
    <Flex direction="column" gap="4" height="100%" className={styles.session}>
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

      {currentTarget && (
        <Box className={styles.targetBanner}>
          <Flex align="center" gap="2">
            <StarIcon />
            <Text size="2" color="gray">
              Now practicing
            </Text>
            <Text size="3" weight="bold">
              {currentTarget}
            </Text>
          </Flex>
        </Box>
      )}

      <ScrollArea type="auto" scrollbars="vertical" className={styles.scroller} ref={scrollRef}>
        <Flex direction="column" gap="3" pr="3">
          {messages.length === 0 && status === "connecting" && (
            <Flex justify="center" align="center" gap="2">
              <Spinner size="2" />
              <Text color="gray">Connecting to practice session...</Text>
            </Flex>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
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

      <form onSubmit={handleSubmit} className={styles.composer}>
        <TextField.Root
          size="3"
          placeholder={
            mode === "translate" && direction === "to"
              ? "Translate the sentence back..."
              : "Type your reply..."
          }
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={composerDisabled}
          className={styles.composerInput}
        />
        <Button type="submit" size="3" disabled={composerDisabled || draft.trim().length === 0}>
          <PaperPlaneIcon />
          Send
        </Button>
      </form>
    </Flex>
  );
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
