// YouTube's IFrame Player API (https://developers.google.com/youtube/iframe_api_reference):
// the embedded player, which the app can play, pause and seek. Loaded once,
// when the first video opens.

/** The parts of YT.Player the app uses. */
export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  destroy(): void;
  /** The player's subtitles: loaded (shown) or unloaded (hidden). */
  loadModule?(name: "captions"): void;
  unloadModule?(name: "captions"): void;
  setOption?(module: "captions", option: string, value: unknown): void;
}

export const PlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

interface PlayerOptions {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void;
    onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YouTubeApi {
  Player: new (element: HTMLElement, options: PlayerOptions) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YouTubeApi> | null = null;

export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT) resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        loading = null;
        script.remove();
        reject(new Error("Couldn't load YouTube's player. Are you online?"));
      };
      document.head.append(script);
    });
  }
  return loading;
}

/** What the player's error codes mean. */
export function playerError(code: number): string {
  if (code === 101 || code === 150 || code === 153) {
    return "The video's owner doesn't let it be played in other apps. Watch it on YouTube instead.";
  }
  if (code === 100) return "This video was removed or made private.";
  if (code === 2) return "That isn't a YouTube video link.";
  return "YouTube couldn't play this video.";
}
