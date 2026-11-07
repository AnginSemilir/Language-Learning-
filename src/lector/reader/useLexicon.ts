// Everything the reader needs to colour words: the grammar-aware lemmatizer,
// the user's word states (live from IndexedDB), their flashcards, and the
// names used in the current text.

import { db } from "@/logic/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadGrammar } from "../dictionary";
import { type CardMatch, getUserCardIndex } from "../flashcards";
import { id as pack } from "../languages/id/manifest";
import {
  type Lemmatizer,
  findNames,
  fold,
  isNameToken,
  phraseKey,
} from "../lemma";
import type { WordState } from "../types";
import type { SavedPhrases } from "./ReaderArticle";
import { phraseInSet } from "./phrase";
import { splitWords } from "./utils";

export type DisplayState = WordState | "name";

export interface ReaderLexicon {
  lex: Lemmatizer | null;
  error: boolean;
  names: Set<string>;
  stateOf: (word: string) => DisplayState;
  /** Where the word's state is stored: its root, or itself if counted separately. */
  headwordOf: (word: string) => string;
  /** The root by form alone (merupakan → rupa), whatever the grouping. */
  rootOf: (word: string) => string;
  /** The user's override for this form, if any. */
  linkOf: (word: string) => "separate" | "group" | undefined;
  cardFor: (word: string) => CardMatch | undefined;
  /** The user's card for several words ("bulan madu"), if any. */
  cardForPhrase: (text: string) => CardMatch | undefined;
  /** Phrases on the user's cards, to underline in the text. */
  savedPhrases: SavedPhrases;
  isName: (word: string) => boolean;
}

/** Longer card fronts are sentences, not phrases to find in the text. */
const MAX_PHRASE_WORDS = 6;

export function textBlocks(content: string) {
  return content.split(/\n\s*\n/).map((b) => splitWords(b, pack));
}

export function useLexicon(content: string | undefined): ReaderLexicon {
  const [lex, setLex] = useState<Lemmatizer | null>(null);
  const [error, setError] = useState(false);
  // Live, so a card that matures in review counts as known straight away.
  const cardRows = useLiveQuery(() => getUserCardIndex(), []);
  const cards = useMemo(
    () => cardRows ?? new Map<string, CardMatch>(),
    [cardRows]
  );
  const vocab = useLiveQuery(() => db.words.toArray(), []);
  const linkRows = useLiveQuery(() => db.wordLinks.toArray(), []);
  const links = useMemo(
    () => new Map((linkRows ?? []).map((l) => [l.form, l.mode])),
    [linkRows]
  );

  useEffect(() => {
    loadGrammar()
      .then((g) => setLex(g.lex))
      .catch(() => setError(true));
  }, []);

  const known = useMemo(
    () => new Map((vocab ?? []).map((v) => [v.text, v.state])),
    [vocab]
  );

  // Exact spellings recorded on an entry (the forms marked together with it).
  // Earlier versions grouped meN- and other forms under their root; this keeps
  // the forms the user actually marked at the state they marked them.
  const formStates = useMemo(() => {
    const map = new Map<string, WordState>();
    for (const v of vocab ?? []) {
      for (const form of v.forms ?? []) {
        if (!map.has(form)) map.set(form, v.state);
      }
    }
    return map;
  }, [vocab]);

  // Flashcards are indexed by the word on the card and, once the lemmatizer
  // is ready, by its headword too, so a card for "beli" matches "membeli".
  const cardIndex = useMemo(() => {
    if (!lex) return cards;
    const index = new Map(cards);
    for (const [key, card] of cards) {
      if (!key.includes(" ")) {
        const headword = lex.lemma(key);
        if (!index.has(headword)) index.set(headword, card);
      }
    }
    return index;
  }, [cards, lex]);

  const phraseCards = useMemo(() => {
    const map = new Map<string, CardMatch>();
    for (const [key, card] of cards) {
      const phrase = phraseKey(key);
      if (phrase.includes(" ") && !map.has(phrase)) map.set(phrase, card);
    }
    return map;
  }, [cards]);

  const savedPhrases = useMemo(() => {
    const keys = new Set<string>();
    let maxWords = 0;
    for (const key of phraseCards.keys()) {
      const words = key.split(" ").length;
      if (words > MAX_PHRASE_WORDS) continue;
      keys.add(key);
      maxWords = Math.max(maxWords, words);
    }
    return { keys, maxWords };
  }, [phraseCards]);

  const cardForPhrase = useCallback(
    (text: string) =>
      phraseCards.get(phraseInSet(phraseCards, phraseKey(text)) ?? ""),
    [phraseCards]
  );

  const names = useMemo(
    () =>
      lex && content ? findNames(textBlocks(content), lex) : new Set<string>(),
    [lex, content]
  );

  const headwordOf = useCallback(
    (word: string) => {
      const surface = fold(word);
      if (!lex) return surface;
      const link = links.get(surface);
      if (link === "separate") return surface;
      if (link === "group") return lex.looseLemma(word);
      return lex.lemma(word);
    },
    [lex, links]
  );

  const rootOf = useCallback(
    (word: string) => (lex ? lex.looseLemma(word) : fold(word)),
    [lex]
  );

  const linkOf = useCallback((word: string) => links.get(fold(word)), [links]);

  const isName = useCallback(
    (word: string) => isNameToken(word, names),
    [names]
  );

  const stateOf = useCallback(
    (word: string): DisplayState => {
      if (isNameToken(word, names)) return "name";
      const surface = fold(word);
      const headword = headwordOf(word);
      // The headword's state wins; an entry saved under the form itself, or a
      // spelling recorded on another entry, is the fallback.
      const explicit =
        known.get(headword) ?? known.get(surface) ?? formStates.get(surface);
      const card = cardIndex.get(surface) ?? cardIndex.get(headword);
      // A word learned through flashcards is known, whatever level it was
      // given while reading (unless the reader said to ignore it).
      if (card?.mature && explicit !== "ignored") return "known";
      if (explicit) return explicit;
      if (card) return "level2";
      return "new";
    },
    [names, headwordOf, known, formStates, cardIndex]
  );

  // A card for the word itself, its headword, or (for the panel only) a
  // related root: reading "membeli" shows your card for "beli".
  const cardFor = useCallback(
    (word: string) =>
      cardIndex.get(fold(word)) ??
      (lex
        ? (cardIndex.get(headwordOf(word)) ??
          cardIndex.get(lex.looseLemma(word)))
        : undefined),
    [cardIndex, lex, headwordOf]
  );

  return {
    lex,
    error,
    names,
    stateOf,
    headwordOf,
    rootOf,
    linkOf,
    cardFor,
    cardForPhrase,
    savedPhrases,
    isName,
  };
}
