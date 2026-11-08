import { Badge } from "@/components/ui/Badge";
import { Stack } from "@/components/ui/Stack";
import { useTranslation } from "react-i18next";
import Section from "./Section";
import SettingsInput from "./SettingsInput";

export default function LearnSettingsView() {
  const [t] = useTranslation();

  return (
    <Stack gap="xl" align="start">
      <SettingsInput
        label={t("settings.learn.enable-visual-feedback")}
        description={t("settings.learn.enable-visual-feedback-description")}
        settingsKey="#useVisualFeedback"
        inputType="checkbox"
      />
      <SettingsInput
        label={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-xs)",
            }}
          >
            {t("settings.learn.show-cognitive-prompts")}
            <Badge color="primary" size="sm">
              Beta
            </Badge>
          </div>
        }
        description={t("settings.learn.show-cognitive-prompts-description")}
        settingsKey="#showCognitivePrompts"
        inputType="checkbox"
      />
      <SettingsInput
        label={t("settings.learn.enableHardAndEasy")}
        description={t("settings.learn.enableHardAndEasyDescription")}
        settingsKey="#learn_enableHardAndEasy"
        inputType="checkbox"
      />
      <Section title="Daily limits">
        <SettingsInput
          label="New cards per day"
          description="How many cards you see for the first time each day (Anki's default is 20). Reviews and learning cards don't count towards it."
          settingsKey="#learn_newCardsPerDay"
          inputType="number"
        />
        <SettingsInput
          label="Maximum reviews per day"
          description="The most review cards shown in a day (Anki's default is 200). Extra ones wait until tomorrow."
          settingsKey="#learn_maxReviewsPerDay"
          inputType="number"
        />
        <SettingsInput
          label="Next day starts at (hour)"
          description="When the daily limits reset, 0–23 (Anki's default is 4, so late study still counts as today)."
          settingsKey="#newDayStartHour"
          inputType="number"
        />
      </Section>
      <Section title="Order">
        <SettingsInput
          label="New card order"
          description="Which new cards come first."
          settingsKey="#learn_newCardOrder"
          inputType="select"
          options={[
            { value: "added", label: "Order added" },
            { value: "random", label: "Random" },
          ]}
        />
        <SettingsInput
          label="New cards and reviews"
          description="Show new cards mixed with reviews (Anki's default), after them or before them."
          settingsKey="#learn_newReviewOrder"
          inputType="select"
          options={[
            { value: "mixed", label: "Mixed" },
            { value: "after", label: "After reviews" },
            { value: "before", label: "Before reviews" },
          ]}
        />
      </Section>
      <Section title="Burying">
        <SettingsInput
          label="Bury new siblings"
          description="When one side of a double-sided card is new today, keep its other side for tomorrow."
          settingsKey="#learn_buryNewSiblings"
          inputType="checkbox"
        />
        <SettingsInput
          label="Bury review siblings"
          description="When one side is reviewed today, keep the other side's review for tomorrow."
          settingsKey="#learn_buryReviewSiblings"
          inputType="checkbox"
        />
      </Section>
      <Section title={t("settings.learn.scheduler-options")}>
        <SettingsInput
          label={t("settings.learn.requestRetention")}
          description={t("settings.learn.requestRetentionDescription")}
          settingsKey="#globalScheduler_requestRetention"
          inputType="number"
        />
        <SettingsInput
          label="Familiar cards come back after at least (days)"
          description="A card marked familiar (probably known) comes back once for a check, at a random time between these two numbers of days, so a batch marked together doesn't all come back on one day. Get it right then and it's known: it doesn't come back. 30 to 180 is one to six months."
          settingsKey="#learn_familiarMinDays"
          inputType="number"
        />
        <SettingsInput
          label="… and at most (days)"
          settingsKey="#learn_familiarMaxDays"
          inputType="number"
        />
        <SettingsInput
          label={t("settings.learn.maximumInterval")}
          description={t("settings.learn.maximumIntervalDescription")}
          settingsKey="#globalScheduler_maximumInterval"
          inputType="number"
        />
        <SettingsInput
          label={t("settings.learn.newToReviewRatio")}
          description={t("settings.learn.newToReviewRatioDescription")}
          settingsKey="#learn_newToReviewRatio"
          inputType="number"
        />
        <SettingsInput
          label={t("settings.learn.schedulerWeights")}
          description={t("settings.learn.schedulerWeightsDescription")}
          settingsKey="#globalScheduler_w"
          inputType="text"
        />
      </Section>
    </Stack>
  );
}
