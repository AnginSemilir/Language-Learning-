import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiError, type Transcription } from "./gemini";
import { type VideoJob, addVideoJob, resetVideoJobs } from "./queue";

const saved: { title: string; scenes: number }[] = [];
vi.mock("../data-layer", () => ({
  saveVideoLesson: async ({
    title,
    video,
  }: { title: string; video: { scenes: unknown[] } }) => {
    saved.push({ title, scenes: video.scenes.length });
    return `lesson-${saved.length}`;
  },
}));

const transcription: Transcription = {
  language: "id",
  cutOff: false,
  cues: [
    { start: 0, end: 2, text: "Halo.", translation: "Hello." },
    { start: 2, end: 6, text: "Apa kabar?", translation: "How are you?" },
  ],
};

function finished(
  id: string,
  title: string,
  transcribe: () => Promise<Transcription>
) {
  return new Promise<VideoJob>((resolve) =>
    addVideoJob({ id, title }, { transcribe, onDone: resolve })
  );
}

describe("video queue", () => {
  afterEach(() => {
    resetVideoJobs();
    saved.length = 0;
  });

  it("transcribes videos one at a time and saves each as a lesson", async () => {
    const order: string[] = [];
    const transcribe = (name: string) => async () => {
      order.push(`start ${name}`);
      await new Promise((r) => setTimeout(r, 10));
      order.push(`end ${name}`);
      return transcription;
    };
    const [a, b] = await Promise.all([
      finished("aaaaaaaaaaa", "A", transcribe("A")),
      finished("bbbbbbbbbbb", "B", transcribe("B")),
    ]);
    expect(order).toEqual(["start A", "end A", "start B", "end B"]);
    expect(a).toMatchObject({ status: "done", lessonId: "lesson-1" });
    expect(b).toMatchObject({ status: "done", lessonId: "lesson-2" });
    expect(saved).toEqual([
      { title: "A", scenes: 1 },
      { title: "B", scenes: 1 },
    ]);
  });

  it("keeps the problem, and a video can be added again", async () => {
    const failed = await finished("aaaaaaaaaaa", "A", async () => {
      throw new GeminiError("Gemini's free limit is used up for now.", "busy");
    });
    expect(failed).toMatchObject({ status: "failed", problem: "busy" });
    const again = await finished("aaaaaaaaaaa", "A", async () => transcription);
    expect(again.status).toBe("done");
    // Deleted and added once more: it's done again, not ignored.
    const third = await finished("aaaaaaaaaaa", "A", async () => transcription);
    expect(third.lessonId).toBe("lesson-2");
  });
});
