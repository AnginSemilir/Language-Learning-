// "Explain" under a reviewed card: Claude's explanation of the card, in a
// dialog. X opens it from the keyboard.
import Explanation from "@/app/explain/Explanation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { noteText } from "@/lector/flashcards";
import { useHotkeys } from "@/lib/hooks/useHotkeys";
import { IconSparkles } from "@tabler/icons-react";
import { useEffect, useState } from "react";

interface ExplainCardProps {
  noteId: string;
  content: unknown;
}

export default function ExplainCard({ noteId, content }: ExplainCardProps) {
  const [open, setOpen] = useState(false);
  const card = noteText(content);

  // A new card closes the last one's explanation.
  useEffect(() => {
    if (noteId) setOpen(false);
  }, [noteId]);

  useHotkeys(card ? [["x", () => setOpen(true)]] : []);

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
      <div className="learn-view__explain">
        <Button
          variant="ghost"
          size="sm"
          leftSection={<IconSparkles size={16} />}
          onClick={() => setOpen(true)}
        >
          Explain
        </Button>
      </div>
      <Modal opened={open} onClose={() => setOpen(false)} title={card.front}>
        {open && (
          <Explanation
            input={{
              kind: "card",
              front: card.front,
              back: card.back,
              example: card.example,
            }}
          />
        )}
      </Modal>
    </>
  );
}
