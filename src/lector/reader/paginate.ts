// Splits a lesson's Markdown into reading pages of roughly `target` words.
// Paragraphs stay whole when they fit; a paragraph longer than a page is split
// at sentence boundaries with Lector's sentence splitter.

import { id as pack } from "../languages/id/manifest";
import { countTypedWords, splitSentences } from "../languages/tokenizer";

export const PAGE_WORDS = 90;

function words(text: string) {
  return countTypedWords(text, pack);
}

/** Paragraph-sized pieces, none (much) longer than `target` words. */
function pieces(content: string, target: number): string[] {
  const out: string[] = [];
  for (const block of content.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (words(trimmed) <= target * 1.3 || /^#{1,6}\s/.test(trimmed)) {
      out.push(trimmed);
      continue;
    }
    let chunk = "";
    for (const sentence of splitSentences(trimmed, pack)) {
      const next = chunk ? `${chunk} ${sentence.trim()}` : sentence.trim();
      if (chunk && words(next) > target) {
        out.push(chunk);
        chunk = sentence.trim();
      } else {
        chunk = next;
      }
    }
    if (chunk) out.push(chunk);
  }
  return out;
}

export function paginate(content: string, target = PAGE_WORDS): string[] {
  const pages: string[] = [];
  let current: string[] = [];
  let count = 0;
  for (const piece of pieces(content, target)) {
    const n = words(piece);
    // A heading starts a new page unless the page is still empty.
    const isHeading = /^#{1,6}\s/.test(piece);
    if (current.length > 0 && (count + n > target * 1.15 || isHeading)) {
      pages.push(current.join("\n\n"));
      current = [];
      count = 0;
    }
    current.push(piece);
    count += n;
  }
  if (current.length > 0) pages.push(current.join("\n\n"));
  return pages.length > 0 ? pages : [""];
}
