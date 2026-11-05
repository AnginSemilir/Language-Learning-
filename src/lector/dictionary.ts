// Indonesian→English lookup. The resolution order is ported from Lector's
// resolveWord (heuwels/lector@eb393ce, AGPL-3.0-only: api/src/lib/dictionary-db.ts),
// keeping only the steps that apply to Indonesian: exact entry, inflection
// table, then the pack's clitic/prefix peeling (stemCandidates).
//
// Data: Lector's dictionary-id release (Wiktionary via kaikki.org, CC BY-SA),
// converted by scripts/build-dictionary-json.py to public/data/dictionary-id.json.

import { id as pack } from "./languages/id/manifest";
import { stemCandidates } from "./languages/morphology";
import { foldWord } from "./languages/text";

export interface DictionarySense {
  partOfSpeech: string;
  gloss: string;
}

export interface DictionaryEntry {
  /** The headword that matched (may differ from the tapped word). */
  word: string;
  senses: DictionarySense[];
  /** e.g. { stem: "beli", label: "meN- form of" } when the tapped word was peeled. */
  lemmaInfo?: { stem: string; label: string };
}

interface DictionaryData {
  e: Record<string, [string, string][]>;
  i: Record<string, [string, string]>;
}

let loading: Promise<DictionaryData> | null = null;

export function loadDictionary(): Promise<DictionaryData> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}data/dictionary-id.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Dictionary failed to load (${r.status})`);
        return r.json() as Promise<DictionaryData>;
      })
      .catch((e) => {
        loading = null;
        throw e;
      });
  }
  return loading;
}

const OPAQUE_INFLECTION_TAGS = new Set(["form", "error-unrecognized-form"]);

function inflectionLabel(type: string | null): string {
  if (!type || OPAQUE_INFLECTION_TAGS.has(type)) return "inflected form of";
  return `${type.replace(/,/g, " ")} form of`;
}

function build(
  data: DictionaryData,
  word: string,
  lemmaInfo?: DictionaryEntry["lemmaInfo"]
): DictionaryEntry | undefined {
  const senses = data.e[word];
  if (!senses) return undefined;
  return {
    word,
    senses: senses.map(([partOfSpeech, gloss]) => ({ partOfSpeech, gloss })),
    lemmaInfo,
  };
}

/** Pure lookup against loaded data, so it can be unit-tested. */
export function resolveWord(
  data: DictionaryData,
  word: string
): DictionaryEntry | undefined {
  const lower = foldWord(word, pack);

  // 1. Exact match
  const exact = build(data, lower);
  if (exact) return exact;

  // 2. Inflection table (e.g. "mengecat" → "cat")
  const infl = data.i[lower];
  if (infl) {
    const entry = build(data, infl[0], {
      stem: infl[0],
      label: inflectionLabel(infl[1]),
    });
    if (entry) return entry;
  }

  // 3. Clitic and prefix peeling from the language pack
  if (pack.morphology) {
    for (const candidate of stemCandidates(lower, pack.morphology)) {
      const label = `${candidate.peeled.join(" + ")} form of`;
      const direct = build(data, candidate.key, { stem: candidate.key, label });
      if (direct) return direct;
      const keyInfl = data.i[candidate.key];
      if (keyInfl) {
        const viaInfl = build(data, keyInfl[0], { stem: keyInfl[0], label });
        if (viaInfl) return viaInfl;
      }
    }
  }
  return undefined;
}

export async function lookupWord(
  word: string
): Promise<DictionaryEntry | undefined> {
  return resolveWord(await loadDictionary(), word);
}
