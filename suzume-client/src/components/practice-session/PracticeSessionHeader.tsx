import { Badge, Box, Flex, Heading, Text } from "@radix-ui/themes";
import { StackIcon } from "@radix-ui/react-icons";
import type { SocketStatus } from "../../hooks/usePracticeSocket";
import type {
  CardScope,
  PracticeMode,
  ProficiencyLevel,
  TranslateDirection,
} from "../../utils/practice";
import { SocketStatusBadge } from "./SocketStatusBadge";

type PracticeSessionHeaderProps = {
  deckLabel: string;
  parents: string[];
  mode: PracticeMode;
  level: ProficiencyLevel;
  scope: CardScope;
  direction: TranslateDirection | null;
  status: SocketStatus;
};

const SCOPE_LABELS: Record<CardScope, string> = {
  today: "Reviewed today",
  all: "All known",
};

const DIRECTION_LABELS: Record<TranslateDirection, string> = {
  from: "From card language",
  to: "Into another language",
};

export function PracticeSessionHeader({
  deckLabel,
  parents,
  mode,
  level,
  scope,
  direction,
  status,
}: PracticeSessionHeaderProps) {
  const breadcrumb = parents.length > 0 ? parents.join(" / ") : "Top-level deck";
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

  return (
    <>
      <Box minWidth="0">
        <Flex align="center" gap="2" minWidth="0">
          <StackIcon style={{ flexShrink: 0 }} />
          <Heading size={{ initial: "4", md: "5" }} truncate>
            {deckLabel}
          </Heading>
        </Flex>
        <Text size={{ initial: "1", md: "2" }} color="gray" truncate as="div">
          {breadcrumb}
        </Text>
      </Box>

      <Flex align="center" gap="2" wrap="wrap">
        <Badge color="iris" variant="soft">
          {modeLabel}
        </Badge>
        <Badge color="gray" variant="soft">
          {level.toUpperCase()}
        </Badge>
        <Badge color="grass" variant="soft">
          {SCOPE_LABELS[scope]}
        </Badge>
        {direction && (
          <Badge color="amber" variant="soft">
            {DIRECTION_LABELS[direction]}
          </Badge>
        )}
        {status !== "open" && <SocketStatusBadge status={status} />}
      </Flex>
    </>
  );
}
