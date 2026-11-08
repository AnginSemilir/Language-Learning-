// How far a note is learned, for Manage Cards: each card's growth stage
// (seed to grand oak, see ../growth.ts), or familiar or known. A note with two
// cards (front → back and back → front) shows both when they differ.

import type { Card } from "../card/card";
import { db } from "../db";
import { GROWTH_STAGE_NAME, growthStage } from "../growth";
import type { NoteType } from "./note";

export interface NoteLevel {
  /** "Oak", "Known", or "Oak / Seed" for a note whose two cards differ. */
  label: string;
  /** For sorting: the further card first, then the other. */
  rank: number;
}

/** 0–4 growing (seed to grand oak), 5 familiar, 6 known. */
export function cardLevel(card: Pick<Card<NoteType>, "model" | "known">) {
  if (card.known === "known") return 6;
  if (card.known === "familiar") return 5;
  return growthStage(card.model);
}

const LEVEL_NAME = [
  GROWTH_STAGE_NAME[0],
  GROWTH_STAGE_NAME[1],
  GROWTH_STAGE_NAME[2],
  GROWTH_STAGE_NAME[3],
  GROWTH_STAGE_NAME[4],
  "Familiar",
  "Known",
];

/** Front → back first: the card that asks for the meaning. */
function isReverse(card: Card<NoteType>) {
  return (card.content as { frontIsField1?: boolean }).frontIsField1 === false;
}

export function noteLevel(cards: Card<NoteType>[]): NoteLevel | undefined {
  if (cards.length === 0) return undefined;
  const ordered = [...cards].sort(
    (a, b) => Number(isReverse(a)) - Number(isReverse(b))
  );
  const levels = ordered.map(cardLevel);
  const high = Math.max(...levels);
  const low = Math.min(...levels);
  const names = [...new Set(levels.map((l) => LEVEL_NAME[l]))];
  return { label: names.join(" / "), rank: high * 10 + low };
}

/** The level of each of these notes, by note id. */
export async function noteLevels(
  noteIds: string[]
): Promise<Map<string, NoteLevel>> {
  const cards = await db.cards.where("note").anyOf(noteIds).toArray();
  const byNote = new Map<string, Card<NoteType>[]>();
  for (const card of cards) {
    const list = byNote.get(card.note) ?? [];
    list.push(card);
    byNote.set(card.note, list);
  }
  const levels = new Map<string, NoteLevel>();
  for (const [id, list] of byNote) {
    const level = noteLevel(list);
    if (level) levels.set(id, level);
  }
  return levels;
}
