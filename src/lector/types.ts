// Ported from Lector (heuwels/lector@eb393ce, AGPL-3.0-only): src/types/index.ts
// Only the shapes this app uses. Lector's server-side fields (sync, Anki,
// entitlements) are left out.

export type WordState =
  | "new"
  | "level1"
  | "level2"
  | "level3"
  | "level4"
  /** Probably known: checked once more before it counts as known. */
  | "familiar"
  | "known"
  | "ignored";

/** How far along a word is, for comparing states (ignored is apart). */
export const STATE_RANK: Record<Exclude<WordState, "ignored">, number> = {
  new: 0,
  level1: 1,
  level2: 2,
  level3: 3,
  level4: 4,
  familiar: 5,
  known: 6,
};
export type VocabType = "word" | "phrase";
export type ClozeMasteryLevel = 0 | 25 | 50 | 75 | 100;
export type ClozeSource =
  | "tatoeba"
  | "mined"
  | "wiktionary"
  | "leipzig"
  | "corpus"
  | "card"
  | "reading";
export type ClozeCollection =
  | "top500"
  | "top1000"
  | "top2000"
  | "mined"
  | "random"
  | "cards";

export interface VocabEntry {
  /** Same as `text`: the folded word is the key, so devices never clash. */
  id: string;
  /** Folded (lower-cased, normalised) word or phrase. */
  text: string;
  type: VocabType;
  sentence: string;
  translation: string;
  state: WordState;
  stateUpdatedAt: Date;
  reviewCount: number;
  lessonId?: string;
  createdAt: Date;
  /** The flashcard note created from this word, if any. */
  noteId?: string;
  /** Spellings seen in texts when `text` is a headword (membeli, dibeli → beli). */
  forms?: string[];
}

export interface ClozeSentence {
  id: string;
  sentence: string;
  clozeWord: string;
  clozeIndex: number;
  tokens?: string[] | null;
  translation: string;
  source: ClozeSource;
  collection: ClozeCollection;
  wordRank?: number;
  tatoebaSentenceId?: number;
  vocabEntryId?: string;
  masteryLevel: ClozeMasteryLevel;
  nextReview: Date;
  reviewCount: number;
  lastReviewed?: Date;
  timesCorrect: number;
  timesIncorrect: number;
  blacklisted?: boolean;
  /** Flashcard practice: the card's word as written, and its meaning (the card's back). */
  cardWord?: string;
  clue?: string;
  /** Where the sentence comes from, for the credit under it. */
  sourceName?: string;
  /** The translation is a machine translation (Opus-MT). */
  machineTranslation?: boolean;
}

/**
 * Gap-fill progress for one flashcard word, keyed by the word's headword (or
 * phrase). The sentence changes every time, so progress belongs to the word.
 */
export interface ClozeWord {
  id: string;
  masteryLevel: ClozeMasteryLevel;
  nextReview: Date;
  reviewCount: number;
  lastReviewed?: Date;
  timesCorrect: number;
  timesIncorrect: number;
  /** Keys of the sentences shown most recently, oldest first. */
  recent: string[];
  /** Keys of the sentences you chose to hide. */
  hidden: string[];
}

export interface DailyStats {
  date: string; // YYYY-MM-DD, primary key
  wordsRead: number;
  newWordsSaved: number;
  wordsMarkedKnown: number;
  minutesRead: number;
  clozePracticed: number;
  points: number;
  dictionaryLookups: number;
  /** Lector's name for flashcard reviews; here, Skola card reviews. */
  ankiReviews: number;
  /** Word games finished (Games). */
  gamesPlayed: number;
  /** Points scored in word games. */
  gamePoints: number;
}

/** One device's activity on one day; statistics add up all devices' rows. */
export interface ActivityRow extends DailyStats {
  /** `${date}|${device}` */
  id: string;
  device: string;
}

export interface Lesson {
  id: string;
  title: string;
  author?: string;
  content: string;
  source: "starter" | "paste" | "video";
  /** Order within the starter course. */
  sortOrder?: number;
  createdAt: Date;
  lastReadAt?: Date;
  /** Reading position: page index and how many pages the lesson had. */
  lastPage?: number;
  pageCount?: number;
  finishedAt?: Date;
  /** Book or series the lesson belongs to (EPUB chapters share one). */
  collection?: string;
  /** A video lesson: the video, and its subtitles cut into scenes. */
  video?: LessonVideo;
}

/** A few sentences of a video, read and played as one page. */
export interface VideoScene {
  /** Seconds into the video. */
  start: number;
  end: number;
  /** What's said, as subtitles have it. */
  text: string;
  /** Its English, when the subtitles came with one. */
  translation?: string;
}

export interface LessonVideo {
  provider: "youtube";
  /** The YouTube video id (watch?v=…). */
  id: string;
  /** The channel, for "More from this channel". */
  channel?: string;
  channelUrl?: string;
  /** Where the subtitles came from. */
  subtitles: "gemini" | "file" | "transcript";
  scenes: VideoScene[];
}

/**
 * A word form the user has chosen to count separately from its root, or to
 * group with it, overriding the automatic choice (merupakan / rupa).
 */
export interface WordLink {
  /** Folded word form, e.g. "merupakan". */
  form: string;
  mode: "separate" | "group";
}
