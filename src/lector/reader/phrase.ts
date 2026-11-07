// Phrases in the reader: words next to each other that make one flashcard
// ("bulan madu": honeymoon). A phrase stays inside one block and, when it is
// grown a word at a time, inside one sentence.

import { id as pack } from "../languages/id/manifest";
import { phraseKey } from "../lemma";
import { type TextPart, readableText } from "./utils";

/** Where a tapped word is: its block, its place among the block's words, and the block's text. */
export interface WordPlace {
  blockId: number;
  wordIndex: number;
  parts: TextPart[];
}

/** A block's words in order, with the text between them. */
export interface BlockWords {
  words: string[];
  /** gaps[i] is the text between words[i] and words[i + 1]. */
  gaps: string[];
}

/** Words from `from` to `to` (inclusive) of one block. */
export interface WordRange {
  from: number;
  to: number;
}

export function blockWords(parts: readonly TextPart[]): BlockWords {
  const words: string[] = [];
  const gaps: string[] = [];
  let gap = "";
  for (const part of parts) {
    if (!part.isWord) {
      gap += part.text;
      continue;
    }
    if (words.length) gaps.push(gap);
    words.push(part.text);
    gap = "";
  }
  return { words, gaps };
}

const CLITICS = pack.morphology?.clitics ?? [];

/**
 * The phrase as a set of phrases has it: itself, or without a clitic on its
 * last word (bulan madunya → bulan madu).
 */
export function phraseInSet(
  keys: { has(key: string): boolean },
  key: string
): string | undefined {
  if (keys.has(key)) return key;
  for (const clitic of CLITICS) {
    const bare = key.slice(0, -clitic.length);
    if (key.endsWith(clitic) && !bare.endsWith(" ") && keys.has(bare)) {
      return bare;
    }
  }
  return undefined;
}

/** What a phrase doesn't reach across: a sentence end, a line break, a dash, brackets or quotes. */
const BREAK = /[.!?;:…\n()[\]{}"“”«»–—-]/;

/** Whether the words on either side of this gap can be in one phrase. */
export function joins(gap: string) {
  return !BREAK.test(gap);
}

function joinsAll(block: BlockWords, { from, to }: WordRange) {
  for (let i = from; i < to; i++) if (!joins(block.gaps[i])) return false;
  return true;
}

/** The words of a range as written, spaces tidied: "bulan madu". */
export function phraseText(block: BlockWords, { from, to }: WordRange) {
  let text = block.words[from] ?? "";
  for (let i = from; i < to; i++) {
    text += block.gaps[i].replace(/\s+/g, " ") + block.words[i + 1];
  }
  return text;
}

/** The range one word longer on that side, or null at a sentence end or the block's edge. */
export function grow(
  block: BlockWords,
  range: WordRange,
  side: "before" | "after"
): WordRange | null {
  if (side === "before") {
    return range.from > 0 && joins(block.gaps[range.from - 1])
      ? { from: range.from - 1, to: range.to }
      : null;
  }
  return range.to < block.words.length - 1 && joins(block.gaps[range.to])
    ? { from: range.from, to: range.to + 1 }
    : null;
}

/**
 * The longest phrase of 2 to `maxWords` words around word `index` that `has`
 * knows, preferring one that starts with the word.
 */
export function phraseAround(
  block: BlockWords,
  index: number,
  has: (key: string) => boolean,
  maxWords: number
): WordRange | null {
  const last = block.words.length - 1;
  for (let n = Math.min(maxWords, last + 1); n >= 2; n--) {
    for (let from = index; from >= Math.max(0, index - n + 1); from--) {
      const range = { from, to: from + n - 1 };
      if (range.to > last || !joinsAll(block, range)) continue;
      if (has(phraseKey(phraseText(block, range)))) return range;
    }
  }
  return null;
}

/**
 * Phrases `has` knows wherever they are in the block, longest first, as the
 * index of each word's phrase (its first word), or -1.
 */
export function phraseRuns(
  block: BlockWords,
  has: (key: string) => boolean,
  maxWords: number
): number[] {
  const runs = block.words.map(() => -1);
  let i = 0;
  while (i < block.words.length) {
    let length = 0;
    for (let n = Math.min(maxWords, block.words.length - i); n >= 2; n--) {
      const range = { from: i, to: i + n - 1 };
      if (!joinsAll(block, range)) continue;
      if (has(phraseKey(phraseText(block, range)))) {
        length = n;
        break;
      }
    }
    if (length) {
      runs.fill(i, i, i + length);
      i += length;
    } else {
      i++;
    }
  }
  return runs;
}

// ── Picking a phrase with the mouse ────────────────────────────────────────
// Dragging from one word to another picks the words between. The reader
// handles the drag itself: Chromium starts no text selection on a focusable
// element, which every word is. A selection begun between words works too.

/** A rendered block's text, read back from the reader's word and gap spans. */
export function domParts(block: Element): TextPart[] {
  const parts: TextPart[] = [];
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (child.hasAttribute("data-leaf")) {
        parts.push({
          text: readableText(child),
          isWord: child.classList.contains("word-cell"),
        });
      } else if (child.tagName === "BR") {
        parts.push({ text: "\n", isWord: false });
      } else {
        walk(child);
      }
    }
  };
  walk(block);
  return parts;
}

function elementOf(node: Node | EventTarget | null): Element | null {
  if (!node || !("nodeType" in node)) return null;
  return node.nodeType === 1 ? (node as Element) : (node as Node).parentElement;
}

/** The reader word at a DOM node, its block, and its place among the block's words. */
export function wordCellAt(node: Node | EventTarget | null) {
  const cell = elementOf(node)?.closest<HTMLElement>(".word-cell");
  const block = cell?.closest<HTMLElement>("[data-block-id]");
  if (!cell || !block) return null;
  const index = Array.from(block.querySelectorAll(".word-cell")).indexOf(cell);
  return { cell, block, index };
}

/** Words `from` to `to` of a rendered block, picked as a phrase. */
export function phraseInBlock(block: HTMLElement, a: number, b: number) {
  const cells = block.querySelectorAll<HTMLElement>(".word-cell");
  const range = { from: Math.min(a, b), to: Math.max(a, b) };
  return {
    blockId: Number(block.dataset.blockId),
    range,
    parts: domParts(block),
    first: cells[range.from],
  };
}

/**
 * The words a text selection touches, when it covers two or more words of
 * one block: a phrase picked by selecting it.
 */
export function selectedPhrase(range: Range) {
  const block = elementOf(range.startContainer)?.closest<HTMLElement>(
    "[data-block-id]"
  );
  if (
    !block ||
    block !== elementOf(range.endContainer)?.closest("[data-block-id]")
  ) {
    return null;
  }
  const cells = Array.from(block.querySelectorAll<HTMLElement>(".word-cell"));
  const touched = cells.flatMap((cell, i) =>
    range.intersectsNode(cell) ? [i] : []
  );
  if (touched.length < 2) return null;
  return phraseInBlock(block, touched[0], touched[touched.length - 1]);
}
