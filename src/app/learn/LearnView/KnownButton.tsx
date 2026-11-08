// Under a card: Familiar (F) sends it away to come back once, in one to six
// months, for a check; Known (K) sends it away for good.
import { notify } from "@/components/Notification";
import { Button } from "@/components/ui/Button";
import { useHotkeys } from "@/lib/hooks/useHotkeys";
import type { KnownLevel } from "@/logic/card/card";
import {
  type FamiliarRange,
  describeDays,
  describeRange,
} from "@/logic/card/known";
import { IconCheck, IconChecks } from "@tabler/icons-react";

interface KnownButtonsProps {
  range: FamiliarRange;
  /** Returns for how many days the card went away. */
  onMark: (level: KnownLevel) => number | null;
}

export default function KnownButtons({ range, onMark }: KnownButtonsProps) {
  const mark = (level: KnownLevel) => {
    const days = onMark(level);
    if (days === null) return;
    notify(
      level === "known" ? "Known" : "Familiar",
      level === "known"
        ? "This card won't come back."
        : `It comes back once for a check, in about ${describeDays(days)}. Get it right then and it's known.`,
      "info",
      2500
    );
  };
  useHotkeys([
    ["f", () => mark("familiar")],
    ["k", () => mark("known")],
  ]);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        leftSection={<IconCheck size={16} />}
        onClick={() => mark("familiar")}
        title={`Probably known: it comes back once in ${describeRange(range)} for a check (F)`}
      >
        Familiar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        leftSection={<IconChecks size={16} />}
        onClick={() => mark("known")}
        title="Known: it doesn't come back (K)"
      >
        Known
      </Button>
    </>
  );
}
