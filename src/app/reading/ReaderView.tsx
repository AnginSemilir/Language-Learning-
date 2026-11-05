// The reading screen. Word lookup follows Lector's read page (heuwels/lector,
// AGPL-3.0-only: src/app/read/[bookId]/page.tsx handleWordClick,
// saveWordToVocab, markAsKnown): tap a word → count a lookup, speak it, look it
// up → set its state or save it.
//
// New here: lessons are split into pages you swipe through, word states are
// stored per headword (membeli/dibeli → beli), and moving forward offers to
// mark the page's untouched words as known, as LingQ does.
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import EmptyNotice from "@/components/EmptyNotice";
import { notify } from "@/components/Notification";
import { Button, Group, Text } from "@/components/ui";
import {
  getLesson,
  incrementDailyStat,
  markHeadwordsKnown,
  saveLessonPage,
  setHeadwordState,
  setWordLink,
  touchLesson,
} from "@/lector/data-layer";
import { loadGrammar, lookupWord } from "@/lector/dictionary";
import { addWordAsCard, getLastDeckId } from "@/lector/flashcards";
import { id as pack } from "@/lector/languages/id/manifest";
import { countTypedWords } from "@/lector/languages/tokenizer";
import { fold } from "@/lector/lemma";
import ReaderArticle, {
  type ActiveReaderWord,
} from "@/lector/reader/ReaderArticle";
import { paginate } from "@/lector/reader/paginate";
import { useLexicon } from "@/lector/reader/useLexicon";
import { splitWords } from "@/lector/reader/utils";
import { speak } from "@/lector/tts";
import type { Lesson, WordState } from "@/lector/types";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { db } from "@/logic/db";
import { useTopLevelDecks } from "@/logic/deck/hooks/useTopLevelDecks";
import {
  IconBook,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import MarkKnownSheet, { type PageWord } from "./MarkKnownSheet";
import WordPanel, { type WordPanelData } from "./WordPanel";
import "./reading.css";

const AUTO_MARK_KEY = "kartu-mark-known";
const SWIPE_MIN_PX = 50;

function getAutoMark() {
  try {
    return localStorage.getItem(AUTO_MARK_KEY) === "always";
  } catch {
    return false;
  }
}

function setAutoMark(always: boolean) {
  try {
    localStorage.setItem(AUTO_MARK_KEY, always ? "always" : "ask");
  } catch {
    // A convenience only.
  }
}

/** The app shell scrolls its main area, not the window. */
function scrollToTop() {
  document.querySelector(".app-shell__main-content")?.scrollTo({ top: 0 });
}

interface Finished {
  markedKnown: number;
  nextLessonId?: string;
}

export default function ReaderView() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [panel, setPanel] = useState<WordPanelData | null>(null);
  const [activeWord, setActiveWord] = useState<ActiveReaderWord | null>(null);
  const [prompt, setPrompt] = useState<PageWord[] | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [markedThisLesson, setMarkedThisLesson] = useState(0);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const [decks] = useTopLevelDecks();
  const lexicon = useLexicon(lesson?.content);
  useDocumentTitle(lesson?.title ?? "Reading");

  const pages = useMemo(
    () => (lesson ? paginate(lesson.content) : [""]),
    [lesson]
  );
  const isLastPage = page >= pages.length - 1;

  useEffect(() => {
    if (!lessonId) return;
    setFinished(null);
    setMarkedThisLesson(0);
    getLesson(lessonId).then((l) => {
      setLesson(l ?? null);
      const saved = l?.lastPage ?? 0;
      setPage(l?.finishedAt ? 0 : saved);
    });
    touchLesson(lessonId);
  }, [lessonId]);

  // ── Word panel ──────────────────────────────────────────────────────────

  const onWordClick = useCallback(
    async (word: string, sentence: string) => {
      speak(word);
      incrementDailyStat("dictionaryLookups");
      const headword = lexicon.headwordOf(word);
      const state = lexicon.stateOf(word);
      setPanel({
        word,
        sentence,
        headword,
        root: lexicon.rootOf(word),
        link: lexicon.linkOf(word),
        derivedFrom: lexicon.lex?.derivedFrom(word),
        isName: state === "name",
        state: state === "name" ? "new" : state,
        entry: "loading",
        card: lexicon.cardFor(word),
      });
      try {
        const entry = await lookupWord(word);
        setPanel((p) => (p && p.word === word ? { ...p, entry } : p));
      } catch {
        setPanel((p) => (p && p.word === word ? { ...p, entry: "error" } : p));
      }
    },
    [lexicon]
  );

  // Keep the open panel in step with grouping and state changes.
  const { stateOf, headwordOf, linkOf } = lexicon;
  useEffect(() => {
    setPanel((p) => {
      if (!p) return p;
      const display = stateOf(p.word);
      const state = display === "name" ? "new" : display;
      const headword = headwordOf(p.word);
      const link = linkOf(p.word);
      if (p.state === state && p.headword === headword && p.link === link) {
        return p;
      }
      return { ...p, state, headword, link };
    });
  }, [stateOf, headwordOf, linkOf]);

  const setGrouping = async (mode: "separate" | "group") => {
    if (!panel) return;
    await setWordLink(panel.word, mode, panel.root);
  };

  const closePanel = () => {
    setPanel(null);
    setActiveWord(null);
  };

  const panelTranslation = (p: WordPanelData) =>
    p.card?.back ??
    (p.entry && typeof p.entry === "object"
      ? (p.entry.senses[0]?.gloss ?? "")
      : "");

  const setState = async (state: WordState) => {
    if (!panel) return;
    const previous = lexicon.stateOf(panel.word);
    setPanel({ ...panel, state });
    await setHeadwordState(panel.headword, {
      state,
      form: panel.word,
      sentence: panel.sentence,
      translation: panelTranslation(panel),
      lessonId,
    });
    if (previous === "new" || previous === "name") {
      incrementDailyStat("newWordsSaved");
    }
    if (state === "known") incrementDailyStat("wordsMarkedKnown");
    if (state === "known" || state === "ignored") closePanel();
  };

  const addCard = async (translation: string, deckId: string | null) => {
    if (!panel) return;
    const { noteId, deckName } = await addWordAsCard({
      word: panel.word,
      translation,
      sentence: panel.sentence,
      deckId,
    });
    const previous = lexicon.stateOf(panel.word);
    const fresh = previous === "new" || previous === "name";
    await setHeadwordState(panel.headword, {
      state: fresh ? "level1" : previous,
      form: panel.word,
      sentence: panel.sentence,
      translation,
      lessonId,
      noteId,
    });
    if (fresh) incrementDailyStat("newWordsSaved");
    notify("Card added", `“${panel.word}” added to ${deckName}.`, "success");
    closePanel();
  };

  // ── Pages ───────────────────────────────────────────────────────────────

  /** Untouched words on a page, as headwords with the spellings seen. */
  const newWordsOn = useCallback(
    (index: number): PageWord[] => {
      const byHeadword = new Map<string, Set<string>>();
      for (const token of splitWords(pages[index] ?? "", pack)) {
        if (!token.isWord || token.text.length < 2) continue;
        if (lexicon.stateOf(token.text) !== "new") continue;
        const headword = lexicon.headwordOf(token.text);
        const forms = byHeadword.get(headword) ?? new Set<string>();
        forms.add(fold(token.text));
        byHeadword.set(headword, forms);
      }
      return [...byHeadword].map(([headword, forms]) => ({
        headword,
        forms: [...forms],
      }));
    },
    [pages, lexicon]
  );

  const goTo = (index: number, dir: "next" | "prev") => {
    closePanel();
    setDirection(dir);
    setPage(index);
    if (lessonId) saveLessonPage(lessonId, index, pages.length);
    scrollToTop();
  };

  const finishLesson = async (markedNow: number) => {
    if (!lesson || !lessonId) return;
    await saveLessonPage(lessonId, pages.length - 1, pages.length);
    const siblings = await db.lessons
      .filter(
        (l) =>
          l.source === lesson.source &&
          (l.collection ?? "") === (lesson.collection ?? "")
      )
      .toArray();
    siblings.sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || +a.createdAt - +b.createdAt
    );
    const at = siblings.findIndex((l) => l.id === lessonId);
    setFinished({
      markedKnown: markedThisLesson + markedNow,
      nextLessonId: at >= 0 ? siblings[at + 1]?.id : undefined,
    });
    closePanel();
    scrollToTop();
  };

  const advance = (markedNow: number) => {
    incrementDailyStat("wordsRead", countTypedWords(pages[page] ?? "", pack));
    if (isLastPage) finishLesson(markedNow);
    else goTo(page + 1, "next");
  };

  const markAndAdvance = async (words: PageWord[]) => {
    await markHeadwordsKnown(words, lessonId);
    setMarkedThisLesson((n) => n + words.length);
    advance(words.length);
  };

  const next = () => {
    if (!lexicon.lex) {
      advance(0);
      return;
    }
    const words = newWordsOn(page);
    if (words.length === 0) {
      advance(0);
    } else if (getAutoMark()) {
      markAndAdvance(words);
      notify(
        "Marked known",
        `${words.length} word${words.length === 1 ? "" : "s"} marked known.`,
        "info",
        1500
      );
    } else {
      setPrompt(words);
    }
  };

  const prev = () => {
    if (page > 0) goTo(page - 1, "prev");
  };

  // Keyboard: ← and → turn pages when no dialog is open.
  // biome-ignore lint/correctness/useExhaustiveDependencies: handlers read current state
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel || prompt || finished) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Swipe: finger moving left = next page, right = previous page.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start || panel || prompt) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5)
      return;
    if (Date.now() - start.t > 800) return;
    if (dx < 0) next();
    else prev();
  };

  // Warm the dictionary as soon as the reader opens.
  useEffect(() => {
    loadGrammar().catch(() => {});
  }, []);

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

      {finished ? (
        <div className="reading-view reading-finished">
          <h1 className="reading-view__title">Finished: {lesson?.title}</h1>
          <Text>
            {finished.markedKnown > 0
              ? `${finished.markedKnown} new word${finished.markedKnown === 1 ? "" : "s"} marked as known.`
              : "No words were marked as known."}
          </Text>
          <Group gap="sm" wrap="wrap">
            {finished.nextLessonId && (
              <Button
                variant="primary"
                onClick={() => navigate(`/read/${finished.nextLessonId}`)}
              >
                Next lesson
              </Button>
            )}
            <Button onClick={() => navigate("/read/known")}>Known words</Button>
            <Button variant="ghost" onClick={() => navigate("/read")}>
              Library
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFinished(null);
                goTo(0, "prev");
              }}
            >
              Read again
            </Button>
          </Group>
        </div>
      ) : (
        <div
          className="reading-view"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {lesson && (
            <>
              {page === 0 && (
                <>
                  <h1 className="reading-view__title">{lesson.title}</h1>
                  {lesson.author && (
                    <p className="reading-view__author">{lesson.author}</p>
                  )}
                </>
              )}
              <div
                key={page}
                className={`reading-view__page reading-view__page--${direction}`}
              >
                <ReaderArticle
                  content={pages[page] ?? ""}
                  stateOf={lexicon.stateOf}
                  activeWord={activeWord}
                  onWordClick={onWordClick}
                  onActivateWord={setActiveWord}
                />
              </div>
              <nav className="reading-view__pager" aria-label="Pages">
                <Button
                  variant="default"
                  onClick={prev}
                  disabled={page === 0}
                  aria-label="Previous page"
                >
                  <IconChevronLeft size={18} />
                </Button>
                <span className="reading-view__page-number">
                  {page + 1} / {pages.length}
                </span>
                <Button
                  variant="primary"
                  onClick={next}
                  aria-label={isLastPage ? "Finish" : "Next page"}
                  rightSection={
                    isLastPage ? undefined : <IconChevronRight size={18} />
                  }
                >
                  {isLastPage ? "Finish" : "Next"}
                </Button>
              </nav>
            </>
          )}
        </div>
      )}

      <WordPanel
        data={panel}
        decks={decks ?? []}
        defaultDeckId={getLastDeckId()}
        onClose={closePanel}
        onSetState={setState}
        onSetGrouping={setGrouping}
        onAddCard={addCard}
      />
      <MarkKnownSheet
        words={prompt}
        isLastPage={isLastPage}
        onCancel={() => setPrompt(null)}
        onSkip={() => {
          setPrompt(null);
          advance(0);
        }}
        onConfirm={(words, always) => {
          setPrompt(null);
          if (always) setAutoMark(true);
          markAndAdvance(words);
        }}
      />
    </>
  );
}
