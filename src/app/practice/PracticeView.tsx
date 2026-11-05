// Cloze practice. Round logic (useClozeRound), answer checking, hints, points
// and mastery are Lector's (heuwels/lector@eb393ce, AGPL-3.0-only:
// src/app/practice/page.tsx recordAnswer/handleHint, use-cloze-round.ts,
// utils.ts). The screen is rebuilt with Skola's components; Lector's
// dictation mode, onboarding and AI "Explain" are not ported.
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import {
  Button,
  Group,
  Paper,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@/components/ui";
import {
  type ClozeMode,
  blacklistCloze,
  countCloze,
  ensureClozeSeeded,
  getDueCloze,
} from "@/lector/data-layer";
import { graphemeSplit } from "@/lector/languages/graphemes";
import { graphemeLength } from "@/lector/languages/graphemes";
import { id as pack } from "@/lector/languages/id/manifest";
import { COLLECTION_LABELS, ROUND_SIZES } from "@/lector/practice/constants";
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
import type { ClozeCollection, ClozeMasteryLevel } from "@/lector/types";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
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
  const [counts, setCounts] = useState<Awaited<
    ReturnType<typeof countCloze>
  > | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<PracticeMode>("type");
  const [which, setWhich] = useState<ClozeMode>("due");
  const [collection, setCollection] = useState<ClozeCollection | "all">(
    "top500"
  );
  const [answer, setAnswer] = useState("");
  const [hintLetters, setHintLetters] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshCounts = useCallback(() => countCloze().then(setCounts), []);

  useEffect(() => {
    ensureClozeSeeded()
      .then(refreshCounts)
      .catch((e) => setLoadError(String(e.message ?? e)));
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
    const sentences = await getDueCloze(which, collection, round.roundSize);
    round.startRound(sentences);
    setAnswer("");
    setHintLetters(0);
    setFeedback(null);
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
          <Stack gap="lg">
            <div>
              <h1 className="practice-view__heading">Fill in the gap</h1>
              <Text>
                Real Indonesian sentences from Tatoeba with one common word
                missing. Get it right and it comes back after 1, 3, 7, then 14
                days; miss it and it starts again.
              </Text>
            </div>
            {counts && (
              <Group gap="lg" wrap="wrap">
                <Text size="sm">
                  <strong>{counts.due}</strong> due
                </Text>
                <Text size="sm">
                  <strong>{counts.fresh}</strong> not yet seen
                </Text>
                <Text size="sm">
                  <strong>{counts.mastered}</strong> mastered
                </Text>
              </Group>
            )}
            <Stack gap="sm">
              <Text size="sm" weight="medium">
                Sentences
              </Text>
              <SegmentedControl
                value={which}
                onChange={(v) => setWhich(v as ClozeMode)}
                data={[
                  { value: "due", label: "Due" },
                  { value: "new", label: "New" },
                  { value: "review", label: "Review" },
                ]}
              />
              <SegmentedControl
                value={collection}
                onChange={(v) => setCollection(v as ClozeCollection | "all")}
                data={[
                  ...Object.entries(COLLECTION_LABELS).map(
                    ([value, label]) => ({
                      value,
                      label,
                    })
                  ),
                  { value: "all", label: "All" },
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
            <Button variant="primary" onClick={start} disabled={!counts}>
              Start
            </Button>
          </Stack>
        )}

        {round.phase === "loading" && <Text>Loading…</Text>}

        {round.phase === "empty" && (
          <Stack gap="md">
            <Text>
              Nothing to practise with these settings. Try “New” or another word
              range.
            </Text>
            <Button onClick={() => round.setPhase("setup")}>Back</Button>
          </Stack>
        )}

        {(round.phase === "practicing" || round.phase === "feedback") &&
          current && (
            <Stack gap="lg">
              <Progress
                value={
                  round.roundSize
                    ? (round.roundProgress / round.roundSize) * 100
                    : 0
                }
              />
              <Text size="xs">
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
                <p className="practice-view__translation">
                  {current.sentence.translation}
                </p>
              </Paper>

              {round.phase === "practicing" && mode === "type" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!answer.trim()) return;
                    recordAnswer(
                      checkAnswer(answer, current.sentence.clozeWord, pack),
                      answer
                    );
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
                    />
                    <Group gap="sm" justify="space-between">
                      <Button
                        type="button"
                        variant="ghost"
                        leftSection={<IconBulb size={16} />}
                        onClick={hint}
                      >
                        Hint{hintLetters ? ` (${hintLetters})` : ""}
                      </Button>
                      <Group gap="sm">
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => recordAnswer(false, "")}
                        >
                          I don’t know
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={!answer.trim() || submitting}
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
                      onClick={() =>
                        recordAnswer(i === mc.correctIndex, option)
                      }
                    >
                      {option}
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
                    {feedback.points > 0 && <> · +{feedback.points} pts</>}
                  </div>
                  <Group gap="sm" justify="space-between">
                    <Group gap="sm">
                      <Button
                        variant="ghost"
                        leftSection={<IconVolume size={16} />}
                        onClick={() => speak(feedback.sentence)}
                      >
                        Listen
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          await blacklistCloze(current.sentence.id);
                          round.blacklistCurrent();
                          setAnswer("");
                          setHintLetters(0);
                          setFeedback(null);
                        }}
                      >
                        Hide this sentence
                      </Button>
                    </Group>
                    <Button variant="primary" onClick={next} autoFocus>
                      Next
                    </Button>
                  </Group>
                </Stack>
              )}
            </Stack>
          )}

        {round.phase === "complete" && (
          <Stack gap="md" align="start">
            <h1 className="practice-view__heading">Round complete</h1>
            <Text>
              {round.roundCorrect} of {round.roundProgress} right first time ·{" "}
              {round.points} points this session
            </Text>
            <Group gap="sm">
              <Button variant="primary" onClick={start}>
                Another round
              </Button>
              <Button onClick={() => round.setPhase("setup")}>Settings</Button>
            </Group>
          </Stack>
        )}

        <Text size="xs" className="practice-view__credit">
          Sentences from Tatoeba (tatoeba.org), CC BY 2.0 FR, via Lector.
        </Text>
      </div>
    </>
  );
}
