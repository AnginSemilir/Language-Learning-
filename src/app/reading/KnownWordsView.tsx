// Known and familiar words, from reading and flashcards together (see
// knownWords.ts). Coverage of the most frequent words at the top; the two
// lists below, to search, unmark or copy.
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { notify } from "@/components/Notification";
import {
  Button,
  Group,
  SegmentedControl,
  Text,
  TextInput,
} from "@/components/ui";
import { deleteVocab } from "@/lector/data-layer";
import {
  type LookupOptions,
  loadGrammar,
  meaningsOf,
} from "@/lector/dictionary";
import { getKnownWords } from "@/lector/knownWords";
import type { GrammarData } from "@/lector/lemma";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import type { KnownLevel } from "@/logic/card/card";
import { useDictionaryChoice } from "@/logic/settings/dictionaryOptions";
import { IconCopy, IconX } from "@tabler/icons-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { AppHeaderContent } from "../shell/Header/Header";
import KnownCoverage from "./KnownCoverage";
import { useFrequency } from "./useFrequency";
import "./reading.css";

const AUTO_MARK_KEY = "kartu-mark-known";

function firstGloss(
  data: GrammarData | null,
  word: string,
  options: LookupOptions
) {
  const sense = data ? meaningsOf(data, word, options)[0] : undefined;
  return sense ? sense.gloss.split(/[;:(]/)[0].trim() : "";
}

export default function KnownWordsView() {
  const dictionary = useDictionaryChoice();
  useDocumentTitle("Known words");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<KnownLevel>("known");
  const [data, setData] = useState<GrammarData | null>(null);
  const [autoMark, setAutoMark] = useState(() => {
    try {
      return localStorage.getItem(AUTO_MARK_KEY) === "always";
    } catch {
      return false;
    }
  });
  const known = useLiveQuery(() => getKnownWords(), []);
  const { coverage, error } = useFrequency();

  useEffect(() => {
    loadGrammar()
      .then((g) => setData(g.data))
      .catch(() => {});
  }, []);

  const counts = useMemo(() => {
    let k = 0;
    let f = 0;
    for (const v of known ?? []) {
      if (v.level === "known") k++;
      else f++;
    }
    return { known: k, familiar: f };
  }, [known]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (known ?? []).filter(
      (v) =>
        v.level === level &&
        (!q || v.text.includes(q) || v.forms.some((f) => f.includes(q)))
    );
  }, [known, query, level]);

  const copy = async () => {
    const list = (known ?? []).filter((v) => v.level === level);
    try {
      await navigator.clipboard.writeText(list.map((v) => v.text).join("\n"));
      notify("Copied", `${list.length} words copied.`, "success", 1500);
    } catch {
      notify("Not copied", "Your browser blocked the clipboard.", "error");
    }
  };

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs
          segments={[
            { label: "Read", path: "/read" },
            { label: "Known words" },
          ]}
        />
      </AppHeaderContent>
      <div className="library-view">
        <div>
          <h1 className="reading-view__title">
            {`${counts.known.toLocaleString()} known, ${counts.familiar.toLocaleString()} familiar`}
          </h1>
          <Text size="sm">
            From reading and flashcards together. Known words don't come back;
            familiar ones are probably known and get checked again: a familiar
            flashcard comes back once in a few months, and right makes it known.
            Flashcards you've learned (reviewed with a gap of 21 days or more)
            count as familiar. A card with several words counts each word, but
            fixed phrases like <em>tanggung jawab</em> stay whole. Passive forms
            count with their base word (<em>dibeli</em> with <em>beli</em>).
          </Text>
        </div>
        <KnownCoverage coverage={coverage} error={error} />
        <SegmentedControl
          value={level}
          onChange={(v) => setLevel(v as KnownLevel)}
          data={[
            {
              value: "known",
              label: `Known (${counts.known.toLocaleString()})`,
            },
            {
              value: "familiar",
              label: `Familiar (${counts.familiar.toLocaleString()})`,
            },
          ]}
        />
        <Group gap="sm" justify="space-between" wrap="wrap">
          <TextInput
            id="known-search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
          <Button
            variant="default"
            leftSection={<IconCopy size={16} />}
            onClick={copy}
            disabled={!rows.length}
          >
            Copy list
          </Button>
        </Group>
        <label className="known-words__setting">
          <input
            type="checkbox"
            checked={autoMark}
            onChange={(e) => {
              const always = e.currentTarget.checked;
              setAutoMark(always);
              try {
                localStorage.setItem(AUTO_MARK_KEY, always ? "always" : "ask");
              } catch {
                // A convenience only.
              }
            }}
          />{" "}
          When I turn a page, mark the rest as known without asking
        </label>
        {rows.length === 0 ? (
          <Text>
            {query.trim()
              ? "No matches."
              : level === "known"
                ? "Nothing yet. While reading, turn the page and choose “Mark known” to add the words you didn't need to look up."
                : "Nothing yet. Words you mark Familiar while reading, and flashcards you mark Familiar or have learned, show here."}
          </Text>
        ) : (
          <ul className="known-words__list">
            {rows.map((v) => {
              const forms = v.forms;
              const gloss =
                v.translation || firstGloss(data, v.text, dictionary.lookup);
              return (
                <li key={v.text} className="known-words__row">
                  <div className="known-words__text">
                    <span lang="id" className="known-words__word">
                      {v.text}
                    </span>
                    {forms.length > 0 && (
                      <span className="known-words__forms" lang="id">
                        {" "}
                        {forms.join(", ")}
                      </span>
                    )}
                    {v.viaFlashcard && (
                      <span className="known-words__tag">flashcard</span>
                    )}
                    {gloss && <div className="known-words__gloss">{gloss}</div>}
                  </div>
                  {v.entryId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Unmark ${v.text}`}
                      onClick={() => v.entryId && deleteVocab(v.entryId)}
                    >
                      <IconX size={16} />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
