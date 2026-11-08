// The reading screen. Word lookup follows Lector's read page (heuwels/lector,
// AGPL-3.0-only: src/app/read/[bookId]/page.tsx handleWordClick,
// saveWordToVocab, markAsKnown): tap a word → count a lookup, speak it, look it
// up → set its state or save it.
//
// New here: lessons are split into pages you swipe through, word states are
// stored per headword (membeli/dibeli → beli), moving forward offers to mark
// the page's untouched words as known, as LingQ does, and several words next
// to each other can be picked as one phrase to make a card ("bulan madu").
//
// A video lesson reads the same way, a scene at a time: the video plays above
// the scene's words (../watch/ScenePlayer.tsx) and stops at its end; turning
// the page plays the next scene.
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
import {
  loadGrammar,
  lookupPhrase,
  lookupWord,
  resolvePhrase,
} from "@/lector/dictionary";
import {
  type CardMatch,
  addWordAsCard,
  getLastDeckId,
} from "@/lector/flashcards";
import { id as pack } from "@/lector/languages/id/manifest";
import { countTypedWords } from "@/lector/languages/tokenizer";
import { fold } from "@/lector/lemma";
import ReaderArticle, {
  type ActiveReaderWord,
  ReaderTitle,
  findSentence,
} from "@/lector/reader/ReaderArticle";
import { paginate } from "@/lector/reader/paginate";
import {
  type BlockWords,
  type WordPlace,
  type WordRange,
  blockWords,
  grow,
  phraseAround,
  phraseInBlock,
  phraseInSet,
  phraseText,
  selectedPhrase,
  withoutClitic,
  wordCellAt,
} from "@/lector/reader/phrase";
import { useLexicon } from "@/lector/reader/useLexicon";
import { splitWords } from "@/lector/reader/utils";
import { speak } from "@/lector/tts";
import type { Lesson, WordState } from "@/lector/types";
import { sceneMarkdown } from "@/lector/video/scenes";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { useGlobalScheduler } from "@/logic/card/CardScheduler";
import { useFamiliarRange } from "@/logic/card/known";
import { knownWordCard, markNoteKnown } from "@/logic/card/markKnown";
import { db } from "@/logic/db";
import { useTopLevelDecks } from "@/logic/deck/hooks/useTopLevelDecks";
import { useDictionaryChoice } from "@/logic/settings/dictionaryOptions";
import {
  IconBook,
  IconChevronLeft,
  IconChevronRight,
  IconLanguage,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import ScenePlayer, { type PlayerControls } from "../watch/ScenePlayer";
import MarkKnownSheet, { type PageWord } from "./MarkKnownSheet";
import WordPanel, {
  firstGloss,
  type PhrasePanelData,
  type PhraseTools,
  type WordPanelData,
} from "./WordPanel";
import "./reading.css";

const AUTO_MARK_KEY = "kartu-mark-known";
const TRANSLATION_KEY = "kartu.video.english";
const SWIPE_MIN_PX = 50;
/** The most words a dictionary phrase offered for a tapped word has. */
const DICTIONARY_PHRASE_WORDS = 5;

/** The tapped word's block, and the words picked in it. */
interface Picked extends WordRange {
  blockId: number;
  /** The tapped word. */
  origin: number;
  block: BlockWords;
  sentence: string;
  /** A phrase the tapped word is part of; `title` is its card's front. */
  suggestion?: WordRange & { gloss: string; title?: string; onCard: boolean };
}

const CLITIC_FORM = new RegExp(
  `^(${(pack.morphology?.clitics ?? []).join("|")}) form of$`
);

/** "Bulan madu" → "bulan madu", unless it starts with a name. */
function cardFront(text: string, startsWithName: boolean) {
  const first = text.split(" ")[0];
  if (startsWithName || first.slice(1) !== first.slice(1).toLowerCase()) {
    return text;
  }
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function getAutoMark() {
  try {
    return localStorage.getItem(AUTO_MARK_KEY) === "always";
  } catch {
    return false;
  }
}

function getShowEnglish() {
  try {
    return localStorage.getItem(TRANSLATION_KEY) === "shown";
  } catch {
    return false;
  }
}

function setShowEnglish(shown: boolean) {
  try {
    localStorage.setItem(TRANSLATION_KEY, shown ? "shown" : "hidden");
  } catch {
    // A convenience only.
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

function cardTitle(card: CardMatch | undefined) {
  return { gloss: card?.back ?? "", title: card?.front };
}

function wordAt(picked: Picked, index: number | undefined) {
  return index === undefined ? undefined : picked.block.words[index];
}

export default function ReaderView() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [panel, setPanel] = useState<WordPanelData | null>(null);
  const [activeWord, setActiveWord] = useState<ActiveReaderWord | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [phrase, setPhrase] = useState<PhrasePanelData | null>(null);
  const [prompt, setPrompt] = useState<PageWord[] | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [markedThisLesson, setMarkedThisLesson] = useState(0);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const [decks] = useTopLevelDecks();
  const lexicon = useLexicon(lesson?.content);
  useDocumentTitle(lesson?.title ?? "Reading");

  const video = lesson?.video;
  const pages = useMemo(() => {
    if (lesson?.video)
      return lesson.video.scenes.map((s) => sceneMarkdown(s.text));
    return lesson ? paginate(lesson.content) : [""];
  }, [lesson]);
  const player = useRef<PlayerControls | null>(null);
  /** Changes when a page turn should play the scene. */
  const [playToken, setPlayToken] = useState(0);
  const [showEnglish, setEnglish] = useState(getShowEnglish);
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

  const dictionary = useDictionaryChoice();
  const scheduler = useGlobalScheduler();
  const familiarRange = useFamiliarRange(scheduler.p.maximum_interval);
  const onWordClick = useCallback(
    async (
      word: string,
      sentence: string,
      place: WordPlace,
      { quiet = false } = {}
    ) => {
      player.current?.pause();
      if (!quiet) speak(word);
      incrementDailyStat("dictionaryLookups");
      const block = blockWords(place.parts);
      const at = place.wordIndex;
      const onCard = phraseAround(
        block,
        at,
        (key) => phraseInSet(lexicon.savedPhrases.keys, key) !== undefined,
        lexicon.savedPhrases.maxWords
      );
      setPicked({
        blockId: place.blockId,
        origin: at,
        from: at,
        to: at,
        block,
        sentence,
        suggestion: onCard
          ? {
              ...onCard,
              ...cardTitle(lexicon.cardForPhrase(phraseText(block, onCard))),
              onCard: true,
            }
          : undefined,
      });
      setPhrase(null);
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
        const entry = await lookupWord(word, dictionary.lookup);
        setPanel((p) => (p && p.word === word ? { ...p, entry } : p));
        if (onCard) return;
        // A phrase in the dictionary the word is part of ("bulan" in
        // "bulan madu").
        const { data } = await loadGrammar();
        const found = (key: string) =>
          !!resolvePhrase(data, key, dictionary.lookup);
        const inDictionary = phraseAround(
          block,
          at,
          found,
          DICTIONARY_PHRASE_WORDS
        );
        if (!inDictionary) return;
        const gloss = firstGloss(
          resolvePhrase(
            data,
            phraseText(block, inDictionary),
            dictionary.lookup
          )
        );
        setPicked((p) =>
          p && p.block === block
            ? { ...p, suggestion: { ...inDictionary, gloss, onCard: false } }
            : p
        );
      } catch {
        setPanel((p) => (p && p.word === word ? { ...p, entry: "error" } : p));
      }
    },
    [lexicon, dictionary.lookup]
  );

  /** Show the picked words as one phrase, and look it up. */
  const pickPhrase = useCallback(
    async (range: WordRange, { quiet = false } = {}) => {
      if (!picked) return;
      const text = phraseText(picked.block, range);
      setPicked({ ...picked, ...range });
      setActiveWord({
        blockId: picked.blockId,
        wordIndex: range.from,
        endIndex: range.to,
      });
      if (range.from === range.to) {
        setPhrase(null);
        return;
      }
      if (!quiet) speak(text);
      setPhrase({
        text,
        sentence: picked.sentence,
        entry: "loading",
        card: lexicon.cardForPhrase(text),
        // "pelat besinya": the card is for "pelat besi".
        withoutEnding: withoutClitic(
          text,
          (word, stem) => lexicon.headwordOf(word) === fold(stem)
        ),
      });
      const update = (change: Partial<PhrasePanelData>) =>
        setPhrase((p) => (p && p.text === text ? { ...p, ...change } : p));
      try {
        const entry = await lookupPhrase(text, dictionary.lookup);
        const info = entry?.lemmaInfo;
        update({
          entry,
          // "bulan madunya" is in the dictionary as a form of "bulan madu".
          ...(info && CLITIC_FORM.test(info.label)
            ? { withoutEnding: info.stem }
            : {}),
        });
        if (entry) return;
        const words = picked.block.words.slice(range.from, range.to + 1);
        const glosses = await Promise.all(
          words.map(async (word) => ({
            word,
            gloss: firstGloss(await lookupWord(word, dictionary.lookup)),
          }))
        );
        update({ glosses });
      } catch {
        update({ entry: "error" });
      }
    },
    [picked, lexicon, dictionary.lookup]
  );

  // Desktop: dragging from one word to another picks them as a phrase. The
  // block is kept by its id: highlighting the words re-renders the blocks.
  const drag = useRef<{ blockId: number; start: number; end: number } | null>(
    null
  );

  const openDragged = (found: ReturnType<typeof phraseInBlock>) => {
    const block = blockWords(found.parts);
    onWordClick(
      block.words[found.range.from],
      findSentence(found.first),
      {
        blockId: found.blockId,
        wordIndex: found.range.from,
        parts: found.parts,
      },
      { quiet: true }
    );
    setPendingRange(found.range);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = null;
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const at = wordCellAt(e.target);
    if (!at) return;
    const blockId = Number(at.block.dataset.blockId);
    drag.current = { blockId, start: at.index, end: at.index };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const current = drag.current;
    if (!current || e.pointerType !== "mouse") return;
    const at = wordCellAt(e.target);
    if (!at || Number(at.block.dataset.blockId) !== current.blockId) return;
    if (at.index === current.end) return;
    current.end = at.index;
    setActiveWord({
      blockId: current.blockId,
      wordIndex: Math.min(current.start, current.end),
      endIndex: Math.max(current.start, current.end),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const current = drag.current;
    drag.current = null;
    if (e.pointerType !== "mouse") return;
    const block =
      current &&
      current.end !== current.start &&
      (e.currentTarget as HTMLElement).querySelector<HTMLElement>(
        `[data-block-id="${current.blockId}"]`
      );
    if (current && block) {
      openDragged(phraseInBlock(block, current.start, current.end));
      return;
    }
    // A selection begun between words.
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const found = selectedPhrase(selection.getRangeAt(0));
    if (!found) return;
    selection.removeAllRanges();
    openDragged(found);
  };

  // The phrase picked by dragging, once the first word's panel is set up.
  const [pendingRange, setPendingRange] = useState<WordRange | null>(null);
  useEffect(() => {
    if (!pendingRange || !picked) return;
    setPendingRange(null);
    pickPhrase(pendingRange);
  }, [pendingRange, picked, pickPhrase]);

  const phraseTools: PhraseTools | null = picked
    ? {
        before: wordAt(picked, grow(picked.block, picked, "before")?.from),
        after: wordAt(picked, grow(picked.block, picked, "after")?.to),
        suggestion: picked.suggestion && {
          text:
            picked.suggestion.title ??
            phraseText(picked.block, picked.suggestion),
          gloss: picked.suggestion.gloss,
          onCard: picked.suggestion.onCard,
        },
        onGrow: (side) => {
          const range = grow(picked.block, picked, side);
          if (range) pickPhrase(range);
        },
        onOpenSuggestion: () => {
          if (picked.suggestion) pickPhrase(picked.suggestion);
        },
        onReset: () =>
          pickPhrase(
            { from: picked.origin, to: picked.origin },
            { quiet: true }
          ),
      }
    : null;

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
    setPhrase(null);
    setPicked(null);
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
    // Its flashcard goes the same way: familiar comes back once for a
    // check. Known: a card never reviewed (added, then found to be known) is
    // deleted; one already studied is kept, marked known, never to come back.
    if (state === "familiar" && panel.card) {
      await markNoteKnown(panel.card.noteId, scheduler, familiarRange, state);
    }
    if (state === "known" && panel.card) {
      const done = await knownWordCard(
        panel.card.noteId,
        scheduler,
        familiarRange
      );
      if (done === "deleted") {
        notify(
          "Card removed",
          `“${panel.card.front}” is known, so its new flashcard was deleted.`,
          "info"
        );
      }
    }
    if (state === "known" || state === "familiar" || state === "ignored") {
      closePanel();
    }
  };

  const addPhraseCard = async (
    shown: PhrasePanelData,
    translation: string,
    deckId: string | null,
    chosen?: string
  ) => {
    const first = shown.text.split(" ")[0];
    // The panel's choice: the bare words (pelat besi) unless the ending is kept.
    const front = cardFront(
      chosen ?? shown.withoutEnding ?? shown.text,
      lexicon.isName(first)
    );
    const { deckName } = await addWordAsCard({
      word: front,
      translation,
      sentence: shown.sentence,
      deckId,
    });
    notify("Card added", `“${front}” added to ${deckName}.`, "success");
    closePanel();
  };

  const addCard = async (
    translation: string,
    deckId: string | null,
    front?: string
  ) => {
    if (phrase) return addPhraseCard(phrase, translation, deckId, front);
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
      // The title is on the first page too.
      const title =
        index === 0 && !lesson?.video ? `${lesson?.title ?? ""}\n` : "";
      const text = `${title}${pages[index] ?? ""}`;
      for (const token of splitWords(text, pack)) {
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
    [pages, lexicon, lesson?.title, lesson?.video]
  );

  const goTo = (index: number, dir: "next" | "prev") => {
    closePanel();
    setDirection(dir);
    setPage(index);
    if (lessonId) saveLessonPage(lessonId, index, pages.length);
    if (video) setPlayToken((n) => n + 1);
    scrollToTop();
  };

  /** The video played on into another scene: its words follow, nothing is marked. */
  const followVideo = (index: number) => {
    if (index === page) return;
    closePanel();
    setPrompt(null);
    setDirection(index > page ? "next" : "prev");
    setPage(index);
    if (lessonId) saveLessonPage(lessonId, index, pages.length);
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

  // Keyboard: ← and → turn pages when no dialog is open; in a video, space
  // plays and pauses, R repeats the scene, 2 and 5 go back that many seconds.
  // biome-ignore lint/correctness/useExhaustiveDependencies: handlers read current state
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel || prompt || finished) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (!video || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " && !target?.closest("button, a, .word-cell")) {
        e.preventDefault();
        player.current?.toggle();
      }
      if (e.key === "r" || e.key === "R") player.current?.repeat();
      if (e.key === "2") player.current?.back(2);
      if (e.key === "5") player.current?.back(5);
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
            video
              ? { label: "Watch", path: "/watch" }
              : { label: "Read", path: "/read" },
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
                onClick={() =>
                  navigate(
                    `${video ? "/watch" : "/read"}/${finished.nextLessonId}`
                  )
                }
              >
                {video ? "Next video" : "Next lesson"}
              </Button>
            )}
            <Button onClick={() => navigate("/read/known")}>Known words</Button>
            <Button
              variant="ghost"
              onClick={() => navigate(video ? "/watch" : "/read")}
            >
              {video ? "Videos" : "Library"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFinished(null);
                goTo(0, "prev");
              }}
            >
              {video ? "Watch again" : "Read again"}
            </Button>
          </Group>
        </div>
      ) : (
        <div
          className="reading-view"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {lesson && (
            <>
              {video && (
                <>
                  <ScenePlayer
                    videoId={video.id}
                    scenes={video.scenes}
                    index={Math.min(page, video.scenes.length - 1)}
                    playToken={playToken}
                    onSceneChange={followVideo}
                    controls={player}
                  />
                  <h1 className="video-heading">{lesson.title}</h1>
                  {video.channel && (
                    <p className="video-channel">{video.channel}</p>
                  )}
                </>
              )}
              {page === 0 && !video && (
                <>
                  <div lang="id">
                    <ReaderTitle
                      title={lesson.title}
                      className="reading-view__title"
                      stateOf={lexicon.stateOf}
                      activeWord={activeWord}
                      savedPhrases={lexicon.savedPhrases}
                      knownPhrases={lexicon.knownPhrases}
                      onWordClick={onWordClick}
                      onActivateWord={setActiveWord}
                    />
                  </div>
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
                  savedPhrases={lexicon.savedPhrases}
                  knownPhrases={lexicon.knownPhrases}
                  onWordClick={onWordClick}
                  onActivateWord={setActiveWord}
                />
                {video?.scenes[page]?.translation && (
                  <div className="scene-translation">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftSection={<IconLanguage size={16} />}
                      onClick={() => {
                        setEnglish(!showEnglish);
                        setShowEnglish(!showEnglish);
                      }}
                      aria-expanded={showEnglish}
                    >
                      {showEnglish ? "Hide English" : "Show English"}
                    </Button>
                    {showEnglish && (
                      <p className="scene-translation__text" lang="en">
                        {video.scenes[page].translation}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <nav className="reading-view__pager" aria-label="Pages">
                <Button
                  variant="default"
                  onClick={prev}
                  disabled={page === 0}
                  aria-label={video ? "Previous scene" : "Previous page"}
                >
                  <IconChevronLeft size={18} />
                </Button>
                <span className="reading-view__page-number">
                  {`${video ? "Scene " : ""}${page + 1} / ${pages.length}`}
                </span>
                <Button
                  variant="primary"
                  onClick={next}
                  aria-label={
                    isLastPage ? "Finish" : video ? "Next scene" : "Next page"
                  }
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
        phrase={phrase}
        phraseTools={phraseTools}
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
        unit={video ? "scene" : "page"}
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
