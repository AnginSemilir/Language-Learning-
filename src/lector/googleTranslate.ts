// Google Translate in the app: the translation of a word, phrase or sentence,
// and for a single word the other meanings Google lists by part of speech.
//
// It uses the free web address Google Translate's browser tools use
// (translate.googleapis.com, client "gtx"), called from the user's own
// browser. It isn't an official API: it needs no key, but Google can stop it
// or show a robot check when it sees too many requests, and then this says
// so (Generate with AI still works). The official Cloud Translation API
// needs a billing account.

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";

export interface GoogleTranslation {
  text: string;
  /** Other meanings of a single word, by part of speech. */
  alternatives: { pos: string; words: string[] }[];
}

export class GoogleTranslateError extends Error {}

interface Answer {
  sentences?: { trans?: string }[];
  dict?: { pos?: string; terms?: string[] }[];
}

/** Google's answer (the JSON form, dj=1) as a translation. */
export function readGoogleAnswer(data: unknown): GoogleTranslation {
  const answer = (data ?? {}) as Answer;
  const text = (answer.sentences ?? [])
    .map((s) => s.trans ?? "")
    .join("")
    .trim();
  const alternatives = (answer.dict ?? [])
    .map((d) => ({
      pos: d.pos ?? "",
      words: (d.terms ?? []).filter((w) => w && w !== text).slice(0, 6),
    }))
    .filter((d) => d.words.length > 0);
  return { text, alternatives };
}

export async function googleTranslate(
  text: string,
  {
    from = "id",
    to = "en",
    signal,
    fetchApi = fetch,
  }: {
    from?: string;
    to?: string;
    signal?: AbortSignal;
    fetchApi?: typeof fetch;
  } = {}
): Promise<GoogleTranslation> {
  const query = text.trim();
  if (!query) throw new GoogleTranslateError("There's nothing to translate.");
  const url = `${ENDPOINT}?client=gtx&dj=1&dt=t&dt=bd&sl=${from}&tl=${to}&q=${encodeURIComponent(query)}`;
  let response: Response;
  try {
    response = await fetchApi(url, { signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new GoogleTranslateError(
      "Google Translate didn't answer. Check your connection; if it keeps happening, Google may be pausing it for a while, so use Generate with AI."
    );
  }
  if (!response.ok) {
    throw new GoogleTranslateError(
      response.status === 429
        ? "Google Translate is pausing requests for a while. Try again later, or use Generate with AI."
        : `Google Translate answered ${response.status}. Try again later, or use Generate with AI.`
    );
  }
  const result = readGoogleAnswer(await response.json().catch(() => null));
  if (!result.text) {
    throw new GoogleTranslateError("Google Translate gave no translation.");
  }
  return result;
}
