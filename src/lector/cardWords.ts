// The words a flashcard stands for, for reading and the known-words list: a
// one-word card is that word; a card with several words (a phrase, a
// sentence) counts each word on its own, except fixed phrases the
// dictionary has, like "tanggung jawab", which stay whole.
import { id as pack } from "./languages/id/manifest";
import { fold, phraseKey } from "./lemma";
import { blockWords, phraseRuns, phraseText } from "./reader/phrase";
import { splitWords } from "./reader/utils";

/** The most words a fixed phrase kept whole has. */
const MAX_PHRASE_WORDS = 4;

export function cardWords(
  front: string,
  isPhrase: (key: string) => boolean
): string[] {
  const block = blockWords(splitWords(front, pack));
  const out = new Set<string>();
  if (block.words.length === 1) {
    out.add(fold(block.words[0]));
    return [...out];
  }
  const runs = phraseRuns(block, isPhrase, MAX_PHRASE_WORDS);
  for (let i = 0; i < block.words.length; ) {
    if (runs[i] < 0) {
      out.add(fold(block.words[i]));
      i++;
      continue;
    }
    let to = i;
    while (to + 1 < block.words.length && runs[to + 1] === runs[i]) to++;
    out.add(phraseKey(phraseText(block, { from: i, to })));
    i = to + 1;
  }
  return [...out];
}
