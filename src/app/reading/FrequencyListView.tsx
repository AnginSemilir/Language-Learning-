// The top 1,000 / 2,000 / 5,000 / 10,000 Indonesian words by frequency, with which
// ones you know. Tap a word to mark it known, or tap a known word to unmark it
// (words known through flashcards stay known while the card is mature).
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { Button, SegmentedControl, Text, TextInput } from "@/components/ui";
import { deleteVocab, markHeadwordsKnown } from "@/lector/data-layer";
import {
  type LookupOptions,
  loadGrammar,
  meaningsOf,
} from "@/lector/dictionary";
import { type GrammarData, fold } from "@/lector/lemma";
import type { DisplayState } from "@/lector/reader/useLexicon";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { db } from "@/logic/db";
import { useDictionaryChoice } from "@/logic/settings/dictionaryOptions";
import {
  IconSearch,
  IconSortAscendingNumbers,
  IconSortDescendingNumbers,
} from "@tabler/icons-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
function gloss(data: GrammarData | null, word: string, options: LookupOptions) {
  const byPos = new Map<string, string>();
  for (const { partOfSpeech: pos, gloss: g } of data
    ? meaningsOf(data, word, options)
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
  familiar: "familiar",
  known: "known",
  ignored: "ignored",
  name: "name",
};

/** Known, or familiar (probably known). */
function isKnownish(state: DisplayState) {
  return state === "known" || state === "familiar";
}

export default function FrequencyListView() {
  const dictionary = useDictionaryChoice();
  const band = Number(useParams().band) || 1000;
  useDocumentTitle(`Top ${band.toLocaleString()} words`);
  const { ranked, coverage, lexicon, error } = useFrequency();
  const [filter, setFilter] = useState<Filter>("all");
  const [rarestFirst, setRarestFirst] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [search, setSearch] = useState("");
  // Typing stays quick: the list catches up a moment later.
  const query = useDeferredValue(search.trim());
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
    // A search finds the Indonesian (any of its forms), or the English.
    const word = fold(query);
    const english = query.toLowerCase();
    const matches = (r: (typeof top)[number]) =>
      !query ||
      r.headword.includes(word) ||
      r.forms.some((f) => f.includes(word)) ||
      (english.length >= 2 &&
        gloss(data, r.headword, dictionary.lookup)
          .toLowerCase()
          .includes(english));
    const filtered = top
      .map((r) => ({ ...r, state: stateOf(r.headword) }))
      .filter((r) =>
        filter === "all"
          ? true
          : filter === "known"
            ? isKnownish(r.state)
            : !isKnownish(r.state)
      )
      .filter(matches);
    return rarestFirst ? filtered.reverse() : filtered;
  }, [
    ranked,
    band,
    stateOf,
    filter,
    rarestFirst,
    query,
    data,
    dictionary.lookup,
  ]);

  const bandCoverage = coverage?.find((c) => c.band === band);
  const known = bandCoverage && bandCoverage.known + bandCoverage.familiar;

  // A tap marks a word known, a familiar one too; tapping a word marked
  // known while reading unmarks it.
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
            {/* One string: the React Compiler can drop the space in "Top {band}". */}
            {`Top ${band.toLocaleString()} words`}
          </h1>
          <Text size="sm">
            {known !== undefined
              ? `${known.toLocaleString()} of ${band.toLocaleString()} known or familiar (${formatPercent(known, band)}). `
              : ""}
            {rarestFirst ? "Least" : "Most"} frequent first. Tap a word to mark
            it known, or tap a known word to unmark it.
          </Text>
        </div>
        <TextInput
          type="search"
          aria-label="Search the words"
          placeholder="Search in Indonesian or English"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setShown(PAGE);
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="frequency-list__controls">
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
          <Button
            variant="default"
            leftSection={
              // Ranks count down when the rarest come first.
              rarestFirst ? (
                <IconSortDescendingNumbers size={18} />
              ) : (
                <IconSortAscendingNumbers size={18} />
              )
            }
            onClick={() => {
              setRarestFirst(!rarestFirst);
              setShown(PAGE);
            }}
            aria-label={`Sorted ${rarestFirst ? "least" : "most"} common first; tap to reverse`}
          >
            {rarestFirst ? "Least common first" : "Most common first"}
          </Button>
        </div>
        {error && <Text>The word list could not be loaded.</Text>}
        {!ranked && !error && <Text>Loading…</Text>}
        {ranked && query && rows.length === 0 && (
          <Text size="sm">{`No word in the top ${band.toLocaleString()} matches “${query}”.`}</Text>
        )}
        <ul className="frequency-list">
          {rows.slice(0, shown).map((r) => {
            const viaCardOnly =
              r.state === "known" && !explicitKnown?.has(r.headword);
            const knownish = isKnownish(r.state);
            return (
              <li key={r.headword}>
                <button
                  type="button"
                  className={`frequency-list__row frequency-list__row--${knownish ? "known" : "unknown"}`}
                  onClick={() => toggle(r)}
                  aria-pressed={knownish}
                  title={
                    viaCardOnly
                      ? "Known through your flashcards"
                      : r.state === "known"
                        ? "Tap to unmark"
                        : r.state === "familiar"
                          ? "Familiar: tap to mark known"
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
                      {gloss(data, r.headword, dictionary.lookup)}
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
