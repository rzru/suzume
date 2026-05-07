import { Box, Button, Grid, Heading } from "@radix-ui/themes";
import { PROFICIENCY_LEVELS, type ProficiencyLevel } from "../../utils/practice";
import styles from "./LevelSelector.module.css";

type LevelSelectorProps = {
  value: ProficiencyLevel | null;
  onChange: (level: ProficiencyLevel) => void;
};

export function LevelSelector({ value, onChange }: LevelSelectorProps) {
  return (
    <Box>
      <Heading size="3" mb="3">
        Choose a proficiency level
      </Heading>
      <Grid columns={{ initial: "2", sm: "3", md: "6" }} gap="2">
        {PROFICIENCY_LEVELS.map((level) => {
          const isActive = value === level;
          return (
            <Button
              key={level}
              size="3"
              variant={isActive ? "solid" : "surface"}
              aria-pressed={isActive}
              className={styles.levelButton}
              onClick={() => onChange(level)}
            >
              {level.toUpperCase()}
            </Button>
          );
        })}
      </Grid>
    </Box>
  );
}
