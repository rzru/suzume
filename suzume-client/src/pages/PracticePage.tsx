import { Badge, Box, Callout, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { ExclamationTriangleIcon, StackIcon } from "@radix-ui/react-icons";
import { Navigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import DecksSidebar from "../components/DecksSidebar";
import { isPracticeMode, isProficiencyLevel } from "../utils/practice";
import { findDeckById } from "../utils/decks";
import { useDecksTreeQuery } from "../hooks/useDecksTreeQuery";

export default function PracticePage() {
  const { data } = useDecksTreeQuery();

  return (
    <AppShell sidebar={<DecksSidebar decks={data?.decks ?? []} />}>
      <PracticePageInner />
    </AppShell>
  );
}

const PracticePageInner = () => {
  const params = useParams<{ deckId: string; mode: string; level: string }>();
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

  const { deckId, mode, level } = params;

  if (!deckId || !isPracticeMode(mode) || !isProficiencyLevel(level)) {
    return <Navigate to={deckId ? `/decks/${deckId}` : "/"} replace />;
  }

  const numericId = Number(deckId);
  const lookup = Number.isFinite(numericId) ? findDeckById(data.decks ?? [], numericId) : null;

  if (!lookup) {
    return (
      <Callout.Root color="amber">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>Deck not found. Pick another deck from the sidebar.</Callout.Text>
      </Callout.Root>
    );
  }

  const breadcrumb = lookup.parents.length > 0 ? lookup.parents.join(" / ") : "Top-level deck";
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

  return (
    <Flex direction="column" gap="5">
      <Box>
        <Flex align="center" gap="2">
          <StackIcon />
          <Heading size="6">{lookup.deck.name}</Heading>
        </Flex>
        <Text size="2" color="gray">
          {breadcrumb}
        </Text>
      </Box>

      <Card size="3">
        <Flex direction="column" gap="3">
          <Flex align="center" gap="2">
            <Badge color="iris" variant="soft">
              {modeLabel}
            </Badge>
            <Badge color="gray" variant="soft">
              {level.toUpperCase()}
            </Badge>
          </Flex>
          <Text size="3" weight="medium">
            Practice coming soon
          </Text>
          <Text size="2" color="gray">
            This page will host the {modeLabel.toLowerCase()} session at level {level.toUpperCase()}{" "}
            for {lookup.deck.name}.
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
};
