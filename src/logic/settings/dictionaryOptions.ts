// Settings → Dictionary, as lookup options and the links to show.
import type { LookupOptions } from "@/lector/dictionary";
import {
  DICTIONARY_LINKS,
  type DictionaryLink,
} from "@/lector/dictionaryLinks";
import { useMemo } from "react";
import { useSetting } from "./hooks/useSetting";

export interface DictionaryChoice {
  lookup: LookupOptions;
  links: DictionaryLink[];
}

export function useDictionaryChoice(): DictionaryChoice {
  const [malay] = useSetting("#dict_malay");
  const [wordnet] = useSetting("#dict_wordnet");
  const [spoken] = useSetting("#dict_spoken");
  const [machine] = useSetting("#dict_machine");
  const [guess] = useSetting("#dict_rootGuess");
  const [kbbi] = useSetting("#dict_linkKbbi");
  const [google] = useSetting("#dict_linkGoogle");
  const [wiktionary] = useSetting("#dict_linkWiktionary");
  const [glosbe] = useSetting("#dict_linkGlosbe");
  return useMemo(() => {
    const skip: NonNullable<LookupOptions["skip"]> = [];
    if (!malay) skip.push("malay");
    if (!wordnet) skip.push("wordnet");
    if (!spoken) skip.push("spoken");
    if (!machine) skip.push("machine");
    const shown = { kbbi, google, wiktionary, glosbe };
    return {
      lookup: { skip, guess },
      links: DICTIONARY_LINKS.filter((link) => shown[link.key]),
    };
  }, [
    malay,
    wordnet,
    spoken,
    machine,
    guess,
    kbbi,
    google,
    wiktionary,
    glosbe,
  ]);
}
