import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { StackIcon } from "@radix-ui/react-icons";

type DeckHeaderProps = {
  deckName: string;
  parents: string[];
};

export function DeckHeader({ deckName, parents }: DeckHeaderProps) {
  const breadcrumb = parents.length > 0 ? parents.join(" / ") : "Top-level deck";

  return (
    <Box>
      <Flex align="center" gap="2">
        <StackIcon />
        <Heading size="6">{deckName}</Heading>
      </Flex>
      <Text size="2" color="gray">
        {breadcrumb}
      </Text>
    </Box>
  );
}
