// Ported from Lector (heuwels/lector@eb393ce, AGPL-3.0-only):
// src/components/MarkdownReader/ReaderArticle/index.tsx
// Changes: dropped ruby annotations, stored segmentation, phrase highlighting
// and prose-style settings (none apply to Indonesian here); Tailwind classes
// replaced with reader.css; word state comes from a grammar-aware `stateOf`
// instead of a surface-form map.
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
import WordCell from "./WordCell";
import type { DisplayState } from "./useLexicon";
import { readableText, splitWords } from "./utils";
import "./reader.css";

export interface ActiveReaderWord {
  blockId: number;
  wordIndex: number;
}

interface ReaderBlockProps {
  as: "p" | "li";
  children: ReactNode;
  blockId: number;
  stateOf: (word: string) => DisplayState;
  activeWord: ActiveReaderWord | null;
  onWordClick: (word: string, sentence: string) => void;
  onActivateWord: (word: ActiveReaderWord) => void;
}

function findSentence(element: HTMLElement): string {
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
  children,
  blockId,
  stateOf,
  activeWord,
  onWordClick,
  onActivateWord,
}: ReaderBlockProps) {
  const renderChildren = (
    value: ReactNode,
    context: { i: number },
    keyPrefix = "r"
  ): ReactNode => {
    if (typeof value === "string") {
      return splitWords(value, pack).map((part, index) => {
        if (!part.isWord) {
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens of static text; position is the identity
            <span key={`${keyPrefix}-${index}`} data-leaf="">
              {part.text}
            </span>
          );
        }
        const wordIndex = context.i++;
        const state = stateOf(part.text);
        const isActive =
          activeWord?.blockId === blockId && activeWord.wordIndex === wordIndex;
        return (
          <WordCell
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens of static text; position is the identity
            key={`${keyPrefix}-${index}`}
            text={part.text}
            state={state}
            isActive={isActive}
            onActivate={(text, element) => {
              onActivateWord({ blockId, wordIndex });
              onWordClick(text, findSentence(element));
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
  return Tag === "p" ? <p>{content}</p> : <li>{content}</li>;
}

interface ReaderArticleProps {
  content: string;
  stateOf: (word: string) => DisplayState;
  activeWord: ActiveReaderWord | null;
  onWordClick: (word: string, sentence: string) => void;
  onActivateWord: (word: ActiveReaderWord) => void;
}

function ReaderArticle({
  content,
  stateOf,
  activeWord,
  onWordClick,
  onActivateWord,
}: ReaderArticleProps) {
  const blockProps = {
    stateOf,
    activeWord,
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
