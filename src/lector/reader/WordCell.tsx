// Ported from Lector (heuwels/lector@eb393ce, AGPL-3.0-only): src/components/WordCell/index.tsx
// Changes: Tailwind classes replaced with reader.css; ruby annotations removed
// (not used for Indonesian).
import type { WordState } from "../types";

export interface WordCellProps {
  text: string;
  /** Word state from the known-words map; undefined renders as 'new'. */
  state?: WordState;
  /** The currently looked-up word (panel open). */
  isActive?: boolean;
  /** Tap/Enter/Space. The element is passed so callers can find the sentence. */
  onActivate?: (text: string, element: HTMLElement) => void;
}

/**
 * One tappable word with the reader's known/level colouring. `data-leaf`
 * marks the span as already rendered for ReaderArticle's children walk.
 */
export default function WordCell({
  text,
  state,
  isActive = false,
  onActivate,
}: WordCellProps) {
  const interactive = onActivate !== undefined;
  return (
    <span
      data-leaf=""
      data-word-state={state ?? "new"}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Look up ${text}` : undefined}
      onClick={(event) => onActivate?.(text, event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onActivate?.(text, event.currentTarget);
      }}
      className={`word-cell word-cell--${state ?? "new"}${
        isActive ? " word-cell--active" : ""
      }`}
    >
      {text}
    </span>
  );
}
