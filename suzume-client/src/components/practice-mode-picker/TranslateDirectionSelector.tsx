import { Box, Button, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import { TRANSLATE_DIRECTIONS, type TranslateDirection } from "../../utils/practice";
import styles from "./ScopeSelector.module.css";

const DIRECTION_LABELS: Record<TranslateDirection, { title: string; description: string }> = {
  from: {
    title: "From card language",
    description: "Get a fresh sentence in the card's language using its target word.",
  },
  to: {
    title: "Into another language",
    description: "Get a translated sentence and translate it back to the card's language.",
  },
};

type TranslateDirectionSelectorProps = {
  value: TranslateDirection | null;
  onChange: (direction: TranslateDirection) => void;
};

export function TranslateDirectionSelector({ value, onChange }: TranslateDirectionSelectorProps) {
  return (
    <Box>
      <Heading size="3" mb="3">
        Choose translation direction
      </Heading>
      <Grid columns={{ initial: "1", sm: "2" }} gap="2">
        {TRANSLATE_DIRECTIONS.map((direction) => {
          const isActive = value === direction;
          const labels = DIRECTION_LABELS[direction];
          return (
            <Button
              key={direction}
              size="3"
              variant={isActive ? "solid" : "surface"}
              aria-pressed={isActive}
              className={styles.scopeButton}
              onClick={() => onChange(direction)}
            >
              <Flex direction="column" align="center" gap="1">
                <Text size="2" weight="medium">
                  {labels.title}
                </Text>
                <Text size="1" color="gray">
                  {labels.description}
                </Text>
              </Flex>
            </Button>
          );
        })}
      </Grid>
    </Box>
  );
}
