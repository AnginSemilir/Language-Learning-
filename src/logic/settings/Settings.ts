export type Settings<T extends keyof SettingsValues> = {
  key: T;
  value: SettingsValues[T];
};

export enum SupportedLanguages {
  English = "en",
  German = "de",
  Swedish = "sv",
  Portuguese = "pt",
}

export interface SettingsValues {
  "#name"?: string;
  "#language": SupportedLanguages;
  "#useVisualFeedback": boolean;
  "#developerMode": boolean;
  "#showShortcutHints": boolean;

  "#colorSchemePreference": "light" | "dark" | "auto";
  "#densityPreference": "relaxed" | "compact" | "auto";
  "#showCognitivePrompts": boolean;

  "#useBubbleMenu": boolean;
  "#useToolbar": boolean;
  "#showSubAndSuperScriptOptionInEditor": boolean;
  "#showStrikethroughOptionInEditor": boolean;
  "#showHighlightOptionInEditor": boolean;
  "#showListOptionInEditor": boolean;
  "#showCodeOptionInEditor": boolean;
  "#showLinkOptionInEditor": boolean;

  "#learn_newToReviewRatio": number;
  "#learn_newCardsPerDay": number;
  "#learn_maxReviewsPerDay": number;
  "#learn_newCardOrder": "added" | "random";
  "#learn_newReviewOrder": "mixed" | "after" | "before";
  "#learn_buryNewSiblings": boolean;
  "#learn_buryReviewSiblings": boolean;
  "#learn_sort": "creationDate" | "dueDate";
  "#learn_enableHardAndEasy": boolean;
  "#newDayStartHour": number;
  "#globalScheduler_maximumInterval": number;
  "#globalScheduler_requestRetention": number;
  "#globalScheduler_w": string;

  // Dictionary (Settings → Dictionary): meanings shown when a word is tapped,
  // besides Wiktionary's, and other dictionaries to look a word up in.
  "#dict_malay": boolean;
  "#dict_wordnet": boolean;
  "#dict_spoken": boolean;
  "#dict_machine": boolean;
  "#dict_rootGuess": boolean;
  "#dict_linkKbbi": boolean;
  "#dict_linkGoogle": boolean;
  "#dict_linkWiktionary": boolean;
  "#dict_linkGlosbe": boolean;

  // Word games (Games): best scores (synced with the rest) and sound.
  "#games_bestMatch": number;
  "#games_bestRain": number;
  "#games_sound": boolean;
  /** Which words the games use: the ones being learned now, or all. */
  "#games_words": "learning" | "all";
}
