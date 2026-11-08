// "Mark the cards as: New | Familiar | Known" while importing, for cards
// that are already known: familiar ones come back once, in one to six
// months, for a check; known ones don't come back.
import { SegmentedControl, Stack, Text } from "@/components/ui";
import { useGlobalScheduler } from "@/logic/card/CardScheduler";
import type { KnownLevel } from "@/logic/card/card";
import { describeRange, useFamiliarRange } from "@/logic/card/known";
import { markCardsKnown } from "@/logic/card/markKnown";
import { db } from "@/logic/db";
import { useCallback } from "react";

export type ImportLevel = "new" | KnownLevel;

export function ImportLevelChoice({
  value,
  onChange,
}: {
  value: ImportLevel;
  onChange: (level: ImportLevel) => void;
}) {
  const scheduler = useGlobalScheduler();
  const range = useFamiliarRange(scheduler.p.maximum_interval);
  return (
    <Stack gap="xs">
      <Text size="sm" weight="medium">
        Mark the cards as
      </Text>
      <SegmentedControl
        value={value}
        onChange={(v) => onChange(v as ImportLevel)}
        data={[
          { value: "new", label: "New" },
          { value: "familiar", label: "Familiar" },
          { value: "known", label: "Known" },
        ]}
      />
      <Text size="xs" className="import-level__hint">
        {value === "new"
          ? "To learn: they come up as new cards."
          : value === "familiar"
            ? `Probably known: each comes back once for a check, at a random time ${describeRange(range)} from now. Right makes it known.`
            : "Already known: they don't come back."}
      </Text>
    </Stack>
  );
}

/** Marks the imported notes' cards familiar or known (nothing for new). */
export function useMarkImported() {
  const scheduler = useGlobalScheduler();
  const range = useFamiliarRange(scheduler.p.maximum_interval);
  return useCallback(
    async (noteIds: string[], level: ImportLevel) => {
      if (level === "new" || noteIds.length === 0) return 0;
      const cards = await db.cards.where("note").anyOf(noteIds).toArray();
      return markCardsKnown(cards, scheduler, range, level);
    },
    [scheduler, range]
  );
}
