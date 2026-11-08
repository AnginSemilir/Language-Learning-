// "More from this channel": the channel's latest videos, each added with one
// tap. With a Gemini key the video is queued for subtitles straight away;
// without one, the Add video dialog opens on it to paste its transcript.
import { Button, Spinner, Text } from "@/components/ui";
import { getGeminiKey } from "@/lector/video/gemini";
import { addVideoJob, useVideoJobs } from "@/lector/video/queue";
import {
  type ChannelVideo,
  type VideoInfo,
  channelVideos,
} from "@/lector/video/youtube";
import { db } from "@/logic/db";
import { IconCheck, IconPlus } from "@tabler/icons-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import Thumbnail from "./Thumbnail";
import { notifyJobDone } from "./notifyJob";

interface ChannelVideosProps {
  channel: string;
  channelUrl: string;
  /** Without a Gemini key: add this one in the Add video dialog. */
  onPick: (video: VideoInfo) => void;
  /** Leave this one out (the video just added). */
  except?: string;
}

const SHOWN = 12;

export default function ChannelVideos({
  channel,
  channelUrl,
  onPick,
  except,
}: ChannelVideosProps) {
  const [videos, setVideos] = useState<ChannelVideo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const jobs = useVideoJobs();
  const added = useLiveQuery(
    async () =>
      new Set(
        (await db.lessons.where("source").equals("video").toArray()).map(
          (l) => l.video?.id
        )
      ),
    []
  );

  useEffect(() => {
    let current = true;
    setVideos(null);
    setError(null);
    channelVideos(channelUrl)
      .then((found) => {
        if (current) setVideos(found);
      })
      .catch((e: Error) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [channelUrl]);

  if (error) {
    return (
      <div role="alert">
        <Text size="sm">
          {`${error} `}
          <a
            href={`${channelUrl}/videos`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the channel on YouTube
          </a>
          {" and paste a video's link in Add video instead."}
        </Text>
      </div>
    );
  }
  if (!videos) {
    return (
      <div className="add-video__preview">
        <Spinner size="xs" />
        <Text size="sm">{`Finding ${channel}'s latest videos…`}</Text>
      </div>
    );
  }
  const list = videos.filter((v) => v.id !== except);
  if (list.length === 0) {
    return (
      <Text size="sm">{`No other videos found on ${channel}'s channel.`}</Text>
    );
  }
  const hasKey = !!getGeminiKey();
  const shown = more ? list : list.slice(0, SHOWN);

  return (
    <div className="watch-view__list">
      {shown.map((v) => {
        const job = jobs.find((j) => j.video.id === v.id);
        const inLibrary = added?.has(v.id);
        const busy =
          job && (job.status === "waiting" || job.status === "working");
        return (
          <div key={v.id} className="video-row">
            <Thumbnail id={v.id} />
            <span className="video-row__text">
              <span className="video-row__title">{v.title}</span>
              {job?.status === "failed" && (
                <span className="video-row__status video-row__status--error">
                  {job.error}
                </span>
              )}
            </span>
            <Button
              size="sm"
              variant={inLibrary ? "ghost" : "default"}
              disabled={inLibrary || busy}
              aria-label={inLibrary ? `${v.title} added` : `Add ${v.title}`}
              leftSection={
                inLibrary ? (
                  <IconCheck size={16} />
                ) : busy ? undefined : (
                  <IconPlus size={16} />
                )
              }
              onClick={() => {
                const video = { id: v.id, title: v.title, channel, channelUrl };
                if (hasKey) addVideoJob(video, { onDone: notifyJobDone });
                else onPick(video);
              }}
            >
              {inLibrary ? "Added" : busy ? "Adding…" : "Add"}
            </Button>
          </div>
        );
      })}
      {!more && list.length > SHOWN && (
        <Button variant="ghost" size="sm" onClick={() => setMore(true)}>
          {`Show ${list.length - SHOWN} more`}
        </Button>
      )}
    </div>
  );
}
