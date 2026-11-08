// "Ask": which way a word note is asked, front → back, back → front or
// both. Taking a direction away deletes its card, so that asks first when
// the card has been reviewed.
import { notify } from "@/components/Notification";
import { Button, Group, SegmentedControl, Text } from "@/components/ui";
import { db } from "@/logic/db";
import {
  type Direction,
  cardsRemovedBy,
  directionOf,
  hasDirections,
  setDirection,
} from "@/logic/note/cardDirection";
import type { Note, NoteType } from "@/logic/note/note";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import "./CardDirection.css";

const OPTIONS: { value: Direction; label: string }[] = [
  { value: "forward", label: "Front → Back" },
  { value: "backward", label: "Back → Front" },
  { value: "both", label: "Both" },
];

const NAMES: Record<Direction, string> = {
  forward: "Front → Back",
  backward: "Back → Front",
  both: "both ways",
};

export default function CardDirection({ note }: { note: Note<NoteType> }) {
  const cards = useLiveQuery(
    () => db.cards.where("note").equals(note.id).toArray(),
    [note.id]
  );
  const [pending, setPending] = useState<Direction | null>(null);
  const [busy, setBusy] = useState(false);
  if (!cards?.length || !hasDirections(note)) return null;
  const current = directionOf(cards);

  const apply = async (direction: Direction) => {
    setPending(null);
    setBusy(true);
    try {
      await setDirection(note.id, direction);
      notify("Card updated", `Asked ${NAMES[direction]} now.`, "success", 2000);
    } catch (e) {
      notify(
        "Couldn't change the direction",
        e instanceof Error ? e.message : String(e),
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const choose = (value: string) => {
    const direction = value as Direction;
    if (direction === current || busy) return;
    const reviewed = cardsRemovedBy(cards, direction).filter(
      (c) => c.history.length > 0
    );
    if (reviewed.length) setPending(direction);
    else apply(direction);
  };

  const removed = pending ? cardsRemovedBy(cards, pending) : [];
  const reviews = removed.reduce((n, c) => n + c.history.length, 0);
  const lost = removed[0] ? NAMES[directionOf([removed[0]])] : "";

  return (
    <div className="card-direction">
      <Text size="sm" weight="semibold">
        Ask
      </Text>
      <SegmentedControl
        value={pending ?? current}
        onChange={choose}
        data={OPTIONS}
      />
      {pending ? (
        <div className="card-direction__confirm" role="alert">
          <Text size="sm">
            {`This deletes the ${lost} card and its ${reviews} review${reviews === 1 ? "" : "s"}.`}
          </Text>
          <Group gap="sm">
            <Button size="sm" variant="primary" onClick={() => apply(pending)}>
              Delete it
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </Group>
        </div>
      ) : (
        <Text size="xs" className="card-direction__hint">
          {current === "both"
            ? "Two cards: one shows the front, the other the back."
            : `One card: it shows the ${current === "forward" ? "front" : "back"} and asks for the ${current === "forward" ? "back" : "front"}.`}
        </Text>
      )}
    </div>
  );
}
