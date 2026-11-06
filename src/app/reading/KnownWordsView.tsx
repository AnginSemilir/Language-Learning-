// Known words: marked known while reading, or learned through flashcards
// (mature cards). Coverage of the most frequent words at the top; search,
// unmark, or copy the list below.
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { notify } from "@/components/Notification";
import { Button, Group, Text, TextInput } from "@/components/ui";
import { deleteVocab } from "@/lector/data-layer";
import { loadGrammar } from "@/lector/dictionary";
import { getKnownWords } from "@/lector/knownWords";
import type { GrammarData } from "@/lector/lemma";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { IconCopy, IconX } from "@tabler/icons-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { AppHeaderContent } from "../shell/Header/Header";
import KnownCoverage from "./KnownCoverage";
import { useFrequency } from "./useFrequency";
import "./reading.css";

const AUTO_MARK_KEY = "kartu-mark-known";

function firstGloss(data: GrammarData | null, word: string) {
  const sense = data?.e[word]?.[0];
  return sense ? sense[1].split(/[;:(]/)[0].trim() : "";
}

export default function KnownWordsView() {
  useDocumentTitle("Known words");
  const [query, setQuery] = useState("");
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

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (known ?? []).filter(
      (v) => !q || v.text.includes(q) || v.forms.some((f) => f.includes(q))
    );
  }, [known, query]);

  const copy = async () => {
    const text = (known ?? []).map((v) => v.text).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      notify("Copied", `${known?.length ?? 0} words copied.`, "success", 1500);
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
            {known?.length ?? 0} known words
          </h1>
          <Text size="sm">
            Words you marked known while reading, plus flashcard words you've
            learned (reviewed with a gap of 21 days or more). Passive forms
            count with their base word (<em>dibeli</em> with <em>beli</em>).
          </Text>
        </div>
        <KnownCoverage coverage={coverage} error={error} />
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
            disabled={!known?.length}
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
            {known?.length
              ? "No matches."
              : "Nothing yet. While reading, turn the page and choose “Mark known” to add the words you didn't need to look up."}
          </Text>
        ) : (
          <ul className="known-words__list">
            {rows.map((v) => {
              const forms = v.forms;
              const gloss = v.translation || firstGloss(data, v.text);
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
