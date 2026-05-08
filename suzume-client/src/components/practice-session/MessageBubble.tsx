import { Box, Button, Card, Dialog, Flex, IconButton, Text } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import type { ReactNode } from "react";
import type { AssistantCard, PracticeMessage } from "../../hooks/usePracticeSocket";
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
      <Flex align="center" gap="2" className={styles.bubbleWrap}>
        <Card size="2" className={bubbleClass}>
          <Text size="2">{rendered}</Text>
        </Card>
        {message.role === "assistant" && <CardInfoDialog card={message.card} />}
      </Flex>
    </Box>
  );
}

function CardInfoDialog({ card }: { card: AssistantCard }) {
  const fields = Object.entries(card.fields).filter(([, value]) => value.trim().length > 0);

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <IconButton
          variant="ghost"
          color="gray"
          size="1"
          aria-label="Show card details"
          className={styles.infoButton}
        >
          <InfoCircledIcon />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content className={styles.drawerContent}>
        <Box className={styles.drawerHeader}>
          <Dialog.Title mb="1">{card.target || `Card #${card.id}`}</Dialog.Title>
          <Dialog.Description size="2" color="gray">
            Card #{card.id}
          </Dialog.Description>
        </Box>

        <Box className={styles.drawerBody}>
          <Flex direction="column" gap="3">
            {fields.map(([name, value]) => (
              <Box key={name}>
                <Text size="1" color="gray" weight="medium" as="div" mb="1">
                  {name}
                </Text>
                <div
                  className={styles.cardFieldHtml}
                  dangerouslySetInnerHTML={{ __html: value }}
                />
              </Box>
            ))}
          </Flex>
        </Box>

        <Flex className={styles.drawerFooter} gap="2" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
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
