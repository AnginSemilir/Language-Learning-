// "Generate with AI" while making a card: Claude fills in the rest of the
// card (the Indonesian, its English, an example sentence) from what's typed.
import { Button, Text } from "@/components/ui";
import { type CardDraft, generateCard } from "@/lector/cardWriter";
import {
  CLAUDE_MODEL_NAME,
  ClaudeError,
  formatCost,
  getApiKey,
} from "@/lector/claude";
import { IconSparkles } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import "./Explanation.css";

interface GenerateCardButtonProps {
  /** What's typed so far: either side may be empty. */
  read: () => { front: string; back: string; example?: string };
  /** The sentence the word was read in, if any. */
  sentence?: string;
  /** Shown beside the button until it's used. */
  hint?: string;
  onGenerated: (card: CardDraft) => void;
}

type State =
  | { status: "idle" }
  | { status: "busy" }
  | { status: "done"; cost: number }
  | { status: "error"; message: string; key: boolean };

export default function GenerateCardButton({
  read,
  sentence,
  hint,
  onGenerated,
}: GenerateCardButtonProps) {
  const [state, setState] = useState<State>({ status: "idle" });

  const generate = async () => {
    if (!getApiKey()) {
      setState({
        status: "error",
        message: "Generating cards uses your own Anthropic API key.",
        key: true,
      });
      return;
    }
    setState({ status: "busy" });
    try {
      const card = await generateCard({ ...read(), sentence });
      onGenerated(card);
      setState({ status: "done", cost: card.cost });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : String(e),
        key: e instanceof ClaudeError && e.problem === "key",
      });
    }
  };

  return (
    <div className="generate-card">
      <Button
        type="button"
        size="sm"
        variant="default"
        leftSection={<IconSparkles size={16} />}
        onClick={generate}
        disabled={state.status === "busy"}
      >
        {state.status === "busy" ? "Generating…" : "Generate with AI"}
      </Button>
      {state.status === "idle" && hint && (
        <Text size="xs" className="explanation__credit">
          {hint}
        </Text>
      )}
      {state.status === "done" && (
        <Text size="xs" className="explanation__credit">
          {`${CLAUDE_MODEL_NAME} · ${formatCost(state.cost)}`}
        </Text>
      )}
      {state.status === "error" && (
        <div role="alert" className="generate-card__error">
          <Text size="xs">{state.message}</Text>
          {state.key && (
            <Link to="/settings/dictionary" className="explanation__link">
              Add your key in Settings → Dictionary
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
