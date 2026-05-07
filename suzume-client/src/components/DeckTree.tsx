import { Box, Flex, Text } from "@radix-ui/themes";
import { TriangleRightIcon } from "@radix-ui/react-icons";
import { NavLink } from "react-router-dom";
import type { DeckNode } from "../api/decksTree";
import { deckHref } from "../utils/decks";

type DeckTreeProps = {
  nodes: DeckNode[];
};

export default function DeckTree({ nodes }: DeckTreeProps) {
  return (
    <Flex direction="column" gap="1">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const Icon = hasChildren ? (
          <TriangleRightIcon className="deck-link__chevron" />
        ) : (
          <span className="deck-link__leaf-dot" />
        );

        return (
          <Box key={node.name}>
            {node.id != null ? (
              <NavLink
                to={deckHref(node.id)}
                end
                className={({ isActive }) => `deck-link${isActive ? " deck-link--active" : ""}`}
              >
                {Icon}
                <Text size="2" className="deck-link__name">
                  {node.name}
                </Text>
              </NavLink>
            ) : (
              <Flex className="deck-link" align="center">
                {Icon}
                <Text size="2" className="deck-link__name" color="gray">
                  {node.name}
                </Text>
              </Flex>
            )}
            {hasChildren && (
              <Box className="deck-children" mt="1">
                <DeckTree nodes={node.children} />
              </Box>
            )}
          </Box>
        );
      })}
    </Flex>
  );
}
