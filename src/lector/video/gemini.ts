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

/** The request for one video. */
export function transcriptionRequest(videoId: string) {
  return {
    systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            fileData: {
              fileUri: `https://www.youtube.com/watch?v=${videoId}`,
            },
          },
          { text: "Write the subtitles for this video." },
        ],
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

function errorFor(status: number, message: string): GeminiError {
  if (status === 400 && /api key/i.test(message)) {
    return new GeminiError(
      "Google didn't accept the Gemini API key. Check it in Settings → Dictionary.",
      "key"
    );
  }
  if (status === 401 || status === 403) {
    return new GeminiError(
      `This Gemini API key can't be used for this: ${message}`,
      "key"
    );
  }
  if (status === 429) {
    return new GeminiError(
      "Gemini's free limit is used up for now. Try again in a minute, or tomorrow if today's limit is used.",
      "busy"
    );
  }
  if (status >= 500) {
    return new GeminiError(
      "Gemini is busy right now. Try again in a moment.",
      "busy"
    );
  }
  if (/video|youtube|file_?uri|private|unavailable/i.test(message)) {
    return new GeminiError(
      `Gemini couldn't watch this video. It has to be public. (${message})`,
      "video"
    );
  }
  return new GeminiError(message || `Gemini answered ${status}.`, "other");
}

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
  }: { signal?: AbortSignal; fetchApi?: typeof fetch } = {}
): Promise<Transcription> {
  const key = getGeminiKey();
  if (!key) {
    throw new GeminiError(
      "Add your Gemini API key in Settings → Dictionary.",
      "key"
    );
  }
  let response: Response;
  try {
    response = await fetchApi(`${ENDPOINT}/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(transcriptionRequest(videoId)),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new GeminiError("Couldn't reach Gemini. Are you online?", "offline");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw errorFor(response.status, body?.error?.message ?? "");
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
    .filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? "")
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
