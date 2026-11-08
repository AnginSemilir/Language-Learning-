import { SettingsValues, SupportedLanguages } from "./Settings";

export const defaultSettings: SettingsValues = {
  "#language": SupportedLanguages.English,
  "#useVisualFeedback": true,
  "#developerMode": false,
  "#showShortcutHints": true,

  "#colorSchemePreference": "auto",
  "#densityPreference": "auto",
  "#showCognitivePrompts": true,

  "#useBubbleMenu": true,
  // The formatting bar (bold, italic, underline, colour...) is always shown.
  "#useToolbar": true,
  "#showSubAndSuperScriptOptionInEditor": true,
  "#showStrikethroughOptionInEditor": true,
  "#showHighlightOptionInEditor": true,
  "#showListOptionInEditor": true,
  "#showCodeOptionInEditor": true,
  "#showLinkOptionInEditor": true,

  "#learn_newToReviewRatio": 0.5,
  // Anki's defaults.
  "#learn_newCardsPerDay": 20,
  "#learn_maxReviewsPerDay": 200,
  "#learn_newCardOrder": "added",
  "#learn_newReviewOrder": "mixed",
  "#learn_buryNewSiblings": false,
  "#learn_buryReviewSiblings": false,
  "#learn_sort": "creationDate",
  "#learn_enableHardAndEasy": true,
  // Known cards come back for a check after 1 to 6 months, spread out.
  "#learn_knownMinDays": 30,
  "#learn_knownMaxDays": 180,
  "#newDayStartHour": 4,
  "#globalScheduler_maximumInterval": 36500,
  "#globalScheduler_requestRetention": 0.9,
  "#globalScheduler_w":
    "0.4,0.6,2.4,5.8,4.93,0.94,0.86,0.01,1.49,0.14,0.94,2.18,0.05,0.34, 1.26,0.29,2.61",

  "#dict_malay": true,
  "#dict_wordnet": true,
  "#dict_spoken": true,
  "#dict_machine": true,
  "#dict_rootGuess": true,
  "#dict_linkKbbi": true,
  "#dict_linkGoogle": true,
  "#dict_linkWiktionary": false,
  "#dict_linkGlosbe": false,

  "#games_bestMatch": 0,
  "#games_bestRain": 0,
  "#games_sound": true,
  "#games_words": "learning",
  "#world_seen": "",
  "#world_story": "",
};
