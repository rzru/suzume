import { Box, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import { ChatBubbleIcon, GlobeIcon, Pencil2Icon } from "@radix-ui/react-icons";
import type { ReactNode } from "react";
import { PRACTICE_MODES, type PracticeMode } from "../../utils/practice";
import styles from "./ModeSelector.module.css";

type ModeDetails = {
  title: string;
  description: string;
  icon: ReactNode;
};

const MODE_DETAILS: Record<PracticeMode, ModeDetails> = {
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
  construct: {
    title: "Construct",
    description: "Get a single target word and build your own sentence with it.",
    icon: <Pencil2Icon width="22" height="22" />,
  },
};

type ModeSelectorProps = {
  value: PracticeMode | null;
  onChange: (mode: PracticeMode) => void;
};

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <Box>
      <Heading size="3" mb="3">
        Choose a practice mode
      </Heading>
      <Grid columns={{ initial: "1", sm: "3" }} gap="3">
        {PRACTICE_MODES.map((mode) => {
          const details = MODE_DETAILS[mode];
          const isActive = value === mode;
          return (
            <Card
              key={mode}
              size="3"
              asChild
              className={`${styles.modeCard} ${isActive ? styles.modeCardActive : ""}`}
              onClick={() => onChange(mode)}
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
  );
}
