import { Table } from "dexie";
import { Rating, SchedulingInfo, State } from "fsrs.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { schedulableModel, useGlobalScheduler } from "./card/CardScheduler";
import { Card } from "./card/card";
import { useCardsWith } from "./card/hooks/useCardsWith";
import { knownSchedule } from "./card/known";
import { updateCardModel } from "./card/updateCardModel";
import {
  type DailyLimits,
  type NewReviewOrder,
  buildDailyQueue,
} from "./dailyQueue";
import { db } from "./db";
import { invalidateDeckStatsCacheForCard } from "./deck/deckStatsCacheManager";
import { NoteType } from "./note/note";
import { DeckStatistics, newStatistics } from "./statistics";

export type LearnOptions = {
  learnAll: boolean;
  newToReviewRatio: number;
  sort?: (a: Card<NoteType>, b: Card<NoteType>) => number;
  /**
   * Anki-style daily limits. A normal session waits for them and offers only
   * today's queue; "learn all" ignores them.
   */
  limits?: DailyLimits;
  /** Whether new cards come mixed with reviews, after them or before them. */
  newReviewOrder?: NewReviewOrder;
};

export type CardQuerier = {
  querier: (
    cards: Table<Card<NoteType>>
  ) => Promise<Card<NoteType>[] | undefined>;
  dependencies: any[];
};

export type LearnController = {
  newCardsNumber: number;
  timeCriticalCardsNumber: number;
  toReviewCardsNumber: number;
  learnedCardsNumber: number;

  currentCard: Card<NoteType> | null;
  currentCardRepeatInfo: Record<number, SchedulingInfo> | null;

  showingAnswer: boolean;
  showAnswer: () => void;

  answerCard: (rating: Rating) => void;
  /** Sends the current card as far ahead as the maximum interval allows. */
  markKnown: () => void;
  /** Days a card marked known stays away (the maximum interval). */
  knownDays: number;
  requestNextCard: () => void;

  /** Whether there's an answer in this session that "Back" can take back. */
  canUndo: boolean;
  /** Takes back the last answer: the card's schedule is restored and it is shown again. */
  undo: () => Promise<void>;

  statistics: DeckStatistics;
  isFinished: boolean;

  options: LearnOptions;
};

/** What "Back" needs to take back one answer. */
interface UndoEntry {
  /** The card as it was before it was answered. */
  card: Card<NoteType>;
  /** The save of the answer, or null when the card wasn't changed. */
  saved: Promise<void> | null;
  /** The card was queued again for later in this session. */
  requeued: boolean;
  statistics: DeckStatistics;
}

const MAX_UNDO = 50;

export function useLearning(
  cardQuerier: CardQuerier,
  options: LearnOptions
): LearnController {
  //e.g. all cards of a deck
  const [providedCards] = useCardsWith(
    cardQuerier.querier,
    cardQuerier.dependencies
  );

  const scheduler = useGlobalScheduler();

  //Time critical cards are cards that are due today / should be done within this learning session (5-10 min interval). timeCriticalCards should be sorted by due date
  const [timeCriticalCards, setTimeCriticalCards] = useState<Card<NoteType>[]>(
    []
  );

  //New cards are cards that have never been reviewed
  const [newCards, setNewCards] = useState<Card<NoteType>[]>([]);
  //To review cards are cards that have been answered correctly before and are due for a review
  const [toReviewCards, setToReviewCards] = useState<Card<NoteType>[]>([]);
  //Learned cards are cards that have been answered correctly but are not due for a review. These cards are not regulary shown, only with learnAll true
  const [learnedCards, setLearnedCards] = useState<Card<NoteType>[]>([]);

  //Currently shown card
  const [currentCard, setCurrentCard] = useState<Card<NoteType> | null>(null);

  const [showingAnswer, setShowingAnswer] = useState<boolean>(false);
  //Used so that nextCard isn't called immediately but only after state has been updated
  const [requestedNextCard, setRequestedNextCard] = useState<boolean>(false);

  //Determines if FinishedLearningView is shown
  const [isFinished, setIsFinished] = useState<boolean>(false);
  //for progress bar and statistics on FinishedLearningView
  const [statistics, setStatistics] = useState<DeckStatistics>(() =>
    newStatistics()
  );
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  //The queue is built once per session; an empty one then finishes the session
  const queueBuilt = useRef(false);

  useEffect(() => {
    //Check if there are already cards provided (and, for a normal session, the daily limits)
    if (providedCards && (options.learnAll || options.limits)) {
      //Check if there are no cards are in the respective lists and currentCard is not set.
      if (
        !queueBuilt.current &&
        timeCriticalCards.length +
          newCards.length +
          toReviewCards.length +
          learnedCards.length ===
          0 &&
        currentCard === null
      ) {
        //If yes, sort the cards into the respective lists
        queueBuilt.current = true;
        const now = new Date(Date.now());
        if (!options.learnAll && options.limits) {
          //Today's queue: learning cards, then reviews and new cards up to the daily limits
          const queue = buildDailyQueue(providedCards, options.limits, now);
          setTimeCriticalCards(
            [...queue.learning].sort(
              (a, b) => a.model.due.getTime() - b.model.due.getTime()
            )
          );
          setNewCards(queue.newCards);
          setToReviewCards(queue.reviews);
          setLearnedCards([]);
          return;
        }
        setTimeCriticalCards(
          providedCards.filter(
            (card) =>
              card.model.state === State.Learning ||
              card.model.state === State.Relearning
          )
        );
        setNewCards(
          providedCards
            .filter((card) => card.model.state === State.New)
            .sort(options.sort)
        );
        setToReviewCards(
          providedCards
            .filter(
              (card) =>
                card.model.state === State.Review && card.model.due <= now
            )
            .sort(options.sort)
        );
        setLearnedCards(
          providedCards
            .filter(
              (card) =>
                card.model.state === State.Review && card.model.due > now
            )
            .sort(options.sort)
        );
      } else if (currentCard === null) {
        //If currentCard is not set (and there are cards in the lists), set it
        nextCard();
      }
    }
  }, [
    providedCards,
    currentCard,
    timeCriticalCards,
    newCards,
    toReviewCards,
    learnedCards,
    options,
  ]);

  //Tries to set currentCard to the next card
  const nextCard = useCallback(() => {
    if (isFinished) {
      return;
    }
    //If there are time critical cards that are due, set the first one as currentCard
    if (
      timeCriticalCards.length > 0 &&
      timeCriticalCards[0].model.due <= new Date(Date.now())
    ) {
      setCurrentCard(timeCriticalCards[0]);
      setTimeCriticalCards((tcCards) => tcCards.filter((_, i) => i !== 0));
      //If there are new cards or cards that need to be reviewed are available choose one of them based on the newToReviewRatio
    } else if (newCards.length + toReviewCards.length > 0) {
      if (newCards.length === 0) {
        setCurrentCard(toReviewCards[0]);
        setToReviewCards((trCards) => trCards.filter((_, i) => i !== 0));
      } else if (toReviewCards.length === 0) {
        setCurrentCard(newCards[0]);
        setNewCards((nCards) => nCards.filter((_, i) => i !== 0));
      } else {
        const order = options.newReviewOrder ?? "mixed";
        if (
          order === "before" ||
          (order === "mixed" && Math.random() < options.newToReviewRatio)
        ) {
          setCurrentCard(newCards[0]);
          setNewCards((nCards) => nCards.filter((_, i) => i !== 0));
        } else {
          setCurrentCard(toReviewCards[0]);
          setToReviewCards((trCards) => trCards.filter((_, i) => i !== 0));
        }
      }
      //If learnAll is true and there are learned cards available set the first one as currentCard
    } else if (options.learnAll && learnedCards.length > 0) {
      setCurrentCard(learnedCards[0]);
      setLearnedCards((lCards) => lCards.filter((_, i) => i !== 0));
      //If there aren't any other cards but still time critical cards which are not due yet do them anyway
    } else if (timeCriticalCards.length > 0) {
      setCurrentCard(timeCriticalCards[0]);
      setTimeCriticalCards((tcCards) => tcCards.filter((_, i) => i !== 0));
      //If there are no cards left finish the learning session
    } else {
      setIsFinished(true);
    }
  }, [timeCriticalCards, newCards, toReviewCards, learnedCards, options]);

  useEffect(() => {
    if (requestedNextCard) {
      nextCard();
      setRequestedNextCard(false);
    }
  }, [requestedNextCard, nextCard]);

  //Providing information about how all 4 ratings would affect the current card
  //Shown on buttons
  const currentCardRepeatInfo = useMemo(() => {
    if (currentCard) {
      return scheduler.repeat(
        schedulableModel(currentCard.model),
        new Date(Date.now())
      );
    } else {
      return null;
    }
  }, [currentCard, scheduler]);

  //Answering the current card with the given rating
  const answer = useCallback(
    (rating: Rating) => {
      if (currentCard && currentCardRepeatInfo) {
        let saved: Promise<void> | null = null;
        //Don't update the card if it is already learned and not due for a review
        if (
          !(
            currentCard.model.state === State.Review &&
            currentCard.model.due.getTime() >= Date.now()
          )
        ) {
          saved = updateCardModel(
            currentCard,
            currentCardRepeatInfo[rating].card,
            currentCardRepeatInfo[rating].review_log
          );
        }
        const requeued =
          currentCardRepeatInfo[rating].card.scheduled_days === 0;
        setUndoStack((stack) => [
          ...stack.slice(-(MAX_UNDO - 1)),
          { card: currentCard, saved, requeued, statistics },
        ]);
        if (requeued) {
          // The copy shown again later keeps the answer just saved in its
          // history; the next answer appends to it rather than replacing it.
          const log = currentCardRepeatInfo[rating].review_log;
          const history = saved
            ? [...currentCard.history, log]
            : currentCard.history;
          setTimeCriticalCards((tcCards) =>
            [
              ...tcCards,
              {
                ...currentCard,
                model: currentCardRepeatInfo[rating].card,
                history,
              },
            ].sort((a, b) => a.model.due.getTime() - b.model.due.getTime())
          );
        }
        setStatistics((ds) => {
          return {
            ...ds,
            ratingsList: [...ds.ratingsList, rating],
            cards: {
              ...ds.cards,
              [currentCard.model.state]: ds.cards[currentCard.model.state] + 1,
            },
          };
        });
      } else {
        throw new Error("Card or cardModelInfo is missing");
      }
      setShowingAnswer(false);
    },
    [currentCard, currentCardRepeatInfo, timeCriticalCards, statistics]
  );

  //Marking the current card known: due again after the maximum interval
  const markKnown = useCallback(() => {
    if (!currentCard || !currentCardRepeatInfo) {
      throw new Error("Card or cardModelInfo is missing");
    }
    const known = knownSchedule(
      currentCardRepeatInfo[Rating.Easy],
      new Date(Date.now()),
      scheduler.p.maximum_interval
    );
    // Unlike an answer, this changes a card that isn't due too ("learn all").
    const saved = updateCardModel(currentCard, known.card, known.review_log);
    setUndoStack((stack) => [
      ...stack.slice(-(MAX_UNDO - 1)),
      { card: currentCard, saved, requeued: false, statistics },
    ]);
    setStatistics((ds) => ({
      ...ds,
      ratingsList: [...ds.ratingsList, Rating.Easy],
      cards: {
        ...ds.cards,
        [currentCard.model.state]: ds.cards[currentCard.model.state] + 1,
      },
    }));
    setShowingAnswer(false);
  }, [currentCard, currentCardRepeatInfo, scheduler, statistics]);

  //Puts a card back at the front of the list it was taken from
  const requeueFront = useCallback((card: Card<NoteType>) => {
    const state = card.model.state;
    if (state === State.New) {
      setNewCards((cards) => [card, ...cards]);
    } else if (state === State.Learning || state === State.Relearning) {
      setTimeCriticalCards((cards) =>
        [card, ...cards].sort(
          (a, b) => a.model.due.getTime() - b.model.due.getTime()
        )
      );
    } else if (card.model.due.getTime() <= Date.now()) {
      setToReviewCards((cards) => [card, ...cards]);
    } else {
      setLearnedCards((cards) => [card, ...cards]);
    }
  }, []);

  //Takes back the last answer of this session
  const undo = useCallback(async () => {
    const entry = undoStack[undoStack.length - 1];
    if (!entry || isFinished) return;
    setUndoStack((stack) => stack.slice(0, -1));
    const { card } = entry;
    if (entry.saved) {
      await entry.saved;
      await db.cards.update(card.id, {
        model: card.model,
        history: card.history,
      });
      await invalidateDeckStatsCacheForCard(card.id);
    }
    if (entry.requeued) {
      setTimeCriticalCards((cards) => {
        const i = cards.findIndex((c) => c.id === card.id);
        return i < 0 ? cards : cards.filter((_, j) => j !== i);
      });
    }
    if (currentCard && currentCard.id !== card.id) requeueFront(currentCard);
    setCurrentCard(card);
    setShowingAnswer(true);
    setStatistics(entry.statistics);
  }, [undoStack, isFinished, currentCard, requeueFront]);

  return {
    newCardsNumber: newCards.length,
    timeCriticalCardsNumber: timeCriticalCards.length,
    toReviewCardsNumber: toReviewCards.length,
    learnedCardsNumber: learnedCards.length,

    currentCard: currentCard,
    currentCardRepeatInfo: currentCardRepeatInfo,

    showingAnswer: showingAnswer,
    showAnswer: setShowingAnswer.bind(null, true),

    answerCard: answer,
    markKnown,
    knownDays: scheduler.p.maximum_interval,
    requestNextCard: setRequestedNextCard.bind(null, true),

    canUndo: undoStack.length > 0 && !isFinished,
    undo,

    statistics: statistics,
    isFinished: isFinished,

    options: options,
  };
}

export function useRepetitionAccuracy(ratingsList: number[]): number {
  return useMemo(() => {
    if (ratingsList.length !== 0) {
      // Again 0, Hard ½, Good and Easy 1: Easy counts as right, not as 150%.
      let sum = 0;
      ratingsList.forEach((rating) => {
        return (sum += Math.min(1, (rating - 1) / 2));
      });
      return Math.round((sum / ratingsList.length) * 1000) / 10;
    } else {
      return Number.NaN;
    }
  }, [ratingsList]);
}
