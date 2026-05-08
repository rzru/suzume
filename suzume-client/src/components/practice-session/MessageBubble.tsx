import { Badge, Box, Card, Flex, IconButton, Text } from "@radix-ui/themes";
import { TrackNextIcon } from "@radix-ui/react-icons";
import type { ReactNode } from "react";
import type { PracticeMessage } from "../../hooks/usePracticeSocket";
import { splitWithHighlight } from "../../utils/practiceHighlight";
import { CardInfoDialog } from "./CardInfoDialog";
import { FeedbackBanner } from "./FeedbackBanner";
import styles from "./MessageBubble.module.css";

type MessageBubbleProps = {
  message: PracticeMessage;
  onSkip?: () => void;
};

export function MessageBubble({ message, onSkip }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const isSkipped = isAssistant && message.skipped === true;
  const rowClass = `${styles.bubbleRow} ${
    isAssistant ? styles.bubbleRowAssistant : styles.bubbleRowUser
  }`;
  const bubbleClass = [
    styles.bubble,
    isAssistant ? styles.bubbleAssistant : styles.bubbleUser,
    isSkipped ? styles.bubbleSkipped : "",
  ]
    .filter(Boolean)
    .join(" ");

  const target = isAssistant ? message.card.target : "";
  const rendered: ReactNode = isAssistant
    ? renderHighlightedContent(message.content, target)
    : message.content;
  const feedback = isAssistant ? message.feedback : null;
  const showSkipButton = isAssistant && !isSkipped && typeof onSkip === "function";

  return (
    <Box className={rowClass}>
      <Flex direction="column" gap="2" className={styles.bubbleWrap}>
        {feedback && <FeedbackBanner feedback={feedback} />}
        <Flex align="center" gap="2">
          <Card size="2" className={bubbleClass}>
            <Text size="2">{rendered}</Text>
          </Card>
          {isAssistant && (
            <Flex direction="row" align="center" gap="2" className={styles.bubbleActions}>
              <CardInfoDialog card={message.card} />
              {showSkipButton && (
                <IconButton
                  variant="ghost"
                  color="gray"
                  size="1"
                  aria-label="Skip this card"
                  className={styles.skipButton}
                  onClick={onSkip}
                >
                  <TrackNextIcon />
                </IconButton>
              )}
            </Flex>
          )}
        </Flex>
        {isSkipped && (
          <Badge color="gray" variant="soft" size="1" className={styles.skippedBadge}>
            Skipped
          </Badge>
        )}
      </Flex>
    </Box>
  );
}

function renderHighlightedContent(content: string, target: string): ReactNode {
  const segments = splitWithHighlight(content, target);
  return segments.map((segment, index) =>
    segment.kind === "highlight" ? (
      <mark key={index} className={styles.targetHighlight}>
        {segment.text}
      </mark>
    ) : (
      <span key={index}>{segment.text}</span>
    ),
  );
}
