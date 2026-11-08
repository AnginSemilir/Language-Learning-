// Marking many cards known at once: a deck, or the cards picked in Manage
// Cards. Each comes back for a check at its own random time in the known
// range (Settings → Learning), so they come back a few at a time.
import { notify } from "@/components/Notification";
import { Button, Checkbox, Group, Modal, Stack, Text } from "@/components/ui";
import { useGlobalScheduler } from "@/logic/card/CardScheduler";
import type { Card } from "@/logic/card/card";
import { describeRange, useKnownRange } from "@/logic/card/known";
import { markCardsKnown } from "@/logic/card/markKnown";
import type { NoteType } from "@/logic/note/note";
import { State } from "fsrs.js";
import { useEffect, useState } from "react";

interface MarkKnownModalProps {
  opened: boolean;
  setOpened: (opened: boolean) => void;
  /** What's being marked: "the Indonesian deck", "12 selected notes". */
  what: string;
  loadCards: () => Promise<Card<NoteType>[]>;
}

export default function MarkKnownModal({
  opened,
  setOpened,
  what,
  loadCards,
}: MarkKnownModalProps) {
  const scheduler = useGlobalScheduler();
  const range = useKnownRange(scheduler.p.maximum_interval);
  const [cards, setCards] = useState<Card<NoteType>[] | null>(null);
  const [includeStarted, setIncludeStarted] = useState(false);
  const [busy, setBusy] = useState(false);

  // The cards are counted once each time the dialog opens.
  useEffect(() => {
    if (!opened) return;
    setCards(null);
    setIncludeStarted(false);
    loadCards().then(setCards);
  }, [opened]);

  const notStarted = cards?.filter((c) => c.model.state === State.New) ?? [];
  const started = cards?.filter((c) => c.model.state !== State.New) ?? [];
  // With nothing new to mark, the started cards are what's being asked about.
  const include = includeStarted || notStarted.length === 0;
  const chosen = include ? (cards ?? []) : notStarted;
  const count = chosen.length;

  const confirm = async () => {
    setBusy(true);
    try {
      const moved = await markCardsKnown(chosen, scheduler, range);
      notify(
        "Marked known",
        `${moved.toLocaleString()} card${moved === 1 ? "" : "s"} will come back for a check over the next ${describeRange(range)}.`,
        "success"
      );
      setOpened(false);
    } catch (e) {
      notify(
        "Couldn't mark the cards known",
        e instanceof Error ? e.message : String(e),
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Mark cards known"
      opened={opened}
      onClose={() => setOpened(false)}
    >
      <Stack gap="md">
        {cards === null ? (
          <Text size="sm">Counting the cards…</Text>
        ) : cards.length === 0 ? (
          <Text size="sm">{`There are no cards in ${what}.`}</Text>
        ) : (
          <>
            <Text size="sm">
              {`Mark ${count.toLocaleString()} card${count === 1 ? "" : "s"} in ${what} as known. Each comes back for a check once, at a random time ${describeRange(range)} from now, so they come back a few a day rather than all at once. After that they're scheduled like any card.`}
            </Text>
            {started.length > 0 && notStarted.length > 0 && (
              <Checkbox
                label={`Also the ${started.length.toLocaleString()} card${started.length === 1 ? "" : "s"} you've already started`}
                checked={includeStarted}
                onChange={(e) => setIncludeStarted(e.currentTarget.checked)}
              />
            )}
            <Text size="xs" className="mark-known__note">
              A card that's already scheduled further out keeps its date. You
              can change how long known cards stay away in Settings → Learning.
            </Text>
          </>
        )}
        <Group gap="sm" justify="end">
          <Button variant="ghost" onClick={() => setOpened(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={confirm}
            disabled={busy || count === 0}
          >
            {busy ? "Marking…" : `Mark ${count.toLocaleString()} known`}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
