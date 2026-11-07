import { describe, expect, it, vi } from "vitest";
import { ArticleError, articleFromHtml, fetchArticle } from "./webArticle";

const STORY = [
  "Hujan deras yang turun sejak pagi membuat sungai di tengah kota meluap dan merendam ratusan rumah warga di tiga kelurahan.",
  "Petugas pemadam kebakaran bersama relawan mengevakuasi warga lanjut usia dan anak-anak ke balai desa yang lebih tinggi.",
  "Menurut kepala desa, air mulai masuk ke rumah warga sekitar pukul sepuluh pagi dan terus naik hingga sore hari.",
  "Pemerintah kota menyiapkan dapur umum dan tenda darurat bagi warga yang belum bisa kembali ke rumah masing-masing.",
  "Warga berharap pemerintah segera memperbaiki tanggul sungai yang rusak sejak banjir besar tahun lalu.",
];
const HEADLINE = "Banjir rendam ratusan rumah warga di tengah kota";

/** A news page laid out like Kompas: menus, a byline, links inside the story. */
function newsPage() {
  return `<!doctype html><html><head>
    <title>${HEADLINE} - Kompas.com</title>
    <meta property="og:site_name" content="Kompas.com">
  </head><body>
    <nav><a href="/">Beranda</a> <a href="/regional">Regional</a> <a href="/nasional">Nasional</a></nav>
    <div class="read__header"><h1 class="read__title">${HEADLINE}</h1>
      <div class="read__credit">Penulis: Budi Santoso</div></div>
    <div class="read__content">
      <p><strong>SEMARANG, KOMPAS.com</strong> - ${STORY[0]}</p>
      <figure><img src="/banjir.jpg"><figcaption>Warga melintasi banjir di Semarang.</figcaption></figure>
      <p>${STORY[1]}</p>
      <p><strong>Baca juga: <a href="/x">Polisi selidiki kebakaran pasar</a></strong></p>
      <p>${STORY[2]}</p>
      <p>${STORY[3]} <em>Kata</em> dia.</p>
      <p>${STORY[4]}</p>
      <p>Dapatkan update berita pilihan dan breaking news setiap hari dari Kompas.com.</p>
    </div>
    <footer><a href="/about">Tentang kami</a> <a href="/kontak">Kontak</a></footer>
  </body></html>`;
}

describe("articleFromHtml", () => {
  it("keeps only the headline and the story", () => {
    const article = articleFromHtml(
      newsPage(),
      "https://regional.kompas.com/read/1"
    );
    expect(article?.title).toBe(HEADLINE);
    expect(article?.author).toBe("Kompas.com");
    const content = article?.content ?? "";
    for (const sentence of STORY) expect(content).toContain(sentence);
    for (const junk of [
      "Beranda",
      "Penulis",
      "Warga melintasi",
      "Baca juga",
      "Dapatkan update",
      "Kontak",
      "*",
    ]) {
      expect(content).not.toContain(junk);
    }
    expect(content.split("\n\n")).toHaveLength(5);
  });

  it("finds the story in a page copied from a browser", () => {
    const copied = `<html><body><!--StartFragment--><a href="/">Beranda</a><h1>${HEADLINE}</h1>
      ${STORY.map((s) => `<p>${s}</p>`).join("")}<p>Baca juga: Harga cabai naik lagi</p><!--EndFragment--></body></html>`;
    const article = articleFromHtml(copied);
    expect(article?.title).toBe(HEADLINE);
    expect(article?.content).toBe(STORY.join("\n\n"));
  });

  it("joins a lone dateline to the story and drops the editors' initials", () => {
    const page = `<html><head><title>${HEADLINE}</title></head><body><article><h1>${HEADLINE}</h1>
      <p>Jakarta, CNN Indonesia --</p>${STORY.map((s) => `<p>${s}</p>`).join("")}<p>(asa/jal)</p></article></body></html>`;
    const paragraphs = articleFromHtml(page)?.content.split("\n\n") ?? [];
    expect(paragraphs[0]).toBe(`Jakarta, CNN Indonesia -- ${STORY[0]}`);
    expect(paragraphs.at(-1)).toBe(STORY[4]);
  });

  it("finds no story on a robot check or a list of links", () => {
    const check = `<html><head><title></title><script>window.awsWafCookieDomainList = [];</script></head>
      <body><div id="challenge-container"></div><noscript><h1>JavaScript is disabled</h1>
      In order to continue, we need to verify that you're not a robot.</noscript></body></html>`;
    expect(articleFromHtml(check)).toBeNull();
    const links = `<html><head><title>Berita terkini</title></head><body><ul>${STORY.map(
      (s, i) => `<li><a href="/${i}">${s.slice(0, 40)}</a></li>`
    ).join("")}</ul></body></html>`;
    expect(articleFromHtml(links)).toBeNull();
  });
});

describe("fetchArticle", () => {
  const respond = (body: string, status = 200) =>
    vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response(body, { status })
    );

  it("fetches the page through the reader and extracts it", async () => {
    const fetchPage = respond(newsPage());
    const article = await fetchArticle(
      " https://regional.kompas.com/read/1 ",
      fetchPage
    );
    expect(article.title).toBe(HEADLINE);
    expect(fetchPage).toHaveBeenCalledWith(
      "https://r.jina.ai/https://regional.kompas.com/read/1",
      {
        headers: { "X-Return-Format": "html" },
      }
    );
  });

  it("says what went wrong", async () => {
    await expect(fetchArticle("kompas", respond(""))).rejects.toThrow(
      "isn't a web address"
    );
    await expect(
      fetchArticle("https://a.id/1", respond("", 429))
    ).rejects.toThrow("Wait a minute");
    await expect(
      fetchArticle("https://a.id/1", respond("", 403))
    ).rejects.toThrow("Paste tab");
    await expect(
      fetchArticle("https://a.id/1", respond("<html></html>"))
    ).rejects.toBeInstanceOf(ArticleError);
  });
});
