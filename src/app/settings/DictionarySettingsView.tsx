// Settings → Dictionary: which meanings the word panel shows besides
// Wiktionary's, and which other dictionaries it links to.
import { Stack } from "@/components/ui/Stack";
import { Text } from "@/components/ui/Text";
import { DICTIONARY_LINKS } from "@/lector/dictionaryLinks";
import type { SettingsValues } from "@/logic/settings/Settings";
import ExplainSettings from "./ExplainSettings";
import Section from "./Section";
import SettingsInput from "./SettingsInput";

const LINK_SETTINGS: Record<string, keyof SettingsValues> = {
  kbbi: "#dict_linkKbbi",
  google: "#dict_linkGoogle",
  wiktionary: "#dict_linkWiktionary",
  glosbe: "#dict_linkGlosbe",
};

export default function DictionarySettingsView() {
  return (
    <Stack gap="xl" align="start">
      <Section title="Meanings shown when you tap a word">
        <Text size="sm">
          English Wiktionary comes first and is always used. For words it
          doesn't have:
        </Text>
        <SettingsInput
          label="Wiktionary's Malay entries"
          description="Many words Indonesian shares with Malay (cemburu, entah, begini) are only listed as Malay."
          settingsKey="#dict_malay"
          inputType="checkbox"
        />
        <SettingsInput
          label="Wordnet Bahasa"
          description="Indonesian words linked to English WordNet (pertunjukan, membutuhkan). Built partly automatically, so the meanings are approximate."
          settingsKey="#dict_wordnet"
          inputType="checkbox"
        />
        <SettingsInput
          label="Everyday spoken words"
          description="A short list of words like sih, kagak, gitu and lho."
          settingsKey="#dict_spoken"
          inputType="checkbox"
        />
        <SettingsInput
          label="Machine translations"
          description="Opus-MT's translations of about 2,600 frequent words no dictionary has (penyadapan: tapping). About 1 in 10 is wrong."
          settingsKey="#dict_machine"
          inputType="checkbox"
        />
        <SettingsInput
          label="Guess from the root"
          description="When nothing else has the word, show its root's meanings (kubelikan: from belikan), marked as a guess."
          settingsKey="#dict_rootGuess"
          inputType="checkbox"
        />
      </Section>
      <Section title="Look up in other dictionaries">
        <Text size="sm">
          Buttons in the word panel that open the word in these dictionaries.
        </Text>
        {DICTIONARY_LINKS.map((link) => (
          <SettingsInput
            key={link.key}
            label={link.label}
            description={link.description}
            settingsKey={LINK_SETTINGS[link.key]}
            inputType="checkbox"
          />
        ))}
      </Section>
      <ExplainSettings />
    </Stack>
  );
}
