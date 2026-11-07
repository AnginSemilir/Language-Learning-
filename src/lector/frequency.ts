// The most frequent Indonesian words, from wordfreq (data CC BY-SA 4.0),
// built by scripts/build-frequency-json.py. Word forms are grouped into
// headwords the same way the reader groups them (dibeli with beli, rumahnya
// with rumah), so "top 1,000" means 1,000 distinct words.

export const BANDS = [1000, 2000, 5000, 10000] as const;
export type Band = (typeof BANDS)[number];

export interface RankedWord {
  /** 1-based rank among headwords. */
  rank: number;
  headword: string;
  /** The word forms from the frequency list that fall under this headword. */
  forms: string[];
}

let loading: Promise<string[]> | null = null;

export function loadFrequency(): Promise<string[]> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}data/frequency-id.json`)
      .then((r) => {
        if (!r.ok)
          throw new Error(`Frequency list failed to load (${r.status})`);
        return r.json() as Promise<{ words: string[] }>;
      })
      .then((d) => d.words)
      .catch((e) => {
        loading = null;
        throw e;
      });
  }
  return loading;
}

/** Groups word forms (most frequent first) into ranked headwords. */
export function rankHeadwords(
  words: string[],
  headwordOf: (word: string) => string
): RankedWord[] {
  const byHeadword = new Map<string, RankedWord>();
  for (const word of words) {
    const headword = headwordOf(word);
    const existing = byHeadword.get(headword);
    if (existing) {
      if (word !== headword) existing.forms.push(word);
    } else {
      byHeadword.set(headword, {
        rank: byHeadword.size + 1,
        headword,
        forms: word !== headword ? [word] : [],
      });
    }
  }
  return [...byHeadword.values()];
}
