// Watch: Indonesian YouTube videos read a scene at a time, as LingQ does.
// Videos are grouped by channel, each with "More from this channel"; videos
// whose subtitles Gemini is still writing are shown at the top.
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { Button, Modal, Paper, Spinner, Text } from "@/components/ui";
import { deleteLesson } from "@/lector/data-layer";
import type { Lesson } from "@/lector/types";
import { getGeminiKey } from "@/lector/video/gemini";
import {
  type VideoJob,
  addVideoJob,
  dismissVideoJob,
  useVideoJobs,
} from "@/lector/video/queue";
import type { VideoInfo } from "@/lector/video/youtube";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { db } from "@/logic/db";
import { IconPlus, IconRefresh, IconTrash, IconX } from "@tabler/icons-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import AddVideoModal from "./AddVideoModal";
import ChannelVideos from "./ChannelVideos";
import Thumbnail from "./Thumbnail";
import { notifyJobDone } from "./notifyJob";
import "./watch.css";

function progress(l: Lesson) {
  if (l.finishedAt) return "finished";
  const scenes = l.video?.scenes.length ?? 0;
  if (l.lastPage !== undefined && l.lastPage > 0) {
    return `scene ${l.lastPage + 1} of ${scenes}`;
  }
  return `${scenes} scene${scenes === 1 ? "" : "s"}`;
}

function VideoRow({ lesson }: { lesson: Lesson }) {
  const navigate = useNavigate();
  const id = lesson.video?.id ?? "";
  return (
    <Paper withBorder className="video-row">
      <button
        type="button"
        className="video-row__open"
        onClick={() => navigate(`/watch/${lesson.id}`)}
      >
        <Thumbnail id={id} />
        <span className="video-row__text">
          <span className="video-row__title">{lesson.title}</span>
          <span className="video-row__status">{progress(lesson)}</span>
        </span>
      </button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Delete ${lesson.title}`}
        onClick={() => deleteLesson(lesson.id)}
      >
        <IconTrash size={16} />
      </Button>
    </Paper>
  );
}

function elapsed(job: VideoJob, now: number) {
  if (job.status === "waiting") return "waiting its turn";
  if (job.status !== "working" || !job.startedAt) return "";
  const seconds = Math.round((now - job.startedAt) / 1000);
  return `Gemini is writing the subtitles… ${seconds}s`;
}

function JobRow({ job, now }: { job: VideoJob; now: number }) {
  const working = job.status === "waiting" || job.status === "working";
  return (
    <Paper withBorder className="video-row">
      <span className="video-row__open">
        <Thumbnail id={job.video.id} />
        <span className="video-row__text">
          <span className="video-row__title">{job.video.title}</span>
          {working && (
            <span className="video-row__status">
              <Spinner size="xs" /> {elapsed(job, now)}
            </span>
          )}
          {job.status === "failed" && (
            <span className="video-row__status video-row__status--error">
              {job.error}
              {job.problem === "key" && (
                <>
                  {" "}
                  <Link to="/settings/dictionary">Settings → Dictionary</Link>
                </>
              )}
            </span>
          )}
        </span>
      </span>
      {job.status === "failed" && job.problem !== "key" && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Try ${job.video.title} again`}
          onClick={() => addVideoJob(job.video, { onDone: notifyJobDone })}
        >
          <IconRefresh size={16} />
        </Button>
      )}
      {!working && (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Dismiss"
          onClick={() => dismissVideoJob(job.video.id)}
        >
          <IconX size={16} />
        </Button>
      )}
    </Paper>
  );
}

export default function WatchView() {
  useDocumentTitle("Watch");
  const [adding, setAdding] = useState<{ initial: VideoInfo | null } | null>(
    null
  );
  const [browsing, setBrowsing] = useState<{
    channel: string;
    channelUrl: string;
  } | null>(null);
  const lessons = useLiveQuery(
    () => db.lessons.where("source").equals("video").toArray(),
    []
  );
  const jobs = useVideoJobs();
  const [now, setNow] = useState(Date.now());
  const working = jobs.some((j) => j.status === "working");
  useEffect(() => {
    if (!working) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [working]);

  // Videos by channel, the channel added to last first.
  const channels = new Map<string, Lesson[]>();
  for (const l of [...(lessons ?? [])].sort(
    (a, b) => +b.createdAt - +a.createdAt
  )) {
    const name = l.video?.channel ?? "Other videos";
    channels.set(name, [...(channels.get(name) ?? []), l]);
  }
  // A finished video is in its channel's list (and was announced).
  const shownJobs = jobs.filter((j) => j.status !== "done");

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs segments={[{ label: "Watch" }]} />
        <Button
          variant="ghost"
          leftSection={<IconPlus />}
          onClick={() => setAdding({ initial: null })}
        >
          Add video
        </Button>
      </AppHeaderContent>

      <div className="watch-view">
        <p className="watch-view__intro">
          Watch Indonesian YouTube videos a scene at a time: each scene plays,
          then stops so you can read its words. Tap a word for its meaning or to
          make a flashcard; swipe to the next scene, marking the words you
          didn't look up as known, as in Read.
        </p>

        {lessons && lessons.length === 0 && shownJobs.length === 0 && (
          <Paper withBorder className="video-row">
            <Text size="sm">
              {getGeminiKey()
                ? "No videos yet. Add one with its YouTube link."
                : "No videos yet. Add one with its YouTube link. For subtitles written for you (with English), add a free Gemini key in Settings → Dictionary."}
            </Text>
          </Paper>
        )}

        {shownJobs.length > 0 && (
          <section>
            <h2 className="watch-view__heading">Adding</h2>
            <div className="watch-view__list">
              {shownJobs.map((job) => (
                <JobRow key={job.video.id} job={job} now={now} />
              ))}
            </div>
          </section>
        )}

        {[...channels].map(([channel, videos]) => {
          const channelUrl = videos.find((v) => v.video?.channelUrl)?.video
            ?.channelUrl;
          return (
            <section key={channel}>
              <div className="watch-view__channel-head">
                <h2 className="watch-view__heading">{channel}</h2>
                {channelUrl && (
                  <Button
                    size="sm"
                    variant="default"
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setBrowsing({ channel, channelUrl })}
                  >
                    More from this channel
                  </Button>
                )}
              </div>
              <div className="watch-view__list">
                {videos.map((l) => (
                  <VideoRow key={l.id} lesson={l} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <AddVideoModal
        opened={adding !== null}
        initial={adding?.initial}
        onClose={() => setAdding(null)}
      />
      <Modal
        opened={browsing !== null}
        onClose={() => setBrowsing(null)}
        title={browsing ? `More from ${browsing.channel}` : ""}
      >
        {browsing && (
          <ChannelVideos
            channel={browsing.channel}
            channelUrl={browsing.channelUrl}
            onPick={(video) => {
              setBrowsing(null);
              setAdding({ initial: video });
            }}
          />
        )}
      </Modal>
    </>
  );
}
