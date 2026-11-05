/**
 * Minimal RFC 4180 CSV parser: quoted fields, "" escapes, commas and
 * newlines inside quotes, CRLF or LF line endings, and a leading BOM.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export interface FlashcardRow {
  front: string;
  back: string;
  hint: string;
}

/**
 * Reads rows with a `front,back[,hint]` header (extra columns such as
 * `publishedAt` are ignored). Without a recognised header, the first two
 * columns are front and back and the third, if present, is the hint.
 */
export function parseFlashcardCsv(text: string): FlashcardRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = header.includes("front") && header.includes("back");
  const frontIdx = hasHeader ? header.indexOf("front") : 0;
  const backIdx = hasHeader ? header.indexOf("back") : 1;
  const hintIdx = hasHeader ? header.indexOf("hint") : 2;

  return (hasHeader ? rows.slice(1) : rows)
    .map((r) => ({
      front: (r[frontIdx] ?? "").trim(),
      back: (r[backIdx] ?? "").trim(),
      hint: hintIdx >= 0 ? (r[hintIdx] ?? "").trim() : "",
    }))
    .filter((r) => r.front !== "" && r.back !== "");
}
