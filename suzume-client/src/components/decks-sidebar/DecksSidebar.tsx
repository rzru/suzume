import { Badge, Flex, Heading, ScrollArea, Separator, Text } from "@radix-ui/themes";
import { LayersIcon } from "@radix-ui/react-icons";
import type { DeckNode } from "../../api/decksTree";
import { DeckTree } from "../deck-tree";
import styles from "./DecksSidebar.module.css";

type DecksSidebarProps = {
  decks: DeckNode[];
  onNavigate?: () => void;
};

function countDecks(nodes: DeckNode[]): number {
  let total = 0;
  for (const node of nodes) {
    total += 1 + countDecks(node.children);
  }
  return total;
}

export function DecksSidebar({ decks, onNavigate }: DecksSidebarProps) {
  const totalDecks = countDecks(decks);

  return (
    <Flex direction="column" gap="3" height="100%">
      <Flex align="center" justify="between">
        <Flex align="center" gap="2">
          <LayersIcon />
          <Heading size="3">Decks</Heading>
        </Flex>
        <Badge color="gray" variant="soft">
          {totalDecks}
        </Badge>
      </Flex>
      <Separator size="4" />
      <ScrollArea type="auto" scrollbars="vertical" className={styles.scrollArea}>
        {decks.length === 0 ? (
          <Text size="2" color="gray">
            No decks yet
          </Text>
        ) : (
          <DeckTree nodes={decks} onNavigate={onNavigate} />
        )}
      </ScrollArea>
    </Flex>
  );
}
