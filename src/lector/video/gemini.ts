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
import { parseTime } from "./subtitles";

/** Always Google's latest Flash model. */
export const GEMINI_MODEL = "gemini-flash-latest";
/** Tried when the Flash model is overloaded or out of free quota. */
export const GEMINI_FALLBACK_MODEL = "gemini-flash-lite-latest";
export const GEMINI_NAME = "Gemini";

const KEY_STORAGE = "kartu.geminiKey";
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

/**
 * The request for one video. A light one samples a frame every 5 seconds
 * instead of every second, which takes a long video's tokens under the free
 * tier's limit per minute.
 */
export function transcriptionRequest(videoId: string, { light = false } = {}) {
  const video = {
    fileData: { fileUri: `https://www.youtube.com/watch?v=${videoId}` },
    ...(light ? { videoMetadata: { fps: LIGHT_FPS } } : {}),
  };
  return {
    systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
    contents: [
      {
        role: "user",
        parts: [video, { text: "Write the subtitles for this video." }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      // The words matter, not the picture: fewer tokens per frame.
      mediaResolution: "MEDIA_RESOLUTION_LOW",
      maxOutputTokens: 65536,
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

/** What Google said to each try, shortened, for the end of a message. */
function said(failures: string[]) {
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
  return `(Google said ${parts.join("; then ")})`;
}

interface GeminiResponse {
  error?: { message?: string };
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
  promptFeedback?: { blockReason?: string };
}

/** The error for the last try, with what Google said to every try. */
export function errorFor(status: number, failures: string[]): GeminiError {
  const last = failures[failures.length - 1] ?? "";
  const message = last.replace(/^\d+: /, "");
  if (status === 400 && /api key/i.test(message)) {
    return new GeminiError(
      "Google didn't accept the Gemini API key. Check it in Settings → Dictionary.",
      "key"
    );
  }
  if (status === 401 || status === 403) {
    return new GeminiError(
      `This Gemini API key can't be used for this. ${said(failures)}`,
      "key"
    );
  }
  if (status === 429) {
    return new GeminiError(
      `Gemini's free limit stopped this: try again in a minute, or tomorrow if today's limit is used. ${said(failures)}`,
      "busy"
    );
  }
  if (status >= 500) {
    return new GeminiError(
      `Gemini couldn't do it just now, even after trying again. Try again in a few minutes. ${said(failures)}`,
      "busy"
    );
  }
  if (/video|youtube|file_?uri|private|unavailable/i.test(message)) {
    return new GeminiError(
      `Gemini couldn't watch this video. It has to be public. ${said(failures)}`,
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
  return status === 429 || status >= 500;
}

/** What's tried, in order, while Gemini is overloaded or over a limit. */
export const ATTEMPTS = [
  { model: GEMINI_MODEL, light: false, wait: 0 },
  { model: GEMINI_MODEL, light: true, wait: 3000 },
  { model: GEMINI_FALLBACK_MODEL, light: true, wait: 5000 },
];

export interface Transcription {
  cues: Cue[];
  language: string;
  /** The answer stopped before the end of the video. */
  cutOff: boolean;
}

/** Subtitles for a public YouTube video, by Gemini, with English. */
export async function transcribeVideo(
  videoId: string,
  {
    signal,
    fetchApi = fetch,
    onRetry,
    sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  }: {
    signal?: AbortSignal;
    fetchApi?: typeof fetch;
    /** Before each try after the first: which it is, of how many. */
    onRetry?: (attempt: number, of: number) => void;
    sleep?: (ms: number) => Promise<unknown>;
  } = {}
): Promise<Transcription> {
  const key = getGeminiKey();
  if (!key) {
    throw new GeminiError(
      "Add your Gemini API key in Settings → Dictionary.",
      "key"
    );
  }
  // What Google said to each try that failed, for the message at the end.
  const failures: string[] = [];
  let status = 0;
  let body: GeminiResponse | null = null;
  let light = true;
  for (let i = 0; i < ATTEMPTS.length; i++) {
    const attempt = ATTEMPTS[i];
    if (i > 0) {
      onRetry?.(i + 1, ATTEMPTS.length);
      await sleep(attempt.wait);
    }
    let response: Response;
    try {
      response = await fetchApi(
        `${ENDPOINT}/${attempt.model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify(
            transcriptionRequest(videoId, { light: light && attempt.light })
          ),
          signal,
        }
      );
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new GeminiError(
        "Couldn't reach Gemini. Are you online?",
        "offline"
      );
    }
    status = response.status;
    body = await response.json().catch(() => null);
    if (response.ok) break;
    const message = body?.error?.message ?? "";
    failures.push(message ? `${status}: ${message}` : String(status));
    // A model that won't take the lighter request gets the usual one.
    if (status === 400 && attempt.light && /metadata|fps/i.test(message)) {
      light = false;
      continue;
    }
    if (!worthRetrying(status)) break;
  }
  if (status < 200 || status >= 300) {
    throw errorFor(status, failures);
  }
  const candidate = body?.candidates?.[0];
  if (!candidate) {
    const reason = body?.promptFeedback?.blockReason;
    throw new GeminiError(
      reason
        ? `Gemini wouldn't write subtitles for this video (${reason}).`
        : "Gemini didn't answer. Try again.",
      "other"
    );
  }
  const json = (candidate.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");
  const read = readTranscription(json);
  const cues = cuesFromSentences(read.sentences);
  const language = read.language.toLowerCase();
  if (cues.length === 0) {
    throw new GeminiError(
      "Gemini heard nobody speaking in this video.",
      "video"
    );
  }
  if (language && !/^(id|in|ind)\b/.test(language)) {
    throw new GeminiError(
      `This video seems to be in another language (${read.language}), not Indonesian.`,
      "language"
    );
  }
  return {
    cues,
    language,
    cutOff: read.cutOff || candidate.finishReason === "MAX_TOKENS",
  };
}
