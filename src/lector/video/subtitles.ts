// Timed subtitles from the three places a video's can come from: a subtitle
// file (.srt, .vtt), the transcript YouTube shows under a video (copied and
// pasted), or Gemini's transcription (./gemini.ts). Each becomes a list of
// cues: what's said and when.

/** One line or sentence of subtitles. */
export interface Cue {
  /** Seconds into the video. */
  start: number;
  /** Seconds; when missing, the cue lasts until the next one starts. */
  end?: number;
  text: string;
  /** Its English, when the subtitles come with one. */
  translation?: string;
}

/**
 * Seconds in a subtitle time: "00:01:02,500", "1:02.5", "62.5", "1:02:03".
 * NaN when it isn't a time.
 */
export function parseTime(time: string): number {
  const match = time.trim().match(/^(?:(\d+):)?(?:(\d+):)?(\d+(?:[.,]\d+)?)$/);
  if (!match) return Number.NaN;
  const [, a, b, s] = match;
  const seconds = Number(s.replace(",", "."));
  if (a !== undefined && b !== undefined) {
    return Number(a) * 3600 + Number(b) * 60 + seconds;
  }
  if (a !== undefined) return Number(a) * 60 + seconds;
  return seconds;
}

/** "1:02", "1:02:03": how a time is shown. */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Sounds in brackets ("[Musik]", "(tertawa)") and speaker dashes go. */
export function cleanCueText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\((?:musik|music|tertawa|tepuk tangan|applause|laughs?)\)/gi, " ")
    .replace(/♪+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .split("\n")
    .map((line) => line.replace(/^\s*[-–—]\s*/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const TIMING = /^\s*(\S+)\s*-->\s*(\S+)/;

/**
 * The cues of an .srt or .vtt file. YouTube's own .vtt files repeat each line
 * as the next one scrolls in; a line is kept once.
 */
export function parseSubtitleFile(raw: string): Cue[] {
  const cues: Cue[] = [];
  let recent: string[] = [];
  for (const block of raw.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = block.split("\n");
    const at = lines.findIndex((line) => TIMING.test(line));
    if (at < 0) continue;
    const [, from, to] = lines[at].match(TIMING) as RegExpMatchArray;
    const start = parseTime(from);
    const end = parseTime(to);
    if (Number.isNaN(start)) continue;
    const fresh = lines
      .slice(at + 1)
      .map((line) => cleanCueText(line))
      .filter((line) => line && !recent.includes(line));
    if (fresh.length === 0) continue;
    recent = [...recent, ...fresh].slice(-3);
    cues.push({
      start,
      end: Number.isNaN(end) ? undefined : end,
      text: fresh.join(" "),
    });
  }
  return cues;
}

const STAMP = /^(?:\d{1,2}:)?\d{1,2}:\d{2}$/;
const STAMP_FIRST = /^((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+)$/;
/** What a screen reader hears for a time ("1 menit, 5 detik"), copied too. */
const SPOKEN_TIME =
  /^(\d+\s+(jam|menit|detik|hours?|minutes?|seconds?),?\s*)+$/i;

/**
 * The cues of the transcript YouTube shows under a video ("Show transcript"),
 * copied and pasted: each time on its own line, or in front of its text.
 */
export function parseTranscript(raw: string): Cue[] {
  const cues: Cue[] = [];
  let current: Cue | null = null;
  const finish = () => {
    if (!current) return;
    current.text = cleanCueText(current.text);
    if (current.text) cues.push(current);
    current = null;
  };
  for (const line of raw.replace(/\r/g, "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || SPOKEN_TIME.test(trimmed)) continue;
    const inline = trimmed.match(STAMP_FIRST);
    if (STAMP.test(trimmed) || inline) {
      finish();
      current = {
        start: parseTime(inline ? inline[1] : trimmed),
        text: inline ? inline[2] : "",
      };
    } else if (current) {
      current.text += ` ${trimmed}`;
    }
  }
  finish();
  return cues;
}

/** Cues in order, each with an end (the next one's start, if not given). */
export function timedCues(cues: Cue[], duration?: number): Required<Cue>[] {
  const sorted = cues
    .filter((c) => Number.isFinite(c.start) && c.text.trim())
    .sort((a, b) => a.start - b.start);
  return sorted.map((cue, i) => {
    const next = sorted[i + 1]?.start;
    let end = cue.end ?? next ?? cue.start + 2 + cue.text.split(" ").length / 3;
    if (!(end > cue.start)) end = next ?? cue.start + 2;
    if (duration && end > duration) end = Math.max(duration, cue.start + 0.5);
    return {
      start: cue.start,
      end,
      text: cue.text.trim(),
      translation: cue.translation?.trim() ?? "",
    };
  });
}
