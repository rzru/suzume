import { Flex, ScrollArea, Spinner, Text } from "@radix-ui/themes";
import { useRef } from "react";
import type {
  PracticeFeedback,
  PracticeMessage,
  SocketStatus,
} from "../../hooks/usePracticeSocket";
import { useAutoScrollToBottom } from "../../hooks/useAutoScrollToBottom";
import { findLastAssistantIndex } from "../../utils/practiceMessages";
import { FeedbackBanner } from "./FeedbackBanner";
import { MessageBubble } from "./MessageBubble";
import styles from "./PracticeMessageList.module.css";

type PracticeMessageListProps = {
  messages: PracticeMessage[];
  status: SocketStatus;
  isAwaitingReply: boolean;
  canSkip: boolean;
  trailingFeedback: PracticeFeedback | null;
  onSkip: () => void;
};

export function PracticeMessageList({
  messages,
  status,
  isAwaitingReply,
  canSkip,
  trailingFeedback,
  onSkip,
}: PracticeMessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useAutoScrollToBottom(scrollRef, [messages.length, isAwaitingReply, trailingFeedback]);

  const lastAssistantIndex = findLastAssistantIndex(messages);

  return (
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
            onSkip={index === lastAssistantIndex && canSkip ? onSkip : undefined}
          />
        ))}
        {trailingFeedback && <FeedbackBanner feedback={trailingFeedback} />}
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
  );
}
