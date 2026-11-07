// Indonesian→English lookup. The resolution order is ported from Lector's
// resolveWord (heuwels/lector@eb393ce, AGPL-3.0-only: api/src/lib/dictionary-db.ts),
// keeping only the steps that apply to Indonesian: exact entry, inflection
// table, then the pack's clitic/prefix peeling (stemCandidates). Added here:
// an entry that only points to another word ("active of lihat") shows that
// word's meanings; words Wiktionary lacks come from its Malay entries or
// Wordnet Bahasa; and failing all that, the word's root, marked as a guess.
//
// Data: Lector's dictionary-id release (Wiktionary via kaikki.org, CC BY-SA),
// converted by scripts/build-dictionary-json.py to public/data/dictionary-id.json,
// plus the "x" map from scripts/build-dictionary-extra.py.

import { id as pack } from "./languages/id/manifest";
import { stemCandidates } from "./languages/morphology";
import { foldWord } from "./languages/text";
import { type GrammarData, type Lemmatizer, createLemmatizer } from "./lemma";

export interface DictionarySense {
  partOfSpeech: string;
  gloss: string;
  /** Not from Wiktionary's Indonesian entries. */
  source?: "malay" | "wordnet" | "spoken";
}

export interface DictionaryEntry {
  /** The headword that matched (may differ from the tapped word). */
  word: string;
  senses: DictionarySense[];
  /** e.g. { stem: "beli", label: "meN- form of" } when the tapped word was peeled. */
  lemmaInfo?: { stem: string; label: string };
  /** The word isn't in the dictionary: these are its root's meanings. */
  guess?: boolean;
}

type DictionaryData = Pick<GrammarData, "e" | "i" | "x">;

let loading: Promise<GrammarData> | null = null;
let grammar: Promise<{ data: GrammarData; lex: Lemmatizer }> | null = null;

export function loadDictionary(): Promise<GrammarData> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}data/dictionary-id.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Dictionary failed to load (${r.status})`);
        return r.json() as Promise<GrammarData>;
      })
      .catch((e) => {
        loading = null;
        throw e;
      });
  }
  return loading;
}

/** The dictionary plus a lemmatizer built from it, loaded once. */
export function loadGrammar(): Promise<{ data: GrammarData; lex: Lemmatizer }> {
  if (!grammar) {
    grammar = loadDictionary()
      .then((data) => ({ data, lex: createLemmatizer(data) }))
      .catch((e) => {
        grammar = null;
        throw e;
      });
  }
  return grammar;
}

const OPAQUE_INFLECTION_TAGS = new Set(["form", "error-unrecognized-form"]);

function inflectionLabel(type: string | null): string {
  if (!type || OPAQUE_INFLECTION_TAGS.has(type)) return "inflected form of";
  return `${type.replace(/,/g, " ")} form of`;
}

/**
 * A sense that only points to another word: "active of lihat", "alternative
 * form of tetapi", "superseded spelling of jantung (“heart”)".
 */
const FORM_OF =
  /^((?:[\w-]+ )*?(?:form|spelling|active|passive|imperative|causative|synonym|plural|singular|clipping|contraction|abbreviation)) of ([\p{L}-]+(?: [\p{L}-]+)*?)(?: \(“.*”\))?$/u;

const SOURCES = { m: "malay", w: "wordnet", s: "spoken" } as const;

function sensesOf(data: DictionaryData, word: string): DictionarySense[] {
  const own = data.e[word];
  if (own) return own.map(([partOfSpeech, gloss]) => ({ partOfSpeech, gloss }));
  return (data.x?.[word] ?? []).map(([partOfSpeech, gloss, source]) => ({
    partOfSpeech,
    gloss,
    source: SOURCES[source as keyof typeof SOURCES],
  }));
}

/**
 * The meanings of a word whose entry only points to another word, following
 * up to three pointers, with what the first one says ("active of", "lihat").
 */
function followForms(data: DictionaryData, word: string) {
  let senses = sensesOf(data, word);
  let shown = word;
  let first: { label: string; stem: string } | undefined;
  const seen = new Set([word]);
  while (seen.size <= 3 && senses.length) {
    const pointers = senses.map((s) => FORM_OF.exec(s.gloss));
    if (pointers.some((m) => !m)) break;
    const next = pointers.find(
      (m) => m && !seen.has(m[2]) && sensesOf(data, m[2]).length
    );
    if (!next) break;
    first ??= { label: `${next[1]} of`, stem: next[2] };
    seen.add(next[2]);
    shown = next[2];
    senses = sensesOf(data, shown);
  }
  return { word: shown, senses, first };
}

function build(
  data: DictionaryData,
  word: string,
  lemmaInfo?: DictionaryEntry["lemmaInfo"]
): DictionaryEntry | undefined {
  const followed = followForms(data, word);
  if (!followed.senses.length) return undefined;
  return {
    word: followed.word,
    senses: followed.senses,
    lemmaInfo: followed.first ?? lemmaInfo,
  };
}

/** A word's meanings for a list: its own, or those of the word it points to. */
export function meaningsOf(data: DictionaryData, word: string) {
  return followForms(data, word).senses;
}

/** Pure lookup against loaded data, so it can be unit-tested. */
export function resolveWord(
  data: DictionaryData,
  word: string,
  lex?: Pick<Lemmatizer, "looseLemma">
): DictionaryEntry | undefined {
  const lower = foldWord(word, pack);

  // 1. Exact match
  const exact = data.e[lower] && build(data, lower);
  if (exact) return exact;

  // 2. Inflection table (e.g. "mengecat" → "cat")
  const infl = data.i[lower];
  if (infl && data.e[infl[0]]) {
    const entry = build(data, infl[0], {
      stem: infl[0],
      label: inflectionLabel(infl[1]),
    });
    if (entry) return entry;
  }

  // 3. Clitic and prefix peeling from the language pack
  const candidates = pack.morphology
    ? stemCandidates(lower, pack.morphology)
    : [];
  for (const candidate of candidates) {
    const label = `${candidate.peeled.join(" + ")} form of`;
    if (data.e[candidate.key]) {
      const direct = build(data, candidate.key, { stem: candidate.key, label });
      if (direct) return direct;
    }
    const keyInfl = data.i[candidate.key];
    if (keyInfl && data.e[keyInfl[0]]) {
      const viaInfl = build(data, keyInfl[0], { stem: keyInfl[0], label });
      if (viaInfl) return viaInfl;
    }
  }

  // 4. Words Wiktionary lacks: its Malay entries and Wordnet Bahasa, for the
  //    word or the word without clitics (membutuhkanmu → membutuhkan).
  const clitics = new Set(pack.morphology?.clitics ?? []);
  for (const candidate of [
    { key: lower, peeled: [] as string[] },
    ...candidates,
  ]) {
    if (
      !data.x?.[candidate.key] ||
      !candidate.peeled.every((p) => clitics.has(p))
    )
      continue;
    const label = `${candidate.peeled.join(" + ")} form of`;
    return build(
      data,
      candidate.key,
      candidate.peeled.length ? { stem: candidate.key, label } : undefined
    );
  }

  // 5. The root by form alone (kutemukan → temu), marked as a guess.
  const root = lex?.looseLemma(lower);
  if (root && root !== lower && data.e[root]) {
    const entry = build(data, root);
    if (entry) {
      return { ...entry, guess: true, lemmaInfo: { label: "", stem: root } };
    }
  }
  return undefined;
}

export async function lookupWord(
  word: string
): Promise<DictionaryEntry | undefined> {
  const { data, lex } = await loadGrammar();
  return resolveWord(data, word, lex);
}
