import { Button, Flex } from "@radix-ui/themes";
import { RocketIcon } from "@radix-ui/react-icons";
import { Link } from "react-router-dom";
import type {
  CardScope,
  PracticeMode,
  ProficiencyLevel,
  TranslateDirection,
} from "../../utils/practice";

type StartPracticeButtonProps = {
  deckId: number;
  mode: PracticeMode | null;
  level: ProficiencyLevel | null;
  scope: CardScope | null;
  direction: TranslateDirection | null;
};

const buttonContent = (
  <>
    <RocketIcon />
    Start practice
  </>
);

export function StartPracticeButton({
  deckId,
  mode,
  level,
  scope,
  direction,
}: StartPracticeButtonProps) {
  const baseSelectionsReady = mode !== null && level !== null && scope !== null;
  const directionReady = mode !== "translate" || direction !== null;
  const canSubmit = baseSelectionsReady && directionReady;

  const buildHref = () => {
    if (!canSubmit) return "";
    if (mode === "translate") {
      return `/decks/${deckId}/${mode}/${level}/${scope}/${direction}`;
    }
    return `/decks/${deckId}/${mode}/${level}/${scope}`;
  };

  return (
    <Flex justify="end">
      <Button asChild={canSubmit} size="3" disabled={!canSubmit}>
        {canSubmit ? <Link to={buildHref()}>{buttonContent}</Link> : buttonContent}
      </Button>
    </Flex>
  );
}
