// The video above a scene's words: YouTube's player, playing one scene at a
// time. Turning to a scene plays it, and the video stops at its end so the
// words can be read (or plays on, with "Stop after each scene" off, the
// words following the video). Under it: back 2 and 5 seconds, play and
// pause, repeat the scene, and the speed.
import { Button, Switch, Text } from "@/components/ui";
import type { VideoScene } from "@/lector/types";
import { formatTime } from "@/lector/video/subtitles";
import { watchUrl } from "@/lector/video/youtube";
import {
  PlayerState,
  type YouTubePlayer,
  loadYouTubeApi,
  playerError,
} from "@/lector/video/youtubePlayer";
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconRepeat,
  IconRewindBackward5,
} from "@tabler/icons-react";
import { type MutableRefObject, useEffect, useRef, useState } from "react";
import "./watch.css";

/** Started a little before a scene, so its first word isn't clipped. */
const LEAD = 0.25;
/** And stopped a little after it. */
const TAIL = 0.35;
const SPEEDS = [1, 0.75, 0.5];
const AUTO_PAUSE_KEY = "kartu.video.autoPause";
const CAPTIONS_KEY = "kartu.video.captions";

export interface PlayerControls {
  pause(): void;
  toggle(): void;
  repeat(): void;
  back(seconds: number): void;
}

function getAutoPause() {
  try {
    return localStorage.getItem(AUTO_PAUSE_KEY) !== "off";
  } catch {
    return true;
  }
}

/** YouTube's own subtitles on the video: off unless chosen (the words are below). */
function getCaptions() {
  try {
    return localStorage.getItem(CAPTIONS_KEY) === "on";
  } catch {
    return false;
  }
}

function saveCaptions(on: boolean) {
  try {
    localStorage.setItem(CAPTIONS_KEY, on ? "on" : "off");
  } catch {
    // A convenience only.
  }
}

/**
 * Shows YouTube's subtitles in Indonesian, or hides them (YouTube may show
 * them by itself, in English, from the viewer's own YouTube settings).
 */
function applyCaptions(player: YouTubePlayer, on: boolean) {
  try {
    if (on) {
      player.loadModule?.("captions");
      player.setOption?.("captions", "track", { languageCode: "id" });
    } else {
      player.setOption?.("captions", "track", {});
      player.unloadModule?.("captions");
    }
  } catch {
    // An older player without these: its own CC button still works.
  }
}

function saveAutoPause(on: boolean) {
  try {
    localStorage.setItem(AUTO_PAUSE_KEY, on ? "on" : "off");
  } catch {
    // A convenience only.
  }
}

/** The scene playing at a time. */
export function sceneAt(scenes: readonly VideoScene[], time: number) {
  let found = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (scenes[i].start - LEAD <= time) found = i;
    else break;
  }
  return found;
}

interface ScenePlayerProps {
  videoId: string;
  scenes: VideoScene[];
  /** The scene shown. */
  index: number;
  /** Changes when the shown scene should play from its start (a page turn). */
  playToken: number;
  /** The video moved on to another scene (playing on, or the user seeked). */
  onSceneChange: (index: number) => void;
  controls?: MutableRefObject<PlayerControls | null>;
}

export default function ScenePlayer({
  videoId,
  scenes,
  index,
  playToken,
  onSceneChange,
  controls,
}: ScenePlayerProps) {
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [autoPause, setAutoPause] = useState(getAutoPause);
  const [captions, setCaptions] = useState(getCaptions);

  // What the ticking timer reads.
  const live = useRef({ scenes, index, autoPause, onSceneChange, captions });
  live.current = { scenes, index, autoPause, onSceneChange, captions };
  /** Where to stop: the end of the scene being played. */
  const stopAt = useRef<number | null>(null);
  const lastTime = useRef(0);

  const scene = scenes[index];

  // The player, made once per video.
  // Made once per video; the scene to start at is read when it's made.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !holder.current) return;
        const target = document.createElement("div");
        holder.current.replaceChildren(target);
        new YT.Player(target, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            start: Math.floor(
              live.current.scenes[live.current.index]?.start ?? 0
            ),
            playsinline: 1,
            rel: 0,
            // Subtitles, if shown, in Indonesian.
            cc_lang_pref: "id",
            cc_load_policy: live.current.captions ? 1 : 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: ({ target }) => {
              if (cancelled) return;
              player.current = target;
              setReady(true);
            },
            onStateChange: ({ data, target }) => {
              setPlaying(data === PlayerState.PLAYING);
              if (data !== PlayerState.PLAYING) return;
              // The subtitles load as the video starts: set them as chosen.
              applyCaptions(target, live.current.captions);
              // Played from YouTube's own controls: stop at this scene's end.
              const { scenes, index, autoPause } = live.current;
              const current = scenes[index];
              const time = target.getCurrentTime();
              if (
                autoPause &&
                stopAt.current === null &&
                current &&
                time < current.end
              ) {
                stopAt.current = current.end + TAIL;
              }
            },
            onError: ({ data }) => setError(playerError(data)),
          },
        });
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId]);

  // Stop at the scene's end, or follow the video into the next scene.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const p = player.current;
      if (!p || p.getPlayerState() !== PlayerState.PLAYING) return;
      const time = p.getCurrentTime();
      const jumped = Math.abs(time - lastTime.current) > 1.5;
      lastTime.current = time;
      const { scenes, index, autoPause, onSceneChange } = live.current;
      const current = scenes[index];
      if (!current) return;
      const outside = time < current.start - 1 || time > current.end + TAIL;
      if (jumped && outside) {
        // Seeked with YouTube's controls: show the scene that's playing.
        const at = sceneAt(scenes, time);
        stopAt.current = autoPause ? scenes[at].end + TAIL : null;
        if (at !== index) onSceneChange(at);
        return;
      }
      if (stopAt.current !== null && time >= stopAt.current) {
        stopAt.current = null;
        p.pauseVideo();
        return;
      }
      // Playing on into the next scene: its words follow.
      if (time > current.end + TAIL) {
        const at = sceneAt(scenes, time);
        if (at === index) return;
        if (autoPause) stopAt.current = scenes[at].end + TAIL;
        onSceneChange(at);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  const playFrom = (time: number, end = scene?.end) => {
    const p = player.current;
    if (!p) return;
    stopAt.current =
      live.current.autoPause && end !== undefined ? end + TAIL : null;
    lastTime.current = Math.max(0, time);
    p.seekTo(Math.max(0, time), true);
    p.playVideo();
  };

  const repeat = () => {
    if (scene) playFrom(scene.start - LEAD);
  };

  /**
   * Back a few seconds. Going back into the scene before shows its words,
   * which then follow the video back to this scene, where it stops.
   */
  const back = (seconds: number) => {
    const p = player.current;
    if (!p || !scene) return;
    const time = Math.max(0, p.getCurrentTime() - seconds);
    playFrom(time, scene.end);
    const at = sceneAt(scenes, time);
    if (at < index) onSceneChange(at);
  };

  const toggle = () => {
    const p = player.current;
    if (!p || !scene) return;
    if (p.getPlayerState() === PlayerState.PLAYING) {
      p.pauseVideo();
      return;
    }
    const time = p.getCurrentTime();
    // At the scene's end, or outside it, play means play the scene again.
    if (time >= scene.end || time < scene.start - 1) repeat();
    else playFrom(time);
  };

  const pause = () => {
    player.current?.pauseVideo();
  };

  if (controls) controls.current = { pause, toggle, repeat, back };

  // A page turn plays the new scene.
  const playedToken = useRef(playToken);
  // Only a new token plays.
  useEffect(() => {
    if (!ready || playToken === playedToken.current) return;
    playedToken.current = playToken;
    repeat();
  }, [playToken, ready]);

  const changeSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    player.current?.setPlaybackRate(next);
  };

  return (
    <div className="scene-player">
      <div className="scene-player__video">
        <div ref={holder} className="scene-player__frame" />
        {error && (
          <div className="scene-player__error" role="alert">
            <Text size="sm">{error}</Text>
            <a
              href={watchUrl(videoId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open on YouTube
            </a>
          </div>
        )}
      </div>
      <div className="scene-player__controls" aria-label="Video controls">
        <Button
          variant="default"
          size="sm"
          onClick={() => back(2)}
          disabled={!ready}
          aria-label="Back 2 seconds"
          title="Back 2 seconds (2)"
        >
          −2s
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => back(5)}
          disabled={!ready}
          aria-label="Back 5 seconds"
          title="Back 5 seconds (5)"
          leftSection={<IconRewindBackward5 size={16} />}
        >
          5s
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={toggle}
          disabled={!ready}
          aria-label={playing ? "Pause" : "Play"}
          title={playing ? "Pause (space)" : "Play (space)"}
          className="scene-player__play"
        >
          {playing ? (
            <IconPlayerPauseFilled size={18} />
          ) : (
            <IconPlayerPlayFilled size={18} />
          )}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={repeat}
          disabled={!ready}
          title="Repeat the scene (R)"
          leftSection={<IconRepeat size={16} />}
        >
          Repeat
        </Button>
        <Button
          variant={captions ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            const on = !captions;
            setCaptions(on);
            saveCaptions(on);
            if (player.current) applyCaptions(player.current, on);
          }}
          disabled={!ready}
          aria-pressed={captions}
          aria-label="Subtitles on the video"
          title={
            captions
              ? "Hide the video's subtitles"
              : "Show the video's subtitles"
          }
          className="scene-player__cc"
        >
          CC
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={changeSpeed}
          disabled={!ready}
          aria-label={`Speed ${speed}×`}
          title="Speed"
          className="scene-player__speed"
        >
          {`${speed}×`}
        </Button>
      </div>
      <div className="scene-player__options">
        <Switch
          label="Stop after each scene"
          checked={autoPause}
          onChange={(e) => {
            const on = e.currentTarget.checked;
            setAutoPause(on);
            saveAutoPause(on);
            if (!on) stopAt.current = null;
            else if (scene) stopAt.current = scene.end + TAIL;
          }}
        />
        {scene && (
          <span className="scene-player__time">
            {`${formatTime(scene.start)} – ${formatTime(scene.end)}`}
          </span>
        )}
      </div>
    </div>
  );
}
