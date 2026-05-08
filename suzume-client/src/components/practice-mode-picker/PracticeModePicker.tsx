import { Flex } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useDeckCountsQuery } from "../../hooks/useDeckCountsQuery";
import { partsToFullName } from "../../utils/decks";
import type {
  CardScope,
  PracticeMode,
  ProficiencyLevel,
  TranslateDirection,
} from "../../utils/practice";
import { DeckHeader } from "./DeckHeader";
import { LevelSelector } from "./LevelSelector";
import { ModeSelector } from "./ModeSelector";
import { ScopeSelector } from "./ScopeSelector";
import { StartPracticeButton } from "./StartPracticeButton";
import { TranslateDirectionSelector } from "./TranslateDirectionSelector";

type PracticeModePickerProps = {
  deckId: number;
  deckName: string;
  parents: string[];
};

export function PracticeModePicker({ deckId, deckName, parents }: PracticeModePickerProps) {
  const [mode, setMode] = useState<PracticeMode | null>(null);
  const [level, setLevel] = useState<ProficiencyLevel | null>(null);
  const [scope, setScope] = useState<CardScope | null>(null);
  const [direction, setDirection] = useState<TranslateDirection | null>(null);

  useEffect(() => {
    setScope(null);
  }, [deckId]);

  useEffect(() => {
    if (mode !== "translate") {
      setDirection(null);
    }
  }, [mode]);

  const fullDeckName = partsToFullName([...parents, deckName]);

  const {
    data: counts,
    isPending: countsPending,
    error: countsError,
  } = useDeckCountsQuery(deckId, fullDeckName);

  return (
    <Flex align="center" justify="center" minHeight="100%" p="4">
      <Flex direction="column" gap="5" width="100%" maxWidth="640px">
        <DeckHeader deckName={deckName} parents={parents} />

        <ModeSelector value={mode} onChange={setMode} />

        <LevelSelector value={level} onChange={setLevel} />

        <ScopeSelector
          value={scope}
          onChange={setScope}
          counts={counts}
          isPending={countsPending}
          error={countsError}
        />

        {mode === "translate" && (
          <TranslateDirectionSelector value={direction} onChange={setDirection} />
        )}

        <StartPracticeButton
          deckId={deckId}
          mode={mode}
          level={level}
          scope={scope}
          direction={direction}
        />
      </Flex>
    </Flex>
  );
}
