import { Box, Button, Callout, Flex, Grid, Heading, Spinner, Text } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import type { DeckCounts } from "../../api/deckCounts";
import { CARD_SCOPES, type CardScope } from "../../utils/practice";
import styles from "./ScopeSelector.module.css";

const SCOPE_LABELS: Record<CardScope, string> = {
  today: "Reviewed today",
  all: "All known",
};

type ScopeSelectorProps = {
  value: CardScope | null;
  onChange: (scope: CardScope) => void;
  counts: DeckCounts | undefined;
  isPending: boolean;
  error: Error | null;
};

export function ScopeSelector({ value, onChange, counts, isPending, error }: ScopeSelectorProps) {
  const showCount = !isPending && error === null;

  const scopeCount = (scope: CardScope): number => {
    if (!counts) {
      return 0;
    }
    return counts[scope];
  };

  const isScopeDisabled = (scope: CardScope): boolean =>
    isPending || error !== null || scopeCount(scope) === 0;

  return (
    <Box>
      <Flex align="center" gap="2" mb="3">
        <Heading size="3">Choose what to practice</Heading>
        {isPending && <Spinner size="1" />}
      </Flex>
      {error !== null ? (
        <Callout.Root color="red" size="1" mb="2">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error.message ?? "Couldn't load deck counts from Anki"}</Callout.Text>
        </Callout.Root>
      ) : null}
      <Grid columns={{ initial: "1", sm: "2" }} gap="2">
        {CARD_SCOPES.map((scope) => {
          const isActive = value === scope;
          const disabled = isScopeDisabled(scope);
          const count = scopeCount(scope);
          return (
            <Button
              key={scope}
              size="3"
              variant={isActive ? "solid" : "surface"}
              aria-pressed={isActive}
              disabled={disabled}
              className={styles.scopeButton}
              onClick={() => onChange(scope)}
            >
              <Flex direction="column" align="center" gap="1">
                <Text size="2" weight="medium">
                  {SCOPE_LABELS[scope]}
                </Text>
                {showCount && (
                  <Text size="1" color="gray">
                    {count} card{count === 1 ? "" : "s"}
                  </Text>
                )}
              </Flex>
            </Button>
          );
        })}
      </Grid>
    </Box>
  );
}
