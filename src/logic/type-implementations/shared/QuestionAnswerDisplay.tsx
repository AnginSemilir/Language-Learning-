import { Divider } from "@/components/ui";
import { ReactNode } from "react";
import "./QuestionAnswerDisplay.css";

export function QuestionContent({ html }: { html: string }) {
  return (
    <h3 className="qa-question" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export function AnswerContent({ html }: { html: string }) {
  return (
    <div className="qa-answer" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export function QuestionAnswerLayout({
  question,
  answer,
}: {
  question: ReactNode;
  answer: ReactNode;
}) {
  return (
    <div>
      {question}
      <Divider />
      {answer}
    </div>
  );
}

export function QuestionOnly({ html }: { html: string }) {
  return <QuestionContent html={html} />;
}

export function QuestionWithAnswer({
  questionHtml,
  answerHtml,
}: {
  questionHtml: string;
  answerHtml: string;
}) {
  return (
    <QuestionAnswerLayout
      question={<QuestionContent html={questionHtml} />}
      answer={<AnswerContent html={answerHtml} />}
    />
  );
}

export function NoteDisplay({
  questionHtml,
  answerHtml,
  showAnswer,
}: {
  questionHtml: string;
  answerHtml: string;
  showAnswer: boolean;
}) {
  return (
    <div>
      <QuestionContent html={questionHtml} />
      {showAnswer && (
        <>
          <Divider />
          <AnswerContent html={answerHtml} />
        </>
      )}
    </div>
  );
}
