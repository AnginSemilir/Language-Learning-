// Marking many cards familiar or known at once: a deck, or the cards picked
// in Manage Cards. Familiar cards come back once for a check, each at its own
// random time in the range (Settings → Learning), so a few a day; known cards
// don't come back.
import { notify } from "@/components/Notification";
import {
  Button,
  Checkbox,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
} from "@/components/ui";
import { useGlobalScheduler } from "@/logic/card/CardScheduler";
import type { Card, KnownLevel } from "@/logic/card/card";
import { describeRange, useFamiliarRange } from "@/logic/card/known";
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
  /** After the cards are marked (not on Cancel). */
  onMarked?: () => void;
}

export default function MarkKnownModal({
  opened,
  setOpened,
  what,
  loadCards,
  onMarked,
}: MarkKnownModalProps) {
  const scheduler = useGlobalScheduler();
  const range = useFamiliarRange(scheduler.p.maximum_interval);
  const [cards, setCards] = useState<Card<NoteType>[] | null>(null);
  const [level, setLevel] = useState<KnownLevel>("familiar");
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
  const plural = count === 1 ? "" : "s";

  const confirm = async () => {
    setBusy(true);
    try {
      const moved = await markCardsKnown(chosen, scheduler, range, level);
      notify(
        level === "known" ? "Marked known" : "Marked familiar",
        level === "known"
          ? `${moved.toLocaleString()} card${moved === 1 ? "" : "s"} won't come back.`
          : `${moved.toLocaleString()} card${moved === 1 ? "" : "s"} will come back for a check over the next ${describeRange(range)}.`,
        "success"
      );
      setOpened(false);
      onMarked?.();
    } catch (e) {
      notify(
        "Couldn't mark the cards",
        e instanceof Error ? e.message : String(e),
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Mark cards familiar or known"
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
            <SegmentedControl
              value={level}
              onChange={(value) => setLevel(value as KnownLevel)}
              data={[
                { value: "familiar", label: "Familiar" },
                { value: "known", label: "Known" },
              ]}
            />
            <Text size="sm">
              {level === "familiar"
                ? `Mark ${count.toLocaleString()} card${plural} in ${what} as familiar: probably known. Each comes back once for a check, at a random time ${describeRange(range)} from now, so they come back a few a day rather than all at once. Get one right then and it's known; miss it and it's learned again.`
                : `Mark ${count.toLocaleString()} card${plural} in ${what} as known. They won't come back.`}
            </Text>
            {started.length > 0 && notStarted.length > 0 && (
              <Checkbox
                label={`Also the ${started.length.toLocaleString()} card${started.length === 1 ? "" : "s"} you've already started`}
                checked={includeStarted}
                onChange={(e) => setIncludeStarted(e.currentTarget.checked)}
              />
            )}
            <Text size="xs" className="mark-known__note">
              {level === "familiar"
                ? "Cards already known stay known, and a card already scheduled further out keeps its date. How long familiar cards stay away is in Settings → Learning."
                : "The words count as known in reading too."}
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
            {busy
              ? "Marking…"
              : `Mark ${count.toLocaleString()} ${level === "known" ? "known" : "familiar"}`}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
