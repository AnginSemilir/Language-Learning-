// Ranked frequency list plus how many of the top 1,000 / 2,000 / 5,000 / 10,000 words
// you know or are familiar with, using the reader's word states (flashcards
// included).
import {
  BANDS,
  type RankedWord,
  loadFrequency,
  rankHeadwords,
} from "@/lector/frequency";
import { useLexicon } from "@/lector/reader/useLexicon";
import { useEffect, useMemo, useState } from "react";

export interface BandCoverage {
  band: number;
  /** Known: doesn't come back. */
  known: number;
  /** Familiar: probably known, still checked now and then. */
  familiar: number;
}

export function useFrequency() {
  const lexicon = useLexicon(undefined);
  const [words, setWords] = useState<string[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadFrequency()
      .then(setWords)
      .catch(() => setError(true));
  }, []);

  const { lex, headwordOf, stateOf } = lexicon;
  const ranked: RankedWord[] | null = useMemo(
    () => (words && lex ? rankHeadwords(words, headwordOf) : null),
    [words, lex, headwordOf]
  );

  const coverage: BandCoverage[] | null = useMemo(() => {
    if (!ranked) return null;
    let known = 0;
    let familiar = 0;
    const out: BandCoverage[] = [];
    let next = 0;
    ranked.slice(0, BANDS[BANDS.length - 1]).forEach((r, i) => {
      const state = stateOf(r.headword);
      if (state === "known") known++;
      if (state === "familiar") familiar++;
      if (i + 1 === BANDS[next]) {
        out.push({ band: BANDS[next], known, familiar });
        next++;
      }
    });
    return out;
  }, [ranked, stateOf]);

  return { ranked, coverage, lexicon, error: error || lexicon.error };
}
