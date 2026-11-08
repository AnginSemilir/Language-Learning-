import { describe, expect, it, vi } from "vitest";
import {
  GoogleTranslateError,
  googleTranslate,
  readGoogleAnswer,
} from "./googleTranslate";

const RUMAH = {
  sentences: [{ trans: "house", orig: "rumah", backend: 10 }],
  dict: [
    {
      pos: "noun",
      terms: ["house", "home", "dwelling", "residence"],
      entry: [],
      base_form: "rumah",
      pos_enum: 1,
    },
  ],
  src: "id",
};

describe("Google Translate", () => {
  it("reads the translation and a word's other meanings", () => {
    expect(readGoogleAnswer(RUMAH)).toEqual({
      text: "house",
      alternatives: [{ pos: "noun", words: ["home", "dwelling", "residence"] }],
    });
    expect(
      readGoogleAnswer({
        sentences: [{ trans: "I eat rice. " }, { trans: "It's tasty." }],
      })
    ).toEqual({ text: "I eat rice. It's tasty.", alternatives: [] });
  });

  it("asks for the text, from and to the languages given", async () => {
    const fetchApi = vi.fn(async (_url: string) => Response.json(RUMAH));
    const result = await googleTranslate("rumah", {
      fetchApi: fetchApi as unknown as typeof fetch,
    });
    expect(result.text).toBe("house");
    const url = new URL(fetchApi.mock.calls[0][0]);
    expect(url.hostname).toBe("translate.googleapis.com");
    expect(url.searchParams.get("q")).toBe("rumah");
    expect(url.searchParams.get("sl")).toBe("id");
    expect(url.searchParams.get("tl")).toBe("en");
    expect(url.searchParams.getAll("dt")).toEqual(["t", "bd"]);
  });

  it("says when Google doesn't answer or pauses it", async () => {
    const down = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    await expect(googleTranslate("rumah", { fetchApi: down })).rejects.toThrow(
      GoogleTranslateError
    );
    const paused = (async () =>
      new Response("", { status: 429 })) as unknown as typeof fetch;
    await expect(
      googleTranslate("rumah", { fetchApi: paused })
    ).rejects.toThrow(/pausing/);
    await expect(googleTranslate("  ")).rejects.toThrow(/nothing/);
  });
});
