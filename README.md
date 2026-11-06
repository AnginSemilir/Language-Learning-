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
- **Daily limits, like Anki.** Settings → Learning: new cards per day (20)
  and maximum reviews per day (200), the hour the next day starts (4am), new
  card order (order added, or random), whether new cards come mixed with
  reviews, after them or before them, and burying a card's other side until
  tomorrow (off). Defaults are Anki's. The deck shows today's numbers ("20
  new"), front → back cards come before their reverse cards, and "Study
  anyway" on a finished deck ignores the limits.
- **Reviewing on a computer.** Space or Enter shows the answer; the number
  keys rate the card in the order of the buttons (1 Again, 2 Hard, 3 Good,
  4 Easy; with Hard and Easy turned off, 1 Again and 2 Good). The keys are
  shown on the buttons when you use a mouse. **Back** (the arrow at the bottom left on a
  phone, next to ✕ on a computer, or Z / Ctrl+Z) takes back your last answer: the card's
  schedule is restored and it is shown again to rate. It works for every
  answer in the session, until the session ends. Above each card a small
  tree shows how well it's learned: a seed (new), a sapling (learning), a
  young oak (next review under 21 days), an oak (21 days or more, when the
  word counts as known) and a grand oak (90 days or more). **Edit** in the
  card's ⋯ menu (or E) opens the card right there; the editor has bold,
  italic, underline, text colours, highlight and more.
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
- **Practice.** Fill-in-the-gap on the words of your flashcards: each word
  in a real sentence, a different one every time, with the English
  translation when there is one and the card's meaning otherwise. Typing
  (the card's word or the form in the sentence both count) or multiple
  choice, letter hints, points. Gap-fill only reads your cards: it doesn't
  change their reviews or which words count as known. On a computer: Enter
  checks, moves on and starts a round; in the answer box `?` gives a letter
  and Esc means "I don't know"; 1–4 pick a multiple-choice answer; L listens
  and H hides the sentence.
- **Light or dark.** "Dark view" / "Light view" in the menu switches theme
  (Settings → Appearance also has Auto, following the system). Each word comes back after 1, 3, 7 and 14
  days; a miss resets it. Choose cards you've studied or all cards; hide a
  bad sentence and it won't come back. A new card gets sentences straight
  away: the app downloads the small sentence file holding that word (and
  keeps it for offline use), then falls back to the example on the card and
  sentences from your reading library.
- **Known words.** Words marked known while reading, plus flashcard words
  you've learned (the Indonesian → English card reviewed with a gap of 21
  days or more, Anki's "mature"). Shows how many of the top 1,000 / 2,000 /
  5,000 Indonesian words you know; tap a band to see those words by
  frequency and mark them known or not. Frequency data:
  [wordfreq](https://github.com/rspeer/wordfreq) (data CC BY-SA 4.0), built
  with `scripts/build-frequency-json.py`.
- **Sync between devices (optional).** Settings → Sync: sign in with your
  email and a one-time code to sync cards, word progress, lessons and
  statistics between phone and laptop through
  [Dexie Cloud](https://dexie.org/cloud/) (the sync service Skola was built
  for). Signed out, everything stays in the browser as before. Signing out
  removes the data from that device (it stays in the cloud), so export a
  backup first.
- **Statistics.** Daily streak, points, words known and learning, and a
  year-long activity heatmap. Flashcard reviews, practice and word lookups all
  count. A **Flashcards** section, like Anki's statistics: today's answers,
  recall and what's left; your forest (cards at each stage from seed to grand
  oak); cards due on each of the next 30 days; answers on each of the last 30
  days; recall for young and mature cards and how often you press each answer
  button; the hour of the day you do best; and your hardest cards, with
  leeches (forgotten 8 times or more) marked. Tap a hard card to edit it.
  Every chart has a table view.

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

## Sync setup

The app syncs with the Dexie Cloud database in `src/logic/db.ts`. To use your
own: `npx dexie-cloud create` (asks for your email and a one-time code; writes
`dexie-cloud.json` and the secret `dexie-cloud.key`, which must not be
committed), then `npx dexie-cloud whitelist https://<user>.github.io`, and put
the `dbUrl` from `dexie-cloud.json` into `db.cloud.configure()`.

## Data

- `public/data/dictionary-id.json`: Indonesian→English entries from English
  Wiktionary via [kaikki.org](https://kaikki.org) (CC BY-SA), from Lector's
  `dict-id-2026-08-21` release, converted with
  `scripts/build-dictionary-json.py`, which also extracts verb forms, derived
  nouns and names from the entries' etymologies.
- `public/data/frequency-id.json`: the 9,000 most frequent Indonesian word
  forms in the dictionary, from [wordfreq](https://github.com/rspeer/wordfreq)
  3.1.1 (data CC BY-SA 4.0).
- `public/data/sentences/`: up to 20 example sentences for each of about
  29,000 Indonesian words and phrases (20 for the 5,000 most frequent
  words), split into 512 files by word. Built with
  `scripts/extract-sentences.py` (download commands in its header) and
  `pnpm build:sentences <tsv>`. Translated sentences come first, in this
  order: learner sentences (Tatoeba, TALPCo, Wiktionary, MASSIVE), then
  news and health texts (ALT, Global Voices, TICO-19), then OpenSubtitles;
  sentences without a translation come last. As a
  compilation the files are CC BY-SA 4.0; each sentence keeps its source's
  licence:
  - [Tatoeba](https://tatoeba.org) (CC BY 2.0 FR)
  - Wiktionary usage examples via [kaikki.org](https://kaikki.org) (CC BY-SA)
  - [TALPCo](https://github.com/matbahasa/TALPCo), the TUFS Asian Language
    Parallel Corpus (CC BY 4.0)
  - [Amazon MASSIVE](https://github.com/alexa/massive) (CC BY 4.0), requests
    that name localised people or places left out
  - [Asian Language Treebank](https://www2.nict.go.jp/astrec-att/member/mutiyama/ALT/)
    (NICT, CC BY 4.0)
  - [Global Voices](https://globalvoices.org) via [OPUS](https://opus.nlpl.eu)
    (CC BY)
  - [TICO-19](https://tico-19.github.io) (CC0)
  - [OpenSubtitles](https://www.opensubtitles.org) v2018 via
    [OPUS](https://opus.nlpl.eu/OpenSubtitles/en&id/v2018/OpenSubtitles)
    (P. Lison and J. Tiedemann, 2016; no licence stated). Film subtitles with
    loose translations, so they come last among translated sentences.
  - [Leipzig Corpora Collection](https://wortschatz.uni-leipzig.de), news 2023
    and Wikipedia 2021 (CC BY), Indonesian only

## License

AGPL-3.0, the license of both Skola and Lector. See [LICENSE](LICENSE).
