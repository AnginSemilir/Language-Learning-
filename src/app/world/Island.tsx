// Pulau Kata, drawn. Everything is placed on a 400 × 250 canvas: sky, sea,
// the island with its hill, your words as trees (logic/game/world.ts picks
// them), whatever your level has built so far, the animals that live there,
// today's weather and visitors, and the traces of the island's secret.
// Buildings, animals and visitors can be tapped to see what they're called.

import { GrowthDrawing } from "@/components/GrowthIcon/GrowthIcon";
import type { Building } from "@/logic/game/buildings";
import type { Weather } from "@/logic/game/calendar";
import { ANIMALS, type IslandDay, VISITORS } from "@/logic/game/discoveries";
import type { DayPhase, Tree } from "@/logic/game/world";
import { type KeyboardEvent, type ReactNode, useId } from "react";
import "./Island.css";
import {
  BirdOfParadise,
  Buffalo,
  Butterflies,
  Cat,
  Chicken,
  Cockatoo,
  Deer,
  Dolphins,
  Elephant,
  Goat,
  JumpingFish,
  Komodo,
  Monkey,
  Orangutan,
  Pinisi,
  ShootingStar,
  Stranger,
  Turtle,
  Whale,
} from "./islandLife";
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
import {
  BlueGlow,
  Bottle,
  Bunting,
  Cake,
  FAR_SLOTS,
  FarIsland,
  FishingBoats,
  GoldenTree,
  GreasedPole,
  Kites,
  Lanterns,
  Lightning,
  Mist,
  Overcast,
  Rain,
} from "./islandSky";

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

export interface IslandThing {
  id: string;
  word: string;
  meaning: string;
}

/** Everything on the island at this moment. */
export interface IslandScene {
  trees: Tree[];
  /** Trees on the island across the water. */
  farTrees: Tree[];
  unlocked: Building[];
  /** The next building to come, shown as a sign where it will stand. */
  next?: Building;
  villagers: number;
  /** Studied today: the campfire burns. */
  campfire: boolean;
  /** All of today's quests done: birds, fireflies or fireworks. */
  celebrate: boolean;
  /** Animals living here (see logic/game/discoveries.ts). */
  animals: string[];
  /** Today's weather, goings-on, visitors and bottle. */
  day: IslandDay;
  /** The island's secret (logic/game/story.ts): the stranger's out… */
  stranger: boolean;
  /** …a blue light is seen at the jetty or the lighthouse… */
  blueLight: "dermaga" | "mercusuar" | null;
  /** …and, at the end, the cave and the golden tree. */
  treasure: boolean;
}

export interface IslandProps {
  scene: IslandScene;
  phase: DayPhase;
  /** Makes buildings, animals and visitors tappable. */
  onPick?: (thing: IslandThing) => void;
  /** The thing tapped last, highlighted. */
  picked?: string;
  className?: string;
}

/** Where the animals live. */
const HOMES: Record<string, [number, number]> = {
  ayam: [104, 191],
  kucing: [172, 201],
  "kupu-kupu": [88, 178],
  kambing: [296, 186],
  kerbau: [242, 177],
  ikan: [300, 233],
  monyet: [182, 152],
  kakatua: [331, 158],
  rusa: [76, 180],
  gajah: [40, 203],
  orangutan: [258, 143],
};

/** Where visitors turn up. */
const VISITS: Record<string, [number, number]> = {
  "lumba-lumba": [100, 237],
  "bintang-jatuh": [150, 40],
  pinisi: [262, 247],
  penyu: [206, 212],
  paus: [178, 246],
  komodo: [70, 208],
  cendrawasih: [0, 58],
};

/** The Indonesian name and the English one, for what can be tapped. */
const NAMES: Record<string, IslandThing> = Object.fromEntries(
  [...ANIMALS, ...VISITORS].map((d) => [
    d.id,
    { id: d.id, word: d.word, meaning: d.meaning },
  ])
);

const CAMPFIRE: IslandThing = {
  id: "api-unggun",
  word: "api unggun",
  meaning: "campfire",
};
const BOTTLE: IslandThing = {
  id: "botol",
  word: "pesan dalam botol",
  meaning: "message in a bottle",
};
const STRANGER: IslandThing = {
  id: "orang-asing",
  word: "orang asing",
  meaning: "stranger",
};

const LIGHT: Record<DayPhase, [number, number]> = {
  dawn: [1, 1],
  day: [1, 1],
  dusk: [0.9, 0.95],
  night: [0.66, 0.8],
};

const WEATHER_LIGHT: Record<Weather, number> = {
  cerah: 1,
  berawan: 0.95,
  gerimis: 0.92,
  hujan: 0.86,
  badai: 0.78,
};

/** The light on the land at this hour, and in this weather. */
function shade(phase: DayPhase, weather?: Weather) {
  const [light, colour] = LIGHT[phase];
  const brightness = light * (weather ? WEATHER_LIGHT[weather] : 1);
  if (brightness > 0.99) return undefined;
  return { filter: `brightness(${brightness}) saturate(${colour})` };
}

const RED_WHITE = ["#e23b3b", "#ffffff"];
const PARTY = ["#f97316", "#facc15", "#22c55e", "#38bdf8", "#a855f7"];

/** Trees further back (higher up the hill) are drawn smaller. */
function treeSize(y: number) {
  return 19 + ((y - 128) / 56) * 10;
}

function TreeAt({
  tree,
  x,
  y,
  size,
}: {
  tree: Tree;
  x: number;
  y: number;
  size: number;
}) {
  return (
    <svg
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
}

export default function Island({
  scene,
  phase,
  onPick,
  picked,
  className = "",
}: IslandProps) {
  const uid = `island${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { trees, unlocked, next, day } = scene;
  const has = (id: string) => unlocked.some((b) => b.id === id);
  const lives = (id: string) => scene.animals.includes(id);
  const visits = (id: string) => day.visitors.includes(id);
  const happens = (id: string) => day.events.includes(id);
  const dark = phase === "night" || phase === "dusk";
  const daylight = phase !== "night";
  const wet = day.weather === "hujan" || day.weather === "badai";
  const party = day.celebration;
  const [skyTop, skyBottom] = SKY[phase];
  const [seaTop, seaBottom] = SEA[phase];

  /**
   * Something on the island, tappable when the island is interactive. Small
   * things get a bigger invisible target (`hit`, in island units), so they
   * can be tapped on a phone.
   */
  const tappable = (
    thing: IslandThing,
    at: string,
    children: ReactNode,
    hit = 0
  ) => {
    if (!onPick) return <g transform={at}>{children}</g>;
    const pick = () => onPick(thing);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick();
      }
    };
    const classes =
      picked === thing.id
        ? "island__spot island__spot--picked"
        : "island__spot";
    return (
      <g
        transform={at}
        className={classes}
        role="button"
        tabIndex={0}
        aria-label={`${thing.word}: ${thing.meaning}`}
        onClick={pick}
        onKeyDown={onKeyDown}
      >
        <title>{`${thing.word} · ${thing.meaning}`}</title>
        {hit > 0 && <circle cy={-hit / 2} r={hit} fill="transparent" />}
        {children}
      </g>
    );
  };

  const place = ([x, y]: [number, number]) => `translate(${x} ${y})`;

  /** A building in its place, once its level is reached. */
  const spot = (id: string, children: ReactNode) => {
    const building = unlocked.find((b) => b.id === id);
    return building && tappable(building, place(SPOTS[id]), children);
  };

  /** An animal at home, once it has come to live here. */
  const animal = (id: string, children: ReactNode) =>
    lives(id) && tappable(NAMES[id], place(HOMES[id]), children, 9);

  /** A visitor, on the days it comes. */
  const visitor = (id: string, children: ReactNode) =>
    visits(id) && tappable(NAMES[id], place(VISITS[id]), children, 10);

  /**
   * At night the land is in shadow; its windows and lamps are drawn again on
   * top (the rest of each building hidden), so they keep their glow.
   */
  const light = (id: string, children: ReactNode) =>
    has(id) && <g transform={place(SPOTS[id])}>{children}</g>;

  // Fewer words than places: spread them over the hill, back to front.
  const placed = trees.map((tree, i) => {
    const slot = Math.floor((i * TREE_SLOTS.length) / trees.length);
    return { tree, at: TREE_SLOTS[Math.min(slot, TREE_SLOTS.length - 1)] };
  });

  // A sign marks where the next building will stand (on land only).
  const nextSpot = next && SIGNPOSTS.has(next.id) ? SPOTS[next.id] : undefined;
  const mountain = (
    <Mountain
      fill={`url(#${uid}-mountain)`}
      waterfall={has("air-terjun")}
      cave={scene.treasure}
    />
  );
  const blueLamp = dark && scene.blueLight === "mercusuar";
  const lighthouse = (
    <Lighthouse
      lit={dark}
      beam={blueLamp ? `${uid}-beam-blue` : `${uid}-beam`}
      blue={blueLamp}
    />
  );
  const shirt = party === "hari-batik" ? `url(#${uid}-batik)` : undefined;
  const fireworks =
    (has("kembang-api") && (scene.celebrate || phase === "night")) ||
    party === "tahun-baru" ||
    party === "seratus-hari";
  const rainbow =
    has("pelangi") || (happens("pelangi") && daylight && phase !== "dusk");
  const flags = party === "kemerdekaan" ? RED_WHITE : PARTY;
  const bunting =
    party === "kemerdekaan" ||
    party === "ulang-tahun" ||
    party === "seratus-hari";

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
        <linearGradient id={`${uid}-beam-blue`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#9fd0ff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#9fd0ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor="#fff3b0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3b0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-blue`}>
          <stop offset="0" stopColor="#8ec5ff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#8ec5ff" stopOpacity="0" />
        </radialGradient>
        <pattern
          id={`${uid}-batik`}
          width="2.4"
          height="2.4"
          patternUnits="userSpaceOnUse"
        >
          <rect width="2.4" height="2.4" fill="#6b3f22" />
          <circle cx="1.2" cy="1.2" r="0.55" fill="#f3dcae" />
        </pattern>
      </defs>

      <rect width="400" height="250" fill={`url(#${uid}-sky)`} />

      {phase === "night" &&
        !wet &&
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

      {rainbow && (
        <g transform={place(SPOTS.pelangi)}>
          <Rainbow />
        </g>
      )}

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

      {phase === "night" && !wet && visitor("bintang-jatuh", <ShootingStar />)}
      {fireworks && <Fireworks />}

      <g style={shade(phase)}>
        {spot("gunung", mountain)}
        {spot("balon-udara", <Balloon />)}
        {daylight && visitor("cendrawasih", <BirdOfParadise />)}
        {daylight && happens("layang-layang") && <Kites />}
        {has("pulau-seberang") && (
          <g>
            {tappable(
              {
                id: "pulau-seberang",
                word: "pulau seberang",
                meaning: "the island across",
              },
              "",
              <FarIsland temple={has("pura")} />
            )}
            {scene.farTrees.map((tree, i) => {
              const [x, y] = FAR_SLOTS[i % FAR_SLOTS.length];
              return (
                <TreeAt
                  key={tree.id}
                  tree={tree}
                  x={x}
                  y={y}
                  size={7 + (y - 140) / 7}
                />
              );
            })}
          </g>
        )}
      </g>

      <rect y="156" width="400" height="94" fill={`url(#${uid}-sea)`} />
      <g className="island__waves" stroke="#ffffff" fill="none">
        <path d={`M-40 172${WAVE}${WAVE}`} opacity="0.35" />
        <path d={`M-40 236${WAVE}${WAVE}`} opacity="0.25" />
      </g>

      <Overcast weather={day.weather} />

      <g className="island__land" style={shade(phase, day.weather)}>
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

        {placed.map(({ tree, at: [x, y] }) => (
          <TreeAt key={tree.id} tree={tree} x={x} y={y} size={treeSize(y)} />
        ))}

        {scene.treasure && (
          <g transform="translate(168 136)">
            <GoldenTree />
          </g>
        )}
        {animal("monyet", <Monkey />)}
        {animal("orangutan", <Orangutan />)}
        {spot("rumah", <House />)}
        {spot("kebun", <Garden />)}
        {animal("kupu-kupu", <Butterflies />)}
        {animal("rusa", <Deer />)}
        {animal("kerbau", <Buffalo />)}
        {animal("kambing", <Goat />)}

        <g transform="translate(58 194)">
          <Palm />
        </g>
        <g transform="translate(344 189) scale(-1 1)">
          <Palm />
        </g>
        {animal("kakatua", <Cockatoo />)}
        {spot("dermaga", <Jetty />)}
        {spot("warung", <FoodStall />)}
        {spot("pasar", <Market />)}
        {spot("mercusuar", lighthouse)}

        {bunting && <Bunting from={[96, 172]} to={[146, 178]} colors={flags} />}
        {bunting && (
          <Bunting from={[196, 176]} to={[262, 178]} colors={flags} />
        )}
        {party === "kemerdekaan" && (
          <g transform="translate(262 203)">
            <GreasedPole />
          </g>
        )}
        {party === "ulang-tahun" && (
          <g transform="translate(188 206)">
            <Cake />
          </g>
        )}

        {animal("ayam", <Chicken />)}
        {animal("kucing", <Cat />)}
        {animal("gajah", <Elephant />)}
        {visitor("penyu", <Turtle />)}
        {visitor("komodo", <Komodo />)}
        {day.bottle && tappable(BOTTLE, "translate(172 214)", <Bottle />, 10)}

        <g transform="translate(112 204)">
          {VILLAGERS.slice(0, scene.villagers).map((name, i) => (
            <Villager key={name} index={i} shirt={shirt} />
          ))}
        </g>

        {next && nextSpot && (
          <g className="island__next" transform={place(nextSpot)}>
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

        {visitor("paus", <Whale />)}
        {visitor("lumba-lumba", <Dolphins />)}
        {animal("ikan", <JumpingFish />)}
        {visitor(
          "pinisi",
          <g transform="scale(0.75)">
            <Pinisi />
          </g>
        )}
      </g>

      {phase === "night" && (
        <g className="island__lights">
          {light("rumah", <House />)}
          {light("sekolah", <School />)}
          {light("mercusuar", lighthouse)}
        </g>
      )}
      {dark && happens("pasar-malam") && has("pasar") && <Lanterns />}
      {phase === "dusk" && happens("nelayan") && <FishingBoats />}
      {dark && scene.blueLight === "dermaga" && has("dermaga") && (
        <g transform="translate(378 206)">
          <BlueGlow gradient={`${uid}-blue`} />
        </g>
      )}
      {dark &&
        scene.stranger &&
        tappable(
          STRANGER,
          "translate(86 207)",
          <Stranger glow={`${uid}-blue`} />,
          10
        )}

      {tappable(
        CAMPFIRE,
        "translate(286 201)",
        <Campfire lit={scene.campfire} />,
        10
      )}

      {scene.celebrate && phase === "day" && (
        <g transform="translate(150 70)">
          <Birds />
        </g>
      )}
      {scene.celebrate && dark && (
        <g className="island__fireflies" fill="#fff59d">
          <circle cx="120" cy="150" r="1.2" />
          <circle cx="182" cy="140" r="1" />
          <circle cx="246" cy="146" r="1.2" />
          <circle cx="292" cy="160" r="1" />
          <circle cx="150" cy="166" r="1" />
        </g>
      )}

      {phase === "dawn" && day.mist && <Mist />}
      <Rain weather={day.weather} />
      {day.weather === "badai" && <Lightning />}
    </svg>
  );
}
