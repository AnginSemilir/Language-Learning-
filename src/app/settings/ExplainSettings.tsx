// Settings → Dictionary → Explanations by Claude: the user's own Anthropic
// API key (kept on this device) and what explanations have cost so far.
import { Button, Group, Text, TextInput } from "@/components/ui";
import {
  CLAUDE_MODEL_NAME,
  formatCost,
  getApiKey,
  getSpent,
  setApiKey,
} from "@/lector/claude";
import { db } from "@/logic/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Section from "./Section";

export default function ExplainSettings() {
  const [key, setKey] = useState(getApiKey);
  const [shown, setShown] = useState(false);
  const spent = useLiveQuery(
    async () => ({ count: await db.explanations.count() }),
    []
  );

  return (
    <Section title="Explanations by Claude">
      <Text size="sm">
        {`Tap Explain on a word, a phrase or a flashcard and ${CLAUDE_MODEL_NAME} explains it: what it means in that sentence, how it's built, how formal it is, with examples. After an explanation, Update card lets it fix the card and add an example sentence, and Generate with AI fills in a new card for you. It uses your own Anthropic API key and is billed to your Anthropic account, about $0.0005 each time. Explanations are saved, so looking at one again is free.`}
      </Text>
      <TextInput
        id="anthropic-key"
        label="Anthropic API key"
        description={
          <>
            {"Create one at "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              console.anthropic.com
            </a>
            {
              ". Kept on this device only, never synced. The word, its sentence or the card are sent to Anthropic to be explained."
            }
          </>
        }
        type={shown ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        placeholder="sk-ant-…"
        value={key}
        onChange={(e) => {
          setKey(e.currentTarget.value);
          setApiKey(e.currentTarget.value);
        }}
      />
      <Group gap="sm">
        <Button size="sm" variant="default" onClick={() => setShown((s) => !s)}>
          {shown ? "Hide key" : "Show key"}
        </Button>
        {key && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setKey("");
              setApiKey("");
            }}
          >
            Remove key
          </Button>
        )}
      </Group>
      {(!!spent?.count || getSpent() > 0) && (
        <Text size="sm">
          {`${spent?.count ?? 0} explanation${spent?.count === 1 ? "" : "s"} saved. About ${formatCost(getSpent())} spent on Claude from this device.`}
        </Text>
      )}
    </Section>
  );
}
