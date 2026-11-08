// Videos being added with Gemini's subtitles, one at a time, while the user
// carries on: adding several videos from a channel queues them. The queue
// lives as long as the page; a video whose subtitles are done is saved as a
// lesson straight away.

import { useSyncExternalStore } from "react";
import { saveVideoLesson } from "../data-layer";
import { type GeminiError, type Progress, transcribeVideo } from "./gemini";
import { makeScenes } from "./scenes";
import type { VideoInfo } from "./youtube";

export interface VideoJob {
  video: VideoInfo;
  status: "waiting" | "working" | "done" | "failed";
  startedAt?: number;
  lessonId?: string;
  error?: string;
  /** What kind of problem, for the failed job's link (a missing key). */
  problem?: GeminiError["problem"];
  /** Gemini stopped before the end of the video. */
  cutOff?: boolean;
  /** Which try this is, when the first didn't work. */
  attempt?: { number: number; of: number };
  /** How far Gemini has got. */
  progress?: Progress;
}

let jobs: VideoJob[] = [];
const listeners = new Set<() => void>();
let running = false;
/** Each job's callbacks, kept out of the jobs the UI sees. */
const hooks = new Map<
  string,
  { onDone?: (job: VideoJob) => void; transcribe: typeof transcribeVideo }
>();

function set(next: VideoJob[]) {
  jobs = next;
  for (const listener of listeners) listener();
}

function update(id: string, change: Partial<VideoJob>) {
  set(jobs.map((j) => (j.video.id === id ? { ...j, ...change } : j)));
}

// The screen stays on while a video is being written down: a phone that
// goes to sleep drops the connection to Gemini.
let wakeLock: { release(): Promise<void> } | null = null;

async function keepAwake() {
  if (wakeLock || document.visibilityState !== "visible") return;
  try {
    const lock = await (
      navigator as Navigator & {
        wakeLock?: {
          request(type: "screen"): Promise<{ release(): Promise<void> }>;
        };
      }
    ).wakeLock?.request("screen");
    wakeLock = lock ?? null;
  } catch {
    // Not allowed (battery saver) or not supported: carry on without.
  }
}

function onVisible() {
  // The lock goes when the page is hidden; take it again on return.
  if (document.visibilityState === "visible") {
    wakeLock = null;
    keepAwake();
  }
}

function stayAwake(on: boolean) {
  if (typeof document === "undefined") return;
  if (on) {
    keepAwake();
    document.addEventListener("visibilitychange", onVisible);
  } else {
    document.removeEventListener("visibilitychange", onVisible);
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  }
}

async function run() {
  if (running) return;
  running = true;
  stayAwake(true);
  try {
    for (;;) {
      const job = jobs.find((j) => j.status === "waiting");
      if (!job) break;
      const { id } = job.video;
      const { onDone, transcribe } = hooks.get(id) ?? {
        transcribe: transcribeVideo,
      };
      update(id, { status: "working", startedAt: Date.now() });
      try {
        const result = await transcribe(id, {
          onRetry: (number, of) => update(id, { attempt: { number, of } }),
          onProgress: (progress) =>
            update(id, { progress, attempt: undefined }),
        });
        const lessonId = await saveVideoLesson({
          title: job.video.title,
          video: {
            provider: "youtube",
            id,
            channel: job.video.channel,
            channelUrl: job.video.channelUrl,
            subtitles: "gemini",
            scenes: makeScenes(result.cues, { sentencePerCue: true }),
          },
        });
        update(id, { status: "done", lessonId, cutOff: result.cutOff });
      } catch (e) {
        update(id, {
          status: "failed",
          error: e instanceof Error ? e.message : String(e),
          problem: (e as GeminiError).problem,
        });
      }
      const finished = jobs.find((j) => j.video.id === id);
      hooks.delete(id);
      if (finished) onDone?.(finished);
    }
  } finally {
    running = false;
    stayAwake(false);
  }
}

/** Queues a video for Gemini's subtitles, unless it's queued already. */
export function addVideoJob(
  video: VideoInfo,
  {
    onDone,
    transcribe,
  }: {
    onDone?: (job: VideoJob) => void;
    transcribe?: typeof transcribeVideo;
  } = {}
) {
  const existing = jobs.find((j) => j.video.id === video.id);
  if (existing?.status === "waiting" || existing?.status === "working") return;
  hooks.set(video.id, { onDone, transcribe: transcribe ?? transcribeVideo });
  set([
    ...jobs.filter((j) => j.video.id !== video.id),
    { video, status: "waiting" },
  ]);
  run();
}

/** Forgets a finished or failed job. */
export function dismissVideoJob(id: string) {
  set(jobs.filter((j) => j.video.id !== id || j.status === "working"));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useVideoJobs(): VideoJob[] {
  return useSyncExternalStore(subscribe, () => jobs);
}

/** For tests. */
export function resetVideoJobs() {
  hooks.clear();
  set([]);
}
