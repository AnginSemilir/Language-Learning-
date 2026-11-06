// Flashcard statistics, worked out from each card's FSRS model and review
// log: today's work, how the collection is growing, what's coming up, how
// well cards are remembered, the best time of day, and the hardest cards.

import { Rating, State } from "fsrs.js";
import type { Card } from "./card/card";
import { startOfStudyDay } from "./dailyQueue";
import { GROWTH_STAGES, type GrowthStage, growthStage } from "./growth";
import type { NoteType } from "./note/note";

const DAY = 86400000;
/** Anki's leech threshold: a card forgotten this often is a leech. */
export const LEECH_LAPSES = 8;
/** Days shown in the forecast and the review history. */
export const STATS_DAYS = 30;
/** Hours need this many answers to count for "best time to study". */
export const MIN_HOUR_ANSWERS = 5;

export interface HardCard {
  card: Card<NoteType>;
  lapses: number;
  again: number;
  reviews: number;
  difficulty: number;
  leech: boolean;
}

export interface CardStats {
  today: {
    reviewed: number;
    again: number;
    /** Share of today's answers that weren't Again, or null with none. */
    correct: number | null;
    newStarted: number;
  };
  stages: Record<GrowthStage, number>;
  /** Cards due on each of the next 30 study days; [0] is today, overdue included. */
  forecast: number[];
  /** Answers on each of the last 30 study days, oldest first; the last is today. */
  history: number[];
  /** Answer buttons over the last 30 days, Again to Easy. */
  ratings: Record<"again" | "hard" | "good" | "easy", number>;
  /** Review cards (graduated) remembered over the last 30 days, split by the gap. */
  recall: {
    all: Ratio;
    young: Ratio;
    mature: Ratio;
  };
  /** All answers by hour of the day. */
  hours: { answers: number; correct: number }[];
  hardest: HardCard[];
  leeches: number;
  totalReviews: number;
}

export interface Ratio {
  passed: number;
  total: number;
}

export const ratio = (r: Ratio) => (r.total ? r.passed / r.total : null);

function time(date: Date | string) {
  return new Date(date).getTime();
}

export function computeCardStats(
  cards: Card<NoteType>[],
  now = new Date(),
  dayStartHour = 4
): CardStats {
  const dayStart = time(startOfStudyDay(now, dayStartHour));
  const dayOf = (date: Date | string) =>
    Math.floor((time(date) - dayStart) / DAY);

  const stats: CardStats = {
    today: { reviewed: 0, again: 0, correct: null, newStarted: 0 },
    stages: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
    forecast: Array(STATS_DAYS).fill(0),
    history: Array(STATS_DAYS).fill(0),
    ratings: { again: 0, hard: 0, good: 0, easy: 0 },
    recall: {
      all: { passed: 0, total: 0 },
      young: { passed: 0, total: 0 },
      mature: { passed: 0, total: 0 },
    },
    hours: Array.from({ length: 24 }, () => ({ answers: 0, correct: 0 })),
    hardest: [],
    leeches: 0,
    totalReviews: 0,
  };

  const hard: HardCard[] = [];
  for (const card of cards) {
    stats.stages[growthStage(card.model)]++;

    if (card.model.state !== State.New) {
      const day = Math.max(0, dayOf(card.model.due));
      if (day < STATS_DAYS) stats.forecast[day]++;
    }

    const history = card.history ?? [];
    if (history.length > 0 && dayOf(history[0].review) === 0) {
      stats.today.newStarted++;
    }
    let again = 0;
    for (const log of history) {
      stats.totalReviews++;
      const day = dayOf(log.review);
      const passed = log.rating !== Rating.Again;
      if (!passed) again++;
      const hour = new Date(log.review).getHours();
      stats.hours[hour].answers++;
      if (passed) stats.hours[hour].correct++;
      if (day > 0 || day <= -STATS_DAYS) continue;

      stats.history[STATS_DAYS - 1 + day]++;
      if (day === 0) {
        stats.today.reviewed++;
        if (!passed) stats.today.again++;
      }
      if (log.rating === Rating.Again) stats.ratings.again++;
      else if (log.rating === Rating.Hard) stats.ratings.hard++;
      else if (log.rating === Rating.Good) stats.ratings.good++;
      else if (log.rating === Rating.Easy) stats.ratings.easy++;
      if (log.state === State.Review) {
        const bucket =
          log.elapsed_days >= 21 ? stats.recall.mature : stats.recall.young;
        for (const r of [stats.recall.all, bucket]) {
          r.total++;
          if (passed) r.passed++;
        }
      }
    }

    const lapses = card.model.lapses ?? 0;
    if (lapses >= LEECH_LAPSES) stats.leeches++;
    if (lapses > 0 || again > 0) {
      hard.push({
        card,
        lapses,
        again,
        reviews: history.length,
        difficulty: card.model.difficulty ?? 0,
        leech: lapses >= LEECH_LAPSES,
      });
    }
  }

  if (stats.today.reviewed > 0) {
    stats.today.correct =
      (stats.today.reviewed - stats.today.again) / stats.today.reviewed;
  }
  stats.hardest = hard
    .sort(
      (a, b) =>
        b.lapses - a.lapses || b.again - a.again || b.difficulty - a.difficulty
    )
    .slice(0, 10);
  return stats;
}

/** The hour with the highest share of correct answers, among hours with enough answers. */
export function bestHour(hours: CardStats["hours"]): number | null {
  let best: number | null = null;
  let bestRate = -1;
  hours.forEach((h, i) => {
    if (h.answers < MIN_HOUR_ANSWERS) return;
    const rate = h.correct / h.answers;
    if (rate > bestRate) {
      bestRate = rate;
      best = i;
    }
  });
  return best;
}

export { GROWTH_STAGES };
