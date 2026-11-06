// Imported cards keep the CSV's hint column as a second paragraph under the
// word. For sentence cards the hint is often the sentence itself, so the card
// would show it twice. These helpers spot and drop such a repeat.

function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Text for comparing: lower-case, single spaces, no quotes or end punctuation. */
export function comparableText(text: string) {
  return plainText(text)
    .toLowerCase()
    .replace(/["“”'‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?…,;:]+$/, "")
    .trim();
}

export function sameText(a: string, b: string) {
  const x = comparableText(a);
  return x !== "" && x === comparableText(b);
}

/** Removes the second paragraph when it only repeats the first. */
export function dropRepeatedParagraph(html: string) {
  const paragraphs = [...html.matchAll(/<p>(.*?)<\/p>/gs)];
  if (paragraphs.length < 2) return html;
  const [first, second] = paragraphs;
  if (!sameText(first[1], second[1]) || second.index === undefined) return html;
  return (
    html.slice(0, second.index) + html.slice(second.index + second[0].length)
  );
}
