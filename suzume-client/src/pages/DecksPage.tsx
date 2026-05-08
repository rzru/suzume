import { Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { useParams } from "react-router-dom";
import { AppShell } from "../components/app-shell";
import { DecksSidebar } from "../components/decks-sidebar";
import { PracticeModePicker } from "../components/practice-mode-picker";
import { findDeckById } from "../utils/decks";
import { useDecksTreeQuery } from "../hooks/useDecksTreeQuery";

export function DecksPage() {
  const { data } = useDecksTreeQuery();

  return (
    <AppShell sidebar={<DecksSidebar decks={data?.decks ?? []} />}>
      <DecksPageInner />
    </AppShell>
  );
}

const DecksPageInner = () => {
  const { deckId } = useParams<{ deckId?: string }>();
  const { isPending, error, data } = useDecksTreeQuery();

  if (isPending) {
    return null;
  }

  if (error) {
    return (
      <>
        <title>Decks — Suzume</title>
        <Callout.Root color="red">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error.message ?? "Decks tree request failed"}</Callout.Text>
        </Callout.Root>
      </>
    );
  }

  if (!deckId) {
    return (
      <>
        <title>Decks — Suzume</title>
        <Callout.Root color="iris" variant="surface">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Select a deck from the left sidebar to get started.</Callout.Text>
        </Callout.Root>
      </>
    );
  }

  const numericId = Number(deckId);
  const lookup = Number.isFinite(numericId) ? findDeckById(data.decks ?? [], numericId) : null;

  if (!lookup || lookup.deck.id == null) {
    return (
      <>
        <title>Decks — Suzume</title>
        <Callout.Root color="amber">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>Deck not found. Pick another deck from the sidebar.</Callout.Text>
        </Callout.Root>
      </>
    );
  }

  return (
    <>
      <title>{`${lookup.deck.name} — Suzume`}</title>
      <PracticeModePicker
        deckId={lookup.deck.id}
        deckName={lookup.deck.name}
        parents={lookup.parents}
      />
    </>
  );
};
