// Add video: a YouTube link, and where its Indonesian subtitles come from.
// Gemini writes them (with English) from the link itself, for free with the
// user's own key; or YouTube's transcript of the video is copied and pasted;
// or a subtitle file is chosen. Once a video is added, the channel's other
// videos are offered, to add with a tap.
import {
  Button,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@/components/ui";
import { Modal } from "@/components/ui";
import { saveVideoLesson } from "@/lector/data-layer";
import type { LessonVideo } from "@/lector/types";
import { getGeminiKey } from "@/lector/video/gemini";
import { addVideoJob } from "@/lector/video/queue";
import { makeScenes } from "@/lector/video/scenes";
import {
  type Cue,
  parseSubtitleFile,
  parseTranscript,
} from "@/lector/video/subtitles";
import { type VideoInfo, videoInfo, youtubeId } from "@/lector/video/youtube";
import { db } from "@/logic/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ChannelVideos from "./ChannelVideos";
import Thumbnail from "./Thumbnail";
import { notifyJobDone } from "./notifyJob";
import "./watch.css";

type Method = "gemini" | "transcript" | "file";

interface AddVideoModalProps {
  opened: boolean;
  onClose: () => void;
  /** A video to start with (from a channel's list). */
  initial?: VideoInfo | null;
}

interface Added {
  video: VideoInfo;
  /** The lesson, when it's saved already (not waiting for Gemini). */
  lessonId?: string;
}

export default function AddVideoModal({
  opened,
  onClose,
  initial,
}: AddVideoModalProps) {
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [looking, setLooking] = useState(false);
  const [method, setMethod] = useState<Method>(() =>
    getGeminiKey() ? "gemini" : "transcript"
  );
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<Added | null>(null);
  const hasKey = !!getGeminiKey();

  const id = youtubeId(link);
  const existing = useLiveQuery(
    async () =>
      id
        ? (await db.lessons.where("source").equals("video").toArray()).find(
            (l) => l.video?.id === id
          )
        : undefined,
    [id]
  );

  // Each time the dialog opens, it starts afresh (on the video picked, if any).
  useEffect(() => {
    if (!opened) return;
    setLink(initial ? `https://www.youtube.com/watch?v=${initial.id}` : "");
    setInfo(initial ?? null);
    setTranscript("");
    setFile(null);
    setError(null);
    setAdded(null);
    setMethod(getGeminiKey() ? "gemini" : "transcript");
  }, [opened, initial]);

  // The video's title and channel, once the link is a video's.
  useEffect(() => {
    if (!id) {
      setInfo(null);
      return;
    }
    if (info?.id === id) return;
    let current = true;
    setLooking(true);
    videoInfo(id).then((found) => {
      if (!current) return;
      setInfo(found);
      setLooking(false);
    });
    return () => {
      current = false;
    };
  }, [id, info?.id]);

  const save = async (cues: Cue[], subtitles: LessonVideo["subtitles"]) => {
    if (!info) return;
    const scenes = makeScenes(cues);
    if (scenes.length === 0) {
      throw new Error("No subtitles with times were found in that.");
    }
    const lessonId = await saveVideoLesson({
      title: info.title,
      video: {
        provider: "youtube",
        id: info.id,
        channel: info.channel,
        channelUrl: info.channelUrl,
        subtitles,
        scenes,
      },
    });
    setAdded({ video: info, lessonId });
  };

  const submit = async () => {
    if (!info) return;
    setError(null);
    if (method === "gemini") {
      addVideoJob(info, { onDone: notifyJobDone });
      setAdded({ video: info });
      return;
    }
    setSaving(true);
    try {
      if (method === "transcript") {
        const cues = parseTranscript(transcript);
        if (cues.length === 0) {
          throw new Error(
            "No times found in what's pasted. Copy the transcript with its times (0:00, 0:04 …)."
          );
        }
        await save(cues, "transcript");
      } else if (file) {
        const cues = parseSubtitleFile(await file.text());
        if (cues.length === 0) {
          throw new Error(
            "That file has no subtitles with times (.srt or .vtt)."
          );
        }
        await save(cues, "file");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const ready =
    !!info &&
    !existing &&
    !saving &&
    (method === "gemini"
      ? hasKey
      : method === "transcript"
        ? transcript.trim() !== ""
        : !!file);

  return (
    <Modal opened={opened} onClose={onClose} title="Add a video">
      {added ? (
        <Stack gap="md">
          <Text size="sm">
            {added.lessonId
              ? `“${added.video.title}” is added.`
              : `Gemini is writing the subtitles for “${added.video.title}”. It'll be in Watch in a minute or two; you can carry on meanwhile.`}
          </Text>
          <Group gap="sm" wrap="wrap">
            {added.lessonId && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  navigate(`/watch/${added.lessonId}`);
                }}
              >
                Watch now
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Done
            </Button>
          </Group>
          {added.video.channelUrl && added.video.channel && (
            <section>
              <h3 className="watch-view__heading">{`More from ${added.video.channel}`}</h3>
              <Text size="xs" className="add-video__hint">
                {hasKey
                  ? "Tap Add and Gemini writes that video's subtitles too."
                  : "Each one needs its transcript pasted, like this one."}
              </Text>
              <ChannelVideos
                channel={added.video.channel}
                channelUrl={added.video.channelUrl}
                except={added.video.id}
                onPick={(video) => {
                  setAdded(null);
                  setLink(`https://www.youtube.com/watch?v=${video.id}`);
                  setInfo(video);
                  setTranscript("");
                  setFile(null);
                }}
              />
            </section>
          )}
        </Stack>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) submit();
          }}
        >
          <Stack gap="md">
            <TextInput
              label="YouTube link"
              placeholder="https://www.youtube.com/watch?v=…"
              value={link}
              onChange={(e) => setLink(e.currentTarget.value)}
              inputMode="url"
              autoComplete="off"
              error={
                link.trim() && !id
                  ? "That isn't a YouTube video link."
                  : undefined
              }
            />
            {id && (
              <div className="add-video__preview">
                <Thumbnail id={id} />
                <span className="video-row__text">
                  <span className="video-row__title">
                    {looking ? "Looking it up…" : (info?.title ?? "")}
                  </span>
                  {info?.channel && (
                    <span className="video-row__status">{info.channel}</span>
                  )}
                </span>
              </div>
            )}
            {existing && (
              <Text size="sm">
                {"This video is in Watch already. "}
                <Link to={`/watch/${existing.id}`} onClick={onClose}>
                  Open it
                </Link>
              </Text>
            )}

            <div>
              <Text size="sm" weight="semibold">
                Indonesian subtitles
              </Text>
              <SegmentedControl
                value={method}
                onChange={(value) => setMethod(value as Method)}
                data={[
                  { value: "gemini", label: "Gemini" },
                  { value: "transcript", label: "Transcript" },
                  { value: "file", label: "File" },
                ]}
              />
            </div>

            {method === "gemini" &&
              (hasKey ? (
                <Text size="sm" className="add-video__hint">
                  Gemini watches the video and writes down what's said, a
                  sentence at a time, with an English translation. Free with
                  your Gemini key, up to about 8 hours of video a day. The video
                  has to be public.
                </Text>
              ) : (
                <Text size="sm" className="add-video__hint">
                  {
                    "Gemini can write the subtitles for free with your own Gemini API key. "
                  }
                  <Link to="/settings/dictionary" onClick={onClose}>
                    Add one in Settings → Dictionary
                  </Link>
                  {", or paste YouTube's transcript instead."}
                </Text>
              ))}

            {method === "transcript" && (
              <>
                <div className="add-video__hint">
                  <Text size="sm">
                    For a video with Indonesian subtitles (its own or YouTube's
                    automatic ones), on a computer:
                  </Text>
                  <ol>
                    <li>
                      <Text size="sm">
                        Open the video on YouTube, make sure the subtitles are
                        set to Indonesian, and under the description choose Show
                        transcript.
                      </Text>
                    </li>
                    <li>
                      <Text size="sm">
                        Select the whole transcript, times and all, copy it and
                        paste it here.
                      </Text>
                    </li>
                  </ol>
                </div>
                <Textarea
                  label="Transcript"
                  lang="id"
                  minRows={5}
                  placeholder={"0:00\nhalo semuanya\n0:03\nselamat datang …"}
                  value={transcript}
                  onChange={(e) => setTranscript(e.currentTarget.value)}
                />
              </>
            )}

            {method === "file" && (
              <label className="add-video__hint">
                <Text size="sm">
                  A subtitle file (.srt or .vtt) in Indonesian for this video.
                </Text>
                <input
                  type="file"
                  accept=".srt,.vtt,text/vtt"
                  onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                />
              </label>
            )}

            {error && (
              <div role="alert" className="video-row__status--error">
                <Text size="sm">{error}</Text>
              </div>
            )}

            <Group gap="sm" justify="end">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!ready}>
                {saving ? "Adding…" : "Add video"}
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
