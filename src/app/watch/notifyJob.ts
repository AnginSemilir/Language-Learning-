import { notify } from "@/components/Notification";
import type { VideoJob } from "@/lector/video/queue";

/** Says when a video's subtitles are ready, or why they couldn't be made. */
export function notifyJobDone(job: VideoJob) {
  if (job.status === "done") {
    notify(
      "Video ready",
      job.cutOff
        ? `“${job.video.title}” is in Watch. Gemini stopped before the end of the video, so the last part has no scenes.`
        : `“${job.video.title}” is in Watch.`,
      "success",
      job.cutOff ? 8000 : 4000
    );
  } else if (job.status === "failed") {
    notify(
      "Couldn't add the video",
      `${job.video.title}: ${job.error ?? "something went wrong."}`,
      "error",
      8000
    );
  }
}
