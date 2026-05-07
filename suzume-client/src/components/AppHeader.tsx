import { Flex, Heading, Separator, Text } from "@radix-ui/themes";

export default function AppHeader() {
  return (
    <Flex direction="column">
      <Flex align="center" gap="3" px="5" py="3">
        <Heading size="4">Suzume</Heading>
        <Text size="2" color="gray">
          Anki review companion
        </Text>
      </Flex>
      <Separator size="4" />
    </Flex>
  );
}
