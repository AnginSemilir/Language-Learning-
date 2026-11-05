import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { parseEpub } from "./epub";
import { subtitlesToText } from "./textFiles";

describe("subtitlesToText", () => {
  it("drops numbers, timestamps, tags and repeated cues", () => {
    const srt = `1
00:00:01,000 --> 00:00:02,000
<i>Selamat pagi.</i>

2
00:00:02,500 --> 00:00:04,000
- Apa kabar?

3
00:00:04,500 --> 00:00:05,000
- Apa kabar?
`;
    expect(subtitlesToText(srt)).toBe("Selamat pagi. Apa kabar?");
  });

  it("reads WebVTT", () => {
    const vtt =
      "WEBVTT\n\n00:01.000 --> 00:02.000\nAku makan.\n\n00:02.000 --> 00:03.000\nKamu minum.\n";
    expect(subtitlesToText(vtt)).toBe("Aku makan. Kamu minum.");
  });
});

describe("parseEpub", () => {
  it("returns chapters in spine order with titles from the table of contents", async () => {
    const zip = new JSZip();
    zip.file(
      "META-INF/container.xml",
      '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>'
    );
    zip.file(
      "OEBPS/content.opf",
      `<package><metadata><dc:title>Cerita Pendek</dc:title><dc:creator>Penulis</dc:creator></metadata>
      <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        <item id="c1" href="bab1.xhtml" media-type="application/xhtml+xml"/>
        <item id="c2" href="bab2.xhtml" media-type="application/xhtml+xml"/>
      </manifest>
      <spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`
    );
    zip.file(
      "OEBPS/toc.ncx",
      `<ncx><navMap>
        <navPoint><navLabel><text>Bab Satu</text></navLabel><content src="bab1.xhtml"/></navPoint>
        <navPoint><navLabel><text>Bab Dua</text></navLabel><content src="bab2.xhtml"/></navPoint>
      </navMap></ncx>`
    );
    zip.file(
      "OEBPS/bab1.xhtml",
      '<html><body><p>Aku pergi ke <a href="x.html">pasar</a> hari ini.</p><img src="a.png"/></body></html>'
    );
    zip.file(
      "OEBPS/bab2.xhtml",
      "<html><body><p>Dia membeli buku baru.</p><p>Bukunya bagus.</p></body></html>"
    );
    const book = await parseEpub(
      await zip.generateAsync({ type: "arraybuffer" })
    );
    expect(book.title).toBe("Cerita Pendek");
    expect(book.author).toBe("Penulis");
    expect(book.chapters.map((c) => c.title)).toEqual(["Bab Satu", "Bab Dua"]);
    expect(book.chapters[0].markdown).toBe("Aku pergi ke pasar hari ini.");
    expect(book.chapters[1].markdown).toBe(
      "Dia membeli buku baru.\n\nBukunya bagus."
    );
  });
});
