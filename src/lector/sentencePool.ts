// Example sentences for any Indonesian word, used by gap-fill practice on your
// own flashcards.
//
// Built by scripts/build-sentence-pool.ts (sources and licences there and in
// scripts/extract-sentences.py): up to 20 sentences per word, easiest first,
// translated ones first.
// Words are grouped the way the reader groups them (dibeli and rumahnya count
// for beli and rumah), and the pool is split into small files so the app only
// downloads the ones holding your card words. The service worker keeps
// downloaded files for offline use (see vite.config.ts).

/** Bump when the pool is rebuilt, so cached files from the old build are not reused. */
export const POOL_VERSION = 1;
export const SHARD_COUNT = 512;

/**
 * Translated: t Tatoeba, w Wiktionary, k TALPCo, m MASSIVE, a ALT, g Global
 * Voices, c TICO-19, o OpenSubtitles. Indonesian only: n Leipzig news,
 * p Leipzig Wikipedia.
 */
export type PoolSource =
  | "t"
  | "w"
  | "k"
  | "m"
  | "a"
  | "g"
  | "c"
  | "o"
  | "n"
  | "p";
/** [Indonesian sentence, English translation or "", source]. */
export type PoolSentence = [string, string, PoolSource];
export type PoolShard = Record<string, PoolSentence[]>;

export const POOL_SOURCE_LABEL: Record<PoolSource, string> = {
  t: "Tatoeba",
  w: "Wiktionary",
  k: "TALPCo",
  m: "Amazon MASSIVE",
  a: "Asian Language Treebank",
  g: "Global Voices",
  c: "TICO-19",
  o: "OpenSubtitles",
  n: "Leipzig news corpus",
  p: "Leipzig Wikipedia corpus",
};

/** FNV-1a, 32-bit. Stable across builds and devices. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function shardOf(key: string): number {
  return hash32(key) % SHARD_COUNT;
}

export function shardFile(shard: number): string {
  return `${shard.toString(16).padStart(3, "0")}.json`;
}

/** Short id for a sentence, used to remember which ones you've seen or hidden. */
export function sentenceKey(text: string): string {
  return hash32(text).toString(36);
}

const shards = new Map<number, Promise<PoolShard>>();

function loadShard(shard: number): Promise<PoolShard> {
  let loading = shards.get(shard);
  if (!loading) {
    loading = fetch(
      `${import.meta.env.BASE_URL}data/sentences/v${POOL_VERSION}/${shardFile(shard)}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`Sentences failed to load (${r.status})`);
        return r.json() as Promise<PoolShard>;
      })
      .catch((e) => {
        shards.delete(shard);
        throw e;
      });
    shards.set(shard, loading);
  }
  return loading;
}

/**
 * The pool's sentences for a headword (lemma) or dictionary phrase, easiest
 * first. Empty when the word isn't in the pool; throws when offline and the
 * file was never downloaded.
 */
export async function poolSentences(key: string): Promise<PoolSentence[]> {
  const shard = await loadShard(shardOf(key));
  return shard[key] ?? [];
}
