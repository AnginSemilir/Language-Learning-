// A video's subtitles cut into scenes: a couple of sentences each, played
// and read as one page. Scenes end where a sentence ends; subtitles without
// punctuation (YouTube's automatic ones) are cut at pauses instead, about
// every 10 seconds.

import type { VideoScene } from "../types";
import { type Cue, timedCues } from "./subtitles";

/** A sentence, or a line of subtitles without punctuation, with its times. */
interface Unit {
  start: number;
  end: number;
  text: string;
  translation: string;
}

/** Where a sentence ends: . ! ? … with any closing quote or bracket. */
const SENTENCE_END = /[.!?…]+["'”’)\]]*(?=\s|$)/g;
/** Words ending in a full stop that don't end a sentence. */
const ABBREVIATION =
  /(?:^|\s)(?:dll|dsb|dkk|tsb|yth|bpk|sdr|sdri|jl|no|rp|hlm|dr|drs|ir|prof|st|mr|mrs|ms|vs|[a-z])\.$/i;

/** Whether subtitles have punctuation to cut at: a sentence end every 30 words or so. */
export function isPunctuated(cues: readonly Cue[]): boolean {
  let words = 0;
  let ends = 0;
  for (const cue of cues) {
    words += cue.text.split(/\s+/).filter(Boolean).length;
    ends += cue.text.match(SENTENCE_END)?.length ?? 0;
  }
  return words > 0 && ends >= Math.max(1, words / 30);
}

/**
 * The sentences in cues that run on from one to the next. A sentence's times
 * are worked out from where it starts and ends within its cues.
 */
export function sentencesOf(cues: Required<Cue>[]): Unit[] {
  // The whole text, and the time at each character.
  let text = "";
  const times: number[] = [];
  for (const cue of cues) {
    if (text) {
      text += " ";
      times.push(cue.start);
    }
    const length = Math.max(1, cue.text.length);
    for (let i = 0; i < cue.text.length; i++) {
      times.push(cue.start + ((cue.end - cue.start) * i) / length);
    }
    text += cue.text;
    // The cue's last character is said as it ends.
    times[times.length - 1] = cue.end;
  }

  const units: Unit[] = [];
  let from = 0;
  const push = (to: number) => {
    const raw = text.slice(from, to);
    const lead = raw.length - raw.trimStart().length;
    const sentence = raw.trim();
    if (sentence) {
      const first = from + lead;
      const last = first + sentence.length - 1;
      units.push({
        start: times[first],
        end: times[last],
        text: sentence,
        translation: "",
      });
    }
    from = to;
  };
  for (const match of text.matchAll(SENTENCE_END)) {
    const to = (match.index ?? 0) + match[0].length;
    if (match[0] === "." && ABBREVIATION.test(text.slice(from, to))) continue;
    push(to);
  }
  push(text.length);
  return units;
}

export interface SceneOptions {
  /** A scene this long (seconds) ends at the next sentence end. */
  target?: number;
  /** Longer than this, a scene ends even mid-way through its sentences. */
  max?: number;
  /** Shorter than this, a scene takes another sentence. */
  min?: number;
  /** The most sentences in a scene. */
  sentences?: number;
}

function merge(scene: Unit, unit: Unit): Unit {
  const join = (a: string, b: string) => (a && b ? `${a} ${b}` : a || b);
  return {
    start: scene.start,
    end: Math.max(scene.end, unit.end),
    text: join(scene.text, unit.text),
    translation: join(scene.translation, unit.translation),
  };
}

/**
 * Units grouped into scenes. A scene takes sentences until it has two (and
 * lasts a few seconds) or reaches `target` seconds; a pause of a second and a
 * half or more ends one early.
 */
export function groupScenes(
  units: Unit[],
  punctuated: boolean,
  { target = 12, max = 25, min = 4, sentences = 3 }: SceneOptions = {}
): VideoScene[] {
  const scenes: Unit[] = [];
  let scene: Unit | null = null;
  let count = 0;
  for (const unit of units) {
    if (scene) {
      const length = scene.end - scene.start;
      const pause = unit.start - scene.end;
      const done = punctuated
        ? (count >= 2 && length >= min) ||
          count >= sentences ||
          length >= target ||
          unit.end - scene.start > max ||
          (pause >= 1.5 && length >= min)
        : length >= target * 0.8 ||
          unit.end - scene.start > max ||
          (pause >= 1 && length >= min);
      if (done) {
        scenes.push(scene);
        scene = null;
      }
    }
    if (scene) {
      scene = merge(scene, unit);
      count++;
    } else {
      scene = { ...unit };
      count = 1;
    }
  }
  if (scene) {
    // A last scene of a word or two joins the one before.
    const before = scenes[scenes.length - 1];
    if (
      before &&
      scene.end - scene.start < 2 &&
      scene.end - before.start <= max
    ) {
      scenes[scenes.length - 1] = merge(before, scene);
    } else {
      scenes.push(scene);
    }
  }
  return scenes.map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text,
    ...(s.translation ? { translation: s.translation } : {}),
  }));
}

/**
 * Subtitles as scenes. Cues that are a sentence each (Gemini's) stay whole;
 * others are re-cut into sentences when they have punctuation.
 */
export function makeScenes(
  cues: Cue[],
  {
    duration,
    sentencePerCue = false,
    ...options
  }: SceneOptions & { duration?: number; sentencePerCue?: boolean } = {}
): VideoScene[] {
  const timed = timedCues(cues, duration);
  const punctuated = isPunctuated(timed);
  const units = sentencePerCue || !punctuated ? timed : sentencesOf(timed);
  return groupScenes(units, punctuated, options);
}

/**
 * A scene's text as the reader's Markdown: subtitles are plain text, so a
 * line that looks like a heading or a list item isn't read as one.
 */
export function sceneMarkdown(text: string): string {
  return text
    .replace(/([\\`*_[\]<>])/g, "\\$1")
    .replace(/^(\s*)([#+-])(\s)/, "$1\\$2$3")
    .replace(/^(\s*\d+)([.)])(\s)/, "$1\\$2$3");
}
