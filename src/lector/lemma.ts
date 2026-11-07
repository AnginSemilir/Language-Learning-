// Grammar-aware word matching for Indonesian.
//
// Two levels of grouping:
//
// * lemma(): where a word's learning state is stored. Only forms that are the
//   same word share it: di- passives with their base (dibeli → beli,
//   diberikan → berikan) when the dictionary shows the same meaning, clitics
//   (rumahnya → rumah) and plural reduplication (buku-buku → buku). Every other
//   form — meN-, ber-, ter-, -kan/-i, derived nouns — counts as its own word.
//
// * looseLemma(): the root by form alone, shown in the word panel as related
//   (membeli, merupakan, berjalan-jalan → beli, rupa, jalan). Sources, in order:
//   Wiktionary's form table, Wiktionary etymologies (built by
//   scripts/build-dictionary-json.py), reduplication and clitics via Lector's
//   morphology pack, then the Sastrawi stemmer (vendored, MIT) for forms
//   Wiktionary doesn't list.
//
// The reader lets the user override either way (see useLexicon).

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
  /**
   * More words, for lookup only (scripts/build-dictionary-extra.py):
   * headword → [pos, gloss, source], source "m" for Wiktionary's Malay
   * entries, "w" for Wordnet Bahasa, "s" for everyday spoken words, "t"
   * for machine translations.
   */
  x?: Record<string, [string, string, string][]>;
}

export interface Lemmatizer {
  /**
   * The headword a word's learning state is stored under: the base of a di-
   * passive (dibeli → beli), the word without clitics (rumahnya → rumah), the
   * singular of a plural (buku-buku → buku); otherwise the word itself.
   */
  lemma(word: string): string;
  /** The root by form alone, for showing related words: membeli → beli. */
  looseLemma(word: string): string;
  /** Root a derived noun comes from, for display ("from baik"). */
  derivedFrom(word: string): string | undefined;
  /** Whether the dictionary only knows this word as a name. */
  isNameOnly(word: string): boolean;
  inDictionary(word: string): boolean;
}

const FUNCTION_POS = new Set(["pron", "prep", "conj", "det", "particle"]);
const VERB_POS = new Set(["verb"]);

// Words that say nothing about meaning in a gloss ("active of", "to be",
// "something", "form of").
const GLOSS_STOP = new Set(
  (
    "the a an to of be is are was or and in on at for with as by from into " +
    "up out about it its that this which who what one one's oneself someone " +
    "something somebody sth sb etc used use form forms active passive " +
    "alternative spelling synonym basic infinitive imperative colloquial " +
    "standard nonstandard verb noun adjective object person thing " +
    "have having become being not no"
  ).split(" ")
);

/** A crude English stem so "enjoy" matches "enjoyable" and "follow" "following". */
function englishStem(word: string) {
  return word
    .replace(
      /(ings|ing|ers|er|ed|es|s|ations|ation|ions|ion|ments|ment|able|ible|ness|ly|age)$/,
      ""
    )
    .replace(/y$/, "i")
    .replace(/e$/, "");
}

const CLITICS_ONLY = {
  clitics: pack.morphology?.clitics ?? [],
  maxClitics: pack.morphology?.maxClitics ?? 2,
  minStem: pack.morphology?.minStem ?? 3,
};

export function fold(word: string) {
  return foldWord(word, pack);
}

/**
 * Several words as one lookup key: folded, single spaces, no punctuation at
 * either end ("Bulan  madu," → "bulan madu").
 */
export function phraseKey(text: string) {
  return foldWord(text, pack)
    .replace(/\s+/g, " ")
    .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, "");
}

export function createLemmatizer(data: GrammarData): Lemmatizer {
  const roots = new Set(Object.keys(data.e));
  for (const form of Object.keys(data.i)) roots.delete(form);
  for (const form of Object.keys(data.v)) roots.delete(form);
  for (const form of Object.keys(data.n)) roots.delete(form);
  const stemmer = new Stemmer(roots);
  const names = new Set(data.p);
  const strictMemo = new Map<string, string>();
  const looseMemo = new Map<string, string>();

  const known = (w: string) =>
    w in data.e || w in data.i || w in data.v || w in data.n;
  const hasPos = (w: string, wanted: Set<string>) =>
    data.e[w]?.some(([pos]) => wanted.has(pos)) ?? false;
  const avoid = pack.avoidWords;

  const glossCache = new Map<
    string,
    { words: Set<string>; stems: Set<string> }
  >();
  function gloss(w: string) {
    let cached = glossCache.get(w);
    if (!cached) {
      const words = new Set(
        (data.e[w] ?? [])
          .flatMap(([, g]) => g.toLowerCase().split(/[^\p{L}-]+/u))
          .filter(Boolean)
      );
      const stems = new Set(
        [...words]
          .filter((x) => x.length > 2 && !GLOSS_STOP.has(x))
          .map(englishStem)
          .filter((x) => x.length > 2)
      );
      cached = { words, stems };
      glossCache.set(w, cached);
    }
    return cached;
  }

  /**
   * Whether a form and the root it links to mean the same thing: one's
   * definition names the other ("active of lihat", "basic form of
   * menggunakan"), or their English definitions share a content word. A form
   * with no definition of its own gives no sign of a different meaning.
   */
  function sameMeaning(form: string, root: string): boolean {
    if (!(form in data.e) || !(root in data.e)) return true;
    const a = gloss(form);
    const b = gloss(root);
    if (a.words.has(root) || b.words.has(form)) return true;
    // "passive of membeli" names a sibling form that links straight to the
    // same root (membeli → beli). A derivative of the form itself doesn't
    // count: gunakan "basic form of menggunakan" says nothing about guna.
    for (const word of a.words) {
      if (word !== form && (data.i[word]?.[0] ?? data.v[word]) === root) {
        return true;
      }
    }
    for (const stem of a.stems) if (b.stems.has(stem)) return true;
    return false;
  }

  function resolve(w: string, depth: number): string {
    if (depth > 4) return w;
    const follow = (next: string) => resolve(next, depth + 1);

    // Pronouns, prepositions and other function words keep their own entry
    // even when they look like verb forms (mereka, menurut, melalui).
    if (hasPos(w, FUNCTION_POS) || avoid.has(w)) return w;
    const inflection = data.i[w];
    if (inflection && inflection[0] !== w) return follow(inflection[0]);
    const verbRoot = data.v[w];
    if (verbRoot && verbRoot !== w) {
      // berikan is both ber- + ikan ("having fish") and beri + -kan; when the
      // -kan/-i base is itself a verb, that reading wins.
      for (const suffix of ["kan", "i"]) {
        const base = w.slice(0, -suffix.length);
        if (w.endsWith(suffix) && base.length >= 3 && hasPos(base, VERB_POS)) {
          return follow(base);
        }
      }
      return follow(verbRoot);
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
          return follow(base);
        }
      }
      return w;
    }
    if (w in data.e) return w;

    // Reduplication: buku-buku → buku, berjalan-jalan → berjalan.
    const dash = w.indexOf("-");
    if (dash > 0) {
      const a = w.slice(0, dash);
      const b = w.slice(dash + 1);
      if (a === b || (b.length >= 3 && a.endsWith(b)) || known(a)) {
        return resolve(a, depth + 1);
      }
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

  /** The base of a di- passive, if w is one and means the same: dibeli → beli. */
  function passiveBase(w: string): string | undefined {
    if (!w.startsWith("di") || w.length < 5) return undefined;
    const base = w.slice(2);
    if (w in data.e) {
      // Wiktionary calls it a passive ("passive of membeli"), or the base is a
      // verb with the same meaning (dinas "government service" is not di + nas).
      const saysPassive = gloss(w).words.has("passive");
      if (saysPassive) return base;
      return hasPos(base, VERB_POS) && sameMeaning(w, base) ? base : undefined;
    }
    // Not in the dictionary (dibelikan): the base must be a known verb.
    return hasPos(base, VERB_POS) ? base : undefined;
  }

  function resolveShared(w: string, depth: number): string {
    if (depth > 3) return w;
    if (hasPos(w, FUNCTION_POS) || avoid.has(w)) return w;
    const base = passiveBase(w);
    if (base) return base;
    if (w in data.e) return w;

    // Plural reduplication only: buku-buku → buku (berjalan-jalan is its own word).
    const dash = w.indexOf("-");
    if (dash > 0) {
      const a = w.slice(0, dash);
      return a === w.slice(dash + 1) ? resolveShared(a, depth + 1) : w;
    }

    // Clitics: rumahnya → rumah, dibelinya → dibeli → beli.
    for (const candidate of stemCandidates(w, CLITICS_ONLY)) {
      if (known(candidate.key)) return resolveShared(candidate.key, depth + 1);
    }
    return w;
  }

  const lookup =
    (memo: Map<string, string>, find: (w: string, depth: number) => string) =>
    (word: string) => {
      const w = fold(word);
      let result = memo.get(w);
      if (result === undefined) {
        result = find(w, 0);
        memo.set(w, result);
      }
      return result;
    };

  return {
    lemma: lookup(strictMemo, resolveShared),
    looseLemma: lookup(looseMemo, resolve),
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
