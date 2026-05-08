import { Box, Flex, Text } from "@radix-ui/themes";
import { TriangleRightIcon } from "@radix-ui/react-icons";
import { NavLink } from "react-router-dom";
import type { DeckNode } from "../../api/decksTree";
import { deckHref } from "../../utils/decks";
import styles from "./DeckTree.module.css";

type DeckTreeProps = {
  nodes: DeckNode[];
  onNavigate?: () => void;
};

export function DeckTree({ nodes, onNavigate }: DeckTreeProps) {
  return (
    <Flex direction="column" gap="1">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const icon = hasChildren ? (
          <TriangleRightIcon className={styles.chevron} />
        ) : (
          <span className={styles.leafDot} />
        );

        return (
          <Box key={node.name}>
            {node.id !== undefined ? (
              <NavLink
                to={deckHref(node.id)}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `${styles.link}${isActive ? ` ${styles.linkActive}` : ""}`
                }
              >
                {icon}
                <Text size="2" className={styles.name}>
                  {node.name}
                </Text>
              </NavLink>
            ) : (
              <Flex className={styles.link} align="center">
                {icon}
                <Text size="2" className={styles.name} color="gray">
                  {node.name}
                </Text>
              </Flex>
            )}
            {hasChildren && (
              <Box className={styles.children} mt="1">
                <DeckTree nodes={node.children} onNavigate={onNavigate} />
              </Box>
            )}
          </Box>
        );
      })}
    </Flex>
  );
}
