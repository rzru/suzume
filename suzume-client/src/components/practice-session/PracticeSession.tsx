import { Callout, Card, Flex } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { usePracticeSocket } from "../../hooks/usePracticeSocket";
import type {
  CardScope,
  PracticeMode,
  ProficiencyLevel,
  TranslateDirection,
} from "../../utils/practice";
import { findLastAssistantIndex } from "../../utils/practiceMessages";
import { PracticeComposer } from "./PracticeComposer";
import { PracticeMessageList } from "./PracticeMessageList";
import { PracticeSessionHeader } from "./PracticeSessionHeader";
import styles from "./PracticeSession.module.css";

type PracticeSessionProps = {
  deckName: string;
  deckLabel: string;
  parents: string[];
  mode: PracticeMode;
  level: ProficiencyLevel;
  scope: CardScope;
  direction: TranslateDirection | null;
};

export function PracticeSession({
  deckName,
  deckLabel,
  parents,
  mode,
  level,
  scope,
  direction,
}: PracticeSessionProps) {
  const { messages, status, error, send, skip, isAwaitingReply } = usePracticeSocket({
    deckName,
    mode,
    level,
    scope,
    direction,
  });

  const composerDisabled = status !== "open" || isAwaitingReply;
  const canSkip = !composerDisabled && findLastAssistantIndex(messages) !== -1;

  const handleSkip = () => {
    if (!canSkip) return;
    skip();
  };

  return (
    <Flex justify="center" align={{ initial: "stretch", md: "center" }} height="100%">
      <Card size="3" className={styles.session}>
        <Flex direction="column" gap={{ initial: "2", md: "4" }} height="100%" minHeight="0">
          <PracticeSessionHeader
            deckLabel={deckLabel}
            parents={parents}
            mode={mode}
            level={level}
            scope={scope}
            direction={direction}
            status={status}
          />

          {error !== null && (
            <Callout.Root color="amber" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <PracticeMessageList
            messages={messages}
            status={status}
            isAwaitingReply={isAwaitingReply}
            canSkip={canSkip}
            onSkip={handleSkip}
          />

          <PracticeComposer
            mode={mode}
            direction={direction}
            disabled={composerDisabled}
            onSubmit={send}
          />
        </Flex>
      </Card>
    </Flex>
  );
}
