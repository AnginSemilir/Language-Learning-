// Settings → Dictionary → Explanations by Claude: the user's own Anthropic
// API key (kept on this device) and what explanations have cost so far.
import { Button, Group, Text, TextInput } from "@/components/ui";
import {
  EXPLAIN_MODEL_NAME,
  formatCost,
  getApiKey,
  setApiKey,
} from "@/lector/explain";
import { db } from "@/logic/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Section from "./Section";

export default function ExplainSettings() {
  const [key, setKey] = useState(getApiKey);
  const [shown, setShown] = useState(false);
  const spent = useLiveQuery(async () => {
    const all = await db.explanations.toArray();
    return {
      count: all.length,
      cost: all.reduce((sum, e) => sum + (e.cost || 0), 0),
    };
  }, []);

  return (
    <Section title="Explanations by Claude">
      <Text size="sm">
        {`Tap Explain on a word, a phrase or a flashcard and ${EXPLAIN_MODEL_NAME} explains it: what it means in that sentence, how it's built, how formal it is, with examples. It uses your own Anthropic API key and is billed to your Anthropic account, about $0.0005 per explanation. Each explanation is saved, so looking at it again is free.`}
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
      {!!spent?.count && (
        <Text size="sm">
          {`${spent.count} explanation${spent.count === 1 ? "" : "s"} saved, about ${formatCost(spent.cost)} in all.`}
        </Text>
      )}
    </Section>
  );
}
