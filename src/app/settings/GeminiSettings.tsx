// Settings → Dictionary → Video subtitles by Gemini: the user's own Gemini
// API key (kept on this device), which Watch uses to write a video's
// Indonesian subtitles and their English.
import { Button, Group, Text, TextInput } from "@/components/ui";
import { getGeminiKey, setGeminiKey } from "@/lector/video/gemini";
import { useState } from "react";
import Section from "./Section";

export default function GeminiSettings() {
  const [key, setKey] = useState(getGeminiKey);
  const [shown, setShown] = useState(false);

  return (
    <Section title="Video subtitles by Gemini">
      <Text size="sm">
        In Watch, Google's Gemini can watch a YouTube video and write down
        what's said in Indonesian, a sentence at a time with its English, so any
        public video can be a lesson. It uses your own Gemini API key, which is
        free: Google's free tier covers about 8 hours of YouTube video a day. On
        the free tier Google may use what's sent to improve its products; here
        that's only the video's link.
      </Text>
      <TextInput
        id="gemini-key"
        label="Gemini API key"
        description={
          <>
            {"Create one, free, at "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
            >
              aistudio.google.com
            </a>
            {
              " (sign in with a Google account). Kept on this device only, never synced."
            }
          </>
        }
        type={shown ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        placeholder="AIza…"
        value={key}
        onChange={(e) => {
          setKey(e.currentTarget.value);
          setGeminiKey(e.currentTarget.value);
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
              setGeminiKey("");
            }}
          >
            Remove key
          </Button>
        )}
      </Group>
    </Section>
  );
}
