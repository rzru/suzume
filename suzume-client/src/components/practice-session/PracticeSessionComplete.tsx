import { Button, Flex, Text } from "@radix-ui/themes";
import { ArrowLeftIcon, ReloadIcon } from "@radix-ui/react-icons";
import { Link } from "react-router-dom";
import styles from "./PracticeSessionComplete.module.css";

type PracticeSessionCompleteProps = {
  deckId: string;
  hasShownCards: boolean;
  onRestart: () => void;
};

export function PracticeSessionComplete({
  deckId,
  hasShownCards,
  onRestart,
}: PracticeSessionCompleteProps) {
  const heading = hasShownCards
    ? "You've practiced every card in this scope."
    : "There are no cards in this scope to practice yet.";
  const subcopy = hasShownCards
    ? "Start a fresh round, or pick a different practice mode."
    : "Try a different scope, or review some cards in Anki first.";

  return (
    <Flex direction="column" gap="2" align="center" className={styles.complete}>
      <Text size="3" weight="medium" align="center">
        {heading}
      </Text>
      <Text size="2" color="gray" align="center">
        {subcopy}
      </Text>
      <Flex gap="2" wrap="wrap" justify="center" mt="1">
        <Button size="2" onClick={onRestart}>
          <ReloadIcon />
          Practice again
        </Button>
        <Button asChild size="2" variant="soft">
          <Link to={`/decks/${deckId}`}>
            <ArrowLeftIcon />
            Back to practice modes
          </Link>
        </Button>
      </Flex>
    </Flex>
  );
}
