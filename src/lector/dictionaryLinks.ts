// Other dictionaries a word can be looked up in from the word panel (chosen
// in Settings → Dictionary). They open in the browser; nothing is copied
// from them: KBBI, for one, has no open licence.

export interface DictionaryLink {
  key: "kbbi" | "google" | "wiktionary" | "glosbe";
  label: string;
  /** What the dictionary is, for Settings. */
  description: string;
  url: (word: string) => string;
}

export const DICTIONARY_LINKS: DictionaryLink[] = [
  {
    key: "kbbi",
    label: "KBBI",
    description:
      "KBBI VI Daring, the official dictionary of Indonesian by Badan Bahasa. Definitions in Indonesian; derived words are listed under their root.",
    url: (word) =>
      `https://kbbi.kemendikdasmen.go.id/entri/${encodeURIComponent(word)}`,
  },
  {
    key: "google",
    label: "Google Translate",
    description: "Google Translate, Indonesian to English.",
    url: (word) =>
      `https://translate.google.com/?sl=id&tl=en&op=translate&text=${encodeURIComponent(word)}`,
  },
  {
    key: "wiktionary",
    label: "Wiktionary",
    description:
      "The word's full Wiktionary page, with etymology, related words and all its senses.",
    url: (word) =>
      `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#Indonesian`,
  },
  {
    key: "glosbe",
    label: "Glosbe",
    description:
      "Glosbe's Indonesian–English dictionary, with example sentences from translated texts.",
    url: (word) => `https://glosbe.com/id/en/${encodeURIComponent(word)}`,
  },
];
