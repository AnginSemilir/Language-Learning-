// Ported from Lector (heuwels/lector@eb393ce, AGPL-3.0-only):
// src/components/MarkdownReader/ReaderArticle/index.tsx
// Changes: dropped ruby annotations, stored segmentation and prose-style
// settings (none apply to Indonesian here); Tailwind classes replaced with
// reader.css; word state comes from a grammar-aware `stateOf` instead of a
// surface-form map. Phrases are new: the looked-up word can grow into a run of
// words, and phrases on the user's flashcards are underlined.
import {
  Fragment,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  memo,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { id as pack } from "../languages/id/manifest";
import { splitSentences } from "../languages/tokenizer";
import { STATE_RANK } from "../types";
import WordCell from "./WordCell";
import {
  type WordPlace,
  blockWords,
  phraseInSet,
  phraseRanges,
  phraseRuns,
} from "./phrase";
import type { DisplayState } from "./useLexicon";
import { collectParts, readableText, splitWords } from "./utils";
import "./reader.css";

export interface ActiveReaderWord {
  blockId: number;
  wordIndex: number;
  /** The last word, when a phrase starting at wordIndex is picked. */
  endIndex?: number;
}

/** Phrases to underline (phraseKey form), with the most words any has. */
export interface SavedPhrases {
  keys: ReadonlySet<string>;
  maxWords: number;
}

/** Fixed phrases known or familiar through flashcards (phraseKey form). */
export interface KnownPhrases {
  levels: ReadonlyMap<string, "known" | "familiar">;
  maxWords: number;
}

type WordClick = (word: string, sentence: string, place: WordPlace) => void;

type BlockTag = "p" | "li" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface ReaderBlockProps {
  as: BlockTag;
  className?: string;
  children: ReactNode;
  blockId: number;
  stateOf: (word: string) => DisplayState;
  activeWord: ActiveReaderWord | null;
  savedPhrases?: SavedPhrases;
  knownPhrases?: KnownPhrases;
  onWordClick: WordClick;
  onActivateWord: (word: ActiveReaderWord) => void;
}

export function findSentence(element: HTMLElement): string {
  const block = element.closest("p, li, blockquote, h1, h2, h3, h4, h5, h6");
  const text = block ? readableText(block) : "";
  const wordText = readableText(element);
  for (const sentence of splitSentences(text, pack)) {
    if (sentence.includes(wordText)) return sentence.trim();
  }
  return text.trim();
}

function ReaderBlock({
  as: Tag,
  className,
  children,
  blockId,
  stateOf,
  activeWord,
  savedPhrases,
  knownPhrases,
  onWordClick,
  onActivateWord,
}: ReaderBlockProps) {
  const parts = collectParts(children, pack);
  // Words of a known or familiar fixed phrase show at its level where the
  // phrase appears (tanggung jawab), if that's further along.
  const phraseLevel: ("known" | "familiar" | undefined)[] = [];
  if (knownPhrases?.levels.size) {
    for (const range of phraseRanges(
      blockWords(parts),
      (key) => knownPhrases.levels.has(key),
      knownPhrases.maxWords
    )) {
      for (let i = range.from; i <= range.to; i++) {
        phraseLevel[i] = knownPhrases.levels.get(range.key);
      }
    }
  }
  const shownState = (word: string, index: number): DisplayState => {
    const own = stateOf(word);
    const level = phraseLevel[index];
    if (!level || own === "ignored" || own === "name") return own;
    return STATE_RANK[own] >= STATE_RANK[level] ? own : level;
  };
  const runs = savedPhrases?.keys.size
    ? phraseRuns(
        blockWords(parts),
        (key) => phraseInSet(savedPhrases.keys, key) !== undefined,
        savedPhrases.maxWords
      )
    : null;
  const active = activeWord?.blockId === blockId ? activeWord : null;
  const isActive = (i: number) =>
    !!active &&
    i >= active.wordIndex &&
    i <= (active.endIndex ?? active.wordIndex);
  // The space inside a picked or saved phrase is marked with its words.
  const gapClass = (before: number) => {
    const after = before + 1;
    if (before >= 0 && isActive(before) && isActive(after)) {
      return "reader-gap reader-gap--active";
    }
    if (
      runs &&
      before >= 0 &&
      runs[before] >= 0 &&
      runs[before] === runs[after]
    ) {
      return "reader-gap reader-gap--phrase";
    }
    return undefined;
  };
  const renderChildren = (
    value: ReactNode,
    context: { i: number },
    keyPrefix = "r"
  ): ReactNode => {
    if (typeof value === "string") {
      return splitWords(value, pack).map((part, index) => {
        if (!part.isWord) {
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: tokens of static text; position is the identity
              key={`${keyPrefix}-${index}`}
              data-leaf=""
              className={gapClass(context.i - 1)}
            >
              {part.text}
            </span>
          );
        }
        // Not `context.i++`: the React Compiler turns that into a
        // pre-increment.
        const wordIndex = context.i;
        context.i += 1;
        const state = shownState(part.text, wordIndex);
        return (
          <WordCell
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens of static text; position is the identity
            key={`${keyPrefix}-${index}`}
            text={part.text}
            state={state}
            isActive={isActive(wordIndex)}
            inPhrase={!!runs && runs[wordIndex] >= 0}
            onActivate={(text, element) => {
              onActivateWord({ blockId, wordIndex });
              onWordClick(text, findSentence(element), {
                blockId,
                wordIndex,
                parts,
              });
            }}
          />
        );
      });
    }
    if (Array.isArray(value)) {
      return value.map((child, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: tokens of static text; position is the identity
        <Fragment key={`${keyPrefix}-${index}`}>
          {renderChildren(child, context, `${keyPrefix}-${index}`)}
        </Fragment>
      ));
    }
    if (isValidElement(value)) {
      const element = value as ReactElement<{ children?: ReactNode }>;
      if ((element.props as Record<string, unknown>)["data-leaf"] !== undefined)
        return element;
      return cloneElement(
        element,
        {},
        renderChildren(element.props.children, context, keyPrefix)
      );
    }
    return value;
  };

  const content = renderChildren(children, { i: 0 });
  return (
    <Tag className={className} data-block-id={blockId}>
      {content}
    </Tag>
  );
}

interface ReaderArticleProps {
  content: string;
  stateOf: (word: string) => DisplayState;
  activeWord: ActiveReaderWord | null;
  savedPhrases?: SavedPhrases;
  knownPhrases?: KnownPhrases;
  onWordClick: WordClick;
  onActivateWord: (word: ActiveReaderWord) => void;
}

function ReaderArticle({
  content,
  stateOf,
  activeWord,
  savedPhrases,
  knownPhrases,
  onWordClick,
  onActivateWord,
}: ReaderArticleProps) {
  const blockProps = {
    stateOf,
    activeWord,
    savedPhrases,
    knownPhrases,
    onWordClick,
    onActivateWord,
  };
  return (
    <article lang={pack.script.bcp47} className="reader-article">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          p: ({ node, children }) => (
            <ReaderBlock
              as="p"
              blockId={node?.position?.start?.offset ?? 0}
              {...blockProps}
            >
              {children}
            </ReaderBlock>
          ),
          li: ({ node, children }) => (
            <ReaderBlock
              as="li"
              blockId={node?.position?.start?.offset ?? 0}
              {...blockProps}
            >
              {children}
            </ReaderBlock>
          ),
          // Headings in an article ("## Boikot sebagai bentuk solidaritas")
          // are words to look up too.
          ...Object.fromEntries(
            (["h1", "h2", "h3", "h4", "h5", "h6"] as const).map((tag) => [
              tag,
              ({
                node,
                children,
              }: {
                node?: { position?: { start?: { offset?: number } } };
                children?: ReactNode;
              }) => (
                <ReaderBlock
                  as={tag}
                  blockId={node?.position?.start?.offset ?? 0}
                  {...blockProps}
                >
                  {children}
                </ReaderBlock>
              ),
            ])
          ),
          a: ({ href, children }) => (
            <a href={href ?? undefined} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

export default memo(ReaderArticle);

interface ReaderTitleProps {
  title: string;
  className?: string;
  stateOf: (word: string) => DisplayState;
  activeWord: ActiveReaderWord | null;
  savedPhrases?: SavedPhrases;
  knownPhrases?: KnownPhrases;
  onWordClick: WordClick;
  onActivateWord: (word: ActiveReaderWord) => void;
}

/** A lesson's title, with words that can be tapped like the text's. */
export function ReaderTitle({
  title,
  className,
  ...blockProps
}: ReaderTitleProps) {
  return (
    <ReaderBlock as="h1" className={className} blockId={-1} {...blockProps}>
      {title}
    </ReaderBlock>
  );
}
