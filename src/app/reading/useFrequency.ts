// Ranked frequency list plus how many of the top 1,000 / 2,000 / 5,000 words
// you know, using the reader's own word states (including mature flashcards).
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
  known: number;
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
    const out: BandCoverage[] = [];
    let next = 0;
    ranked.slice(0, BANDS[BANDS.length - 1]).forEach((r, i) => {
      if (stateOf(r.headword) === "known") known++;
      if (i + 1 === BANDS[next]) {
        out.push({ band: BANDS[next], known });
        next++;
      }
    });
    return out;
  }, [ranked, stateOf]);

  return { ranked, coverage, lexicon, error: error || lexicon.error };
}
