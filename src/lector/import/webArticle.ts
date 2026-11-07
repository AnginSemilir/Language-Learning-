// Turns a web article (a news story, a blog post) into a lesson: only its
// headline and its story, without menus, adverts, photos, "Baca juga" links
// or sign-up prompts. Mozilla's Readability, the engine of Firefox's reader
// view, finds the story; a few lines that news sites put inside it are
// dropped afterwards.
//
// The page comes either from a link, fetched through Jina Reader (r.jina.ai,
// which lets a web app read other sites' pages; free without a key, but it
// pauses keyless access to a site for a while when it sees anything odd on
// its pages), or from a page the reader copied in their own browser and
// pasted. Sites that show apps a robot check (Kompas) are left alone: the
// reader is told to copy the page instead.

import { Readability } from "@mozilla/readability";
import { countWords, htmlToMarkdown } from "./html-to-markdown";
import type { ImportedText } from "./textFiles";

const READER = "https://r.jina.ai/";

/** Shorter than this, what Readability found isn't a story. */
const MIN_WORDS = 40;

/**
 * Paragraphs inside a story that aren't part of it: links to other stories,
 * prompts to follow the site, bylines, credits and page numbers.
 */
const NOT_STORY = [
  /^(baca|lihat|simak|tonton) (juga|pula)\b/i,
  /^(berita|artikel) terkait\b/i,
  /^(dapatkan|simak) (update|informasi|berita|breaking news)\b/i,
  /^(ikuti|gabung|bergabung)\b.*\b(whatsapp|telegram|google news|saluran|channel|grup)\b/i,
  /^baca berita tanpa iklan\b/i,
  /^(penulis|peranan|editor|reporter|pewarta|kontributor|sumber|foto|video)\s*[:,]/i,
  /^artikel ini (telah|sudah) tayang\b/i,
  /^(telah )?(diterbitkan|dipublikasikan|diperbarui)\b/i,
  /^waktu (baca|membaca)\b/i,
  // "Skip ... and keep reading" links round a box (BBC).
  /^(lewati|lewatkan)\b.*\b(membaca|baca)$/i,
  /^(halaman|page)\s*\d/i,
  /^(advertisement|iklan|scroll to continue with content)$/i,
  // Copyright notices (ANTARA ends every story with one).
  /^dilarang (keras )?(mengambil|mengutip|menyalin)\b/i,
  /^(copyright|hak cipta)\b|^©/i,
];

/** The same, for a few words on their own (a box's title or end). */
const NOT_STORY_SHORT = [
  /^akhir dari\b/i,
  /^(paling banyak dibaca|terpopuler|populer|terkini|berita lainnya)$/i,
  // The editors' initials at the end: "(jal)", "(asa/jal)".
  /^\([a-z]{2,5}(\/[a-z]{2,5})*\)$/i,
];
const SHORT = 6;

/** Bits of a story that aren't text to read. */
const NOT_TEXT =
  "figure, figcaption, picture, img, video, audio, iframe, aside, table, script, style";

/** Markup kept as plain text. */
const INLINE = "b, strong, i, em, u, mark, small, span, a, font";

/** The site's name after the headline: "Judul - Kompas.com", "Judul | BBC". */
function stripSiteName(title: string, site: string | undefined) {
  if (!site) return title.trim();
  const escaped = site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return title
    .replace(new RegExp(`\\s*[-|–—:]\\s*${escaped}\\s*$`, "i"), "")
    .trim();
}

/**
 * The headline and story of a web page, or null if it has no story (a home
 * page, a list of links, or a "check you're not a robot" page).
 */
export function articleFromHtml(
  html: string,
  url?: string
): ImportedText | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (url) {
    const base = doc.createElement("base");
    base.href = url;
    doc.head.append(base);
  }
  // The headline on the page (a page copied from a browser has no <title>),
  // unless the <h1> is just the site's name.
  const h1 = doc.querySelector("h1");
  const text = h1?.textContent?.replace(/\s+/g, " ").trim();
  const heading = text && text.split(" ").length >= 4 ? text : undefined;
  // The story comes after the headline: what's before it is menus.
  for (
    let el: Element | null = heading ? h1 : null;
    el && el !== doc.body;
    el = el.parentElement
  ) {
    while (el.previousSibling) el.previousSibling.remove();
  }
  const found = new Readability(doc).parse();
  if (!found?.content) return null;

  const story = new DOMParser().parseFromString(found.content, "text/html");
  for (const el of story.querySelectorAll(NOT_TEXT)) el.remove();
  // Plain text: sites split bold and italic oddly ("(*****influencer*****)").
  for (const el of story.querySelectorAll(INLINE))
    el.replaceWith(...el.childNodes);
  const site = found.siteName?.trim() || undefined;
  // The <title> is often a shorter headline, for sharing.
  const title = stripSiteName(heading || found.title?.trim() || "", site);

  const paragraphs = htmlToMarkdown(story.body.innerHTML)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => {
      const text = p.replace(/^[#>*_\s-]+|[*_\s]+$/g, "");
      if (!text || NOT_STORY.some((re) => re.test(text))) return false;
      const short = text.split(/\s+/).length <= SHORT;
      return !(short && NOT_STORY_SHORT.some((re) => re.test(text)));
    });
  // A dateline on its own ("Jakarta, CNN Indonesia --") opens the next paragraph.
  for (let i = paragraphs.length - 2; i >= 0; i--) {
    const p = paragraphs[i];
    if (/\s[-–—]{1,2}$/.test(p) && p.split(/\s+/).length <= SHORT) {
      paragraphs.splice(i, 2, `${p} ${paragraphs[i + 1]}`);
    }
  }
  // The headline is the lesson's title, so it isn't repeated; anything before
  // it (a menu, in a page copied from a browser) isn't the story.
  const at = paragraphs
    .slice(0, 5)
    .findIndex((p) => p.replace(/^#+\s*/, "") === title);
  if (at >= 0) paragraphs.splice(0, at + 1);

  const content = paragraphs.join("\n\n");
  if (!title || countWords(content) < MIN_WORDS) return null;
  return { title, author: site, content };
}

/** What went wrong, so the form can offer the right next step. */
export type ArticleProblem =
  | "address"
  | "offline"
  | "busy"
  | "paused"
  | "key"
  | "reader"
  | "robot"
  | "no-story";

/** Why an article couldn't be imported, in words for the reader. */
export class ArticleError extends Error {
  constructor(
    message: string,
    readonly problem: ArticleProblem
  ) {
    super(message);
  }
}

const COPY_INSTEAD =
  "Open the article in your browser, select all, copy, and paste it in the Paste tab: only the headline and story are kept.";

/** A "check you're not a robot" page, shown instead of the article. */
const ROBOT_CHECK =
  /awsWafCookieDomainList|challenge-platform|cf-chl-|Just a moment\.\.\.|not a robot|captcha/i;

/** Jina Reader's error, from its JSON answer: `{name, message, ...}`. */
async function readerError(response: Response, host: string, key: boolean) {
  let name = "";
  let message = "";
  try {
    const body = await response.json();
    name = String(body?.name ?? "");
    message = String(body?.message ?? "");
  } catch {}
  if (response.status === 429) {
    return new ArticleError(
      key
        ? "Jina Reader is busy. Wait a minute and try again."
        : "Jina Reader fetches 20 pages a minute for free. Wait a minute and try again, or add a free key below.",
      "busy"
    );
  }
  if (name === "AuthenticationFailedError" || response.status === 401) {
    return new ArticleError(
      "Jina Reader didn't accept the key. Check it, or remove it to use the free access.",
      "key"
    );
  }
  // Free (keyless) access to a site is paused for a while after Jina sees
  // anything odd on its pages.
  if (name === "AbuseAlleviationError" || /anonymous access/i.test(message)) {
    const until = message.match(
      /blocked until (.+?\d{2}:\d{2}:\d{2} GMT[+-]\d{4})/
    )?.[1];
    const time = until && new Date(until);
    const when =
      time && !Number.isNaN(time.getTime())
        ? ` until ${time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : " for a while";
    return new ArticleError(
      `Jina Reader, which fetches pages for the app, has paused free access to ${host}${when}. Try again then, or add a free key below.`,
      "paused"
    );
  }
  const reason = message.replace(/\s+/g, " ").slice(0, 160);
  return new ArticleError(
    reason
      ? `Jina Reader couldn't get that page: ${reason}`
      : `Jina Reader couldn't get that page (error ${response.status}). Try again in a moment.`,
    "reader"
  );
}

/** Fetches a web page and returns its headline and story. */
export async function fetchArticle(
  address: string,
  {
    key = "",
    fetchPage = fetch,
  }: { key?: string; fetchPage?: typeof fetch } = {}
): Promise<ImportedText> {
  // A shared link often comes with the headline in front of it.
  const link = address.match(/https?:\/\/\S+/i)?.[0];
  let url: URL;
  try {
    url = new URL(link ?? "");
  } catch {
    throw new ArticleError(
      "That isn't a link. Paste a web address starting with https://",
      "address"
    );
  }

  const headers: Record<string, string> = { "X-Return-Format": "html" };
  if (key.trim()) headers.Authorization = `Bearer ${key.trim()}`;
  let response: Response | undefined;
  // One more try when the reader can't be reached or has a passing fault.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetchPage(READER + url.href, { headers });
      if (response.status < 500) break;
    } catch {
      response = undefined;
    }
  }
  if (!response) {
    throw new ArticleError(
      "Couldn't reach Jina Reader (r.jina.ai), which fetches pages for the app. Check your connection and try again.",
      "offline"
    );
  }
  if (!response.ok)
    throw await readerError(response, url.hostname, !!key.trim());

  const html = await response.text();
  const article = articleFromHtml(html, url.href);
  if (article) return article;
  if (ROBOT_CHECK.test(html)) {
    throw new ArticleError(
      `${url.hostname} shows apps a "check you're not a robot" page instead of the article (Kompas does this). ${COPY_INSTEAD}`,
      "robot"
    );
  }
  throw new ArticleError(
    `No story found on that page. If it is an article, the site may not let apps read it. ${COPY_INSTEAD}`,
    "no-story"
  );
}
