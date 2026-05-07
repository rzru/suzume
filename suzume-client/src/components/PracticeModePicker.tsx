import { Box, Button, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import { ChatBubbleIcon, GlobeIcon, RocketIcon, StackIcon } from "@radix-ui/react-icons";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  PRACTICE_MODES,
  PROFICIENCY_LEVELS,
  type PracticeMode,
  type ProficiencyLevel,
} from "../utils/practice";
import styles from "./PracticeModePicker.module.css";

const MODE_DETAILS: Record<PracticeMode, { title: string; description: string; icon: ReactNode }> =
  {
    chat: {
      title: "Chat",
      description: "Have a guided conversation using vocabulary from this deck.",
      icon: <ChatBubbleIcon width="22" height="22" />,
    },
    translate: {
      title: "Translate",
      description: "Translate prompts back and forth to drill the deck.",
      icon: <GlobeIcon width="22" height="22" />,
    },
  };

type PracticeModePickerProps = {
  deckId: number;
  deckName: string;
  parents: string[];
};

export default function PracticeModePicker({ deckId, deckName, parents }: PracticeModePickerProps) {
  const [mode, setMode] = useState<PracticeMode | null>(null);
  const [level, setLevel] = useState<ProficiencyLevel | null>(null);

  const breadcrumb = parents.length > 0 ? parents.join(" / ") : "Top-level deck";
  const canSubmit = mode !== null && level !== null;
  const submitLabel = (
    <>
      <RocketIcon />
      Start practice
    </>
  );

  return (
    <Flex align="center" justify="center" minHeight="100%" p="4">
      <Flex direction="column" gap="5" width="100%" maxWidth="640px">
        <Box>
          <Flex align="center" gap="2">
            <StackIcon />
            <Heading size="6">{deckName}</Heading>
          </Flex>
          <Text size="2" color="gray">
            {breadcrumb}
          </Text>
        </Box>

        <Box>
          <Heading size="3" mb="3">
            Choose a practice mode
          </Heading>
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            {PRACTICE_MODES.map((value) => {
              const details = MODE_DETAILS[value];
              const isActive = mode === value;
              return (
                <Card
                  key={value}
                  size="3"
                  asChild
                  className={`${styles.modeCard} ${isActive ? styles.modeCardActive : ""}`}
                  onClick={() => setMode(value)}
                >
                  <button type="button" aria-pressed={isActive}>
                    <Flex direction="column" gap="2" align="start">
                      <Flex align="center" gap="2">
                        {details.icon}
                        <Heading size="4">{details.title}</Heading>
                      </Flex>
                      <Text size="2" color="gray" align="left">
                        {details.description}
                      </Text>
                    </Flex>
                  </button>
                </Card>
              );
            })}
          </Grid>
        </Box>

        {mode !== null && (
          <Box>
            <Heading size="3" mb="3">
              Choose a proficiency level
            </Heading>
            <Grid columns={{ initial: "2", sm: "3", md: "6" }} gap="2">
              {PROFICIENCY_LEVELS.map((value) => {
                const isActive = level === value;
                return (
                  <Button
                    key={value}
                    size="3"
                    variant={isActive ? "solid" : "surface"}
                    aria-pressed={isActive}
                    className={styles.levelButton}
                    onClick={() => setLevel(value)}
                  >
                    {value.toUpperCase()}
                  </Button>
                );
              })}
            </Grid>
          </Box>
        )}

        <Flex justify="end">
          <Button asChild={canSubmit} size="3" disabled={!canSubmit}>
            {canSubmit ? (
              <Link to={`/decks/${deckId}/${mode}/${level}`}>{submitLabel}</Link>
            ) : (
              submitLabel
            )}
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
