import type { Explanation } from "@/lector/explain";
import type {
  ActivityRow,
  ClozeSentence,
  ClozeWord,
  Lesson,
  VocabEntry,
  WordLink,
} from "@/lector/types";
import Dexie, { Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import "dexie-export-import";
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
  /** Word states, keyed by the folded headword so devices never clash. */
  words!: Table<VocabEntry>;
  lessons!: Table<Lesson>;
  /** Daily activity, one row per device and day (summed for statistics). */
  activity!: Table<ActivityRow>;
  /** Lector's sentence-bank practice (no longer offered; kept for synced data). */
  cloze!: Table<ClozeSentence>;
  /** Gap-fill progress per flashcard word. */
  clozeWords!: Table<ClozeWord>;
  /** The user's choices to group a word form with its root, or not. */
  wordLinks!: Table<WordLink>;
  /** Claude's explanations of words and cards, so each is paid for once. */
  explanations!: Table<Explanation>;

  constructor() {
    super("skola_db", { addons: [dexieCloud], cache: "immutable" });
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
    // For sync: a word's entry is keyed by the word itself (two devices
    // marking "makan" update one entry instead of clashing on a unique
    // index), and daily activity is kept per device so counts add up.
    this.version(25)
      .stores({
        words: "id, state",
        activity: "id, date",
      })
      .upgrade(async (tx) => {
        const vocab = await tx.table("vocab").toArray();
        await tx
          .table("words")
          .bulkPut(vocab.map((v: VocabEntry) => ({ ...v, id: v.text })));
        const device = getDeviceId();
        const days = await tx.table("dailyStats").toArray();
        await tx
          .table("activity")
          .bulkPut(
            days.map((d) => ({ ...d, id: `${d.date}|${device}`, device }))
          );
      });
    this.version(26).stores({
      vocab: null,
      dailyStats: null,
    });
    this.version(27).stores({
      clozeWords: "id, nextReview",
    });
    this.version(28).stores({
      explanations: "id, createdAt",
    });
    // Opened below, after sync is configured.
  }
}

/** A random id for this browser, so per-device rows don't overwrite each other. */
export function getDeviceId(): string {
  const KEY = "kartu-device-id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "this-device";
  }
}

export const db = new Database();

// Sync is optional: the app works offline and signed out exactly as before;
// signing in (Settings → Sync) syncs with this Dexie Cloud database.
db.cloud.configure({
  databaseUrl: "https://z5ias1d2u.dexie.cloud",
  // Keep using the existing "skola_db" database. By default the addon renames
  // it to "skola_db-<database id>", which would start everyone on an empty
  // database and leave their existing cards behind.
  nameSuffix: false,
  requireAuth: false,
  customLoginGui: true,
  // The sign-in dialog handles the email + one-time-code flow only.
  socialAuth: false,
});
db.open();
