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
}
