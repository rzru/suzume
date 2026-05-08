import { Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Navigate, useParams } from "react-router-dom";
import { AppShell } from "../components/app-shell";
import { DecksSidebar } from "../components/decks-sidebar";
import { PracticeSession } from "../components/practice-session";
import {
  isCardScope,
  isPracticeMode,
  isProficiencyLevel,
  isTranslateDirection,
} from "../utils/practice";
import { findDeckById, partsToFullName } from "../utils/decks";
import { useDecksTreeQuery } from "../hooks/useDecksTreeQuery";

export function PracticePage() {
  const { data } = useDecksTreeQuery();

  return (
    <AppShell sidebar={<DecksSidebar decks={data?.decks ?? []} />}>
      <PracticePageInner />
    </AppShell>
  );
}

const PracticePageInner = () => {
  const params = useParams<{
    deckId: string;
    mode: string;
    level: string;
    scope: string;
    direction?: string;
  }>();
  const { isPending, error, data } = useDecksTreeQuery();

  if (isPending) {
    return null;
  }

  if (error) {
    return (
      <>
        <title>Practice — Suzume</title>
        <Callout.Root color="red">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error.message ?? "Decks tree request failed"}</Callout.Text>
        </Callout.Root>
      </>
    );
  }

  const { deckId, mode, level, scope, direction } = params;

  if (!deckId || !isPracticeMode(mode) || !isProficiencyLevel(level) || !isCardScope(scope)) {
    return <Navigate to={deckId ? `/decks/${deckId}` : "/"} replace />;
  }

  if (mode === "translate" && !isTranslateDirection(direction)) {
    return <Navigate to={`/decks/${deckId}`} replace />;
  }

  if (mode !== "translate" && direction !== undefined) {
    return <Navigate to={`/decks/${deckId}`} replace />;
  }

  const numericId = Number(deckId);
  const lookup = Number.isFinite(numericId) ? findDeckById(data.decks ?? [], numericId) : null;

  if (!lookup) {
    return (
      <>
        <title>Practice — Suzume</title>
        <Callout.Root color="amber">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>Deck not found. Pick another deck from the sidebar.</Callout.Text>
        </Callout.Root>
      </>
    );
  }

  const fullDeckName = partsToFullName([...lookup.parents, lookup.deck.name]);

  return (
    <>
      <title>{`Practice: ${fullDeckName} — Suzume`}</title>
      <PracticeSession
        deckId={deckId}
        deckName={fullDeckName}
        deckLabel={lookup.deck.name}
        parents={lookup.parents}
        mode={mode}
        level={level}
        scope={scope}
        direction={isTranslateDirection(direction) ? direction : null}
      />
    </>
  );
};
