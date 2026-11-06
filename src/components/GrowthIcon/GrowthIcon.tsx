// How well a card is learned, drawn as a tree growing from a seed to a grand
// oak. The stage follows the gap until the card's next review, the same
// measure that makes a word count as known (21 days, see lector/flashcards).
// The plant sways from its base and its leaves rustle (GrowthIcon.css); a
// new stage pops in. Still for people who ask for reduced motion.

import {
  GRAND_OAK_DAYS,
  GROWTH_STAGE_NAME,
  type GrowthStage,
  growthStage,
} from "@/logic/growth";
import type { ReactElement } from "react";
import "./GrowthIcon.css";

export { GROWTH_STAGE_NAME, GRAND_OAK_DAYS, growthStage, type GrowthStage };

const TRUNK = "#8a5a2b";
const LEAF_LIGHT = "#7cc35a";
const LEAF = "#4fa043";
const LEAF_DARK = "#2f7d36";

function Ground() {
  return (
    <ellipse cx="16" cy="29.5" rx="9" ry="1.6" fill="#a47148" opacity="0.45" />
  );
}

function Seed() {
  return (
    <>
      <Ground />
      <ellipse cx="16" cy="26.6" rx="3.4" ry="2.6" fill={TRUNK} />
      <g className="growth-icon__plant">
        <path
          d="M16 24.3c0-2.2.7-3.6 2.3-4.5"
          stroke={LEAF}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          className="growth-icon__crown"
          d="M18.3 19.8c1.9-.6 3.3 0 3.9 1-1.6.9-3.1.8-3.9-1z"
          fill={LEAF_LIGHT}
        />
      </g>
    </>
  );
}

function Sapling() {
  return (
    <>
      <Ground />
      <g className="growth-icon__plant">
        <path
          d="M16 29V16"
          stroke={TRUNK}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <g className="growth-icon__crown">
          <path
            d="M16 21c-1.2-2.6-3.6-3.6-6-3 .9 2.6 3.4 3.7 6 3z"
            fill={LEAF}
          />
          <path
            d="M16 18c1.2-2.7 3.7-3.8 6.2-3.1-.9 2.7-3.6 3.8-6.2 3.1z"
            fill={LEAF_LIGHT}
          />
          <path
            d="M16 16.2c-.9-2.1-.3-4.2 1.3-5.4.8 2.1.2 4.1-1.3 5.4z"
            fill={LEAF}
          />
        </g>
      </g>
    </>
  );
}

function YoungOak() {
  return (
    <>
      <Ground />
      <g className="growth-icon__plant">
        <path
          d="M16 29v-9"
          stroke={TRUNK}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M16 23l-2.6-2.4"
          stroke={TRUNK}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <g className="growth-icon__crown">
          <circle cx="12.6" cy="15.6" r="4.4" fill={LEAF} />
          <circle cx="19.4" cy="15.2" r="4.6" fill={LEAF} />
          <circle cx="16" cy="11.2" r="5" fill={LEAF_LIGHT} />
        </g>
      </g>
    </>
  );
}

function Oak() {
  return (
    <>
      <Ground />
      <g className="growth-icon__plant">
        <path
          d="M16 29.2v-10"
          stroke={TRUNK}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M16 22.5l-3.8-3.2M16 21.5l3.6-3"
          stroke={TRUNK}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <g className="growth-icon__crown">
          <circle cx="9.6" cy="15.2" r="4.6" fill={LEAF_DARK} />
          <circle cx="22.4" cy="15" r="4.8" fill={LEAF_DARK} />
          <circle cx="12.4" cy="10.2" r="5" fill={LEAF} />
          <circle cx="20" cy="9.8" r="5.2" fill={LEAF} />
          <circle cx="16" cy="13.4" r="5.4" fill={LEAF_LIGHT} />
        </g>
      </g>
    </>
  );
}

function GrandOak() {
  return (
    <>
      <ellipse
        cx="16"
        cy="29.6"
        rx="13"
        ry="1.8"
        fill="#a47148"
        opacity="0.45"
      />
      <g className="growth-icon__plant">
        <path
          d="M14 29.4c.8-3.4.8-6.6.4-10h3.2c-.4 3.4-.4 6.6.4 10z"
          fill={TRUNK}
        />
        <path
          d="M15 22l-6-4.4M17 21.4l6.2-4.6M16 20.2v-4"
          stroke={TRUNK}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <g className="growth-icon__crown">
          <circle cx="5.8" cy="15.4" r="4.4" fill={LEAF_DARK} />
          <circle cx="26.2" cy="15.2" r="4.6" fill={LEAF_DARK} />
          <circle cx="9.4" cy="9.6" r="5.2" fill={LEAF} />
          <circle cx="22.6" cy="9.4" r="5.4" fill={LEAF} />
          <circle cx="16" cy="6.6" r="5.4" fill={LEAF} />
          <circle cx="11.4" cy="14.6" r="5" fill={LEAF_LIGHT} />
          <circle cx="20.6" cy="14.4" r="5.2" fill={LEAF_LIGHT} />
          <circle cx="16" cy="11.4" r="5.4" fill={LEAF_LIGHT} />
          <path
            d="M24.6 20.6c0-1 .7-1.6 1.5-1.6s1.5.6 1.5 1.6c0 1.2-.7 2-1.5 2s-1.5-.8-1.5-2z"
            fill="#b07a3c"
          />
          <path
            d="M24.5 20.2h3.2"
            stroke="#6d4520"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>
      </g>
    </>
  );
}

const DRAWINGS: Record<GrowthStage, () => ReactElement> = {
  0: Seed,
  1: Sapling,
  2: YoungOak,
  3: Oak,
  4: GrandOak,
};

export function GrowthIcon({
  stage,
  size = 32,
  className = "",
}: {
  stage: GrowthStage;
  size?: number;
  className?: string;
}) {
  const Drawing = DRAWINGS[stage];
  return (
    <svg
      key={stage}
      className={`growth-icon growth-icon--stage-${stage} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={GROWTH_STAGE_NAME[stage]}
    >
      <title>{GROWTH_STAGE_NAME[stage]}</title>
      <Drawing />
    </svg>
  );
}
