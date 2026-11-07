// Claude's explanation of a word, phrase or flashcard: the saved one if there
// is one, otherwise asked for (with the user's own API key) and shown as it
// arrives.
import { Button, Spinner, Text } from "@/components/ui";
import {
  EXPLAIN_MODEL_NAME,
  ExplainError,
  type ExplainInput,
  type ExplainProblem,
  explain,
  formatCost,
  getApiKey,
  savedExplanation,
} from "@/lector/explain";
import { IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import "./Explanation.css";

type State =
  | { status: "loading"; text: string }
  | { status: "done"; text: string; cost: number; saved: boolean }
  | { status: "no-key" }
  | { status: "error"; message: string; problem: ExplainProblem };

export default function Explanation({ input }: { input: ExplainInput }) {
  // The question as a string, so a new object for the same words doesn't
  // ask again.
  const question = JSON.stringify(input);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: "loading", text: "" });

  useEffect(() => {
    const asked = JSON.parse(question) as ExplainInput;
    const controller = new AbortController();
    let current = true;
    setState({ status: "loading", text: "" });
    (async () => {
      if (attempt === 0) {
        const saved = await savedExplanation(asked);
        if (!current) return;
        if (saved) {
          setState({
            status: "done",
            text: saved.text,
            cost: saved.cost,
            saved: true,
          });
          return;
        }
      }
      if (!getApiKey()) {
        setState({ status: "no-key" });
        return;
      }
      try {
        const result = await explain(asked, {
          signal: controller.signal,
          onText: (text) => {
            if (current) setState({ status: "loading", text });
          },
        });
        if (current) {
          setState({
            status: "done",
            text: result.text,
            cost: result.cost,
            saved: false,
          });
        }
      } catch (e) {
        if (!current) return;
        if (e instanceof ExplainError) {
          setState({ status: "error", message: e.message, problem: e.problem });
        } else {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : String(e),
            problem: "other",
          });
        }
      }
    })();
    return () => {
      current = false;
      controller.abort();
    };
  }, [question, attempt]);

  if (state.status === "no-key") {
    return (
      <div className="explanation explanation--note">
        <Text size="sm">
          Claude can explain words and cards using your own Anthropic API key.
        </Text>
        <Link to="/settings/dictionary" className="explanation__link">
          Add your key in Settings → Dictionary
        </Link>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="explanation explanation--note" role="alert">
        <Text size="sm">{state.message}</Text>
        {state.problem === "key" ? (
          <Link to="/settings/dictionary" className="explanation__link">
            Settings → Dictionary
          </Link>
        ) : (
          <Button
            size="sm"
            variant="default"
            leftSection={<IconRefresh size={14} />}
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="explanation" aria-live="polite">
      {state.text ? (
        <div className="explanation__text">
          <ReactMarkdown>{state.text}</ReactMarkdown>
        </div>
      ) : (
        <div className="explanation__waiting">
          <Spinner size="xs" />
          <Text size="sm">{`${EXPLAIN_MODEL_NAME} is thinking…`}</Text>
        </div>
      )}
      {state.status === "done" && (
        <div className="explanation__footer">
          <Text size="xs" className="explanation__credit">
            {state.saved
              ? `${EXPLAIN_MODEL_NAME} · saved, free to look at again`
              : `${EXPLAIN_MODEL_NAME} · ${formatCost(state.cost)}`}
          </Text>
          <Button
            size="sm"
            variant="ghost"
            leftSection={<IconRefresh size={14} />}
            onClick={() => setAttempt((n) => n + 1)}
          >
            Explain again
          </Button>
        </div>
      )}
    </div>
  );
}
