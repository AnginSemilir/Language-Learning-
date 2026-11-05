// Everything the reader needs to colour words: the grammar-aware lemmatizer,
// the user's word states (live from IndexedDB), their flashcards, and the
// names used in the current text.

import { db } from "@/logic/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadGrammar } from "../dictionary";
import { type CardMatch, getUserCardIndex } from "../flashcards";
import { id as pack } from "../languages/id/manifest";
import { type Lemmatizer, findNames, fold, isNameToken } from "../lemma";
import type { WordState } from "../types";
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
  isName: (word: string) => boolean;
}

export function textBlocks(content: string) {
  return content.split(/\n\s*\n/).map((b) => splitWords(b, pack));
}

export function useLexicon(content: string | undefined): ReaderLexicon {
  const [lex, setLex] = useState<Lemmatizer | null>(null);
  const [error, setError] = useState(false);
  const [cards, setCards] = useState<Map<string, CardMatch>>(new Map());
  const vocab = useLiveQuery(() => db.vocab.toArray(), []);
  const linkRows = useLiveQuery(() => db.wordLinks.toArray(), []);
  const links = useMemo(
    () => new Map((linkRows ?? []).map((l) => [l.form, l.mode])),
    [linkRows]
  );

  useEffect(() => {
    loadGrammar()
      .then((g) => setLex(g.lex))
      .catch(() => setError(true));
    getUserCardIndex().then(setCards);
  }, []);

  const known = useMemo(
    () => new Map((vocab ?? []).map((v) => [v.text, v.state])),
    [vocab]
  );

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
      // The headword's state wins; an entry saved under the form itself (by an
      // older version, or before the user grouped it) is the fallback.
      const state = known.get(headword) ?? known.get(surface);
      if (state) return state;
      if (cardIndex.has(surface) || cardIndex.has(headword)) return "level2";
      return "new";
    },
    [names, headwordOf, known, cardIndex]
  );

  const cardFor = useCallback(
    (word: string) =>
      cardIndex.get(fold(word)) ??
      (lex ? cardIndex.get(lex.lemma(word)) : undefined),
    [cardIndex, lex]
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
    isName,
  };
}
