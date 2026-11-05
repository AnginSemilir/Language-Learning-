// Turns an imported file into lesson text: plain text and Markdown as is,
// subtitles (.srt, .vtt) as running text, EPUB books via ./epub.

import { parseEpub } from "./epub";

export interface ImportedText {
  title: string;
  author?: string;
  /** Book or series name when the file yields several lessons. */
  collection?: string;
  content: string;
}

const TIMESTAMP = /^\s*\d{1,2}:\d{2}(:\d{2})?[.,]\d{1,3}\s*-->/;

/** Subtitle cues joined into paragraphs, without numbers, times or tags. */
export function subtitlesToText(raw: string): string {
  const lines: string[] = [];
  let previous = "";
  for (const block of raw.replace(/\r/g, "").split(/\n\s*\n/)) {
    const text = block
      .split("\n")
      .filter(
        (line) =>
          line.trim() !== "" &&
          !/^\d+$/.test(line.trim()) &&
          !TIMESTAMP.test(line) &&
          !/^(WEBVTT|NOTE|STYLE|REGION)\b/.test(line.trim())
      )
      .map((line) =>
        line
          .replace(/<[^>]+>/g, "")
          .replace(/\{[^}]*\}/g, "")
          .replace(/^\s*-\s*/, "")
          .trim()
      )
      .filter(Boolean)
      .join(" ");
    if (text && text !== previous) lines.push(text);
    previous = text;
  }
  // Group cues into paragraphs of about five lines.
  const paragraphs: string[] = [];
  for (let i = 0; i < lines.length; i += 5) {
    paragraphs.push(lines.slice(i, i + 5).join(" "));
  }
  return paragraphs.join("\n\n");
}

function baseName(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim() || name
  );
}

export async function readTextFile(file: File): Promise<ImportedText[]> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (ext === "epub") {
    const book = await parseEpub(await file.arrayBuffer());
    if (book.chapters.length === 0) {
      throw new Error("No readable chapters were found in this book.");
    }
    return book.chapters.map((chapter) => ({
      title: chapter.title,
      author: book.author || undefined,
      collection: book.title,
      content: chapter.markdown,
    }));
  }
  const raw = await file.text();
  const content =
    ext === "srt" || ext === "vtt" ? subtitlesToText(raw) : raw.trim();
  if (!content) throw new Error("The file is empty.");
  return [{ title: baseName(file.name), content }];
}
