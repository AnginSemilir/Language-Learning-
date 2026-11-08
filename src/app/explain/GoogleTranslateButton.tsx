// "Google Translate" next to "Generate with AI" while making a card: fills
// in the translation from Google Translate, in the app. For a single word,
// Google's other meanings are offered to tap instead.
import { Button, Text } from "@/components/ui";
import {
  type GoogleTranslation,
  googleTranslate,
} from "@/lector/googleTranslate";
import { IconLanguage } from "@tabler/icons-react";
import { useState } from "react";
import "./Explanation.css";

interface GoogleTranslateButtonProps {
  /** What to translate, and which way; null when there's nothing yet. */
  read: () => { text: string; from: "id" | "en"; to: "id" | "en" } | null;
  /** `to`: the language translated into, so a picked meaning goes to the same side. */
  onTranslated: (text: string, to: "id" | "en") => void;
}

type State =
  | { status: "idle" }
  | { status: "busy" }
  | { status: "done"; result: GoogleTranslation; to: "id" | "en" }
  | { status: "error"; message: string };

export default function GoogleTranslateButton({
  read,
  onTranslated,
}: GoogleTranslateButtonProps) {
  const [state, setState] = useState<State>({ status: "idle" });

  const translate = async () => {
    const what = read();
    if (!what?.text.trim()) {
      setState({
        status: "error",
        message: "Type the word first, in Indonesian or English.",
      });
      return;
    }
    setState({ status: "busy" });
    try {
      const result = await googleTranslate(what.text, {
        from: what.from,
        to: what.to,
      });
      onTranslated(result.text, what.to);
      setState({ status: "done", result, to: what.to });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <div className="generate-card google-translate">
      <Button
        type="button"
        size="sm"
        variant="default"
        leftSection={<IconLanguage size={16} />}
        onClick={translate}
        disabled={state.status === "busy"}
      >
        {state.status === "busy" ? "Translating…" : "Google Translate"}
      </Button>
      {state.status === "done" &&
        state.result.alternatives.map(({ pos, words }) => (
          <span key={pos} className="google-translate__alternatives">
            {pos && <Text size="xs">{`${pos}:`}</Text>}
            {words.map((word) => (
              <button
                key={word}
                type="button"
                className="google-translate__word"
                onClick={() => onTranslated(word, state.to)}
              >
                {word}
              </button>
            ))}
          </span>
        ))}
      {state.status === "error" && (
        <div role="alert" className="generate-card__error">
          <Text size="xs">{state.message}</Text>
        </div>
      )}
    </div>
  );
}
