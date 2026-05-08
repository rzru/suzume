import { Box, Button, Dialog, Flex, IconButton, Text } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import type { AssistantCard } from "../../hooks/usePracticeSocket";
import { rewriteAnkiMedia } from "../../utils/ankiMedia";
import styles from "./CardInfoDialog.module.css";

type CardInfoDialogProps = {
  card: AssistantCard;
};

export function CardInfoDialog({ card }: CardInfoDialogProps) {
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
          <Dialog.Title mb="1">
            {card.target ? (
              <span
                className={styles.drawerTitleHtml}
                dangerouslySetInnerHTML={{ __html: rewriteAnkiMedia(card.target) }}
              />
            ) : (
              `Card #${card.id}`
            )}
          </Dialog.Title>
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
                  dangerouslySetInnerHTML={{ __html: rewriteAnkiMedia(value) }}
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
