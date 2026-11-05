// Grammar-aware word matching for Indonesian.
//
// A word in a text is matched to a headword so that its verb forms share one
// learning state: membeli, dibeli, beli → beli. Sources, in order:
//   1. Wiktionary's form table (active/passive/plural/spelling variants),
//   2. Wiktionary etymologies that analyse a verb form (meN-, di-, ter-, ber-,
//      per-, -kan, -i; built by scripts/build-dictionary-json.py),
//   3. reduplication (buku-buku, berjalan-jalan) and clitics (-nya, -ku, -lah…)
//      via Lector's morphology pack,
//   4. the Sastrawi stemmer (vendored, MIT) over Wiktionary's root words, for
//      forms Wiktionary doesn't list.
// Derived nouns that have their own dictionary entry (pembelian, kebaikan)
// stay separate headwords: their meaning differs from the root's.

import Stemmer from "@/vendor/sastrawi/stemmer";
import { id as pack } from "./languages/id/manifest";
import { stemCandidates } from "./languages/morphology";
import { foldWord } from "./languages/text";

export interface GrammarData {
  /** headword → senses */
  e: Record<string, [string, string][]>;
  /** form → [lemma, form type] */
  i: Record<string, [string, string]>;
  /** verb form → root, from etymologies */
  v: Record<string, string>;
  /** derived noun → root, from etymologies */
  n: Record<string, string>;
  /** words whose only dictionary sense is a proper name */
  p: string[];
}

export interface Lemmatizer {
  /** The headword a word's learning state is stored under. */
  lemma(word: string): string;
  /** Root a derived noun comes from, for display ("from baik"). */
  derivedFrom(word: string): string | undefined;
  /** Whether the dictionary only knows this word as a name. */
  isNameOnly(word: string): boolean;
  inDictionary(word: string): boolean;
}

const FUNCTION_POS = new Set(["pron", "prep", "conj", "det", "particle"]);
const VERB_POS = new Set(["verb"]);

const CLITICS_ONLY = {
  clitics: pack.morphology?.clitics ?? [],
  maxClitics: pack.morphology?.maxClitics ?? 2,
  minStem: pack.morphology?.minStem ?? 3,
};

export function fold(word: string) {
  return foldWord(word, pack);
}

export function createLemmatizer(data: GrammarData): Lemmatizer {
  const roots = new Set(Object.keys(data.e));
  for (const form of Object.keys(data.i)) roots.delete(form);
  for (const form of Object.keys(data.v)) roots.delete(form);
  for (const form of Object.keys(data.n)) roots.delete(form);
  const stemmer = new Stemmer(roots);
  const names = new Set(data.p);
  const memo = new Map<string, string>();

  const known = (w: string) =>
    w in data.e || w in data.i || w in data.v || w in data.n;
  const hasPos = (w: string, wanted: Set<string>) =>
    data.e[w]?.some(([pos]) => wanted.has(pos)) ?? false;
  const avoid = pack.avoidWords;

  function resolve(w: string, depth: number): string {
    if (depth > 4) return w;
    // Pronouns, prepositions and other function words keep their own entry
    // even when they look like verb forms (mereka, menurut, melalui).
    if (hasPos(w, FUNCTION_POS) || avoid.has(w)) return w;
    const inflection = data.i[w];
    if (inflection && inflection[0] !== w)
      return resolve(inflection[0], depth + 1);
    const verbRoot = data.v[w];
    if (verbRoot && verbRoot !== w) {
      // berikan is both ber- + ikan ("having fish") and beri + -kan; when the
      // -kan/-i base is itself a verb, that reading wins.
      for (const suffix of ["kan", "i"]) {
        const base = w.slice(0, -suffix.length);
        if (w.endsWith(suffix) && base.length >= 3 && hasPos(base, VERB_POS)) {
          return resolve(base, depth + 1);
        }
      }
      return resolve(verbRoot, depth + 1);
    }
    // Passive and stative verbs Wiktionary lists without a link to their
    // base: dijual → jual. Only when the base is itself a verb (dingin, an
    // adjective, is left alone). meN- forms are covered by the data above;
    // guessing them here would turn menang ("win") into tang ("pliers").
    if (w in data.e && hasPos(w, VERB_POS)) {
      for (const prefix of ["di", "ter", "ber"]) {
        const base = w.slice(prefix.length);
        if (
          w.startsWith(prefix) &&
          base.length >= 3 &&
          hasPos(base, VERB_POS)
        ) {
          return resolve(base, depth + 1);
        }
      }
      return w;
    }
    if (w in data.e) return w;

    // Reduplication: buku-buku → buku, berjalan-jalan → berjalan → jalan.
    const dash = w.indexOf("-");
    if (dash > 0) {
      const a = w.slice(0, dash);
      const b = w.slice(dash + 1);
      if (a === b || (b.length >= 3 && a.endsWith(b)))
        return resolve(a, depth + 1);
      if (known(a)) return resolve(a, depth + 1);
      return w;
    }

    // Clitics: rumahnya → rumah, bukunya → buku, dialah → dia.
    for (const candidate of stemCandidates(w, CLITICS_ONLY)) {
      if (known(candidate.key)) return resolve(candidate.key, depth + 1);
    }

    // Anything else: affix stripping with the Sastrawi stemmer.
    const stem = stemmer.stem(w);
    if (stem !== w && stem in data.e) return stem;
    return w;
  }

  return {
    lemma(word: string) {
      const w = fold(word);
      let result = memo.get(w);
      if (result === undefined) {
        result = resolve(w, 0);
        memo.set(w, result);
      }
      return result;
    },
    derivedFrom(word: string) {
      return data.n[fold(word)];
    },
    isNameOnly(word: string) {
      return names.has(fold(word));
    },
    inDictionary(word: string) {
      return known(fold(word));
    },
  };
}

// ── Proper nouns ───────────────────────────────────────────────────────────

const HAS_DIGIT = /\d/;
// Anything between words that ends a sentence or line: ". ", '." "', ":\n", "!\n— ".
const SENTENCE_BREAK = /[.!?…:;\n]/;

export interface TextToken {
  text: string;
  isWord: boolean;
}

/**
 * Folded keys of the words a text uses as names. A capitalised word counts as
 * a name when the dictionary only knows it as a name, when it is capitalised
 * in the middle of a sentence and never written in lower case, or when it
 * starts a sentence but is neither in the dictionary nor seen in lower case.
 * Acronyms (DPR, TNI) count as names too.
 *
 * `blocks` are the text's paragraphs, each already split into tokens.
 */
export function findNames(blocks: TextToken[][], lex: Lemmatizer): Set<string> {
  const lowercase = new Set<string>();
  const midSentence = new Set<string>();
  const sentenceStart = new Set<string>();

  for (const tokens of blocks) {
    let atStart = true;
    for (const token of tokens) {
      if (!token.isWord) {
        if (SENTENCE_BREAK.test(token.text)) atStart = true;
        continue;
      }
      const word = token.text;
      const key = fold(word);
      const first = word.charAt(0);
      if (HAS_DIGIT.test(word) || first === first.toLowerCase()) {
        lowercase.add(key);
      } else if (atStart) {
        sentenceStart.add(key);
      } else {
        midSentence.add(key);
      }
      atStart = false;
    }
  }

  const names = new Set<string>();
  for (const key of midSentence) {
    if (!lowercase.has(key)) names.add(key);
  }
  for (const key of sentenceStart) {
    if (lowercase.has(key) || names.has(key)) continue;
    if (lex.isNameOnly(key)) names.add(key);
    else if (!lex.inDictionary(key) && lex.lemma(key) === key) names.add(key);
  }
  return names;
}

/** Whether a token in running text is a name or number to leave out of word counts. */
export function isNameToken(word: string, names: Set<string>): boolean {
  if (HAS_DIGIT.test(word)) return true;
  if (word.length >= 2 && word === word.toUpperCase() && /\p{L}/u.test(word)) {
    return true;
  }
  const first = word.charAt(0);
  if (first === first.toLowerCase()) return false;
  return names.has(fold(word));
}
