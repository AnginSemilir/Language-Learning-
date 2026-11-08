import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cuesFromSentences,
  readTranscription,
  setGeminiKey,
  transcribeVideo,
  transcriptionRequest,
} from "./gemini";
import {
  groupScenes,
  isPunctuated,
  makeScenes,
  sceneMarkdown,
  sentencesOf,
} from "./scenes";
import {
  formatTime,
  parseSubtitleFile,
  parseTime,
  parseTranscript,
  timedCues,
} from "./subtitles";
import {
  channelVideos,
  videoInfo,
  videosFromMarkdown,
  youtubeId,
} from "./youtube";

describe("youtubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ?feature=share", "dQw4w9WgXcQ"],
    ["Lihat ini https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("%s", (link, id) => {
    expect(youtubeId(link)).toBe(id);
  });

  it("isn't fooled by other sites or channel links", () => {
    expect(youtubeId("https://vimeo.com/123456789")).toBeNull();
    expect(youtubeId("https://www.youtube.com/@kompastv")).toBeNull();
    expect(youtubeId("not a link")).toBeNull();
  });
});

describe("times", () => {
  it("reads subtitle and transcript times", () => {
    expect(parseTime("00:01:02,500")).toBe(62.5);
    expect(parseTime("01:02.25")).toBe(62.25);
    expect(parseTime("1:02:03")).toBe(3723);
    expect(parseTime("62.5")).toBe(62.5);
    expect(parseTime("soon")).toBeNaN();
  });

  it("shows them", () => {
    expect(formatTime(62.9)).toBe("1:02");
    expect(formatTime(3723)).toBe("1:02:03");
  });
});

describe("parseSubtitleFile", () => {
  it("reads SRT cues with their times", () => {
    const srt = `1
00:00:01,000 --> 00:00:03,500
<i>Selamat pagi.</i>

2
00:00:04,000 --> 00:00:06,000
- Apa kabar?
- Baik.
`;
    expect(parseSubtitleFile(srt)).toEqual([
      { start: 1, end: 3.5, text: "Selamat pagi." },
      { start: 4, end: 6, text: "Apa kabar? Baik." },
    ]);
  });

  it("keeps each line of YouTube's scrolling WebVTT once", () => {
    const vtt = `WEBVTT
Kind: captions
Language: id

00:00:00.160 --> 00:00:02.869 align:start position:0%

halo<00:00:00.480><c> semuanya</c>

00:00:02.869 --> 00:00:02.879 align:start position:0%
halo semuanya


00:00:02.879 --> 00:00:05.000 align:start position:0%
halo semuanya
selamat<00:00:03.200><c> datang</c>
`;
    expect(parseSubtitleFile(vtt).map((c) => c.text)).toEqual([
      "halo semuanya",
      "selamat datang",
    ]);
  });

  it("drops sounds in brackets", () => {
    const srt =
      "1\n00:00:01,000 --> 00:00:02,000\n[Musik]\n\n2\n00:00:02,000 --> 00:00:03,000\nYa [tertawa] benar.\n";
    expect(parseSubtitleFile(srt).map((c) => c.text)).toEqual(["Ya benar."]);
  });
});

describe("parseTranscript", () => {
  it("reads YouTube's transcript, times on their own lines", () => {
    const pasted = `0:00
halo semuanya selamat datang
0:04
4 detik
di channel saya
1:02:03
terima kasih`;
    expect(parseTranscript(pasted)).toEqual([
      { start: 0, text: "halo semuanya selamat datang" },
      { start: 4, text: "di channel saya" },
      { start: 3723, text: "terima kasih" },
    ]);
  });

  it("reads times in front of the text", () => {
    expect(parseTranscript("0:01 Halo.\n0:05 Apa kabar?")).toEqual([
      { start: 1, text: "Halo." },
      { start: 5, text: "Apa kabar?" },
    ]);
  });
});

describe("timedCues", () => {
  it("gives each cue an end and keeps the order", () => {
    expect(
      timedCues([
        { start: 5, text: "dua" },
        { start: 1, text: "satu" },
      ])
    ).toEqual([
      { start: 1, end: 5, text: "satu", translation: "" },
      { start: 5, end: 7 + 1 / 3, text: "dua", translation: "" },
    ]);
  });
});

describe("scenes", () => {
  it("re-cuts punctuated cues into sentences with their times", () => {
    const units = sentencesOf(
      timedCues([
        { start: 0, end: 4, text: "Saya suka kopi. Kamu" },
        { start: 4, end: 6, text: "suka teh?" },
      ])
    );
    expect(units.map((u) => u.text)).toEqual([
      "Saya suka kopi.",
      "Kamu suka teh?",
    ]);
    expect(units[0].start).toBe(0);
    expect(units[0].end).toBeCloseTo(3, 0);
    expect(units[1].start).toBeGreaterThan(3);
    expect(units[1].end).toBe(6);
  });

  it("doesn't end a sentence at an abbreviation or in a number", () => {
    const units = sentencesOf(
      timedCues([
        { start: 0, end: 5, text: "Harganya Rp. 3.000 dll. Murah sekali." },
      ])
    );
    expect(units.map((u) => u.text)).toEqual([
      "Harganya Rp. 3.000 dll. Murah sekali.",
    ]);
  });

  it("puts a couple of sentences in each scene", () => {
    const cues = [
      { start: 0, end: 3, text: "Halo semuanya." },
      { start: 3, end: 6, text: "Selamat datang." },
      { start: 6, end: 9, text: "Hari ini kita masak." },
      { start: 9, end: 12, text: "Ini nasi goreng." },
      { start: 12, end: 15, text: "Enak sekali." },
    ];
    const scenes = makeScenes(cues, { sentencePerCue: true });
    expect(scenes.map((s) => s.text)).toEqual([
      "Halo semuanya. Selamat datang.",
      "Hari ini kita masak. Ini nasi goreng.",
      "Enak sekali.",
    ]);
    expect(scenes[1]).toMatchObject({ start: 6, end: 12 });
  });

  it("keeps a long sentence on its own and ends a scene at a long pause", () => {
    const scenes = makeScenes(
      [
        { start: 0, end: 14, text: "Satu kalimat yang sangat panjang sekali." },
        { start: 14, end: 16, text: "Pendek." },
        { start: 16, end: 21, text: "Lalu diam." },
        { start: 25, end: 27, text: "Mulai lagi." },
      ],
      { sentencePerCue: true }
    );
    expect(scenes.map((s) => s.text)).toEqual([
      "Satu kalimat yang sangat panjang sekali.",
      "Pendek. Lalu diam.",
      "Mulai lagi.",
    ]);
  });

  it("cuts subtitles without punctuation about every 10 seconds", () => {
    const cues = Array.from({ length: 12 }, (_, i) => ({
      start: i * 3,
      end: i * 3 + 3,
      text: `kata ke ${i} tanpa titik`,
    }));
    expect(isPunctuated(cues)).toBe(false);
    const scenes = makeScenes(cues);
    expect(scenes.length).toBe(3);
    expect(scenes[0]).toMatchObject({ start: 0, end: 12 });
  });

  it("carries English along", () => {
    const scenes = groupScenes(
      [
        { start: 0, end: 3, text: "Halo.", translation: "Hello." },
        { start: 3, end: 6, text: "Apa kabar?", translation: "How are you?" },
      ],
      true
    );
    expect(scenes).toEqual([
      {
        start: 0,
        end: 6,
        text: "Halo. Apa kabar?",
        translation: "Hello. How are you?",
      },
    ]);
  });

  it("keeps subtitles from being read as Markdown", () => {
    expect(sceneMarkdown("# 1 *wow* [ya]")).toBe("\\# 1 \\*wow\\* \\[ya\\]");
    expect(sceneMarkdown("1. Pertama")).toBe("1\\. Pertama");
    expect(sceneMarkdown("- Ya, betul")).toBe("\\- Ya, betul");
  });
});

describe("Gemini", () => {
  afterEach(() => {
    setGeminiKey("");
    vi.restoreAllMocks();
  });

  it("asks about the YouTube link", () => {
    const request = transcriptionRequest("dQw4w9WgXcQ");
    expect(request.contents[0].parts[0]).toEqual({
      fileData: { fileUri: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });
    expect(request.generationConfig.responseMimeType).toBe("application/json");
  });

  it("reads the sentences, and what's there of a cut-off answer", () => {
    const whole = readTranscription(
      '{"language":"id","sentences":[{"start":"0:01.5","end":"0:03","text":"Halo.","english":"Hello."}]}'
    );
    expect(whole).toMatchObject({ language: "id", cutOff: false });
    const cut = readTranscription(
      '{"language":"id","sentences":[{"start":"0:01","end":"0:02","text":"Satu.","english":"One."},{"start":"0:03","end":"0:0'
    );
    expect(cut.cutOff).toBe(true);
    expect(cut.sentences).toHaveLength(1);
  });

  it("turns sentences into cues", () => {
    expect(
      cuesFromSentences([
        { start: "0:05", end: "0:04", text: "Dua.", english: "Two." },
        { start: "0:01.5", end: "0:03", text: " Satu. ", english: "One." },
        { start: "?", text: "Hilang." },
      ])
    ).toEqual([
      { start: 1.5, end: 3, text: "Satu.", translation: "One." },
      { start: 5, end: undefined, text: "Dua.", translation: "Two." },
    ]);
  });

  it("calls the API with the key and reads the answer", async () => {
    setGeminiKey("AIza-test");
    const fetchApi = vi.fn(async () =>
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: '{"language":"id","sentences":[{"start":"0:00.5","end":"0:02","text":"Halo semua.","english":"Hi all."}]}',
                },
              ],
            },
          },
        ],
      })
    );
    const result = await transcribeVideo("dQw4w9WgXcQ", {
      fetchApi: fetchApi as unknown as typeof fetch,
    });
    expect(result.cues).toEqual([
      { start: 0.5, end: 2, text: "Halo semua.", translation: "Hi all." },
    ]);
    const [url, init] = fetchApi.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain(":streamGenerateContent?alt=sse");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "AIza-test"
    );
  });

  it("says when the key is missing, wrong or the free limit is used", async () => {
    await expect(transcribeVideo("dQw4w9WgXcQ")).rejects.toMatchObject({
      problem: "key",
    });
    setGeminiKey("bad");
    const answer = (status: number, message: string) =>
      (async () =>
        Response.json(
          { error: { message } },
          { status }
        )) as unknown as typeof fetch;
    await expect(
      transcribeVideo("dQw4w9WgXcQ", {
        fetchApi: answer(
          400,
          "API key not valid. Please pass a valid API key."
        ),
      })
    ).rejects.toMatchObject({ problem: "key" });
    await expect(
      transcribeVideo("dQw4w9WgXcQ", {
        fetchApi: answer(429, "Resource has been exhausted"),
        sleep: async () => {},
      })
    ).rejects.toMatchObject({ problem: "busy" });
  });

  const ANSWER = {
    candidates: [
      {
        content: {
          parts: [
            {
              text: '{"language":"id","sentences":[{"start":"0:00","end":"0:02","text":"Halo.","english":"Hello."}]}',
            },
          ],
        },
      },
    ],
  };

  /**
   * A fake API answering each call in turn, keeping what was asked: a status
   * and JSON body, a ready-made (streamed) response, or a broken connection.
   */
  function answers(...replies: ([number, unknown] | Response | "broken")[]) {
    const calls: {
      url: string;
      body: ReturnType<typeof transcriptionRequest>;
    }[] = [];
    const fetchApi = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      const reply = replies[calls.length - 1];
      if (reply === "broken") throw new TypeError("Failed to fetch");
      if (reply instanceof Response) return reply;
      const [status, body] = reply;
      return Response.json(body, { status });
    }) as unknown as typeof fetch;
    return { calls, fetchApi };
  }

  /** A streamed answer: the text in server-sent events, cut where told. */
  function streamed(
    pieces: string[],
    {
      finish = "STOP",
      breaks = false,
    }: { finish?: string; breaks?: boolean } = {}
  ) {
    const encoder = new TextEncoder();
    const events = pieces.map(
      (text, i) =>
        `data: ${JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text }] },
              ...(i === pieces.length - 1 && !breaks
                ? { finishReason: finish }
                : {}),
            },
          ],
        })}\r\n\r\n`
    );
    // Split mid-event too, as a network does.
    const all = events.join("");
    const chunks = [all.slice(0, 37), all.slice(37, 120), all.slice(120)];
    // Each piece is read before the connection breaks.
    let next = 0;
    return new Response(
      new ReadableStream({
        pull(controller) {
          if (next < chunks.length) {
            controller.enqueue(encoder.encode(chunks[next++]));
          } else if (breaks) {
            controller.error(new TypeError("network error"));
          } else {
            controller.close();
          }
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const sentence = (start: string, end: string, text: string) =>
    JSON.stringify({ start, end, text, english: text });

  it("asks for fewer frames in a lighter request", () => {
    expect(
      transcriptionRequest("dQw4w9WgXcQ", { light: true }).contents[0].parts[0]
    ).toEqual({
      fileData: { fileUri: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      videoMetadata: { fps: 0.2 },
    });
  });

  it("tries again, lighter, when Gemini is overloaded", async () => {
    setGeminiKey("AIza-test");
    const { calls, fetchApi } = answers(
      [503, { error: { message: "The model is overloaded." } }],
      [200, ANSWER]
    );
    const retries: string[] = [];
    const result = await transcribeVideo("dQw4w9WgXcQ", {
      fetchApi,
      sleep: async () => {},
      onRetry: (n, of) => retries.push(`${n}/${of}`),
    });
    expect(result.cues).toHaveLength(1);
    expect(retries).toEqual(["2/4"]);
    expect(calls[0].url).toContain("/gemini-flash-latest:");
    expect(calls[1].body.contents[0].parts[0]).toHaveProperty("videoMetadata");
  });

  it("falls back to Flash-Lite, then says what happened each time", async () => {
    setGeminiKey("AIza-test");
    const { calls, fetchApi } = answers(
      [429, { error: { message: "Quota exceeded, limit: 0" } }],
      [503, { error: { message: "The model is overloaded." } }],
      [503, { error: { message: "The model is overloaded." } }],
      [500, { error: { message: "Internal error encountered." } }]
    );
    const error = await transcribeVideo("dQw4w9WgXcQ", {
      fetchApi,
      sleep: async () => {},
    }).catch((e) => e);
    expect(calls.map((c) => c.url.match(/models\/([^:]+)/)?.[1])).toEqual([
      "gemini-flash-latest",
      "gemini-flash-latest",
      "gemini-3.5-flash",
      "gemini-flash-lite-latest",
    ]);
    expect(error).toMatchObject({ problem: "busy" });
    expect(error.message).toContain(
      "(Details: 429: Quota exceeded, limit: 0; then 503: The model is overloaded. (2 times); then 500: Internal error encountered.)"
    );
  });

  it("drops the lighter request if the model won't take it", async () => {
    setGeminiKey("AIza-test");
    const { calls, fetchApi } = answers(
      [503, { error: { message: "The model is overloaded." } }],
      [400, { error: { message: 'Unknown name "videoMetadata"' } }],
      [200, ANSWER]
    );
    await transcribeVideo("dQw4w9WgXcQ", { fetchApi, sleep: async () => {} });
    expect(calls[2].body.contents[0].parts[0]).not.toHaveProperty(
      "videoMetadata"
    );
  });

  it("says a message repeated once", async () => {
    setGeminiKey("AIza-test");
    const busy: [number, unknown] = [
      503,
      { error: { message: "Overloaded." } },
    ];
    const { fetchApi } = answers(busy, busy, busy, busy);
    const error = await transcribeVideo("dQw4w9WgXcQ", {
      fetchApi,
      sleep: async () => {},
    }).catch((e) => e);
    expect(error.message).toContain("(Details: 503: Overloaded. (4 times))");
  });

  it("reads an answer as it streams in, with its progress", async () => {
    setGeminiKey("AIza-test");
    const { fetchApi } = answers(
      streamed([
        `{"language":"id","sentences":[${sentence("0:01", "0:03", "Satu.")},`,
        `${sentence("0:04", "0:06", "Dua.")},${sentence("0:07", "0:09", "Tiga.")}]}`,
      ])
    );
    const progress: string[] = [];
    const result = await transcribeVideo("dQw4w9WgXcQ", {
      fetchApi,
      onProgress: (p) => progress.push(`${p.upTo}/${p.sentences}`),
    });
    expect(result.cues.map((c) => c.text)).toEqual(["Satu.", "Dua.", "Tiga."]);
    expect(result.cutOff).toBe(false);
    expect(progress.length).toBeGreaterThan(1);
    expect(progress[progress.length - 1]).toBe("9/3");
  });

  it("carries on from where a broken connection stopped", async () => {
    setGeminiKey("AIza-test");
    const { calls, fetchApi } = answers(
      streamed(
        [
          `{"language":"id","sentences":[${sentence("0:01", "0:20", "Satu.")},`,
          `${sentence("0:21", "0:40", "Dua.")},{"start":"0:41","en`,
        ],
        { breaks: true }
      ),
      // The rest, with times from the start of the part.
      streamed([
        `{"language":"id","sentences":[${sentence("0:00", "0:02", "Dua.")},${sentence("0:03", "0:10", "Tiga.")}]}`,
      ])
    );
    const result = await transcribeVideo("dQw4w9WgXcQ", {
      fetchApi,
      sleep: async () => {},
    });
    expect(calls[1].body.contents[0].parts[0]).toMatchObject({
      videoMetadata: { startOffset: "40s" },
    });
    expect(result.cues.map((c) => [c.start, c.text])).toEqual([
      [1, "Satu."],
      [21, "Dua."],
      [43, "Tiga."],
    ]);
    expect(result.cutOff).toBe(false);
  });

  it("carries on after a long answer is cut off, times kept as given", async () => {
    setGeminiKey("AIza-test");
    const { calls, fetchApi } = answers(
      streamed(
        [
          `{"language":"id","sentences":[${sentence("1:00", "1:30", "Satu.")},{"start":"1:3`,
        ],
        { finish: "MAX_TOKENS" }
      ),
      streamed([
        `{"language":"id","sentences":[${sentence("1:31", "1:40", "Dua.")}]}`,
      ])
    );
    const result = await transcribeVideo("dQw4w9WgXcQ", { fetchApi });
    expect(calls[1].body.contents[0].parts[0]).toMatchObject({
      videoMetadata: { startOffset: "90s" },
    });
    expect(result.cues.map((c) => [c.start, c.text])).toEqual([
      [60, "Satu."],
      [91, "Dua."],
    ]);
  });

  it("keeps what's written when the rest can't be had", async () => {
    setGeminiKey("AIza-test");
    const busy: [number, unknown] = [
      503,
      { error: { message: "Overloaded." } },
    ];
    const { fetchApi } = answers(
      streamed(
        [`{"language":"id","sentences":[${sentence("0:01", "0:30", "Satu.")},`],
        { breaks: true }
      ),
      busy,
      busy,
      busy,
      busy
    );
    const result = await transcribeVideo("dQw4w9WgXcQ", {
      fetchApi,
      sleep: async () => {},
    });
    expect(result.cues.map((c) => c.text)).toEqual(["Satu."]);
    expect(result.cutOff).toBe(true);
  });

  it("tries again when the connection fails, and says so if it keeps failing", async () => {
    setGeminiKey("AIza-test");
    const ok = answers("broken", [200, ANSWER]);
    const result = await transcribeVideo("dQw4w9WgXcQ", {
      fetchApi: ok.fetchApi,
      sleep: async () => {},
    });
    expect(result.cues).toHaveLength(1);
    const bad = answers("broken", "broken", "broken", "broken");
    await expect(
      transcribeVideo("dQw4w9WgXcQ", {
        fetchApi: bad.fetchApi,
        sleep: async () => {},
      })
    ).rejects.toMatchObject({ problem: "offline" });
  });

  it("asks for little thinking, and drops it if the model won't take it", async () => {
    setGeminiKey("AIza-test");
    const { calls, fetchApi } = answers(
      [
        400,
        {
          error: { message: "Thinking level is not supported for this model." },
        },
      ],
      [200, ANSWER]
    );
    const retries: number[] = [];
    await transcribeVideo("dQw4w9WgXcQ", {
      fetchApi,
      sleep: async () => {},
      onRetry: (n) => retries.push(n),
    });
    expect(calls[0].body.generationConfig).toMatchObject({
      thinkingConfig: { thinkingLevel: "low" },
    });
    expect(calls[1].body.generationConfig).not.toHaveProperty("thinkingConfig");
    expect(retries).toEqual([]);
  });

  it("moves straight to the next model when one is out for the day", async () => {
    setGeminiKey("AIza-test");
    const { calls, fetchApi } = answers(
      [
        429,
        {
          error: {
            message:
              "Quota exceeded for metric: generate_content_free_tier_requests, limit: 20, model: gemini-3.8-flash, description: Generate content requests per day limit exceeded on Free Tier.",
          },
        },
      ],
      [200, ANSWER]
    );
    const waits: number[] = [];
    await transcribeVideo("dQw4w9WgXcQ", {
      fetchApi,
      sleep: async (ms) => waits.push(ms),
    });
    expect(calls.map((c) => c.url.match(/models\/([^:]+)/)?.[1])).toEqual([
      "gemini-flash-latest",
      "gemini-3.5-flash",
    ]);
    expect(waits).toEqual([]);
  });

  it("starts with the quicker model when chosen, and skips a retired one", async () => {
    setGeminiKey("AIza-test");
    const { calls, fetchApi } = answers(
      [404, { error: { message: "This model is no longer available." } }],
      [200, ANSWER]
    );
    await transcribeVideo("dQw4w9WgXcQ", {
      fetchApi,
      model: "fast",
      sleep: async () => {},
    });
    expect(calls.map((c) => c.url.match(/models\/([^:]+)/)?.[1])).toEqual([
      "gemini-3.5-flash",
      "gemini-flash-latest",
    ]);
  });

  it("doesn't try again when the video is the problem", async () => {
    setGeminiKey("AIza-test");
    const { calls, fetchApi } = answers([
      400,
      { error: { message: "The YouTube video is private." } },
    ]);
    await expect(
      transcribeVideo("dQw4w9WgXcQ", { fetchApi, sleep: async () => {} })
    ).rejects.toMatchObject({ problem: "video" });
    expect(calls).toHaveLength(1);
  });

  it("turns down a video in another language", async () => {
    setGeminiKey("AIza-test");
    const fetchApi = (async () =>
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"language":"en","sentences":[{"start":"0:00","end":"0:02","text":"Hello.","english":"Hello."}]}',
                },
              ],
            },
          },
        ],
      })) as unknown as typeof fetch;
    await expect(
      transcribeVideo("dQw4w9WgXcQ", { fetchApi })
    ).rejects.toMatchObject({ problem: "language" });
  });
});

describe("channels", () => {
  it("finds the videos in a channel page's Markdown", () => {
    const markdown = `[![Image 3](https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg)](https://www.youtube.com/watch?v=aaaaaaaaaaa)

### [Belajar Bahasa Indonesia [Bagian 1]](https://www.youtube.com/watch?v=aaaaaaaaaaa "Belajar")

12K views • 2 weeks ago

[](https://www.youtube.com/watch?v=bbbbbbbbbbb)

[Masak Nasi Goreng](https://www.youtube.com/watch?v=bbbbbbbbbbb&pp=0gcJCX)

[Shorts video](https://www.youtube.com/shorts/ccccccccccc)

[Home](https://www.youtube.com/)`;
    expect(videosFromMarkdown(markdown)).toEqual([
      { id: "aaaaaaaaaaa", title: "Belajar Bahasa Indonesia [Bagian 1]" },
      { id: "bbbbbbbbbbb", title: "Masak Nasi Goreng" },
      { id: "ccccccccccc", title: "Shorts video" },
    ]);
  });

  it("reads the channel's Videos page through Jina Reader", async () => {
    const fetchApi = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response("[Satu](https://www.youtube.com/watch?v=aaaaaaaaaaa)")
    );
    const videos = await channelVideos(
      "https://www.youtube.com/@belajar/",
      fetchApi as unknown as typeof fetch
    );
    expect(videos).toEqual([{ id: "aaaaaaaaaaa", title: "Satu" }]);
    expect(fetchApi.mock.calls[0][0]).toBe(
      "https://r.jina.ai/https://www.youtube.com/@belajar/videos"
    );
  });

  it("gets a video's title and channel from oEmbed, then noembed", async () => {
    const fetchApi = vi.fn(async (url: string) =>
      url.startsWith("https://www.youtube.com/oembed")
        ? new Response("", { status: 401 })
        : Response.json({
            title: "Belajar",
            author_name: "Guru",
            author_url: "https://www.youtube.com/@guru",
          })
    );
    expect(
      await videoInfo("aaaaaaaaaaa", fetchApi as unknown as typeof fetch)
    ).toEqual({
      id: "aaaaaaaaaaa",
      title: "Belajar",
      channel: "Guru",
      channelUrl: "https://www.youtube.com/@guru",
    });
  });
});
