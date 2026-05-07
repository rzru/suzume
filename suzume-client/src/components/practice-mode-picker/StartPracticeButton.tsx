import { Button, Flex } from "@radix-ui/themes";
import { RocketIcon } from "@radix-ui/react-icons";
import { Link } from "react-router-dom";
import type { CardScope, PracticeMode, ProficiencyLevel } from "../../utils/practice";

type StartPracticeButtonProps = {
  deckId: number;
  mode: PracticeMode | null;
  level: ProficiencyLevel | null;
  scope: CardScope | null;
};

const buttonContent = (
  <>
    <RocketIcon />
    Start practice
  </>
);

export function StartPracticeButton({ deckId, mode, level, scope }: StartPracticeButtonProps) {
  const canSubmit = mode !== null && level !== null && scope !== null;

  return (
    <Flex justify="end">
      <Button asChild={canSubmit} size="3" disabled={!canSubmit}>
        {canSubmit ? (
          <Link to={`/decks/${deckId}/${mode}/${level}/${scope}`}>{buttonContent}</Link>
        ) : (
          buttonContent
        )}
      </Button>
    </Flex>
  );
}
