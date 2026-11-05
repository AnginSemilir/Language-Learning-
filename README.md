# Kartu

Indonesian flashcards, reading and sentence practice in one web app. It runs
entirely in the browser, keeps your data on your device, works offline, and can
be installed on a phone from the browser ("Add to Home screen").

Kartu combines two open-source projects instead of starting from scratch:

| From | What it provides |
| --- | --- |
| [Skola](https://github.com/h16nning/skola) (h16nning, AGPL-3.0) | The app itself: decks, card editor, FSRS spaced-repetition review, notes table, settings, offline PWA. |
| [Lector](https://github.com/heuwels/lector) (heuwels, AGPL-3.0) | The Indonesian language pack (tokenizer, word folding, `meN-`/`ber-`/`-nya` stemming), the reader with colour-coded word states, cloze practice logic, streaks and activity heatmap, 20 graded starter stories, the Indonesian dictionary and sentence bank. |

The Indonesian stemmer is vendored from
[sastrawijs](https://github.com/damzaky/sastrawijs) (MIT, `src/vendor/sastrawi`)
without its Kateglo word list, which is licensed for non-commercial use only;
it runs over Wiktionary's root words instead.

Lector is a server app (Next.js + API + SQLite). Its logic was ported as is
under `src/lector/`, each file marked with where it came from; the parts that
talked to its server were rewritten to use the browser database
(`src/lector/data-layer.ts`).

## Features

- **Your flashcards.** Import a CSV with a `front,back,hint` header from the
  deck menu (Import Cards → From CSV). Extra columns are ignored, the hint is
  shown under the front, and re-importing skips cards already in the deck.
  Cards can be double-sided (both directions) or one-way.
- **Read.** 20 graded starter stories, or add your own: paste text, or import a
  `.txt`/`.md` file, subtitles (`.srt`/`.vtt`) or an EPUB book (one lesson per
  chapter). Lessons are split into pages you swipe through. Tap a word to hear
  it, see its dictionary entry, mark how well you know it, or add it as a
  flashcard. Words already in your flashcards are highlighted as "learning".
- **Mark the rest as known.** Turning the page offers to mark every word on it
  you didn't look up or rate as known (you can leave words out, or have it
  happen without asking). Names and numbers are skipped. Known words are
  listed under Read → Known words.
- **Grammar-aware matching.** Only forms that are the same word share
  progress: *di-* passives with their base (*dibeli* → *beli*, *diberikan* →
  *berikan*, unless the dictionary shows a different meaning), clitics
  (*rumahnya* → *rumah*) and plurals (*buku-buku* → *buku*). Other forms
  (*membeli*, *bertanya*, *merupakan*, *pembelian*) count as words of their
  own; the word panel shows the related root ("Related to *beli*") and has
  **Group with …** / **Count separately** to override per word. Roots come from
  Wiktionary's verb-form table and etymologies, then the
  [Sastrawi](https://github.com/damzaky/sastrawijs) stemmer (MIT) for forms
  Wiktionary doesn't list.
- **Practice.** Fill-in-the-gap on 7,220 Tatoeba sentences built around the
  2,000 most common words. Typing or multiple choice, letter hints, points.
  Correct answers come back after 1, 3, 7 and 14 days; misses reset.
- **Statistics.** Daily streak, points, words known and learning, and a
  year-long activity heatmap. Flashcard reviews, practice and word lookups all
  count.

Not ported from Lector (they need its server): YouTube import, AI translation
and tutor, managed text-to-speech (the browser's own Indonesian voice is used),
Anki sync.

## Develop

```bash
pnpm install
pnpm start        # dev server
pnpm test         # vitest
pnpm lint:type    # tsc
pnpm lint         # biome
pnpm build        # production build in dist/
```

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes the app on every push to
`main` (or run it by hand from the Actions tab). One-time setup: in the
repository's **Settings → Pages**, set **Source** to **GitHub Actions**. The app
is then served at `https://<user>.github.io/<repo>/`. It uses relative paths and
a hash router, so no other configuration is needed.

## Data

- `public/data/dictionary-id.json`: Indonesian→English entries from English
  Wiktionary via [kaikki.org](https://kaikki.org) (CC BY-SA), from Lector's
  `dict-id-2026-08-21` release, converted with
  `scripts/build-dictionary-json.py`, which also extracts verb forms, derived
  nouns and names from the entries' etymologies.
- `public/data/sentences-id.json`: sentences from
  [Tatoeba](https://tatoeba.org) (CC BY 2.0 FR), from Lector's sentence bank.

## License

AGPL-3.0, the license of both Skola and Lector. See [LICENSE](LICENSE).
