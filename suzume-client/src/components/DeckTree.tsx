import { Box, Flex, Text } from "@radix-ui/themes";
import { TriangleRightIcon } from "@radix-ui/react-icons";
import { NavLink } from "react-router-dom";
import type { DeckNode } from "../api/decksTree";
import { deckHref } from "../utils/decks";

type DeckTreeProps = {
  nodes: DeckNode[];
  parents?: string[];
};

export default function DeckTree({ nodes, parents = [] }: DeckTreeProps) {
  return (
    <Flex direction="column" gap="1">
      {nodes.map((node) => {
        const path = [...parents, node.name];
        const hasChildren = node.children.length > 0;

        return (
          <Box key={node.name}>
            <NavLink
              to={deckHref(path)}
              end
              className={({ isActive }) => `deck-link${isActive ? " deck-link--active" : ""}`}
            >
              {hasChildren ? (
                <TriangleRightIcon className="deck-link__chevron" />
              ) : (
                <span className="deck-link__leaf-dot" />
              )}
              <Text size="2" className="deck-link__name">
                {node.name}
              </Text>
            </NavLink>
            {hasChildren && (
              <Box className="deck-children" mt="1">
                <DeckTree nodes={node.children} parents={path} />
              </Box>
            )}
          </Box>
        );
      })}
    </Flex>
  );
}
