// "Known" under a card: it goes away for a while and comes back for a check
// at a random time in the range set in Settings → Learning (one to six
// months by default). K does the same from the keyboard.
import { notify } from "@/components/Notification";
import { Button } from "@/components/ui/Button";
import { useHotkeys } from "@/lib/hooks/useHotkeys";
import {
  type KnownRange,
  describeDays,
  describeRange,
} from "@/logic/card/known";
import { IconCheck } from "@tabler/icons-react";

interface KnownButtonProps {
  range: KnownRange;
  /** Returns for how many days the card went away. */
  onKnown: () => number | null;
}

export default function KnownButton({ range, onKnown }: KnownButtonProps) {
  const known = () => {
    const days = onKnown();
    if (days === null) return;
    notify(
      "Marked known",
      `It comes back for a check in about ${describeDays(days)}.`,
      "info",
      2500
    );
  };
  useHotkeys([["k", known]]);
  return (
    <Button
      variant="ghost"
      size="sm"
      leftSection={<IconCheck size={16} />}
      onClick={known}
      title={`Don't show this card for ${describeRange(range)} (K)`}
    >
      Known
    </Button>
  );
}
