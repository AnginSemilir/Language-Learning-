// "Update card" after an explanation: Claude suggests a fixed card (its
// Indonesian, its English and an example sentence); the user can edit the
// suggestion and saves it to the card.
import { notify } from "@/components/Notification";
import {
  Button,
  Group,
  Spinner,
  Text,
  TextInput,
  Textarea,
} from "@/components/ui";
import {
  type CardDraft,
  cardDraft,
  saveCardDraft,
  suggestCardUpdate,
} from "@/lector/cardWriter";
import { CLAUDE_MODEL_NAME, ClaudeError, formatCost } from "@/lector/claude";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type State =
  | { status: "loading" }
  | {
      status: "ready";
      current: CardDraft;
      changes: string;
      cost: number;
    }
  | { status: "saved" }
  | { status: "error"; message: string; key: boolean };

interface CardUpdateProps {
  noteId: string;
  /** Claude's explanation, so the suggestion builds on it. */
  explanation?: string;
  onClose: () => void;
}

const FIELDS: { key: keyof CardDraft; label: string }[] = [
  { key: "front", label: "Indonesian" },
  { key: "back", label: "English" },
  { key: "example", label: "Example sentence" },
];

export default function CardUpdate({
  noteId,
  explanation,
  onClose,
}: CardUpdateProps) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  const [draft, setDraft] = useState<CardDraft>({
    front: "",
    back: "",
    example: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setState({ status: "loading" });
    (async () => {
      try {
        const card = await cardDraft(noteId);
        if (!card) {
          throw new ClaudeError(
            "Only cards with a word on one side and its meaning on the other can be updated.",
            "other"
          );
        }
        const suggestion = await suggestCardUpdate(
          card,
          explanation,
          controller.signal
        );
        if (!current) return;
        setDraft({
          front: suggestion.front,
          back: suggestion.back,
          example: suggestion.example,
        });
        setState({
          status: "ready",
          current: card,
          changes: suggestion.changes,
          cost: suggestion.cost,
        });
      } catch (e) {
        if (!current) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : String(e),
          key: e instanceof ClaudeError && e.problem === "key",
        });
      }
    })();
    return () => {
      current = false;
      controller.abort();
    };
  }, [noteId, explanation, attempt]);

  if (state.status === "loading") {
    return (
      <div className="explanation__waiting card-update">
        <Spinner size="xs" />
        <Text size="sm">{`${CLAUDE_MODEL_NAME} is checking the card…`}</Text>
      </div>
    );
  }

  if (state.status === "saved") {
    return (
      <div className="card-update card-update--saved">
        <IconCheck size={16} />
        <Text size="sm">Card updated.</Text>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="card-update" role="alert">
        <Text size="sm">{state.message}</Text>
        {state.key ? (
          <Link to="/settings/dictionary" className="explanation__link">
            Settings → Dictionary
          </Link>
        ) : (
          <Group gap="sm">
            <Button
              size="sm"
              variant="default"
              leftSection={<IconRefresh size={14} />}
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </Group>
        )}
      </div>
    );
  }

  const { current } = state;
  const unchanged = FIELDS.every(
    ({ key }) => draft[key].trim() === current[key].trim()
  );
  const save = async () => {
    setSaving(true);
    try {
      await saveCardDraft(noteId, draft);
      notify("Card updated", `“${draft.front}” is saved.`, "success");
      setState({ status: "saved" });
    } catch (e) {
      notify(
        "Couldn't update the card",
        e instanceof Error ? e.message : String(e),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="card-update"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Text size="sm" weight="semibold">
        {unchanged ? "Claude would keep the card as it is." : state.changes}
      </Text>
      {FIELDS.map(({ key, label }) => {
        const was = current[key];
        const changed = draft[key].trim() !== was.trim();
        const description = changed ? `Was: ${was || "(none)"}` : undefined;
        const onChange = (
          e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        ) => {
          const value = e.currentTarget.value;
          setDraft((d) => ({ ...d, [key]: value }));
        };
        return key === "example" ? (
          <Textarea
            key={key}
            lang="id"
            label={label}
            description={description}
            value={draft[key]}
            onChange={onChange}
            minRows={2}
          />
        ) : (
          <TextInput
            key={key}
            lang={key === "front" ? "id" : "en"}
            label={label}
            description={description}
            value={draft[key]}
            onChange={onChange}
          />
        );
      })}
      <Group gap="sm" wrap="wrap">
        <Button
          type="submit"
          size="sm"
          variant="primary"
          leftSection={<IconCheck size={14} />}
          disabled={
            unchanged || saving || !draft.front.trim() || !draft.back.trim()
          }
        >
          Save to card
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </Group>
      <Text size="xs" className="explanation__credit">
        {`${CLAUDE_MODEL_NAME} · ${formatCost(state.cost)}`}
      </Text>
    </form>
  );
}
