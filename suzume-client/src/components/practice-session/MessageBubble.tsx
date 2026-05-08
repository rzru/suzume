import { Badge, Box, Card, Flex, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import type { PracticeMessage } from "../../hooks/usePracticeSocket";
import styles from "./PracticeSession.module.css";

type MessageBubbleProps = {
  message: PracticeMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const rowClass = `${styles.bubbleRow} ${
    isAssistant ? styles.bubbleRowAssistant : styles.bubbleRowUser
  }`;
  const bubbleClass = `${styles.bubble} ${
    isAssistant ? styles.bubbleAssistant : styles.bubbleUser
  }`;

  const target = message.role === "assistant" ? message.card.target : "";
  const rendered = isAssistant ? renderWithHighlight(message.content, target) : message.content;

  return (
    <Box className={rowClass}>
      <Card size="2" className={bubbleClass}>
        <Text size="2">{rendered}</Text>
        {message.role === "assistant" && (
          <Box className={styles.cardMeta}>
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2" wrap="wrap">
                <Text size="1" color="gray" weight="medium">
                  Card #{message.card.id}
                </Text>
                {target && (
                  <Badge color="amber" variant="surface">
                    Target: {target}
                  </Badge>
                )}
              </Flex>
              {Object.entries(message.card.fields)
                .filter(([, value]) => value.trim().length > 0)
                .slice(0, 4)
                .map(([name, value]) => (
                  <Text key={name} size="1" color="gray">
                    <strong>{name}:</strong> {value}
                  </Text>
                ))}
            </Flex>
          </Box>
        )}
      </Card>
    </Box>
  );
}

function renderWithHighlight(content: string, target: string): ReactNode {
  const trimmed = target.trim();
  if (!trimmed) {
    return content;
  }

  const lowerContent = content.toLowerCase();
  const lowerTarget = trimmed.toLowerCase();

  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  let next = lowerContent.indexOf(lowerTarget, cursor);

  while (next !== -1) {
    if (next > cursor) {
      parts.push(content.slice(cursor, next));
    }
    parts.push(
      <mark key={`hl-${key++}`} className={styles.targetHighlight}>
        {content.slice(next, next + trimmed.length)}
      </mark>,
    );
    cursor = next + trimmed.length;
    next = lowerContent.indexOf(lowerTarget, cursor);
  }

  if (cursor === 0) {
    return content;
  }

  if (cursor < content.length) {
    parts.push(content.slice(cursor));
  }

  return parts;
}
