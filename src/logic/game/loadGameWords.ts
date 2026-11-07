import { cardTerm } from "@/lector/cardCloze";
import { noteText } from "@/lector/flashcards";
import type { Card } from "../card/card";
import { db } from "../db";
import { growthStage } from "../growth";
import type { NoteType } from "../note/note";
import { type GameWord, shortGloss } from "./gameWords";

function time(date: Date | string | undefined) {
  const ms = date ? new Date(date).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

const isForward = (card: Card<NoteType>) =>
  (card.content as { frontIsField1?: boolean }).frontIsField1 !== false;

/** Every flashcard word that could go into a game (see pickGameWords). */
export async function loadGameWords(): Promise<GameWord[]> {
  const [notes, cards] = await Promise.all([
    db.notes.toArray(),
    db.cards.toArray(),
  ]);
  const cardsByNote = new Map<string, Card<NoteType>[]>();
  for (const card of cards) {
    const list = cardsByNote.get(card.note) ?? [];
    list.push(card);
    cardsByNote.set(card.note, list);
  }

  const words: GameWord[] = [];
  for (const note of notes) {
    const text = noteText(note.content);
    const noteCards = cardsByNote.get(note.id);
    if (!text || !noteCards) continue;
    const term = cardTerm(text.front);
    if (!term) continue;
    // The Indonesian → English card says how well the word is learned.
    const primary = noteCards.find(isForward) ?? noteCards[0];
    let lastReviewed = 0;
    for (const card of noteCards) {
      for (const log of card.history ?? []) {
        lastReviewed = Math.max(lastReviewed, time(log.review));
      }
    }
    words.push({
      id: note.id,
      term,
      meaning: shortGloss(text.back),
      fullMeaning: text.back,
      stage: growthStage(primary.model),
      lastReviewed,
      added: time(primary.creationDate),
    });
  }
  return words;
}
