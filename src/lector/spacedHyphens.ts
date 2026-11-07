// Some corpora (OpenSubtitles, Leipzig news, Wikipedia) write a reduplicated
// word with spaces round its hyphen: "anak - anak" for anak-anak, "bersama -
// sama", "satu - satunya". Used when building the sentence pool
// (scripts/build-sentence-pool.ts), this joins them up again. Real dashes
// ("roti - dia memanggangnya sendiri") and stammers in subtitles ("Aku - aku
// tidak tahu") are left alone.

/** Dictionary entries: word → its senses as [part of speech, gloss]. */
export type Entries = Record<string, [pos: string, gloss: string][]>;

/** Words whose first sense is one of these can be reduplicated... */
const REDUPLICATES = new Set(["noun", "verb", "adj", "adv", "num"]);
/**
 * ...unless one of their first two senses is a function word: "aku - aku",
 * "dan - dan" or "ini - ini" is a stammer.
 */
const FUNCTION = new Set(["pron", "det", "conj", "prep", "particle"]);

/** Two words with a hyphen spaced on one side or both. */
const SPACED = /(?<![\p{L}-])(\p{L}+)(?: - |- | -)(\p{Ll}+)(?![\p{L}-])/gu;

function reduplicates(word: string, entries: Entries) {
  // Names are listed with words too (api, "fire", is also Api).
  const senses = (entries[word] ?? [])
    .map(([pos]) => pos)
    .filter((pos) => pos !== "name");
  return (
    REDUPLICATES.has(senses[0]) &&
    !senses.slice(0, 2).some((pos) => FUNCTION.has(pos))
  );
}

function isReduplication(first: string, second: string, entries: Entries) {
  const a = first.toLowerCase();
  // In the dictionary: tiba-tiba, kura-kura, sayur-mayur, warna-warni.
  if (entries[`${a}-${second}`]) return true;
  // The repeated part ends the first half and starts the second: anak - anak,
  // bersama - sama, satu - satunya, kemerah - merahan.
  for (let n = Math.min(a.length, second.length); n >= 3; n--) {
    const base = second.slice(0, n);
    if (a.endsWith(base)) return reduplicates(base, entries);
  }
  // With meN-: tolong - menolong, pukul - memukul.
  if (
    second.startsWith("me") &&
    (second.endsWith(a) || (a.length >= 4 && second.endsWith(a.slice(1))))
  ) {
    return reduplicates(a, entries);
  }
  return false;
}

/** `text` with the spaced hyphens of reduplicated words closed up. */
export function joinSpacedHyphens(text: string, entries: Entries): string {
  return text.replace(SPACED, (whole, first: string, second: string) =>
    isReduplication(first, second, entries) ? `${first}-${second}` : whole
  );
}
