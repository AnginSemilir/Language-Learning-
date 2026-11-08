// Settings → Dictionary → Video subtitles by Gemini: the user's own Gemini
// API key (kept on this device), which Watch uses to write a video's
// Indonesian subtitles and their English.
import {
  Button,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@/components/ui";
import {
  type GeminiModelChoice,
  getGeminiKey,
  getModelChoice,
  setGeminiKey,
  setModelChoice,
} from "@/lector/video/gemini";
import { useState } from "react";
import Section from "./Section";

export default function GeminiSettings() {
  const [key, setKey] = useState(getGeminiKey);
  const [shown, setShown] = useState(false);
  const [model, setModel] = useState(getModelChoice);

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
      <Stack gap="xs">
        <Text size="sm" weight="semibold">
          Model
        </Text>
        <SegmentedControl
          value={model}
          onChange={(value) => {
            setModel(value as GeminiModelChoice);
            setModelChoice(value as GeminiModelChoice);
          }}
          data={[
            { value: "best", label: "Newest Flash" },
            { value: "fast", label: "Gemini 3.5 Flash" },
          ]}
        />
        <Text size="xs">
          {model === "best"
            ? "Google's newest Flash model (now 3.8): careful subtitles, but slow, a few minutes for a 20-minute video, and the free tier allows only about 20 requests a day."
            : "A few times quicker than the newest, with its own free limit. Its subtitles were accurate on the videos tried."}
          {
            " When one model's free requests for the day are used up, the other is used."
          }
        </Text>
      </Stack>
    </Section>
  );
}
