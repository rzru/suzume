import { Badge, Box, Callout, Card, Code, DataList, Flex, Heading, Text } from "@radix-ui/themes";
import { ExclamationTriangleIcon, InfoCircledIcon, StackIcon } from "@radix-ui/react-icons";
import { useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppShell from "../components/AppShell";
import DecksSidebar from "../components/DecksSidebar";
import { findDeckByPath, partsToFullName, splatToParts } from "../utils/decks";
import { useDecksTreeQuery } from "../hooks/useDecksTreeQuery";

export default function DecksPage() {
  const { data } = useDecksTreeQuery();

  return (
    <AppShell sidebar={<DecksSidebar decks={data?.decks ?? []} />} header={<AppHeader />}>
      <DecksPageInner />
    </AppShell>
  );
}

const DecksPageInner = () => {
  const params = useParams<{ "*"?: string }>();
  const { isPending, error, data } = useDecksTreeQuery();

  if (isPending) {
    return null;
  }

  if (error) {
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>{error.message ?? "Decks tree request failed"}</Callout.Text>
      </Callout.Root>
    );
  }

  const selectedParts = splatToParts(params["*"]);
  const hasSelection = selectedParts.length > 0;

  if (!hasSelection) {
    return (
      <Callout.Root color="iris" variant="surface">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>Select a deck from the left sidebar to get started.</Callout.Text>
      </Callout.Root>
    );
  }

  const selectedDeck = findDeckByPath(data.decks ?? [], selectedParts);

  if (!selectedDeck) {
    return (
      <Callout.Root color="amber">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          No deck matches <Code>{partsToFullName(selectedParts)}</Code>. Pick another deck from the
          sidebar.
        </Callout.Text>
      </Callout.Root>
    );
  }

  const fullName = partsToFullName(selectedParts);
  const parents = selectedParts.slice(0, -1);
  const breadcrumb = parents.length > 0 ? parents.join(" / ") : "Top-level deck";
  const subdeckCount = selectedDeck.children.length;

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Box>
          <Flex align="center" gap="2">
            <StackIcon />
            <Heading size="6">{selectedDeck.name}</Heading>
          </Flex>
          <Text size="2" color="gray">
            {breadcrumb}
          </Text>
        </Box>

        <DataList.Root>
          <DataList.Item>
            <DataList.Label minWidth="120px">Full path</DataList.Label>
            <DataList.Value>
              <Code>{fullName}</Code>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="120px">Depth</DataList.Label>
            <DataList.Value>
              <Text>{selectedParts.length}</Text>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="120px">Subdecks</DataList.Label>
            <DataList.Value>
              <Badge color={subdeckCount > 0 ? "iris" : "gray"} variant="soft">
                {subdeckCount}
              </Badge>
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>

        {subdeckCount > 0 && (
          <Box>
            <Text size="2" color="gray" mb="2" as="div">
              Direct subdecks
            </Text>
            <Flex gap="2" wrap="wrap">
              {selectedDeck.children.map((child) => (
                <Badge key={child.name} color="gray" variant="soft">
                  {child.name}
                </Badge>
              ))}
            </Flex>
          </Box>
        )}
      </Flex>
    </Card>
  );
};
