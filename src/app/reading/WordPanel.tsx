// Word panel for the reader. Its actions follow Lector's TranslationDrawer
// (heuwels/lector, AGPL-3.0-only): hear the word, see the dictionary entry,
// set a learning level 1–4, mark known or ignore. "Add as flashcard" is new:
// it saves the word to a Skola deck instead of Lector's Anki export. So are
// phrases: the word can grow into the words around it ("bulan madu") to make
// one card.
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@/components/ui";
import type { DictionaryEntry } from "@/lector/dictionary";
import type { CardMatch } from "@/lector/flashcards";
import { fold } from "@/lector/lemma";
import { speak } from "@/lector/tts";
import type { WordState } from "@/lector/types";
import { Deck } from "@/logic/deck/deck";
import { useDictionaryChoice } from "@/logic/settings/dictionaryOptions";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCards,
  IconCheck,
  IconExternalLink,
  IconEyeOff,
  IconVolume,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

export interface WordPanelData {
  word: string;
  sentence: string;
  /** The headword the word's state is stored under (membeli → beli). */
  headword: string;
  /** The root by form alone, even when counted separately (merupakan → rupa). */
  root: string;
  /** The user's grouping override for this form, if any. */
  link?: "separate" | "group";
  /** For derived nouns with their own entry: the root (kebaikan → baik). */
  derivedFrom?: string;
  /** Treated as a proper noun in this text. */
  isName?: boolean;
  state: WordState;
  entry: DictionaryEntry | undefined | "loading" | "error";
  card: CardMatch | undefined;
}

/** Several words looked up together, to make one card. */
export interface PhrasePanelData {
  text: string;
  sentence: string;
  entry: DictionaryEntry | undefined | "loading" | "error";
  card: CardMatch | undefined;
  /** Each word's first meaning, when the phrase isn't in the dictionary. */
  glosses?: { word: string; gloss: string }[];
}

/** Growing the tapped word into a phrase. */
export interface PhraseTools {
  /** The words that can be added on either side. */
  before?: string;
  after?: string;
  /** A phrase the word is part of: on one of the user's cards, or in the dictionary. */
  suggestion?: { text: string; gloss: string; onCard: boolean };
  onGrow: (side: "before" | "after") => void;
  onOpenSuggestion: () => void;
  /** Back to the tapped word on its own. */
  onReset: () => void;
}

interface WordPanelProps {
  data: WordPanelData | null;
  /** Set when several words are picked: the panel is about them instead. */
  phrase: PhrasePanelData | null;
  phraseTools: PhraseTools | null;
  decks: Deck[];
  defaultDeckId: string | null;
  onClose: () => void;
  onSetState: (state: WordState) => void;
  onSetGrouping: (mode: "separate" | "group") => void;
  onAddCard: (translation: string, deckId: string | null) => Promise<void>;
}

const LEVELS: { state: WordState; label: string }[] = [
  { state: "level1", label: "1" },
  { state: "level2", label: "2" },
  { state: "level3", label: "3" },
  { state: "level4", label: "4" },
];

/** Where the meanings shown come from. */
function credit(entry: DictionaryEntry) {
  const sources = new Set(entry.senses.map((s) => s.source));
  if (sources.has("machine")) {
    return "Machine translation (Opus-MT): may be wrong";
  }
  if (sources.has("wordnet")) {
    return "Wordnet Bahasa (MIT): approximate meanings, from English WordNet";
  }
  if (sources.has("malay")) return "Wiktionary's Malay entry, CC BY-SA";
  if (sources.has("spoken")) return "Everyday spoken Indonesian (Kartu's list)";
  return "Wiktionary, CC BY-SA";
}

export function firstGloss(entry: WordPanelData["entry"]) {
  if (!entry || typeof entry === "string") return "";
  return entry.senses[0]?.gloss.split(/[;:(]/)[0].trim() ?? "";
}

function Meanings({
  entry,
  lookup,
  phrase,
}: {
  entry: WordPanelData["entry"];
  /** What the "Look up in" links search for. */
  lookup: string;
  phrase?: PhrasePanelData;
}) {
  const { links } = useDictionaryChoice();
  return (
    <div className="word-panel__dictionary">
      {entry === "loading" && <Text size="sm">Looking up…</Text>}
      {entry === "error" && (
        <Text size="sm">The dictionary could not be loaded.</Text>
      )}
      {entry === undefined && (
        <Text size="sm">
          {phrase
            ? "Not in the dictionary as a phrase."
            : "Not in the dictionary."}
        </Text>
      )}
      {entry === undefined && !!phrase?.glosses?.length && (
        <ul className="word-panel__glosses">
          {phrase.glosses.map((g, i) => (
            <li key={`${i}-${g.word}`}>
              <strong lang="id">{g.word}</strong>
              {g.gloss ? ` ${g.gloss}` : " (not in the dictionary)"}
            </li>
          ))}
        </ul>
      )}
      {entry && typeof entry === "object" && (
        <>
          {entry.guess ? (
            <Text size="sm">
              Not in the dictionary. Probably from{" "}
              <strong>{entry.lemmaInfo?.stem}</strong>:
            </Text>
          ) : (
            entry.lemmaInfo && (
              <Text size="sm">
                {entry.lemmaInfo.label} <strong>{entry.lemmaInfo.stem}</strong>
              </Text>
            )
          )}
          <ol className="word-panel__senses">
            {entry.senses.map((s, i) => (
              <li key={`${i}-${s.gloss}`}>
                {s.partOfSpeech && (
                  <span className="word-panel__pos">{s.partOfSpeech}</span>
                )}{" "}
                {s.gloss}
              </li>
            ))}
          </ol>
          <Text size="xs" className="word-panel__credit">
            {credit(entry)}
          </Text>
        </>
      )}
      {links.length > 0 && entry !== "loading" && (
        <div className="word-panel__links">
          <span className="word-panel__label">Look up in</span>
          {links.map((link) => (
            <a
              key={link.key}
              className="word-panel__link"
              href={link.url(lookup)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
              <IconExternalLink size={14} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/** Make a phrase: add the word before or after, or use a phrase the word is in. */
function PhraseRow({
  tools,
  word,
  inPhrase,
}: {
  tools: PhraseTools;
  word: string;
  inPhrase: boolean;
}) {
  const { before, after, suggestion } = tools;
  const canGrow = !!before || !!after;
  if (!canGrow && !inPhrase && !suggestion) return null;
  return (
    <div className="word-panel__phrase">
      {suggestion && !inPhrase && (
        <div className="word-panel__grouping">
          <Text size="sm">
            {suggestion.onCard ? "Part of your card" : "Part of the phrase"}{" "}
            <strong lang="id">{suggestion.text}</strong>
            {suggestion.gloss ? `: ${suggestion.gloss}` : ""}
          </Text>
          <Button size="sm" variant="default" onClick={tools.onOpenSuggestion}>
            {suggestion.onCard ? "Show phrase" : "Use phrase"}
          </Button>
        </div>
      )}
      {(canGrow || inPhrase) && (
        <div>
          <div className="word-panel__label">
            {inPhrase ? "Add a word" : "Make a phrase with"}
          </div>
          <Group gap="xs" wrap="wrap">
            {before && (
              <Button
                size="sm"
                variant="default"
                leftSection={<IconArrowLeft size={14} />}
                aria-label={`Add ${before} before`}
                onClick={() => tools.onGrow("before")}
              >
                {before}
              </Button>
            )}
            {after && (
              <Button
                size="sm"
                variant="default"
                rightSection={<IconArrowRight size={14} />}
                aria-label={`Add ${after} after`}
                onClick={() => tools.onGrow("after")}
              >
                {after}
              </Button>
            )}
            {inPhrase && (
              <Button size="sm" variant="ghost" onClick={tools.onReset}>
                {`Just “${word}”`}
              </Button>
            )}
          </Group>
        </div>
      )}
    </div>
  );
}

export default function WordPanel({
  data,
  phrase,
  phraseTools,
  decks,
  defaultDeckId,
  onClose,
  onSetState,
  onSetGrouping,
  onAddCard,
}: WordPanelProps) {
  const [translation, setTranslation] = useState("");
  const [deckId, setDeckId] = useState<string | null>(defaultDeckId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const shown = phrase ?? data;
    if (!shown) return;
    setTranslation(shown.card?.back ?? firstGloss(shown.entry));
  }, [data, phrase]);

  useEffect(() => setDeckId(defaultDeckId), [defaultDeckId]);

  const entry = data?.entry;
  const surface = data ? fold(data.word) : "";
  const grouped = !!data && data.headword !== surface;
  const related = !!data && !grouped && data.root !== surface;
  const card = phrase ? phrase.card : data?.card;
  const phraseRow = data && phraseTools && (
    <PhraseRow tools={phraseTools} word={data.word} inPhrase={!!phrase} />
  );
  return (
    <Modal
      opened={data !== null}
      onClose={onClose}
      title={phrase?.text ?? data?.word}
    >
      {data && (
        <Stack gap="md" className="word-panel">
          {phrase ? (
            <>
              <Group gap="sm" align="center">
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconVolume size={16} />}
                  onClick={() => speak(phrase.text)}
                >
                  Listen
                </Button>
                {phrase.sentence && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speak(phrase.sentence)}
                  >
                    Sentence
                  </Button>
                )}
              </Group>
              {phraseRow}
              {phrase.card && (
                <div className="word-panel__card">
                  <div className="word-panel__label">In your flashcards</div>
                  <div>
                    <strong>{phrase.card.front}</strong> — {phrase.card.back}
                  </div>
                </div>
              )}
              <Meanings
                entry={phrase.entry}
                lookup={phrase.text}
                phrase={phrase}
              />
              {phrase.sentence && (
                <Text size="sm" className="word-panel__sentence">
                  {phrase.sentence}
                </Text>
              )}
            </>
          ) : (
            <>
              <Group gap="sm" align="center">
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconVolume size={16} />}
                  onClick={() => speak(data.word)}
                >
                  Listen
                </Button>
                {data.sentence && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speak(data.sentence)}
                  >
                    Sentence
                  </Button>
                )}
              </Group>

              {(grouped || related || data.derivedFrom || data.isName) && (
                <div className="word-panel__grammar">
                  {data.isName && (
                    <Text size="sm">Treated as a name in this text.</Text>
                  )}
                  {grouped && (
                    <div className="word-panel__grouping">
                      <Text size="sm">
                        {surface === `di${data.headword}`
                          ? "Passive of"
                          : "Form of"}{" "}
                        <strong lang="id">{data.headword}</strong>; it shares
                        that word's progress.
                      </Text>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onSetGrouping("separate")}
                      >
                        Count separately
                      </Button>
                    </div>
                  )}
                  {related && (
                    <div className="word-panel__grouping">
                      <Text size="sm">
                        {data.link === "separate" ? (
                          <>
                            Counted separately from{" "}
                            <strong lang="id">{data.root}</strong>.
                          </>
                        ) : (
                          <>
                            Related to <strong lang="id">{data.root}</strong>
                          </>
                        )}
                      </Text>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onSetGrouping("group")}
                      >
                        {`Group with ${data.root}`}
                      </Button>
                    </div>
                  )}
                  {data.derivedFrom && !grouped && !related && (
                    <Text size="sm">
                      Derived from <strong lang="id">{data.derivedFrom}</strong>
                      .
                    </Text>
                  )}
                </div>
              )}

              {data.card && (
                <div className="word-panel__card">
                  <div className="word-panel__label">In your flashcards</div>
                  <div>
                    <strong>{data.card.front}</strong> — {data.card.back}
                  </div>
                </div>
              )}

              <Meanings entry={entry} lookup={surface} />

              {phraseRow}

              {data.sentence && (
                <Text size="sm" className="word-panel__sentence">
                  {data.sentence}
                </Text>
              )}

              <div>
                <div className="word-panel__label">
                  How well do you know it?
                </div>
                <Group gap="xs" wrap="wrap">
                  {LEVELS.map((l) => (
                    <Button
                      key={l.state}
                      size="sm"
                      variant={data.state === l.state ? "primary" : "default"}
                      onClick={() => onSetState(l.state)}
                    >
                      {l.label}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant={data.state === "known" ? "primary" : "default"}
                    leftSection={<IconCheck size={16} />}
                    onClick={() => onSetState("known")}
                  >
                    Known
                  </Button>
                  <Button
                    size="sm"
                    variant={data.state === "ignored" ? "primary" : "ghost"}
                    leftSection={<IconEyeOff size={16} />}
                    onClick={() => onSetState("ignored")}
                  >
                    Ignore
                  </Button>
                </Group>
              </div>
            </>
          )}
          {!card && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                try {
                  await onAddCard(translation, deckId);
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Stack gap="sm">
                <TextInput
                  id="word-panel-translation"
                  label="Translation for the card"
                  value={translation}
                  onChange={(e) => setTranslation(e.currentTarget.value)}
                  required
                />
                {decks.length > 0 && (
                  <Select
                    label="Deck"
                    value={deckId ?? ""}
                    onChange={(v) => setDeckId(v || null)}
                    options={[
                      { value: "", label: "Indonesian (default)" },
                      ...decks.map((d) => ({ value: d.id, label: d.name })),
                    ]}
                  />
                )}
                <Button
                  type="submit"
                  variant="primary"
                  leftSection={<IconCards size={16} />}
                  disabled={!translation.trim() || saving}
                >
                  Add as flashcard
                </Button>
              </Stack>
            </form>
          )}
        </Stack>
      )}
    </Modal>
  );
}
