// Cloze practice on the words of your flashcards (see lector/cardCloze.ts).
// Round logic (useClozeRound), answer checking, hints, points and mastery are
// Lector's (heuwels/lector@eb393ce, AGPL-3.0-only: src/app/practice/page.tsx
// recordAnswer/handleHint, use-cloze-round.ts, utils.ts). The screen is
// rebuilt with Skola's components; Lector's dictation mode, onboarding and AI
// "Explain" are not ported.
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import {
  Button,
  Group,
  Kbd,
  Paper,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@/components/ui";
import {
  type CardClozeCounts,
  type CardClozeMode,
  type CardFilter,
  buildCardRound,
  countCardCloze,
  hideCardSentence,
} from "@/lector/cardCloze";
import { graphemeSplit } from "@/lector/languages/graphemes";
import { graphemeLength } from "@/lector/languages/graphemes";
import { id as pack } from "@/lector/languages/id/manifest";
import { ROUND_SIZES } from "@/lector/practice/constants";
import type { PracticeMode } from "@/lector/practice/types";
import { useClozeRound } from "@/lector/practice/use-cloze-round";
import {
  buildMultipleChoiceOptions,
  calculatePoints,
  checkAnswer,
  getFuzzyStatus,
  normalize,
} from "@/lector/practice/utils";
import { speak } from "@/lector/tts";
import type {
  ClozeMasteryLevel,
  ClozeSentence,
  ClozeSource,
} from "@/lector/types";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { useHotkeys } from "@/lib/hooks/useHotkeys";
import { useShowShortcutHints } from "@/logic/settings/hooks/useShowShortcutHints";
import { IconBulb, IconVolume } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeaderContent } from "../shell/Header/Header";
import "./PracticeView.css";

interface Feedback {
  isCorrect: boolean;
  correctWord: string;
  userAnswer: string;
  translation: string;
  sentence: string;
  points: number;
  newMastery: ClozeMasteryLevel;
  /** You typed the card's word; the sentence uses another form of it. */
  otherForm: boolean;
}

const SOURCE_LABEL: Partial<Record<ClozeSource, string>> = {
  tatoeba: "Tatoeba",
  wiktionary: "Wiktionary",
  leipzig: "Leipzig Corpora",
  card: "your card",
  reading: "your reading",
};

/** Right if it matches the word in the sentence, or the word as on your card. */
function isRight(answer: string, sentence: ClozeSentence) {
  if (checkAnswer(answer, sentence.clozeWord, pack)) return true;
  return !!sentence.cardWord && checkAnswer(answer, sentence.cardWord, pack);
}

const MASTERY_LABEL: Record<ClozeMasteryLevel, string> = {
  0: "new",
  25: "seen once",
  50: "getting there",
  75: "nearly",
  100: "mastered",
};

export default function PracticeView() {
  useDocumentTitle("Practice");
  const round = useClozeRound();
  const [counts, setCounts] = useState<CardClozeCounts | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<PracticeMode>("type");
  const [which, setWhich] = useState<CardClozeMode>("due");
  const [filter, setFilter] = useState<CardFilter>("studied");
  const [roundNote, setRoundNote] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [hintLetters, setHintLetters] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshCounts = useCallback(
    () =>
      countCardCloze(filter)
        .then(setCounts)
        .catch((e) => setLoadError(String(e.message ?? e))),
    [filter]
  );

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const current = round.current;
  const mc = useMemo(() => {
    if (!current || mode !== "mc") return null;
    return buildMultipleChoiceOptions(
      current.sentence.clozeWord,
      round.queue.length > 3
        ? round.queue
        : [...round.queue, ...round.retryQueue]
    );
  }, [current, mode, round.queue, round.retryQueue]);

  useEffect(() => {
    if (round.phase === "practicing") inputRef.current?.focus();
  }, [round.phase, current]);

  const start = async () => {
    round.beginRound(round.roundSize);
    setAnswer("");
    setHintLetters(0);
    setFeedback(null);
    setRoundNote(null);
    try {
      const built = await buildCardRound(which, filter, round.roundSize);
      round.startRound(built.sentences);
      const notes: string[] = [];
      if (built.skipped.length > 0) {
        notes.push(
          `No example sentences yet for ${built.skipped.length === 1 ? "1 word" : `${built.skipped.length} words`}: ${built.skipped.slice(0, 5).join(", ")}${built.skipped.length > 5 ? "…" : ""}.`
        );
      }
      if (built.offline) {
        notes.push(
          "Some sentences couldn't be downloaded. Check your connection."
        );
      }
      setRoundNote(notes.join(" ") || null);
    } catch (e) {
      round.setPhase("setup");
      setLoadError(String((e as Error).message ?? e));
    }
  };

  const recordAnswer = async (isCorrect: boolean, submitted: string) => {
    if (!current || submitting) return;
    setSubmitting(true);
    const previousMastery = current.sentence.masteryLevel;
    const newMastery: ClozeMasteryLevel = isCorrect
      ? (Math.min(previousMastery + 25, 100) as ClozeMasteryLevel)
      : 0;
    const earnedPoints =
      isCorrect && !round.isRetryPhase
        ? calculatePoints(
            newMastery,
            hintLetters,
            graphemeLength(normalize(current.sentence.clozeWord)),
            mode
          )
        : 0;
    const committed = await round.commitReview({
      isCorrect,
      earnedPoints,
      newMastery,
    });
    setSubmitting(false);
    if (!committed) return;
    setFeedback({
      isCorrect,
      correctWord: current.sentence.clozeWord,
      userAnswer: submitted,
      translation: current.sentence.translation,
      sentence: current.sentence.sentence,
      points: earnedPoints,
      newMastery,
      otherForm:
        isCorrect &&
        mode === "type" &&
        !checkAnswer(submitted, current.sentence.clozeWord, pack),
    });
    round.showFeedback();
  };

  const next = () => {
    const state = round.advance();
    setAnswer("");
    setHintLetters(0);
    setFeedback(null);
    if (state.phase === "complete") refreshCounts();
  };

  const hint = () => {
    if (!current) return;
    const correct = graphemeSplit(normalize(current.sentence.clozeWord, pack));
    const typed = graphemeSplit(normalize(answer, pack));
    let prefix = 0;
    while (
      prefix < typed.length &&
      prefix < correct.length &&
      typed[prefix] === correct[prefix]
    )
      prefix++;
    const reveal = Math.min(
      Math.max(prefix + 1, hintLetters + 1),
      correct.length
    );
    setHintLetters(hintLetters + 1);
    setAnswer(correct.slice(0, reveal).join(""));
    inputRef.current?.focus();
  };

  const fuzzy = current
    ? getFuzzyStatus(answer, current.sentence.clozeWord, pack)
    : "empty";

  const hideSentence = async () => {
    if (!current) return;
    await hideCardSentence(current.sentence);
    round.blacklistCurrent();
    setAnswer("");
    setHintLetters(0);
    setFeedback(null);
  };

  // Keyboard: Enter checks, moves on and starts; in the answer box ? is a
  // hint and Esc is "I don't know"; 1–4 pick a multiple-choice option; on the
  // result, L listens and H hides the sentence.
  const showKeys = useShowShortcutHints();
  const phase = round.phase;
  useHotkeys(
    phase === "setup" && counts
      ? [["Enter", start]]
      : phase === "complete"
        ? [["Enter", start]]
        : phase === "empty"
          ? [["Enter", () => round.setPhase("setup")]]
          : phase === "feedback" && feedback
            ? [
                ["Enter", next],
                ["l", () => speak(feedback.sentence)],
                ["h", hideSentence],
              ]
            : phase === "practicing" && mode === "mc" && mc
              ? mc.options.map((option, i): [string, () => void] => [
                  String(i + 1),
                  () => recordAnswer(i === mc.correctIndex, option),
                ])
              : []
  );
  const key = (k: string) => (showKeys ? <Kbd>{k}</Kbd> : undefined);

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs segments={[{ label: "Practice" }]} />
        {round.phase !== "setup" && (
          <Text size="sm" weight="medium">
            {round.points} pts
          </Text>
        )}
      </AppHeaderContent>

      <div className="practice-view">
        {loadError && (
          <Paper withBorder className="practice-view__panel">
            <Text>Sentences could not be loaded: {loadError}</Text>
          </Paper>
        )}

        {round.phase === "setup" && !loadError && (
          <div className="practice-setup">
            <div className="practice-setup__intro">
              <h1 className="practice-view__heading">Fill in the gap</h1>
              <Text>
                The words on your flashcards, each in a real sentence with the
                word missing, and a different sentence every time. Get a word
                right and it comes back after 1, 3, 7, then 14 days; miss it and
                it starts again. Your flashcards themselves aren't changed.
              </Text>
              {counts && (
                <div className="practice-view__counts">
                  <div className="practice-setup__stat">
                    <span className="practice-setup__stat-value">
                      {counts.due}
                    </span>
                    due
                  </div>
                  <div className="practice-setup__stat">
                    <span className="practice-setup__stat-value">
                      {counts.fresh}
                    </span>
                    not yet practised
                  </div>
                  <div className="practice-setup__stat">
                    <span className="practice-setup__stat-value">
                      {counts.mastered}
                    </span>
                    mastered
                  </div>
                </div>
              )}
              {counts?.words === 0 && (
                <Text size="sm">
                  Add or import flashcards first: practice uses the words on
                  them.
                </Text>
              )}
            </div>
            <Paper withBorder className="practice-setup__options">
              <Stack gap="sm">
                <Text size="sm" weight="medium">
                  Words
                </Text>
                <SegmentedControl
                  value={which}
                  onChange={(v) => setWhich(v as CardClozeMode)}
                  data={[
                    { value: "due", label: "Due" },
                    { value: "new", label: "New" },
                    { value: "review", label: "Review" },
                  ]}
                />
                <SegmentedControl
                  value={filter}
                  onChange={(v) => setFilter(v as CardFilter)}
                  data={[
                    { value: "studied", label: "Cards I’ve studied" },
                    { value: "all", label: "All cards" },
                  ]}
                />
                <Text size="sm" weight="medium">
                  Answer by
                </Text>
                <SegmentedControl
                  value={mode}
                  onChange={(v) => setMode(v as PracticeMode)}
                  data={[
                    { value: "type", label: "Typing" },
                    { value: "mc", label: "Multiple choice" },
                  ]}
                />
                <Text size="sm" weight="medium">
                  Round size
                </Text>
                <SegmentedControl
                  value={String(round.roundSize)}
                  onChange={(v) => round.setRoundSize(Number(v))}
                  data={ROUND_SIZES.map((n) => ({
                    value: String(n),
                    label: String(n),
                  }))}
                />
              </Stack>
              <Button
                variant="primary"
                onClick={start}
                disabled={!counts}
                className="practice-view__big-button"
                rightSection={key("↵")}
              >
                Start
              </Button>
            </Paper>
          </div>
        )}

        {round.phase === "loading" && <Text>Loading…</Text>}

        {round.phase === "empty" && (
          <Stack gap="md">
            <Text>
              Nothing to practise with these settings.{" "}
              {counts && counts.due === 0 && counts.fresh === 0
                ? filter === "studied"
                  ? "Words come back 1, 3, 7 and 14 days after you get them right; study more flashcards or choose “All cards” for new ones."
                  : "Words come back 1, 3, 7 and 14 days after you get them right."
                : filter === "studied"
                  ? "Try “New” or “All cards”."
                  : "Try “New”."}
            </Text>
            {roundNote && <Text size="sm">{roundNote}</Text>}
            <Button onClick={() => round.setPhase("setup")}>Back</Button>
          </Stack>
        )}

        {(round.phase === "practicing" || round.phase === "feedback") &&
          current && (
            <Stack gap="lg" className="practice-session">
              <Progress
                value={
                  round.roundSize
                    ? (round.roundProgress / round.roundSize) * 100
                    : 0
                }
              />
              <Text size="xs" className="practice-view__progress">
                {round.isRetryPhase
                  ? "Second try on the ones you missed"
                  : `${round.roundProgress + (round.phase === "practicing" ? 1 : 0)} of ${round.roundSize}`}
                {" · "}
                {MASTERY_LABEL[current.sentence.masteryLevel]}
              </Text>

              <Paper withBorder className="practice-view__card">
                <p className="practice-view__sentence" lang="id">
                  {round.phase === "feedback" && feedback
                    ? feedback.sentence
                    : current.blankedSentence}
                </p>
                {current.sentence.translation ? (
                  <p className="practice-view__translation">
                    {current.sentence.translation}
                  </p>
                ) : (
                  current.sentence.clue && (
                    <p className="practice-view__translation">
                      Missing word: “{current.sentence.clue}”
                    </p>
                  )
                )}
                {(current.sentence.sourceName ||
                  SOURCE_LABEL[current.sentence.source]) && (
                  <p className="practice-view__source">
                    From{" "}
                    {current.sentence.sourceName ||
                      SOURCE_LABEL[current.sentence.source]}
                  </p>
                )}
              </Paper>

              {round.phase === "practicing" && mode === "type" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!answer.trim()) return;
                    recordAnswer(isRight(answer, current.sentence), answer);
                  }}
                >
                  <Stack gap="sm">
                    <TextInput
                      id="cloze-answer"
                      ref={inputRef}
                      value={answer}
                      onChange={(e) => setAnswer(e.currentTarget.value)}
                      placeholder="Type the missing word"
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      lang="id"
                      className={`practice-view__input practice-view__input--${fuzzy}`}
                      onKeyDown={(e) => {
                        // "?" is never part of a word, so it can ask for a hint.
                        if (e.key === "?") {
                          e.preventDefault();
                          hint();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          recordAnswer(false, "");
                        }
                      }}
                    />
                    <Group gap="sm" justify="space-between">
                      <Button
                        type="button"
                        variant="ghost"
                        leftSection={<IconBulb size={16} />}
                        rightSection={key("?")}
                        onClick={hint}
                      >
                        Hint{hintLetters ? ` (${hintLetters})` : ""}
                      </Button>
                      <Group gap="sm">
                        <Button
                          type="button"
                          variant="default"
                          rightSection={key("Esc")}
                          onClick={() => recordAnswer(false, "")}
                        >
                          I don’t know
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={!answer.trim() || submitting}
                          rightSection={key("↵")}
                        >
                          Check
                        </Button>
                      </Group>
                    </Group>
                  </Stack>
                </form>
              )}

              {round.phase === "practicing" && mode === "mc" && mc && (
                <div className="practice-view__choices">
                  {mc.options.map((option, i) => (
                    <Button
                      key={option}
                      variant="default"
                      disabled={submitting}
                      leftSection={key(String(i + 1))}
                      onClick={() =>
                        recordAnswer(i === mc.correctIndex, option)
                      }
                    >
                      <span lang="id">{option}</span>
                    </Button>
                  ))}
                </div>
              )}

              {round.phase === "feedback" && feedback && (
                <Stack gap="md">
                  <div
                    className={`practice-view__result practice-view__result--${
                      feedback.isCorrect ? "right" : "wrong"
                    }`}
                  >
                    <strong>
                      {feedback.isCorrect ? "Correct" : "Not quite"}
                    </strong>{" "}
                    — the word is{" "}
                    <strong lang="id">{feedback.correctWord}</strong>
                    {!feedback.isCorrect && feedback.userAnswer && (
                      <> (you wrote “{feedback.userAnswer}”)</>
                    )}
                    {feedback.otherForm && " in this sentence"}
                    {feedback.points > 0 && <> · +{feedback.points} pts</>}
                    {current.sentence.cardWord && (
                      <div className="practice-view__card-word">
                        Your card:{" "}
                        <span lang="id">{current.sentence.cardWord}</span> —{" "}
                        {current.sentence.clue}
                      </div>
                    )}
                  </div>
                  <Group gap="sm" justify="space-between">
                    <Group gap="sm">
                      <Button
                        variant="ghost"
                        leftSection={<IconVolume size={16} />}
                        rightSection={key("L")}
                        onClick={() => speak(feedback.sentence)}
                      >
                        Listen
                      </Button>
                      <Button
                        variant="ghost"
                        rightSection={key("H")}
                        onClick={hideSentence}
                      >
                        Hide this sentence
                      </Button>
                    </Group>
                    <Button
                      variant="primary"
                      onClick={next}
                      autoFocus
                      rightSection={key("↵")}
                    >
                      Next
                    </Button>
                  </Group>
                </Stack>
              )}
            </Stack>
          )}

        {round.phase === "complete" && (
          <Stack gap="md" align="start" className="practice-session">
            <h1 className="practice-view__heading">Round complete</h1>
            <div className="practice-view__counts">
              <div className="practice-setup__stat">
                <span className="practice-setup__stat-value">
                  {round.roundCorrect}/{round.roundProgress}
                </span>
                right first time
              </div>
              <div className="practice-setup__stat">
                <span className="practice-setup__stat-value">
                  {round.points}
                </span>
                points this session
              </div>
            </div>
            {roundNote && <Text size="sm">{roundNote}</Text>}
            <Group gap="sm">
              <Button variant="primary" onClick={start} rightSection={key("↵")}>
                Another round
              </Button>
              <Button onClick={() => round.setPhase("setup")}>Settings</Button>
            </Group>
          </Stack>
        )}

        <Text size="xs" className="practice-view__credit">
          Sentences from Tatoeba (CC BY 2.0 FR), Wiktionary (CC BY-SA), TALPCo,
          Amazon MASSIVE, the Asian Language Treebank (CC BY 4.0), Global Voices
          (CC BY), TICO-19 (CC0) and the Leipzig Corpora Collection (CC BY),
          plus your own cards and reading. Details under Settings → About.
        </Text>
      </div>
    </>
  );
}
