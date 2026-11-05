// Ported from Lector (heuwels/lector@eb393ce, AGPL-3.0-only): api/src/lib/epub-parser.ts
// Changes: runs in the browser with JSZip instead of AdmZip on the server
// (async reads); node:path replaced with a string dirname.
import JSZip from "jszip";
import { id as pack } from "../languages/id/manifest";
import { normalizeText } from "../languages/text";
import { countWords, htmlToMarkdown } from "./html-to-markdown";

export interface EpubChapter {
  title: string;
  markdown: string;
  wordCount: number;
}

export interface ParsedEpub {
  title: string;
  author: string;
  chapters: EpubChapter[];
}

const MAX_ENTRIES = 5000;

function dirname(p: string) {
  const i = p.lastIndexOf("/");
  return i < 0 ? "." : p.slice(0, i);
}

async function readText(zip: JSZip, ...paths: string[]) {
  for (const p of paths) {
    const file = zip.file(p);
    if (file) return file.async("string");
  }
  return null;
}

export async function parseEpub(data: ArrayBuffer | Blob): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(data);
  if (Object.keys(zip.files).length > MAX_ENTRIES) {
    throw new Error("EPUB has too many entries");
  }

  const containerXml = await readText(zip, "META-INF/container.xml");
  const opfPathMatch = containerXml?.match(/full-path="([^"]+)"/);
  if (!opfPathMatch) {
    throw new Error("Could not find OPF file path in container.xml");
  }
  const opfPath = opfPathMatch[1];
  const opfDir = dirname(opfPath);
  const opfXml = (await readText(zip, opfPath)) ?? "";

  const title = normalizeText(
    extractTag(opfXml, "dc:title") || extractTag(opfXml, "title") || "Untitled"
  );
  const author = normalizeText(
    extractTag(opfXml, "dc:creator") || extractTag(opfXml, "creator") || ""
  );

  const manifest = new Map<string, string>();
  const manifestRegex =
    /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*(?:media-type="([^"]+)")?[^>]*\/?>/g;
  let match: RegExpExecArray | null = manifestRegex.exec(opfXml);
  while (match !== null) {
    manifest.set(match[1], match[2]);
    match = manifestRegex.exec(opfXml);
  }
  const manifestRegex2 =
    /<item\s+[^>]*href="([^"]+)"[^>]*id="([^"]+)"[^>]*\/?>/g;
  match = manifestRegex2.exec(opfXml);
  while (match !== null) {
    if (!manifest.has(match[2])) manifest.set(match[2], match[1]);
    match = manifestRegex2.exec(opfXml);
  }

  const spineItemRefs: string[] = [];
  const spineRegex = /<itemref\s+[^>]*idref="([^"]+)"[^>]*\/?>/g;
  match = spineRegex.exec(opfXml);
  while (match !== null) {
    spineItemRefs.push(match[1]);
    match = spineRegex.exec(opfXml);
  }

  const chapters: EpubChapter[] = [];
  const tocTitles = await parseToc(zip, opfXml, opfDir);

  for (const itemRef of spineItemRefs) {
    const href = manifest.get(itemRef);
    if (!href) continue;
    const decoded = decodeURIComponent(href);
    const filePath = opfDir !== "." ? `${opfDir}/${decoded}` : decoded;
    const xhtml = await readText(zip, filePath, decoded);
    if (!xhtml) continue;

    const bodyMatch = xhtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : xhtml;
    const markdown = htmlToMarkdown(bodyHtml).trim();
    if (!markdown || markdown.length < 10) continue;

    const headingMatch = markdown.match(/^#+\s+(.+)$/m);
    const tocTitle = tocTitles.get(href);
    const chapterTitle = normalizeText(
      tocTitle || headingMatch?.[1] || `Chapter ${chapters.length + 1}`
    );
    chapters.push({
      title: chapterTitle,
      markdown,
      wordCount: countWords(markdown, pack),
    });
  }

  return { title, author, chapters };
}

function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

async function parseToc(
  zip: JSZip,
  opfXml: string,
  opfDir: string
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  const ncxMatch =
    opfXml.match(/<item[^>]*id="ncx"[^>]*href="([^"]+)"[^>]*\/?>/i) ||
    opfXml.match(/<item[^>]*href="([^"]+)"[^>]*id="ncx"[^>]*\/?>/i) ||
    opfXml.match(
      /<item[^>]*media-type="application\/x-dtbncx\+xml"[^>]*href="([^"]+)"[^>]*\/?>/i
    ) ||
    opfXml.match(
      /<item[^>]*href="([^"]+)"[^>]*media-type="application\/x-dtbncx\+xml"[^>]*\/?>/i
    );

  if (ncxMatch) {
    const ncxPath = opfDir !== "." ? `${opfDir}/${ncxMatch[1]}` : ncxMatch[1];
    const ncxXml = await readText(zip, ncxPath, ncxMatch[1]);
    if (ncxXml) {
      const navPointRegex =
        /<navPoint[^>]*>[\s\S]*?<text>([^<]+)<\/text>[\s\S]*?<content\s+src="([^"]+)"[\s\S]*?<\/navPoint>/g;
      let match = navPointRegex.exec(ncxXml);
      while (match !== null) {
        titles.set(match[2].split("#")[0], match[1].trim());
        match = navPointRegex.exec(ncxXml);
      }
    }
  }

  if (titles.size === 0) {
    const navMatch =
      opfXml.match(/<item[^>]*properties="nav"[^>]*href="([^"]+)"[^>]*\/?>/i) ||
      opfXml.match(/<item[^>]*href="([^"]+)"[^>]*properties="nav"[^>]*\/?>/i);
    if (navMatch) {
      const navPath = opfDir !== "." ? `${opfDir}/${navMatch[1]}` : navMatch[1];
      const navHtml = await readText(zip, navPath, navMatch[1]);
      if (navHtml) {
        const linkRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
        let match = linkRegex.exec(navHtml);
        while (match !== null) {
          titles.set(match[1].split("#")[0], match[2].trim());
          match = linkRegex.exec(navHtml);
        }
      }
    }
  }
  return titles;
}
