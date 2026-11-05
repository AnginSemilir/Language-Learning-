import Dexie, { Table } from "dexie";
import "dexie-export-import";
import type {
  ClozeSentence,
  DailyStats,
  Lesson,
  VocabEntry,
  WordLink,
} from "@/lector/types";
import { Card } from "./card/card";
import { Deck } from "./deck/deck";
import { NoteType } from "./note/note";
import { Note } from "./note/note";
import { Settings, SettingsValues } from "./settings/Settings";
import { DeckStatistics } from "./statistics";

export class Database extends Dexie {
  decks!: Table<Deck>;
  cards!: Table<Card<NoteType>>;
  notes!: Table<Note<NoteType>>;
  statistics!: Table<DeckStatistics>;
  settings!: Table<Settings<keyof SettingsValues>>;
  // Ported from Lector: reading vocabulary, lessons, activity and cloze practice.
  vocab!: Table<VocabEntry>;
  lessons!: Table<Lesson>;
  dailyStats!: Table<DailyStats>;
  cloze!: Table<ClozeSentence>;
  /** The user's choices to group a word form with its root, or not. */
  wordLinks!: Table<WordLink>;

  constructor() {
    super("skola_db", { cache: "immutable" });
    this.version(22).stores({
      cards: "id, note, deck",
      decks: "id, *cards, *notes, *subDecks, *superDecks",
      notes: "id, deck, sortField, *linkedNotes",
      statistics: "[deck+day], day",
      settings: "key",
    });
    this.version(23).stores({
      vocab: "id, &text, state",
      lessons: "id, source, sortOrder, createdAt",
      dailyStats: "date",
      cloze: "id, nextReview, collection, reviewCount",
    });
    this.version(24).stores({
      wordLinks: "form",
    });
    this.open();
  }
}

export const db = new Database();
