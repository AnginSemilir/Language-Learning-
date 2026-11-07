// Pulau Kata, drawn. Everything is placed on a 400 × 250 canvas: sky, sea,
// the island with its hill, your words as trees (logic/game/world.ts picks
// them) and whatever your level has built so far. Buildings can be tapped
// to see what they're called.

import { GrowthDrawing } from "@/components/GrowthIcon/GrowthIcon";
import type { Building, DayPhase, Tree } from "@/logic/game/world";
import { type KeyboardEvent, type ReactNode, useId } from "react";
import "./Island.css";
import {
  Balloon,
  Birds,
  Boat,
  Campfire,
  FerrisWheel,
  Fireworks,
  FoodStall,
  Garden,
  House,
  Jetty,
  Lighthouse,
  Market,
  Mountain,
  Palm,
  Rainbow,
  RiceTerraces,
  School,
  Villager,
} from "./islandParts";

/** Where trees grow on the hill, back to front (clear of the buildings). */
const TREE_SLOTS: [number, number][] = [
  [234, 132],
  [174, 135],
  [221, 137],
  [250, 140],
  [266, 141],
  [279, 143],
  [156, 144],
  [142, 145],
  [192, 147],
  [229, 147],
  [174, 149],
  [216, 152],
  [162, 153],
  [149, 154],
  [234, 157],
  [196, 158],
  [293, 159],
  [212, 161],
  [162, 162],
  [178, 162],
  [101, 164],
  [147, 165],
  [315, 166],
  [198, 167],
  [221, 167],
  [238, 167],
  [300, 169],
  [162, 171],
  [187, 174],
  [330, 174],
  [207, 175],
  [152, 176],
  [228, 178],
  [313, 178],
  [299, 180],
  [241, 181],
  [170, 182],
  [191, 182],
  [215, 182],
  [261, 182],
  [274, 182],
  [328, 183],
];

/** Where each building stands (its anchor on the ground). */
const SPOTS: Record<string, [number, number]> = {
  rumah: [122, 182],
  kebun: [88, 187],
  perahu: [46, 228],
  warung: [150, 199],
  dermaga: [322, 196],
  sawah: [266, 172],
  pasar: [228, 200],
  sekolah: [200, 134],
  mercusuar: [362, 192],
  gunung: [150, 160],
  "air-terjun": [150, 160],
  bianglala: [308, 156],
  "balon-udara": [82, 76],
  pelangi: [240, 168],
};

const SKY: Record<DayPhase, [string, string]> = {
  dawn: ["#ffc9a3", "#fff0dc"],
  day: ["#7fcdfb", "#e3f6ff"],
  dusk: ["#ff9478", "#ffd8a0"],
  night: ["#0c1937", "#2a3d70"],
};

const SEA: Record<DayPhase, [string, string]> = {
  dawn: ["#8fcfe0", "#3d8fb5"],
  day: ["#55c6df", "#1c7fb0"],
  dusk: ["#6aa9c7", "#2b6894"],
  night: ["#1f4068", "#0b2140"],
};

/** The sun's place and colour; at night the moon is out instead. */
const SUN: Record<Exclude<DayPhase, "night">, { at: string; fill: string }> = {
  dawn: { at: "translate(66 120)", fill: "#ffb15c" },
  day: { at: "translate(334 44)", fill: "#ffd84d" },
  dusk: { at: "translate(338 114)", fill: "#ff8a52" },
};

const STARS: [number, number, number][] = [
  [24, 18, 1.1],
  [58, 40, 0.8],
  [92, 14, 1],
  [130, 34, 0.7],
  [168, 12, 1.2],
  [204, 42, 0.8],
  [236, 20, 1],
  [270, 54, 0.7],
  [290, 14, 0.9],
  [358, 26, 1.1],
  [380, 60, 0.8],
  [16, 72, 0.9],
  [112, 70, 0.6],
  [186, 78, 0.8],
  [250, 88, 0.6],
  [346, 96, 0.7],
];

const VILLAGERS = ["ani", "budi", "citra", "dewi", "eko", "fajar"];

/** Buildings on land, which get a signpost before they arrive. */
const SIGNPOSTS = new Set([
  "rumah",
  "kebun",
  "warung",
  "dermaga",
  "sawah",
  "pasar",
  "sekolah",
  "mercusuar",
  "bianglala",
]);

const WAVE = "q10 -3 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0";

export interface IslandProps {
  trees: Tree[];
  unlocked: Building[];
  /** The next building to come, shown as a sign where it will stand. */
  next?: Building;
  villagers: number;
  /** Studied today: the campfire burns. */
  campfire: boolean;
  /** All of today's quests done: birds, fireflies or fireworks. */
  celebrate: boolean;
  phase: DayPhase;
  /** Makes the buildings tappable. */
  onPick?: (building: Building) => void;
  /** The building tapped last, highlighted. */
  picked?: string;
  className?: string;
}

/** Trees further back (higher up the hill) are drawn smaller. */
function treeSize(y: number) {
  return 19 + ((y - 128) / 56) * 10;
}

export default function Island({
  trees,
  unlocked,
  next,
  villagers,
  campfire,
  celebrate,
  phase,
  onPick,
  picked,
  className = "",
}: IslandProps) {
  const uid = `island${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const has = (id: string) => unlocked.some((b) => b.id === id);
  const dark = phase === "night" || phase === "dusk";
  const [skyTop, skyBottom] = SKY[phase];
  const [seaTop, seaBottom] = SEA[phase];

  /** A building in its place, tappable when the island is interactive. */
  const spot = (id: string, children: ReactNode) => {
    const building = unlocked.find((b) => b.id === id);
    if (!building) return null;
    const place = `translate(${SPOTS[id].join(" ")})`;
    if (!onPick) return <g transform={place}>{children}</g>;
    const pick = () => onPick(building);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick();
      }
    };
    const classes =
      picked === id ? "island__spot island__spot--picked" : "island__spot";
    return (
      <g
        transform={place}
        className={classes}
        role="button"
        tabIndex={0}
        aria-label={`${building.word}: ${building.meaning}`}
        onClick={pick}
        onKeyDown={onKeyDown}
      >
        <title>{`${building.word} · ${building.meaning}`}</title>
        {children}
      </g>
    );
  };

  /**
   * At night the land is in shadow; its windows and lamps are drawn again on
   * top (the rest of each building hidden), so they keep their glow.
   */
  const light = (id: string, children: ReactNode) =>
    has(id) && (
      <g transform={`translate(${SPOTS[id].join(" ")})`}>{children}</g>
    );

  // Fewer words than places: spread them over the hill, back to front.
  const placed = trees.map((tree, i) => {
    const slot = Math.floor((i * TREE_SLOTS.length) / trees.length);
    return { tree, at: TREE_SLOTS[Math.min(slot, TREE_SLOTS.length - 1)] };
  });

  // A sign marks where the next building will stand (on land only).
  const nextSpot = next && SIGNPOSTS.has(next.id) ? SPOTS[next.id] : undefined;
  const mountain = (
    <Mountain fill={`url(#${uid}-mountain)`} waterfall={has("air-terjun")} />
  );
  const lighthouse = <Lighthouse lit={dark} beam={`${uid}-beam`} />;

  return (
    <svg
      viewBox="0 0 400 250"
      className={`island island--${phase} ${className}`}
      role="img"
      aria-label="Pulau Kata, your island"
    >
      <title>Pulau Kata, your island</title>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBottom} />
        </linearGradient>
        <linearGradient id={`${uid}-sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={seaTop} />
          <stop offset="1" stopColor={seaBottom} />
        </linearGradient>
        <linearGradient id={`${uid}-grass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fcc66" />
          <stop offset="1" stopColor="#4c9f4f" />
        </linearGradient>
        <linearGradient id={`${uid}-mountain`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9c8f83" />
          <stop offset="0.45" stopColor="#7fa07a" />
          <stop offset="1" stopColor="#5f8f62" />
        </linearGradient>
        <linearGradient id={`${uid}-beam`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#fff6bf" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff6bf" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor="#fff3b0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3b0" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="250" fill={`url(#${uid}-sky)`} />

      {phase === "night" &&
        STARS.map(([x, y, r], i) => (
          <circle
            key={`${x}-${y}`}
            className="island__star"
            cx={x}
            cy={y}
            r={r}
            fill="#fffbe8"
            style={{ animationDelay: `${(i % 5) * 0.7}s` }}
          />
        ))}

      {phase === "night" ? (
        <g transform="translate(324 42)">
          <circle r="22" fill={`url(#${uid}-glow)`} opacity="0.5" />
          <circle r="12" fill="#f6f1d4" />
          <circle cx="5" cy="-3" r="10" fill={skyTop} />
        </g>
      ) : (
        <g transform={SUN[phase].at}>
          <circle r="30" fill={`url(#${uid}-glow)`} />
          <circle r="15" fill={SUN[phase].fill} />
        </g>
      )}

      {spot("pelangi", <Rainbow />)}

      <g opacity={dark ? 0.35 : 0.95}>
        <g className="island__cloud" style={{ animationDuration: "95s" }}>
          <ellipse cx="60" cy="36" rx="22" ry="8" fill="#fff" />
          <ellipse cx="74" cy="30" rx="14" ry="9" fill="#fff" />
        </g>
        <g
          className="island__cloud"
          style={{ animationDuration: "130s", animationDelay: "-60s" }}
        >
          <ellipse cx="200" cy="56" rx="26" ry="8" fill="#fff" />
          <ellipse cx="214" cy="49" rx="15" ry="9" fill="#fff" />
          <ellipse cx="188" cy="51" rx="10" ry="6" fill="#fff" />
        </g>
        <g
          className="island__cloud"
          style={{ animationDuration: "110s", animationDelay: "-30s" }}
        >
          <ellipse cx="300" cy="24" rx="18" ry="6" fill="#fff" />
          <ellipse cx="310" cy="20" rx="10" ry="6" fill="#fff" />
        </g>
      </g>

      {spot("gunung", mountain)}
      {spot("balon-udara", <Balloon />)}
      {has("kembang-api") && (celebrate || phase === "night") && <Fireworks />}

      <rect y="156" width="400" height="94" fill={`url(#${uid}-sea)`} />
      <g className="island__waves" stroke="#ffffff" fill="none">
        <path d={`M-40 172${WAVE}${WAVE}`} opacity="0.35" />
        <path d={`M-40 236${WAVE}${WAVE}`} opacity="0.25" />
      </g>

      <g className="island__land">
        {spot("perahu", <Boat />)}

        <ellipse cx="200" cy="207" rx="172" ry="12" fill="#000" opacity="0.1" />
        <path
          d="M28 196C40 176 92 166 150 163C218 160 300 162 352 176C374 182 378 196 356 201C300 212 110 212 52 206C34 204 22 201 28 196Z"
          fill="#f1d7a1"
        />
        <path
          d="M36 198C70 204 300 208 356 199"
          stroke="#e2bf80"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M62 184C80 158 132 128 200 124C266 121 318 146 340 178C330 182 76 186 62 184Z"
          fill={`url(#${uid}-grass)`}
        />
        <path
          d="M96 168C126 142 160 132 196 130C168 140 130 154 104 172Z"
          fill="#9ad97a"
          opacity="0.55"
        />

        {spot("sekolah", <School />)}
        {spot("bianglala", <FerrisWheel />)}
        {spot("sawah", <RiceTerraces />)}

        {placed.map(({ tree, at: [x, y] }) => {
          const size = treeSize(y);
          return (
            <svg
              key={tree.id}
              className={`island__tree growth-icon--stage-${tree.stage}`}
              x={x - size / 2}
              y={y - size * 0.92}
              width={size}
              height={size}
              viewBox="0 0 32 32"
              overflow="visible"
              aria-hidden="true"
            >
              <GrowthDrawing stage={tree.stage} />
            </svg>
          );
        })}

        {spot("rumah", <House />)}
        {spot("kebun", <Garden />)}

        <g transform="translate(58 194)">
          <Palm />
        </g>
        <g transform="translate(344 189) scale(-1 1)">
          <Palm />
        </g>
        {spot("dermaga", <Jetty />)}
        {spot("warung", <FoodStall />)}
        {spot("pasar", <Market />)}
        {spot("mercusuar", lighthouse)}

        <g transform="translate(112 204)">
          {VILLAGERS.slice(0, villagers).map((name, i) => (
            <Villager key={name} index={i} />
          ))}
        </g>

        {next && nextSpot && (
          <g
            className="island__next"
            transform={`translate(${nextSpot.join(" ")})`}
          >
            <title>{`Level ${next.level} brings something new here`}</title>
            <path d="M0 0v-12" stroke="#8a5a2b" strokeWidth="1.2" />
            <rect
              x="-6"
              y="-20"
              width="12"
              height="9"
              rx="1.5"
              fill="#fff7e6"
            />
            <text x="0" y="-13" className="island__next-mark">
              ?
            </text>
          </g>
        )}

        <path
          className="island__foam"
          d="M34 202C70 210 120 214 200 213C280 212 330 208 360 201"
          stroke="#ffffff"
          strokeWidth="1.6"
          fill="none"
          opacity="0.7"
        />
      </g>

      {phase === "night" && (
        <g className="island__lights">
          {light("rumah", <House />)}
          {light("sekolah", <School />)}
          {light("mercusuar", lighthouse)}
        </g>
      )}

      <g transform="translate(286 201)">
        <Campfire lit={campfire} />
      </g>

      {celebrate && phase === "day" && (
        <g transform="translate(150 70)">
          <Birds />
        </g>
      )}
      {celebrate && dark && (
        <g className="island__fireflies" fill="#fff59d">
          <circle cx="120" cy="150" r="1.2" />
          <circle cx="182" cy="140" r="1" />
          <circle cx="246" cy="146" r="1.2" />
          <circle cx="292" cy="160" r="1" />
          <circle cx="150" cy="166" r="1" />
        </g>
      )}
    </svg>
  );
}
