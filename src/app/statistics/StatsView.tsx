// Statistics. Replaces Skola's placeholder with Lector's activity view
// (heuwels/lector, AGPL-3.0-only: src/app/stats, streak.ts, ActivityHeatmap).
// Lector counts Anki reviews toward the heatmap and streak; here Skola's own
// flashcard reviews (each card's FSRS review log) fill that role.
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { Paper, Text } from "@/components/ui";
import { getAllDailyStats, todayKey } from "@/lector/data-layer";
import ActivityHeatmap from "@/lector/heatmap/ActivityHeatmap";
import type { ActivityDay } from "@/lector/heatmap/types";
import { getKnownWords } from "@/lector/knownWords";
import { activeDateSet, computeStreaks } from "@/lector/lib/streak";
import type { DailyStats } from "@/lector/types";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { db } from "@/logic/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import KnownCoverage from "../reading/KnownCoverage";
import { useFrequency } from "../reading/useFrequency";
import { AppHeaderContent } from "../shell/Header/Header";
import "./StatsView.css";

function useActivity() {
  return useLiveQuery(async () => {
    const [daily, cards, vocab, cloze, knownWords] = await Promise.all([
      getAllDailyStats(),
      db.cards.toArray(),
      db.words.toArray(),
      db.cloze.toArray(),
      getKnownWords(),
    ]);
    const reviewsByDay = new Map<string, number>();
    for (const card of cards) {
      for (const log of card.history ?? []) {
        const key = todayKey(new Date(log.review));
        reviewsByDay.set(key, (reviewsByDay.get(key) ?? 0) + 1);
      }
    }
    return {
      daily,
      reviewsByDay,
      vocab,
      cloze,
      knownCount: knownWords.length,
      cardCount: cards.length,
    };
  }, []);
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper withBorder className="stats-view__stat">
      <span className="stats-view__value">{value}</span>
      <Text size="sm">{label}</Text>
    </Paper>
  );
}

function StatsView() {
  useDocumentTitle("Statistics");
  const data = useActivity();
  const { coverage, error: coverageError } = useFrequency();

  const derived = useMemo(() => {
    if (!data) return null;
    const byDate = new Map<string, DailyStats>(
      data.daily.map((d) => [d.date, { ...d }])
    );
    for (const [date, n] of data.reviewsByDay) {
      const row = byDate.get(date);
      if (row) row.ankiReviews = n;
      else
        byDate.set(date, {
          date,
          wordsRead: 0,
          newWordsSaved: 0,
          wordsMarkedKnown: 0,
          minutesRead: 0,
          clozePracticed: 0,
          points: 0,
          dictionaryLookups: 0,
          ankiReviews: n,
        });
    }
    const rows = [...byDate.values()];
    const today = todayKey();
    const streak = computeStreaks(activeDateSet(rows), today);
    const heatmap: ActivityDay[] = rows.map((r) => {
      const parts = {
        dictionaryLookups: r.dictionaryLookups,
        clozePracticed: r.clozePracticed,
        minutesRead: r.minutesRead,
        ankiReviews: r.ankiReviews,
      };
      return {
        date: r.date,
        count:
          parts.dictionaryLookups +
          parts.clozePracticed +
          parts.minutesRead +
          parts.ankiReviews,
        parts,
      };
    });
    const todayRow = byDate.get(today);
    const known = data.knownCount;
    const learning = data.vocab.filter((v) =>
      v.state.startsWith("level")
    ).length;
    return {
      streak,
      heatmap,
      today,
      todayRow,
      totalPoints: rows.reduce((s, r) => s + r.points, 0),
      known,
      learning,
      clozeMastered: data.cloze.filter((c) => c.masteryLevel === 100).length,
      clozeSeen: data.cloze.filter((c) => c.reviewCount > 0).length,
    };
  }, [data]);

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs segments={[{ label: "Statistics" }]} />
      </AppHeaderContent>
      <div className="stats-view">
        {derived && (
          <>
            <div className="stats-view__streak">
              <span className="stats-view__streak-number">
                {derived.streak.current}
              </span>
              <div className="stats-view__streak-text">
                <strong>
                  day{derived.streak.current === 1 ? "" : "s"} in a row
                </strong>
                <span>
                  {derived.streak.activeToday
                    ? "You've studied today."
                    : derived.streak.current > 0
                      ? "Study today to keep your streak."
                      : "Review cards, practise or read to start a streak."}{" "}
                  Longest: {derived.streak.longest}
                </span>
              </div>
            </div>

            <div className="stats-view__grid">
              <Stat
                label="cards reviewed today"
                value={derived.todayRow?.ankiReviews ?? 0}
              />
              <Stat
                label="sentences practised today"
                value={derived.todayRow?.clozePracticed ?? 0}
              />
              <Stat
                label="points today"
                value={derived.todayRow?.points ?? 0}
              />
              <Stat label="points in total" value={derived.totalPoints} />
              <Stat label="words known" value={derived.known} />
              <Stat label="words learning" value={derived.learning} />
              <Stat label="flashcards" value={data?.cardCount ?? 0} />
              <Stat
                label="sentences mastered"
                value={`${derived.clozeMastered} / ${derived.clozeSeen} seen`}
              />
            </div>

            <section className="stats-view__section">
              <h2 className="stats-view__heading">Vocabulary coverage</h2>
              <KnownCoverage coverage={coverage} error={coverageError} />
            </section>

            <ActivityHeatmap
              data={derived.heatmap}
              endDate={derived.today}
              unit="actions"
            />
          </>
        )}
      </div>
    </>
  );
}

export default StatsView;
