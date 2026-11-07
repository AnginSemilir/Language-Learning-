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
  type Answer = { body: string; status?: number } | "offline";
  /** A fake fetch giving these answers in turn. */
  const answers = (...list: Answer[]) =>
    vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
      const next = list.length > 1 ? list.shift() : list[0];
      if (!next || next === "offline") throw new TypeError("Failed to fetch");
      return new Response(next.body, { status: next.status ?? 200 });
    });
  const jinaError = (status: number, name: string, message: string) => ({
    status,
    body: JSON.stringify({ code: status, name, message }),
  });
  const problem = (promise: Promise<unknown>) =>
    promise.then(
      () => "no error",
      (e: ArticleError) => `${e.problem}: ${e.message}`
    );

  it("fetches the page through the reader and extracts it", async () => {
    const fetchPage = answers({ body: newsPage() });
    const article = await fetchArticle(
      "Banjir rendam rumah - Kompas.com https://regional.kompas.com/read/1 ",
      { fetchPage, key: " jina_abc " }
    );
    expect(article.title).toBe(HEADLINE);
    expect(fetchPage).toHaveBeenCalledWith(
      "https://r.jina.ai/https://regional.kompas.com/read/1",
      {
        headers: {
          "X-Return-Format": "html",
          Authorization: "Bearer jina_abc",
        },
      }
    );
  });

  it("tries again once when the reader has a passing fault", async () => {
    const fetchPage = answers("offline", { body: newsPage() });
    expect((await fetchArticle("https://a.id/1", { fetchPage })).title).toBe(
      HEADLINE
    );
    const failing = answers({ body: "", status: 502 });
    expect(
      await problem(fetchArticle("https://a.id/1", { fetchPage: failing }))
    ).toMatch(/^reader: .*error 502/);
    expect(failing).toHaveBeenCalledTimes(2);
    expect(
      await problem(
        fetchArticle("https://a.id/1", { fetchPage: answers("offline") })
      )
    ).toMatch(/^offline: Couldn't reach Jina Reader/);
  });

  it("says what went wrong", async () => {
    const fetchWith = (answer: Answer, key = "") =>
      problem(
        fetchArticle("https://www.bbc.com/indonesia/1", {
          fetchPage: answers(answer),
          key,
        })
      );
    expect(
      await problem(fetchArticle("kompas", { fetchPage: answers("offline") }))
    ).toMatch(/^address: /);
    expect(await fetchWith({ body: "", status: 429 })).toMatch(
      /^busy: .*20 pages a minute.*add a free key/
    );
    expect(await fetchWith({ body: "", status: 429 }, "jina_abc")).not.toMatch(
      /add a free key/
    );
    expect(
      await fetchWith(
        jinaError(
          403,
          "AbuseAlleviationError",
          "Anonymous access to domain www.bbc.com blocked until Sat Nov 07 2026 09:40:30 GMT+0000 (Coordinated Universal Time) due to previous abuse"
        )
      )
    ).toMatch(
      /^paused: .*paused free access to www\.bbc\.com until \d{2}.\d{2}\b.*add a free key/
    );
    expect(
      await fetchWith(
        jinaError(401, "AuthenticationFailedError", "Invalid API key"),
        "jina_x"
      )
    ).toMatch(/^key: /);
    expect(
      await fetchWith(
        jinaError(
          422,
          "SubmittedDataMalformedError",
          "Domain could not be resolved"
        )
      )
    ).toBe(
      "reader: Jina Reader couldn't get that page: Domain could not be resolved"
    );
  });

  it("tells a robot check from a page without a story", async () => {
    const robot = `<html><head><script>window.awsWafCookieDomainList = [];</script></head>
      <body><noscript>we need to verify that you're not a robot.</noscript></body></html>`;
    expect(
      await problem(
        fetchArticle("https://regional.kompas.com/1", {
          fetchPage: answers({ body: robot }),
        })
      )
    ).toMatch(/^robot: regional\.kompas\.com shows apps .*Paste tab/);
    expect(
      await problem(
        fetchArticle("https://a.id/", {
          fetchPage: answers({ body: "<html><body>Beranda</body></html>" }),
        })
      )
    ).toMatch(/^no-story: /);
  });
});
