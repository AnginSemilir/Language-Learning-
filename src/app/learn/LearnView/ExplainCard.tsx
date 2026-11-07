// "Explain" under a reviewed card: Claude's explanation of the card, in a
// dialog, with "Update card" to let Claude fix it. X opens it from the
// keyboard.
import Explanation from "@/app/explain/Explanation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ExplainInput } from "@/lector/explain";
import { noteText } from "@/lector/flashcards";
import { useHotkeys } from "@/lib/hooks/useHotkeys";
import { IconSparkles } from "@tabler/icons-react";
import { useEffect, useState } from "react";

interface ExplainCardProps {
  noteId: string;
  content: unknown;
}

export default function ExplainCard({ noteId, content }: ExplainCardProps) {
  const card = noteText(content);
  // The card as it was when Explain was pressed: updating the card from the
  // explanation mustn't ask for a new one.
  const [asked, setAsked] = useState<ExplainInput | null>(null);
  const open = asked !== null;
  const explain = () =>
    card &&
    setAsked({
      kind: "card",
      front: card.front,
      back: card.back,
      example: card.example,
    });

  // A new card closes the last one's explanation.
  useEffect(() => {
    if (noteId) setAsked(null);
  }, [noteId]);

  useHotkeys(card ? [["x", explain]] : []);

  // While it's open, the review's keys (Space, 1–4) don't answer the card
  // behind it.
  useEffect(() => {
    if (!open) return;
    const hold = (e: KeyboardEvent) => {
      if (e.key !== "Escape" && e.key !== "Tab") e.stopPropagation();
    };
    window.addEventListener("keydown", hold, true);
    return () => window.removeEventListener("keydown", hold, true);
  }, [open]);

  if (!card) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        leftSection={<IconSparkles size={16} />}
        onClick={explain}
      >
        Explain
      </Button>
      <Modal
        opened={open}
        onClose={() => setAsked(null)}
        title={asked?.kind === "card" ? asked.front : card.front}
      >
        {asked && <Explanation noteId={noteId} input={asked} />}
      </Modal>
    </>
  );
}
