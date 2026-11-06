// Builds public/data/sentences/v<POOL_VERSION>/: up to 20 example sentences for
// every Indonesian dictionary word and phrase, for gap-fill practice on the
// user's own flashcards (see src/lector/sentencePool.ts).
//
// Input: the TSV written by scripts/extract-sentences.py. Sentences without a
// human translation can get a machine translation, in three steps:
//
//   pnpm build:sentences pool-input.tsv --mt-todo mt-todo.txt [--mt mt.tsv]
//   node scripts/translate/translate-sentences.mjs mt-todo.txt mt.tsv
//   pnpm build:sentences pool-input.tsv --mt mt.tsv [output dir]
//
// The first lists the sentences the pool would show with a machine
// translation, assuming each will pass the meaning check; the second
// translates them (adding to mt.tsv); the third builds the pool. Some
// translations fail the check, so running the first two again with --mt
// lists and translates the next sentences in line for those slots. Without
// --mt, sentences without a human translation are shown untranslated.
//
// Words are grouped with the app's own lemmatizer, so a sentence with dibeli
// or rumahnya counts for beli or rumah. For each word, sentences are ranked:
// human translations first (learner sentences from Tatoeba, TALPCo and
// Wiktionary ahead of the parallel corpora), then machine translations that
// pass the meaning check for that word (src/lector/meaningCheck.ts), then
// untranslated ones; within each, fewer rare words and shorter is better.

import {
  createReadStream,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline";
import { id as pack } from "../src/lector/languages/id/manifest";
import { tokenizeWords } from "../src/lector/languages/tokenizer";
import { createLemmatizer, fold } from "../src/lector/lemma";
import { hasMeaning } from "../src/lector/meaningCheck";
import {
  POOL_VERSION,
  type PoolSentence,
  type PoolSource,
  SHARD_COUNT,
  hash32,
  shardFile,
  shardOf,
} from "../src/lector/sentencePool";

/** Sentences kept for each of the 5,000 most frequent words. */
const PER_COMMON_WORD = 20;
/** Rarer dictionary words and phrases. */
const PER_RARE_WORD = 12;
/** Words outside the dictionary (newer or derived words Wiktionary lacks). */
const PER_EXTRA_WORD = 6;
/** A word outside the dictionary needs this many lower-case uses in mid-sentence. */
const EXTRA_MIN_USES = 10;
/** Words past this frequency rank make a sentence harder. */
const COMMON_RANK = 3000;
/**
 * Shorter sentences aren't machine-translated: they are often fragments, and
 * the model guesses at them.
 */
const MT_MIN_WORDS = 5;

const args = process.argv.slice(2);
function option(name: string) {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  return args.splice(at, 2)[1];
}
const mtPath = option("--mt");
const todoPath = option("--mt-todo");
const [input, outRoot = "public/data/sentences"] = args;
if (!input) {
  console.error(
    "Usage: pnpm build:sentences <pool-input.tsv> [--mt-todo <out.txt> | --mt <mt.tsv>] [output dir]"
  );
  process.exit(1);
}

function lines(path: string) {
  return createInterface({
    input: createReadStream(path),
    crlfDelay: Number.POSITIVE_INFINITY,
  });
}

/** Machine translations: Indonesian sentence → English. */
const machine = new Map<string, string>();
if (mtPath) {
  for await (const line of lines(mtPath)) {
    const [text, english] = line.split("\t");
    if (english) machine.set(text, english);
  }
}

const data = JSON.parse(readFileSync("public/data/dictionary-id.json", "utf8"));
const freq: string[] = JSON.parse(
  readFileSync("public/data/frequency-id.json", "utf8")
).words;
const lex = createLemmatizer(data);
const rank = new Map(freq.map((w, i) => [w, i + 1]));
const names = new Set<string>(data.p);
const WORD = /^\p{Ll}+(?:-\p{Ll}+)*$/u;

const common = new Set<string>();
for (const w of freq) {
  if (common.size === 5000) break;
  common.add(lex.lemma(w));
}

const dictWords = new Set<string>();
const phrases = new Map<string, string[][]>(); // first word → phrases starting with it
for (const key of Object.keys(data.e)) {
  if (key !== key.toLowerCase() || names.has(key)) continue;
  const parts = key.split(" ");
  if (!parts.every((p) => WORD.test(p))) continue;
  if (parts.length === 1) {
    if (lex.lemma(key) === key) dictWords.add(key);
  } else {
    const list = phrases.get(parts[0]) ?? [];
    list.push(parts);
    phrases.set(parts[0], list);
  }
}

const lemmaCache = new Map<string, string>();
function lemmaOf(folded: string) {
  let l = lemmaCache.get(folded);
  if (l === undefined) {
    l = lex.lemma(folded);
    lemmaCache.set(folded, l);
  }
  return l;
}

/** Sources written for learners or as examples; the others are filtered harder. */
const CURATED = new Set<PoolSource>(["t", "w", "k", "m"]);

/** A sentence a learner can use: a complete, short sentence, not a headline or list. */
function usable(source: PoolSource, text: string, words: number) {
  if (words < 3 || words > 20) return false;
  if (CURATED.has(source)) return true;
  if (words > 16) return false;
  if (!/^["“'(]?\p{Lu}/u.test(text)) return false;
  if (!/[.!?]["”')]?$/.test(text)) return false;
  if (/https?:|www\.|@|#|\||\.\.\.|…/.test(text)) return false;
  if ((text.match(/\d/g) ?? []).length > 4) return false;
  // Headlines Capitalise Most Words.
  const capitals = text.match(/(?<=\s)["“'(]?\p{Lu}/gu)?.length ?? 0;
  if (capitals >= 4 && capitals > (words - 1) * 0.6) return false;
  if ((text.match(/["“”]/g) ?? []).length % 2) return false;
  if ((text.match(/\(/g) ?? []).length !== (text.match(/\)/g) ?? []).length)
    return false;
  return true;
}

interface Parsed {
  source: PoolSource;
  text: string;
  translation: string;
  folded: string[];
  /** Capitalised in mid-sentence: a name, or part of one. */
  capital: boolean[];
}

async function* sentences(): AsyncGenerator<Parsed> {
  const seen = new Set<number>();
  for await (const line of lines(input)) {
    const [source, text, translation = ""] = line.split("\t") as [
      PoolSource,
      string,
      string?,
    ];
    const tokens = tokenizeWords(text, pack);
    if (!usable(source, text, tokens.length)) continue;
    const folded = tokens.map((t) => fold(t.text));
    const dedupe = hash32(folded.join(" "));
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const capital = tokens.map((t, i) => i > 0 && /^\p{Lu}/u.test(t.text));
    yield { source, text, translation, folded, capital };
  }
}

// Pass 1: words the dictionary lacks but the corpora use as ordinary words:
// mostly lower-case in mid-sentence, so not names.
const lower = new Map<string, number>();
const upper = new Map<string, number>();
for await (const s of sentences()) {
  s.folded.forEach((f, i) => {
    if (i === 0 || !WORD.test(f)) return;
    const l = lemmaOf(f);
    if (dictWords.has(l) || l.length < 2) return;
    const counts = s.capital[i] ? upper : lower;
    counts.set(l, (counts.get(l) ?? 0) + 1);
  });
}
const extraWords = new Set(
  [...lower]
    .filter(([w, n]) => n >= EXTRA_MIN_USES && n >= 2 * (upper.get(w) ?? 0))
    .map(([w]) => w)
);
lower.clear();
upper.clear();

// Pass 2: keep the best sentences per word.
type Candidate = [score: number, sentence: PoolSentence];
const best = new Map<string, Candidate[]>();
function offer(key: string, score: number, sentence: PoolSentence) {
  const cap = common.has(key)
    ? PER_COMMON_WORD
    : dictWords.has(key) || key.includes(" ")
      ? PER_RARE_WORD
      : PER_EXTRA_WORD;
  let list = best.get(key);
  if (!list) best.set(key, (list = []));
  if (list.length >= cap && score >= list[list.length - 1][0]) return;
  list.push([score, sentence]);
  list.sort((a, b) => a[0] - b[0]);
  if (list.length > cap) list.pop();
}

/** A word's dictionary senses, for the meaning check. */
function glosses(key: string): string[] {
  return ((data.e[key] ?? []) as [string, string][]).map(([, g]) => g);
}

/**
 * Priority tiers, best first; within a tier, shorter sentences with fewer
 * rare words win. 0: learner sentences with a human translation (Tatoeba,
 * TALPCo, Wiktionary, MASSIVE). 1: translated news and health texts (ALT,
 * Global Voices, TICO-19). 2: a machine translation that passed the meaning
 * check. 3: no translation.
 */
const HUMAN_TIER: Partial<Record<PoolSource, number>> = {
  t: 0,
  k: 0,
  w: 0,
  m: 0,
  a: 1,
  g: 1,
  c: 1,
};
const MACHINE = 2;
const UNTRANSLATED = 3;
/** Corpora not written for learners come after the others in their tier. */
const CORPUS = new Set<PoolSource>(["o", "n", "p"]);
let total = 0;
for await (const s of sentences()) {
  total++;
  const lemmas = s.folded.map(lemmaOf);
  const rare = s.folded.map(
    (f, i) =>
      !s.capital[i] &&
      !/\d/.test(f) &&
      (rank.get(f) ?? Number.POSITIVE_INFINITY) > COMMON_RANK
  );
  const rareCount = rare.filter(Boolean).length;
  const base = (CORPUS.has(s.source) ? 20 : 0) + s.folded.length;
  const translatable = !s.translation && s.folded.length >= MT_MIN_WORDS;
  // A translation far longer or shorter than the sentence has usually gone
  // wrong (repeating itself, or leaving half out).
  const english = machine.get(s.text);
  const ratio = (english?.length ?? 0) / s.text.length;
  const plausible = ratio >= 0.5 && ratio <= 2;

  function offerFor(key: string, targetRare: number) {
    const score = base + (rareCount - targetRare) * 8;
    if (s.translation) {
      const tier = HUMAN_TIER[s.source] ?? 1;
      offer(key, tier * 1000 + score, [s.text, s.translation, s.source]);
    } else if (
      translatable &&
      // Listing what to translate: assume a new translation will pass.
      (english === undefined
        ? todoPath
        : plausible && hasMeaning(english, glosses(key)))
    ) {
      offer(key, MACHINE * 1000 + score, [s.text, english ?? "", s.source, 1]);
    } else if (s.source !== "o") {
      // Subtitle lines are only shown with a translation that passed.
      offer(key, UNTRANSLATED * 1000 + score, [s.text, "", s.source]);
    }
  }

  const occurrences = new Map<string, number[]>();
  lemmas.forEach((l, i) => {
    if (dictWords.has(l) || extraWords.has(l)) {
      const at = occurrences.get(l) ?? [];
      at.push(i);
      occurrences.set(l, at);
    }
  });
  for (const [l, at] of occurrences) {
    // One clear gap per sentence, and not a name that happens to be a word.
    if (at.length !== 1 || s.capital[at[0]]) continue;
    offerFor(l, rare[at[0]] ? 1 : 0);
  }

  const phraseHits = new Map<string, number>();
  s.folded.forEach((f, i) => {
    for (const p of phrases.get(f) ?? []) {
      if (p.every((w, j) => s.folded[i + j] === w && !s.capital[i + j])) {
        const key = p.join(" ");
        phraseHits.set(key, (phraseHits.get(key) ?? 0) + 1);
      }
    }
  });
  for (const [key, n] of phraseHits) if (n === 1) offerFor(key, 0);
}

if (todoPath) {
  // The sentences still to translate, the ones near the top of a word's list
  // first, so a translation run that is cut short still covers the most.
  const order = new Map<string, number>();
  const bySource = new Map<string, number>();
  for (const list of best.values()) {
    list.forEach(([, s], i) => {
      if (!s[3] || s[1]) return;
      bySource.set(s[2], (bySource.get(s[2]) ?? 0) + 1);
      if (i < (order.get(s[0]) ?? Number.POSITIVE_INFINITY)) order.set(s[0], i);
    });
  }
  const todo = [...order].sort((a, b) => a[1] - b[1]).map(([text]) => text);
  writeFileSync(todoPath, todo.length ? `${todo.join("\n")}\n` : "");
  console.log(`${total} usable sentences`);
  console.log(
    `${todo.length} sentences to translate (uses by source: ${[...bySource].map(([s, n]) => `${s} ${n}`).join(", ")})`
  );
  process.exit(0);
}

// Write the shards.
const outDir = `${outRoot}/v${POOL_VERSION}`;
rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const shards: Record<string, PoolSentence[]>[] = Array.from(
  { length: SHARD_COUNT },
  () => ({})
);
for (const key of [...best.keys()].sort()) {
  shards[shardOf(key)][key] = (best.get(key) ?? []).map(([, s]) => s);
}
let bytes = 0;
shards.forEach((shard, i) => {
  const json = JSON.stringify(shard);
  bytes += json.length;
  writeFileSync(`${outDir}/${shardFile(i)}`, json);
});

const count = (keys: Iterable<string>, min: number) =>
  [...keys].filter((k) => (best.get(k)?.length ?? 0) >= min).length;
const translated = (keys: Iterable<string>, min: number) =>
  [...keys].filter(
    (k) => (best.get(k) ?? []).filter(([, s]) => s[1]).length >= min
  ).length;
const bySource = new Map<string, number>();
let machineKept = 0;
for (const list of best.values()) {
  for (const [, s] of list) {
    bySource.set(s[2], (bySource.get(s[2]) ?? 0) + 1);
    if (s[3]) machineKept++;
  }
}
const phraseKeys = [...phrases.values()].flat().map((p) => p.join(" "));
console.log(`${total} usable sentences`);
console.log(
  `dictionary words with ≥1 / ≥5 sentences: ${count(dictWords, 1)} / ${count(dictWords, 5)} of ${dictWords.size}`
);
console.log(
  `top 5,000 with ≥5 / ≥10 / 20: ${count(common, 5)} / ${count(common, 10)} / ${count(common, 20)}`
);
console.log(
  `dictionary phrases with ≥1: ${count(phraseKeys, 1)} of ${phraseKeys.length}`
);
console.log(
  `translated, top 5,000 with ≥1 / ≥5 / ≥10: ${translated(common, 1)} / ${translated(common, 5)} / ${translated(common, 10)}`
);
console.log(
  `translated, dictionary words with ≥1 / ≥5: ${translated(dictWords, 1)} / ${translated(dictWords, 5)}`
);
console.log(
  `sentences kept by source: ${[...bySource].map(([s, n]) => `${s} ${n}`).join(", ")}`
);
console.log(
  `machine translations: ${machine.size} available, ${machineKept} kept`
);
console.log(`other words (not in the dictionary): ${extraWords.size}`);
console.log(
  `${best.size} entries, ${(bytes / 1e6).toFixed(1)} MB in ${SHARD_COUNT} files`
);
