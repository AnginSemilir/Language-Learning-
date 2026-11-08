import {
  GROWTH_STAGE_NAME,
  GrowthIcon,
  type GrowthStage,
  growthStage,
} from "@/components/GrowthIcon/GrowthIcon";
import type { KnownLevel } from "@/logic/card/card";
import { Card as Model } from "fsrs.js";
import { State } from "fsrs.js";
import "./LearnViewCurrentCardStateIndicator.css";

const BASE = "learn-view-current-card-state-indicator";

interface LearnViewCurrentCardStateIndicatorProps {
  currentCardModel: Model | undefined;
  /** Familiar: this review is its check, and right makes it known. */
  known?: KnownLevel;
}

const COLOURS: Record<string, string> = {
  fuchsia: "var(--theme-fuchsia-700)",
  orange: "var(--theme-orange-700)",
  sky: "var(--theme-sky-700)",
  neutral: "var(--theme-neutral-600)",
};

function Indicator({
  color,
  stage,
  text,
}: {
  color: keyof typeof COLOURS;
  stage: GrowthStage;
  text: string;
}) {
  return (
    <div className={BASE} style={{ color: COLOURS[color] }}>
      <GrowthIcon stage={stage} size={96} />
      <span className={`${BASE}__text`}>
        {text} · {GROWTH_STAGE_NAME[stage]}
      </span>
    </div>
  );
}

/**
 * What kind of card this is (new, learning, review), with a tree showing how
 * well it's learned: a seed for a new card up to a grand oak.
 */
export default function LearnViewCurrentCardStateIndicator({
  currentCardModel,
  known,
}: LearnViewCurrentCardStateIndicatorProps) {
  if (currentCardModel === undefined) return null;
  const stage = growthStage(currentCardModel);
  if (currentCardModel.state === State.New) {
    return <Indicator color="fuchsia" stage={stage} text="New card" />;
  }
  if (
    currentCardModel.state === State.Learning ||
    currentCardModel.state === State.Relearning
  ) {
    return <Indicator color="orange" stage={stage} text="Learning" />;
  }
  if (currentCardModel.due <= new Date(Date.now())) {
    if (known === "familiar") {
      return (
        <Indicator
          color="sky"
          stage={stage}
          text="Familiar check: right makes it known"
        />
      );
    }
    return <Indicator color="sky" stage={stage} text="Review" />;
  }
  return <Indicator color="neutral" stage={stage} text="Already learned" />;
}
