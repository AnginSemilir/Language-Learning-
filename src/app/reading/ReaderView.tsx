// The reading screen. Flow follows Lector's read page (heuwels/lector,
// AGPL-3.0-only: src/app/read/[bookId]/page.tsx handleWordClick, saveWordToVocab,
// markAsKnown): tap a word → count a lookup, speak it, look it up → set its
// state or save it. Lector's AI gloss fallback and Anki export are not ported.
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import EmptyNotice from "@/components/EmptyNotice";
import { notify } from "@/components/Notification";
import {
  getKnownWordsMap,
  getLesson,
  incrementDailyStat,
  saveVocab,
  touchLesson,
  updateWordState,
  vocabKey,
} from "@/lector/data-layer";
import { lookupWord } from "@/lector/dictionary";
import {
  addWordAsCard,
  getLastDeckId,
  getUserCardIndex,
} from "@/lector/flashcards";
import ReaderArticle, {
  type ActiveReaderWord,
} from "@/lector/reader/ReaderArticle";
import { speak } from "@/lector/tts";
import type { Lesson, WordState } from "@/lector/types";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { useTopLevelDecks } from "@/logic/deck/hooks/useTopLevelDecks";
import { IconBook } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import WordPanel, { type WordPanelData } from "./WordPanel";
import "./reading.css";

export default function ReaderView() {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [known, setKnown] = useState<Map<string, WordState>>(new Map());
  const [panel, setPanel] = useState<WordPanelData | null>(null);
  const [activeWord, setActiveWord] = useState<ActiveReaderWord | null>(null);
  const [decks] = useTopLevelDecks();
  useDocumentTitle(lesson?.title ?? "Reading");

  useEffect(() => {
    if (!lessonId) return;
    getLesson(lessonId).then((l) => setLesson(l ?? null));
    touchLesson(lessonId);
    // Words already in the user's flashcards show as "learning" (level 2)
    // unless the reader has an explicit state for them.
    Promise.all([getKnownWordsMap(), getUserCardIndex()]).then(
      ([vocab, cards]) => {
        const merged = new Map(vocab);
        for (const key of cards.keys()) {
          if (!merged.has(key)) merged.set(key, "level2");
        }
        setKnown(merged);
      }
    );
  }, [lessonId]);

  const onWordClick = useCallback(
    async (word: string, sentence: string) => {
      speak(word);
      incrementDailyStat("dictionaryLookups");
      const key = vocabKey(word);
      const [cards] = await Promise.all([getUserCardIndex()]);
      setPanel({
        word,
        sentence,
        state: known.get(key) ?? "new",
        entry: "loading",
        card: cards.get(key),
      });
      try {
        const entry = await lookupWord(word);
        setPanel((p) => (p && p.word === word ? { ...p, entry } : p));
      } catch {
        setPanel((p) => (p && p.word === word ? { ...p, entry: "error" } : p));
      }
    },
    [known]
  );

  const setState = async (state: WordState) => {
    if (!panel) return;
    const key = vocabKey(panel.word);
    const prev = known.get(key);
    setKnown(new Map(known).set(key, state));
    setPanel({ ...panel, state });
    const entry = panel.entry;
    const translation =
      panel.card?.back ??
      (entry && typeof entry === "object"
        ? (entry.senses[0]?.gloss ?? "")
        : "");
    if (!prev || prev === "new") {
      await saveVocab({
        text: panel.word,
        type: "word",
        sentence: panel.sentence,
        translation,
        state,
        reviewCount: 0,
        lessonId,
      });
      incrementDailyStat("newWordsSaved");
    } else {
      await updateWordState(panel.word, state);
    }
    if (state === "known") incrementDailyStat("wordsMarkedKnown");
    if (state === "known" || state === "ignored") {
      setPanel(null);
      setActiveWord(null);
    }
  };

  const addCard = async (translation: string, deckId: string | null) => {
    if (!panel) return;
    const { noteId, deckName } = await addWordAsCard({
      word: panel.word,
      translation,
      sentence: panel.sentence,
      deckId,
    });
    const key = vocabKey(panel.word);
    const state = known.get(key);
    const nextState = !state || state === "new" ? "level1" : state;
    await saveVocab({
      text: panel.word,
      type: "word",
      sentence: panel.sentence,
      translation,
      state: nextState,
      reviewCount: 0,
      lessonId,
      noteId,
    });
    if (!state || state === "new") incrementDailyStat("newWordsSaved");
    setKnown(new Map(known).set(key, nextState));
    notify("Card added", `“${panel.word}” added to ${deckName}.`, "success");
    setPanel(null);
    setActiveWord(null);
  };

  if (lesson === null) {
    return (
      <EmptyNotice
        icon={IconBook}
        title="Text not found"
        description="It may have been deleted."
      />
    );
  }

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs
          segments={[
            { label: "Read", path: "/read" },
            { label: lesson?.title ?? "…" },
          ]}
        />
      </AppHeaderContent>
      <div className="reading-view">
        {lesson && (
          <>
            <h1 className="reading-view__title">{lesson.title}</h1>
            {lesson.author && (
              <p className="reading-view__author">{lesson.author}</p>
            )}
            <ReaderArticle
              content={lesson.content}
              knownWordsMap={known}
              activeWord={activeWord}
              onWordClick={onWordClick}
              onActivateWord={setActiveWord}
            />
          </>
        )}
      </div>
      <WordPanel
        data={panel}
        decks={decks ?? []}
        defaultDeckId={getLastDeckId()}
        onClose={() => {
          setPanel(null);
          setActiveWord(null);
        }}
        onSetState={setState}
        onAddCard={addCard}
      />
    </>
  );
}
