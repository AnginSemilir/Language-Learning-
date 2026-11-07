// The top 1,000 / 2,000 / 5,000 / 10,000 Indonesian words by frequency, with which
// ones you know. Tap a word to mark it known, or tap a known word to unmark it
// (words known through flashcards stay known while the card is mature).
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { Button, SegmentedControl, Text } from "@/components/ui";
import { deleteVocab, markHeadwordsKnown } from "@/lector/data-layer";
import { loadGrammar, meaningsOf } from "@/lector/dictionary";
import type { GrammarData } from "@/lector/lemma";
import type { DisplayState } from "@/lector/reader/useLexicon";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { db } from "@/logic/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import { formatPercent } from "./KnownCoverage";
import { useFrequency } from "./useFrequency";
import "./reading.css";

const PAGE = 200;
type Filter = "all" | "unknown" | "known";

const NOISE_POS = new Set([
  "name",
  "character",
  "symbol",
  "abbrev",
  "romanization",
]);
const NOISE_GLOSS =
  /abbreviation|initialism|acronym|alternative|spelling|letter-case|obsolete|superseded|rank in judo/i;

/**
 * The first sense of each part of speech, up to two, skipping names,
 * abbreviations and spelling notes. Wiktionary lists "bisa" as "venom" and
 * "bad" before the verb "can"; one sense per part of speech gives
 * "venom; can, be able".
 */
function gloss(data: GrammarData | null, word: string) {
  const byPos = new Map<string, string>();
  for (const { partOfSpeech: pos, gloss: g } of data
    ? meaningsOf(data, word)
    : []) {
    if (NOISE_POS.has(pos) || NOISE_GLOSS.test(g)) continue;
    const short = g.split(/[;:(]/)[0].trim();
    if (short && !byPos.has(pos)) byPos.set(pos, short);
  }
  return [...byPos.values()].slice(0, 2).join("; ");
}

const LABEL: Record<DisplayState, string> = {
  new: "new",
  level1: "learning",
  level2: "learning",
  level3: "learning",
  level4: "learning",
  known: "known",
  ignored: "ignored",
  name: "name",
};

export default function FrequencyListView() {
  const band = Number(useParams().band) || 1000;
  useDocumentTitle(`Top ${band.toLocaleString()} words`);
  const { ranked, coverage, lexicon, error } = useFrequency();
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const [data, setData] = useState<GrammarData | null>(null);
  const explicitKnown = useLiveQuery(
    async () =>
      new Set(
        (await db.words.where("state").equals("known").toArray()).map(
          (w) => w.text
        )
      ),
    []
  );

  useEffect(() => {
    loadGrammar()
      .then((g) => setData(g.data))
      .catch(() => {});
  }, []);

  const { stateOf } = lexicon;
  const rows = useMemo(() => {
    const top = (ranked ?? []).slice(0, band);
    return top
      .map((r) => ({ ...r, state: stateOf(r.headword) }))
      .filter((r) =>
        filter === "all"
          ? true
          : filter === "known"
            ? r.state === "known"
            : r.state !== "known"
      );
  }, [ranked, band, stateOf, filter]);

  const known = coverage?.find((c) => c.band === band)?.known;

  const toggle = async (row: (typeof rows)[number]) => {
    if (row.state === "known") {
      if (explicitKnown?.has(row.headword)) await deleteVocab(row.headword);
      return;
    }
    await markHeadwordsKnown([{ headword: row.headword, forms: row.forms }]);
  };

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs
          segments={[
            { label: "Read", path: "/read" },
            { label: "Known words", path: "/read/known" },
            { label: `Top ${band.toLocaleString()}` },
          ]}
        />
      </AppHeaderContent>
      <div className="library-view">
        <div>
          <h1 className="reading-view__title">
            Top {band.toLocaleString()} words
          </h1>
          <Text size="sm">
            {known !== undefined
              ? `${known.toLocaleString()} of ${band.toLocaleString()} known (${formatPercent(known, band)}). `
              : ""}
            Most frequent first. Tap a word to mark it known, or tap a known
            word to unmark it.
          </Text>
        </div>
        <SegmentedControl
          value={filter}
          onChange={(v) => {
            setFilter(v as Filter);
            setShown(PAGE);
          }}
          data={[
            { value: "all", label: "All" },
            { value: "unknown", label: "Not known" },
            { value: "known", label: "Known" },
          ]}
        />
        {error && <Text>The word list could not be loaded.</Text>}
        {!ranked && !error && <Text>Loading…</Text>}
        <ul className="frequency-list">
          {rows.slice(0, shown).map((r) => {
            const viaCardOnly =
              r.state === "known" && !explicitKnown?.has(r.headword);
            return (
              <li key={r.headword}>
                <button
                  type="button"
                  className={`frequency-list__row frequency-list__row--${r.state === "known" ? "known" : "unknown"}`}
                  onClick={() => toggle(r)}
                  aria-pressed={r.state === "known"}
                  title={
                    viaCardOnly
                      ? "Known through your flashcards"
                      : r.state === "known"
                        ? "Tap to unmark"
                        : "Tap to mark known"
                  }
                >
                  <span className="frequency-list__rank">{r.rank}</span>
                  <span className="frequency-list__text">
                    <span className="frequency-list__word" lang="id">
                      {r.headword}
                    </span>
                    {r.forms.length > 0 && (
                      <span className="frequency-list__forms" lang="id">
                        {" "}
                        {r.forms.slice(0, 3).join(", ")}
                      </span>
                    )}
                    <span className="frequency-list__gloss">
                      {gloss(data, r.headword)}
                    </span>
                  </span>
                  <span
                    className={`frequency-list__state frequency-list__state--${LABEL[r.state].replace(" ", "-")}`}
                  >
                    {viaCardOnly ? "flashcard" : LABEL[r.state]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {rows.length > shown && (
          <Button onClick={() => setShown(shown + PAGE)}>
            Show more ({(rows.length - shown).toLocaleString()} left)
          </Button>
        )}
      </div>
    </>
  );
}
