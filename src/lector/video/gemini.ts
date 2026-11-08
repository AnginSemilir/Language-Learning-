// Subtitles for a YouTube video by Google's Gemini, which can watch a YouTube
// link itself: it writes down what's said, a sentence at a time with its
// times, and translates each sentence into English. It uses the user's own
// Gemini API key from Google AI Studio, which is free within Google's daily
// limits (about 8 hours of YouTube video a day). The key stays on this
// device (localStorage, never synced).
//
// YouTube's own captions can't be fetched by a web app without a server:
// YouTube now asks for a token from its bot check for them. Its transcript
// can be copied and pasted instead (./subtitles.ts).

import type { Cue } from "./subtitles";
import { formatTime, parseTime } from "./subtitles";

/**
 * The models used: Google's newest Flash (best, but slow and only about 20
 * requests a day free), Gemini 3.5 Flash (a few times quicker, its own
 * limit) and Flash-Lite, the last resort.
 */
export const GEMINI_MODELS = {
  best: "gemini-flash-latest",
  fast: "gemini-3.5-flash",
  lite: "gemini-flash-lite-latest",
};
export const GEMINI_NAME = "Gemini";

/** Which model to use first; the others are used when it can't. */
export type GeminiModelChoice = "best" | "fast";

const KEY_STORAGE = "kartu.geminiKey";
const MODEL_STORAGE = "kartu.geminiModel";

export function getModelChoice(): GeminiModelChoice {
  try {
    return localStorage.getItem(MODEL_STORAGE) === "fast" ? "fast" : "best";
  } catch {
    return "best";
  }
}

export function setModelChoice(choice: GeminiModelChoice) {
  try {
    localStorage.setItem(MODEL_STORAGE, choice);
  } catch {
    // A convenience only.
  }
}
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export function getGeminiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setGeminiKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // Private browsing: the key works until the page closes.
  }
}

export type GeminiProblem =
  | "key"
  | "busy"
  | "offline"
  | "video"
  | "language"
  | "other";

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly problem: GeminiProblem
  ) {
    super(message);
  }
}

const INSTRUCTIONS = `You write subtitles for someone learning Indonesian.

Transcribe everything that is said in the video, word for word, in the language it is said in. Keep the speakers' own words, including informal and slang words (gue, nggak, banget, kayak); don't correct, shorten or summarise. Leave out music, sound effects and text on screen that nobody says.

Give one item per sentence, in order. Split a sentence longer than about 20 words at a natural pause. Use normal punctuation and capital letters.

For each item:
- start, end: when the sentence begins and finishes being said, as M:SS.s (H:MM:SS.s after an hour), as exactly as you can.
- text: the sentence as said.
- english: a natural English translation of the sentence.

language: the code of the main language spoken (id for Indonesian).`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    language: { type: "STRING" },
    sentences: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          start: { type: "STRING" },
          end: { type: "STRING" },
          text: { type: "STRING" },
          english: { type: "STRING" },
        },
        required: ["start", "end", "text", "english"],
        propertyOrdering: ["start", "end", "text", "english"],
      },
    },
  },
  required: ["language", "sentences"],
  propertyOrdering: ["language", "sentences"],
};

/** Frames a second looked at in a lighter request: the words are what matter. */
const LIGHT_FPS = 0.2;

export interface RequestOptions {
  /**
   * A frame every 5 seconds instead of every second, which takes a long
   * video's tokens under the free tier's limit per minute.
   */
  light?: boolean;
  /** Seconds into the video to start from, carrying on after a break. */
  from?: number;
  /** Thinking a little rather than a lot, which is much quicker. */
  quick?: boolean;
}

/** The request for one video, or for the rest of it from a time. */
export function transcriptionRequest(
  videoId: string,
  { light = false, from = 0, quick = true }: RequestOptions = {}
) {
  const metadata = {
    ...(light ? { fps: LIGHT_FPS } : {}),
    ...(from > 0 ? { startOffset: `${Math.floor(from)}s` } : {}),
  };
  const video = {
    fileData: { fileUri: `https://www.youtube.com/watch?v=${videoId}` },
    ...(Object.keys(metadata).length > 0 ? { videoMetadata: metadata } : {}),
  };
  const ask =
    from > 0
      ? `Write the subtitles for the rest of this video, from ${formatTime(from)} on. Give the times from the start of the whole video.`
      : "Write the subtitles for this video.";
  return {
    systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
    contents: [{ role: "user", parts: [video, { text: ask }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      // The words matter, not the picture: fewer tokens per frame.
      mediaResolution: "MEDIA_RESOLUTION_LOW",
      maxOutputTokens: 65536,
      ...(quick ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
    },
  };
}

interface Sentence {
  start?: string;
  end?: string;
  text?: string;
  english?: string;
}

/**
 * The JSON Gemini wrote. When it was cut off (a very long video), the
 * sentences up to the cut are kept.
 */
export function readTranscription(json: string): {
  language: string;
  sentences: Sentence[];
  cutOff: boolean;
} {
  try {
    const data = JSON.parse(json);
    return {
      language: String(data.language ?? ""),
      sentences: Array.isArray(data.sentences) ? data.sentences : [],
      cutOff: false,
    };
  } catch {
    const last = json.lastIndexOf("}");
    if (last < 0) throw new GeminiError("Gemini's answer was empty.", "other");
    try {
      const data = JSON.parse(`${json.slice(0, last + 1)}]}`);
      return {
        language: String(data.language ?? ""),
        sentences: Array.isArray(data.sentences) ? data.sentences : [],
        cutOff: true,
      };
    } catch {
      throw new GeminiError(
        "Gemini's answer couldn't be read. Try again.",
        "other"
      );
    }
  }
}

/** Gemini's sentences as cues, in order, with times that make sense. */
export function cuesFromSentences(sentences: Sentence[]): Cue[] {
  const cues: Cue[] = [];
  for (const s of sentences) {
    const text = (s.text ?? "").replace(/\s+/g, " ").trim();
    const start = parseTime(s.start ?? "");
    if (!text || Number.isNaN(start)) continue;
    const end = parseTime(s.end ?? "");
    cues.push({
      start,
      end: end > start ? end : undefined,
      text,
      translation: (s.english ?? "").trim() || undefined,
    });
  }
  return cues.sort((a, b) => a.start - b.start);
}

/** What happened at each try, shortened, for the end of a message. */
function details(failures: string[]) {
  const each: { text: string; times: number }[] = [];
  for (const failure of failures) {
    const flat = failure.replace(/\s+/g, " ").trim();
    const text = flat.length > 200 ? `${flat.slice(0, 200)}…` : flat;
    const last = each[each.length - 1];
    if (last?.text === text) last.times++;
    else each.push({ text, times: 1 });
  }
  const parts = each.map(({ text, times }) =>
    times > 1 ? `${text} (${times} times)` : text
  );
  return `(Details: ${parts.join("; then ")})`;
}

interface GeminiResponse {
  error?: { message?: string };
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
  promptFeedback?: { blockReason?: string };
}

/** What a broken connection is recorded as. */
const BROKE = "the connection broke";

/** The error for the last try, with what happened at every try. */
export function errorFor(status: number, failures: string[]): GeminiError {
  const last = failures[failures.length - 1] ?? "";
  const message = last.replace(/^\d+: /, "");
  if (status === 0) {
    return new GeminiError(
      `The connection to Gemini kept breaking. Keep the app open while it works and try again. ${details(failures)}`,
      "offline"
    );
  }
  if (status === 400 && /api key/i.test(message)) {
    return new GeminiError(
      "Google didn't accept the Gemini API key. Check it in Settings → Dictionary.",
      "key"
    );
  }
  if (status === 401 || status === 403) {
    return new GeminiError(
      `This Gemini API key can't be used for this. ${details(failures)}`,
      "key"
    );
  }
  if (status === 429) {
    return new GeminiError(
      `Gemini's free limit stopped this: try again in a minute, or tomorrow if today's limit is used. ${details(failures)}`,
      "busy"
    );
  }
  if (status >= 500) {
    return new GeminiError(
      `Gemini couldn't do it just now, even after trying again. Try again in a few minutes. ${details(failures)}`,
      "busy"
    );
  }
  if (/video|youtube|file_?uri|private|unavailable/i.test(message)) {
    return new GeminiError(
      `Gemini couldn't watch this video. It has to be public. ${details(failures)}`,
      "video"
    );
  }
  return new GeminiError(
    message ? `Gemini: ${message}` : `Gemini answered ${status}.`,
    "other"
  );
}

/** Whether another try (later, lighter or with the other model) may work. */
export function worthRetrying(status: number) {
  return status === 0 || status === 429 || status >= 500;
}

/**
 * What's tried, in order, while Gemini is overloaded, over a limit or cut
 * off: the chosen model, the same lighter, the other Flash, then Flash-Lite.
 */
export function attemptsFor(choice: GeminiModelChoice) {
  const { best, fast, lite } = GEMINI_MODELS;
  const [first, second] = choice === "fast" ? [fast, best] : [best, fast];
  return [
    { model: first, light: false, wait: 0 },
    { model: first, light: true, wait: 3000 },
    { model: second, light: true, wait: 3000 },
    { model: lite, light: true, wait: 5000 },
  ];
}

/** A model's free requests for the day are used up. */
const DAILY_LIMIT = /per ?day/i;

/** The most times a long video is carried on from where the answer stopped. */
const MAX_PARTS = 8;

/** Gemini's answer, as far as it came. */
interface Answer {
  text: string;
  finishReason?: string;
  blockReason?: string;
  /** The connection broke before the answer was finished. */
  dropped: boolean;
}

/**
 * An answer as it streams in (server-sent events, so the connection never
 * sits silent while a long video is written down), or a plain JSON one.
 */
export async function readAnswer(
  response: Response,
  onText?: (text: string) => void
): Promise<Answer> {
  const answer: Answer = { text: "", dropped: false };
  const take = (data: GeminiResponse) => {
    const candidate = data.candidates?.[0];
    for (const part of candidate?.content?.parts ?? []) {
      if (!part.thought) answer.text += part.text ?? "";
    }
    answer.finishReason = candidate?.finishReason ?? answer.finishReason;
    answer.blockReason = data.promptFeedback?.blockReason ?? answer.blockReason;
  };
  const handle = (event: string) => {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    if (!data) return;
    try {
      take(JSON.parse(data));
    } catch {
      // A broken event: the rest still counts.
    }
  };
  if (!response.body) return { ...answer, dropped: true };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let events = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (!events && /^data:/m.test(buffer)) events = true;
      if (!events) continue;
      const complete = buffer.split(/\r?\n\r?\n/);
      buffer = complete.pop() ?? "";
      for (const event of complete) handle(event);
      onText?.(answer.text);
    }
  } catch {
    return { ...answer, dropped: true };
  }
  if (events) {
    handle(buffer);
  } else {
    try {
      const data = JSON.parse(buffer);
      for (const item of Array.isArray(data) ? data : [data]) take(item);
    } catch {
      return { ...answer, dropped: true };
    }
  }
  onText?.(answer.text);
  return answer;
}

export interface Transcription {
  cues: Cue[];
  language: string;
  /** The subtitles stop before the end of the video. */
  cutOff: boolean;
}

export interface Progress {
  /** Seconds of the video written down so far. */
  upTo: number;
  sentences: number;
}

interface Options {
  signal?: AbortSignal;
  fetchApi?: typeof fetch;
  /** Before each try after the first: which it is, of how many. */
  onRetry?: (attempt: number, of: number) => void;
  /** As the subtitles come in. */
  onProgress?: (progress: Progress) => void;
  /** The model to try first (Settings → Dictionary). */
  model?: GeminiModelChoice;
  sleep?: (ms: number) => Promise<unknown>;
}

/** Times written from the start of a part rather than of the video. */
function fromPartStart(first: number, from: number) {
  return first < (from <= 60 ? from / 2 : from - 30);
}

/** Subtitles for a public YouTube video, by Gemini, with English. */
export async function transcribeVideo(
  videoId: string,
  {
    signal,
    fetchApi = fetch,
    onRetry,
    onProgress,
    model = getModelChoice(),
    sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  }: Options = {}
): Promise<Transcription> {
  const key = getGeminiKey();
  if (!key) {
    throw new GeminiError(
      "Add your Gemini API key in Settings → Dictionary.",
      "key"
    );
  }
  // What happened at each try that failed, for the message at the end.
  const failures: string[] = [];
  // Settings a model turned down are left out from then on.
  let light = true;
  let quick = true;
  let clips = true;
  const attempts = attemptsFor(model);
  // Models that can't be used today (daily limit) or at all (retired).
  const skipped = new Set<string>();
  const nextUsable = (from: number) => {
    let i = from;
    while (i < attempts.length && skipped.has(attempts[i].model)) i++;
    return i;
  };

  /** One request; a broken connection is status 0. */
  const ask = async (
    model: string,
    request: ReturnType<typeof transcriptionRequest>,
    onText: (text: string) => void
  ) => {
    let response: Response;
    try {
      response = await fetchApi(
        `${ENDPOINT}/${model}:streamGenerateContent?alt=sse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify(request),
          signal,
        }
      );
    } catch (e) {
      if (signal?.aborted) throw e;
      return { status: 0, message: BROKE };
    }
    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => null)) as GeminiResponse | null;
      return { status: response.status, message: body?.error?.message ?? "" };
    }
    const answer = await readAnswer(response, onText);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return { status: response.status, message: "", answer };
  };

  /** The subtitles from `from` on, as far as one answer gets. */
  const part = async (from: number, onText: (text: string) => void) => {
    let status = 0;
    for (let i = nextUsable(0); i < attempts.length; ) {
      const attempt = attempts[i];
      const options = { light: light && attempt.light, from, quick };
      const result = await ask(
        attempt.model,
        transcriptionRequest(videoId, options),
        onText
      );
      status = result.status;
      if (result.answer) {
        const { answer } = result;
        if (!answer.text.trim() && answer.blockReason) {
          throw new GeminiError(
            `Gemini wouldn't write subtitles for this video (${answer.blockReason}).`,
            "other"
          );
        }
        let read: ReturnType<typeof readTranscription> | null = null;
        try {
          read = readTranscription(answer.text);
        } catch {
          read = null;
        }
        if (read && (read.sentences.length > 0 || !answer.dropped)) {
          return {
            ...read,
            complete:
              !answer.dropped &&
              !read.cutOff &&
              answer.finishReason !== "MAX_TOKENS",
          };
        }
        status = 0;
        failures.push(answer.dropped ? BROKE : "an empty answer");
      } else {
        failures.push(status ? `${status}: ${result.message}` : result.message);
        // Settings a model won't take: the same try again without them.
        if (status === 400 && quick && /thinking/i.test(result.message)) {
          quick = false;
          continue;
        }
        if (status === 400 && /metadata|fps|offset/i.test(result.message)) {
          if (from > 0) {
            clips = false;
            throw errorFor(status, failures);
          }
          if (options.light) {
            light = false;
            continue;
          }
        }
        // Out for today, or retired: straight on to the next model.
        if (
          status === 404 ||
          (status === 429 && DAILY_LIMIT.test(result.message))
        ) {
          skipped.add(attempt.model);
          i = nextUsable(i + 1);
          if (i < attempts.length) onRetry?.(i + 1, attempts.length);
          continue;
        }
        if (!worthRetrying(status)) throw errorFor(status, failures);
      }
      i = nextUsable(i + 1);
      if (i < attempts.length) {
        onRetry?.(i + 1, attempts.length);
        await sleep(attempts[i].wait);
      }
    }
    throw errorFor(status, failures);
  };

  const cues: Cue[] = [];
  let language = "";
  let cutOff = false;
  let from = 0;
  const reached = () => {
    const last = cues[cues.length - 1];
    return last ? (last.end ?? last.start) : 0;
  };
  for (let round = 0; ; round++) {
    // Progress as the answer streams in: the sentences so far and the time
    // of the last one.
    const onText = (text: string) => {
      const starts = [...text.matchAll(/"start"\s*:\s*"([^"]+)"/g)];
      const time = parseTime(starts[starts.length - 1]?.[1] ?? "");
      if (Number.isNaN(time)) return;
      onProgress?.({
        upTo: from > 0 && fromPartStart(time, from) ? time + from : time,
        sentences: cues.length + starts.length,
      });
    };
    let result: Awaited<ReturnType<typeof part>>;
    try {
      result = await part(from, onText);
    } catch (e) {
      // What's written down so far is kept.
      if (cues.length > 0 && !signal?.aborted) {
        cutOff = true;
        break;
      }
      throw e;
    }
    if (round === 0) {
      language = result.language.toLowerCase();
      if (language && !/^(id|in|ind)\b/.test(language)) {
        throw new GeminiError(
          `This video seems to be in another language (${result.language}), not Indonesian.`,
          "language"
        );
      }
    }
    let found = cuesFromSentences(result.sentences);
    if (from > 0 && found.length > 0 && fromPartStart(found[0].start, from)) {
      found = found.map((c) => ({
        ...c,
        start: c.start + from,
        end: c.end === undefined ? undefined : c.end + from,
      }));
    }
    // A part may start by repeating the sentence the last one ended with.
    const after = cues.length > 0 ? reached() - 0.5 : Number.NEGATIVE_INFINITY;
    const recent = new Set(cues.slice(-2).map((c) => c.text.toLowerCase()));
    while (found.length > 0 && recent.has(found[0].text.toLowerCase())) {
      found.shift();
    }
    cues.push(...found.filter((c) => c.start >= after));
    if (cues.length > 0)
      onProgress?.({ upTo: reached(), sentences: cues.length });
    if (result.complete) break;
    // Cut off or disconnected: carry on from the last sentence.
    const next = reached();
    if (!clips || round >= MAX_PARTS - 1 || next < from + 2) {
      cutOff = true;
      break;
    }
    from = next;
  }
  if (cues.length === 0) {
    throw new GeminiError(
      "Gemini heard nobody speaking in this video.",
      "video"
    );
  }
  return { cues, language, cutOff };
}
