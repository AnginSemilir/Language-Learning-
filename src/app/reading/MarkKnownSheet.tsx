// Shown when moving to the next page: the words on the page you haven't
// looked up, added or rated, as headwords. Tap a word to keep it unknown.
import { Button, Checkbox, Group, Modal, Stack, Text } from "@/components/ui";
import { useEffect, useState } from "react";

export interface PageWord {
  headword: string;
  forms: string[];
}

interface MarkKnownSheetProps {
  words: PageWord[] | null;
  isLastPage: boolean;
  /** What a page is called: a video's pages are its scenes. */
  unit?: "page" | "scene";
  onConfirm: (words: PageWord[], always: boolean) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export default function MarkKnownSheet({
  words,
  isLastPage,
  unit = "page",
  onConfirm,
  onSkip,
  onCancel,
}: MarkKnownSheetProps) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [always, setAlways] = useState(false);

  useEffect(() => {
    if (words) setExcluded(new Set());
  }, [words]);

  const selected = (words ?? []).filter((w) => !excluded.has(w.headword));
  const toggle = (headword: string) => {
    const next = new Set(excluded);
    if (next.has(headword)) next.delete(headword);
    else next.add(headword);
    setExcluded(next);
  };

  return (
    <Modal
      opened={words !== null}
      onClose={onCancel}
      title="Mark the rest as known?"
    >
      {words && (
        <Stack gap="md">
          <Text size="sm">
            {`These words in this ${unit} are new to you and you didn't look them up. Tap any you don't actually know to leave them out. Names and numbers are not included.`}
          </Text>
          <div className="mark-known__words">
            {words.map((w) => {
              const off = excluded.has(w.headword);
              const extra = w.forms.filter((f) => f !== w.headword);
              return (
                <button
                  type="button"
                  key={w.headword}
                  className={`mark-known__word${off ? " mark-known__word--off" : ""}`}
                  aria-pressed={!off}
                  onClick={() => toggle(w.headword)}
                >
                  {w.headword}
                  {extra.length > 0 && (
                    <span className="mark-known__forms">
                      {" "}
                      ({extra.join(", ")})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Checkbox
            label="Always mark them without asking"
            checked={always}
            onChange={(e) => setAlways(e.currentTarget.checked)}
          />
          <Group gap="sm" justify="space-between" wrap="wrap">
            <Button variant="ghost" onClick={onSkip}>
              {isLastPage
                ? "Finish without marking"
                : `Next ${unit}, don't mark`}
            </Button>
            <Button
              variant="primary"
              onClick={() => onConfirm(selected, always)}
            >
              {/* One string: the React Compiler drops the space in "Mark {n}". */}
              {`Mark ${selected.length} known ${isLastPage ? "and finish" : "and continue"}`}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
