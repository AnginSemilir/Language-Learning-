// "Known" under a card: it won't come up again until the maximum interval
// (Settings → Learning) has passed. K does the same from the keyboard.
import { notify } from "@/components/Notification";
import { Button } from "@/components/ui/Button";
import { useHotkeys } from "@/lib/hooks/useHotkeys";
import { describeDays } from "@/logic/card/known";
import { IconCheck } from "@tabler/icons-react";

interface KnownButtonProps {
  /** How long a known card stays away: the maximum interval. */
  days: number;
  onKnown: () => void;
}

export default function KnownButton({ days, onKnown }: KnownButtonProps) {
  const away = describeDays(days);
  const known = () => {
    onKnown();
    notify(
      "Marked known",
      `It comes back in ${away}. Change that with Maximum interval in Settings → Learning.`,
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
      title={`Don't show this card for ${away} (K)`}
    >
      Known
    </Button>
  );
}
