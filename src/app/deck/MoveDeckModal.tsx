import EmptyNotice from "@/components/EmptyNotice";
import { notify } from "@/components/Notification";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Modal } from "@/components/ui/Modal";
import { Deck } from "@/logic/deck/deck";
import { useDecks } from "@/logic/deck/hooks/useDecks";
import { isSelfOrDescendant, moveDeck } from "@/logic/deck/moveDeck";
import { IconArrowsExchange, IconNotes } from "@tabler/icons-react";
import { useState } from "react";
import "./MoveDeckModal.css";

const BASE_URL = "move-deck-modal";

interface MoveDeckModalProps {
  deck: Deck;
  opened: boolean;
  setOpened: (opened: boolean) => void;
}

export default function MoveDeckModal({
  deck,
  opened,
  setOpened,
}: MoveDeckModalProps) {
  const oldSuperDeck = deck.superDecks
    ? deck.superDecks[deck.superDecks.length - 1]
    : null;

  // Not the deck it is in already, and not the deck itself or one of its own
  // sub-decks: moving a deck inside itself would make a loop.
  const [decks, areDecksReady] = useDecks((decks) =>
    decks?.filter(
      (d) => d.id !== oldSuperDeck && !isSelfOrDescendant(d, deck.id)
    )
  );
  const [newDeckID, setNewDeckID] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const handleMove = async () => {
    const newDeck = decks?.find((d) => d.id === newDeckID);
    if (newDeck === undefined) return;
    setMoving(true);
    try {
      await moveDeck(deck.id, newDeck.id);
      notify("Deck moved", `“${deck.name}” is now in ${newDeck.name}.`);
      setOpened(false);
    } catch (error) {
      notify("Not moved", String((error as Error).message ?? error), "error");
    } finally {
      setMoving(false);
    }
  };

  const isValidSelection =
    areDecksReady &&
    !!newDeckID &&
    !!decks?.some((d) => d.id === newDeckID) &&
    !moving;

  return (
    <Modal title="Move Deck" opened={opened} onClose={() => setOpened(false)}>
      <div className={`${BASE_URL}__content`}>
        {decks && decks.length > 0 ? (
          <Combobox
            searchable
            label="Move To"
            nothingFoundMessage="No Decks Found"
            disabled={!areDecksReady}
            data={decks.map((d) => ({
              value: d.id,
              label: d.name,
            }))}
            value={newDeckID}
            onChange={(value: string | null) => {
              setNewDeckID(value);
            }}
          />
        ) : (
          <EmptyNotice
            icon={IconNotes}
            title="No other deck to move it to."
            description="A deck can go into any deck except the one it's in and its own sub-decks. Create another deck first."
          />
        )}
        <div className={`${BASE_URL}__actions`}>
          <Button
            onClick={handleMove}
            leftSection={<IconArrowsExchange />}
            disabled={!isValidSelection}
            variant="primary"
          >
            Move Deck
          </Button>
        </div>
      </div>
    </Modal>
  );
}
