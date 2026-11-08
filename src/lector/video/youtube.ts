// YouTube links, a video's title and channel, and a channel's latest videos.
// The title and channel come from YouTube's oEmbed (the public description of
// a video that sites embed it with), or noembed.com's copy of it. A channel's
// videos come from its Videos page, read through Jina Reader (r.jina.ai), as
// web articles are (../import/webArticle.ts).

const ID = /^[\w-]{11}$/;

/** The video id in a YouTube link (watch, youtu.be, shorts, embed, live), or null. */
export function youtubeId(link: string): string | null {
  const text = link.trim();
  if (ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text.match(/https?:\/\/\S+/i)?.[0] ?? text);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/")[1] ?? "";
    return ID.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  const v = url.searchParams.get("v");
  if (v && ID.test(v)) return v;
  const [, kind, id] = url.pathname.split("/");
  if (["shorts", "embed", "live", "v"].includes(kind) && ID.test(id ?? "")) {
    return id;
  }
  return null;
}

export function watchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function thumbnailUrl(id: string) {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

export interface VideoInfo {
  id: string;
  title: string;
  channel?: string;
  /** https://www.youtube.com/@name */
  channelUrl?: string;
}

interface OEmbed {
  title?: string;
  author_name?: string;
  author_url?: string;
  error?: string;
}

/** A video's title and channel, or just its id when they can't be found. */
export async function videoInfo(
  id: string,
  fetchApi: typeof fetch = fetch
): Promise<VideoInfo> {
  const url = encodeURIComponent(watchUrl(id));
  for (const source of [
    `https://www.youtube.com/oembed?format=json&url=${url}`,
    `https://noembed.com/embed?url=${url}`,
  ]) {
    try {
      const response = await fetchApi(source);
      if (!response.ok) continue;
      const data = (await response.json()) as OEmbed;
      if (data.error || !data.title) continue;
      return {
        id,
        title: data.title,
        channel: data.author_name,
        channelUrl: data.author_url,
      };
    } catch {
      // The next source.
    }
  }
  return { id, title: "YouTube video" };
}

export interface ChannelVideo {
  id: string;
  title: string;
}

/** Links to videos in a page as Markdown: [Title](https://www.youtube.com/watch?v=…). */
export function videosFromMarkdown(markdown: string): ChannelVideo[] {
  const found = new Map<string, string>();
  const link =
    /(!?)\[((?:[^[\]]|\[[^\]]*\])*)\]\((https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|shorts\/)([\w-]{11})[^)\s]*)[^)]*\)/g;
  for (const match of markdown.matchAll(link)) {
    const [, image, rawTitle, , id] = match;
    const title = rawTitle
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
    // Thumbnails and empty links come first; the title link has the words.
    if (image || !title || /^image \d+/i.test(title)) {
      if (!found.has(id)) found.set(id, "");
      continue;
    }
    if (!found.get(id)) found.set(id, title);
  }
  return [...found]
    .filter(([, title]) => title)
    .map(([id, title]) => ({ id, title }));
}

function readerKey() {
  try {
    return localStorage.getItem("kartu.jinaReaderKey") ?? "";
  } catch {
    return "";
  }
}

/** The channel's latest videos, newest first, from its Videos page. */
export async function channelVideos(
  channelUrl: string,
  fetchApi: typeof fetch = fetch
): Promise<ChannelVideo[]> {
  const page = `${channelUrl.replace(/\/+$/, "").replace(/\/(videos|featured|streams)$/, "")}/videos`;
  const headers: Record<string, string> = { "X-Return-Format": "markdown" };
  const key = readerKey();
  if (key) headers.Authorization = `Bearer ${key}`;
  let response: Response;
  try {
    response = await fetchApi(`https://r.jina.ai/${page}`, { headers });
  } catch {
    throw new Error(
      "Couldn't reach Jina Reader (r.jina.ai), which reads the channel's page for the app. Check your connection."
    );
  }
  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Jina Reader has paused free reading for a while. Try again later, or add a Jina key in Read → Add text → From a link."
        : `Jina Reader couldn't read the channel's page (${response.status}).`
    );
  }
  return videosFromMarkdown(await response.text());
}
