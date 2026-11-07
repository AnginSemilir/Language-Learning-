// A small picture of something found on Pulau Kata, for the surprise that
// shows it, the collection and the day's news: the same drawing as on the
// island, framed against its sky, sea or sand. Still a silhouette until
// it's found.

import type { Weather } from "@/logic/game/calendar";
import type { ReactNode } from "react";
import "./DiscoveryArt.css";
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
  Turtle,
  Whale,
} from "./islandLife";
import {
  Balloon,
  Boat,
  FerrisWheel,
  FoodStall,
  Garden,
  House,
  Jetty,
  Lighthouse,
  Market,
  Mountain,
  Rainbow,
  RiceTerraces,
  School,
} from "./islandParts";
import { Bottle, Cake, FarIsland, Kites, Lanterns, Temple } from "./islandSky";

type Backdrop = "sky" | "night" | "sea" | "grass" | "beach" | "paper";

interface Art {
  /** The part of the drawing to show: x, y, width, height. */
  box: [number, number, number, number];
  backdrop: Backdrop;
  /** Where the ground or the sea begins (y), if not at 0. */
  ground?: number;
  draw: () => ReactNode;
}

const SKY: Record<Backdrop, string> = {
  sky: "#cdeeff",
  night: "#1c2b52",
  sea: "#cdeeff",
  grass: "#d9f1ff",
  beach: "#d9f1ff",
  paper: "#fbf3e2",
};

const GROUND: Partial<Record<Backdrop, string>> = {
  sea: "#6cc8e2",
  grass: "#a9dc86",
  beach: "#f3dcae",
};

const RAYS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

function Burst({ color }: { color: string }) {
  return (
    <g>
      {RAYS.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = Math.round(Math.cos(rad) * 40) / 10;
        const y1 = Math.round(Math.sin(rad) * 40) / 10;
        const x2 = Math.round(Math.cos(rad) * 110) / 10;
        const y2 = Math.round(Math.sin(rad) * 110) / 10;
        return (
          <path
            key={angle}
            d={`M${x1} ${y1}L${x2} ${y2}`}
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function Postcard() {
  return (
    <g>
      <rect x="-14" y="-10" width="28" height="18" rx="1.5" fill="#ffffff" />
      <rect x="4" y="-8" width="8" height="9" rx="0.8" fill="#7fcdfb" />
      <path d="M5 -1.4c2 -3 4 -3 6 0z" fill="#7fcc66" />
      <path
        d="M-11 -5h12M-11 -2h11M-11 1h12M-11 4h8"
        stroke="#c9b48f"
        strokeWidth="0.7"
      />
    </g>
  );
}

function Footprints() {
  return (
    <g fill="#c9a46a">
      <ellipse cx="-9" cy="-2" rx="1.4" ry="2.2" />
      <ellipse cx="-4" cy="-5" rx="1.4" ry="2.2" />
      <ellipse cx="1" cy="-2" rx="1.4" ry="2.2" />
      <ellipse cx="6" cy="-5" rx="1.4" ry="2.2" />
      <ellipse cx="11" cy="-2" rx="1.4" ry="2.2" />
    </g>
  );
}

function Flag() {
  return (
    <g>
      <path d="M-6 0v-22" stroke="#8a8f98" strokeWidth="1" />
      <g className="island__flag">
        <rect x="-5.6" y="-22" width="14" height="4.4" fill="#e23b3b" />
        <rect x="-5.6" y="-17.6" width="14" height="4.4" fill="#ffffff" />
      </g>
    </g>
  );
}

const BATIK_DOTS = [-9, -3, 3, 9].flatMap((x) => [
  [x, -5],
  [x, 2],
]);

function BatikCloth() {
  return (
    <g>
      <rect x="-12" y="-9" width="24" height="16" rx="1" fill="#6b3f22" />
      {BATIK_DOTS.map(([x, y]) => (
        <g key={`${x} ${y}`} transform={`translate(${x} ${y})`}>
          <circle r="1.6" fill="#f3dcae" />
          <circle r="0.7" fill="#b9783f" />
        </g>
      ))}
      <path d="M-12 -1.5h24" stroke="#f3dcae" strokeWidth="0.4" />
    </g>
  );
}

function Hundred() {
  return (
    <g>
      <circle r="10" fill="#ffd65c" />
      <circle r="10" fill="none" stroke="#f59e0b" strokeWidth="1" />
      <text className="discovery-art__text" y="3.4" textAnchor="middle">
        100
      </text>
    </g>
  );
}

const SEA_LINE = 0;

/** The drawings, by the id of what's found (levels by their building). */
const ART: Record<string, Art> = {
  ayam: { box: [-9, -12, 18, 14], backdrop: "grass", draw: () => <Chicken /> },
  kucing: { box: [-8, -13, 16, 15], backdrop: "beach", draw: () => <Cat /> },
  "kupu-kupu": {
    box: [-12, -22, 28, 18],
    backdrop: "grass",
    ground: -4,
    draw: () => <Butterflies />,
  },
  kambing: { box: [-9, -13, 19, 15], backdrop: "grass", draw: () => <Goat /> },
  kerbau: {
    box: [-13, -14, 23, 16],
    backdrop: "grass",
    draw: () => <Buffalo />,
  },
  ikan: {
    box: [-10, -12, 20, 16],
    backdrop: "sea",
    draw: () => <JumpingFish />,
  },
  monyet: { box: [-9, -19, 18, 17], backdrop: "grass", draw: () => <Monkey /> },
  kakatua: {
    box: [-6, -13, 12, 14],
    backdrop: "sky",
    draw: () => <Cockatoo />,
  },
  rusa: { box: [-8, -16, 17, 17], backdrop: "grass", draw: () => <Deer /> },
  orangutan: {
    box: [-8, -12, 16, 13],
    backdrop: "grass",
    draw: () => <Orangutan />,
  },
  gajah: {
    box: [-9, -15, 21, 16],
    backdrop: "grass",
    draw: () => <Elephant />,
  },
  "lumba-lumba": {
    box: [-11, -9, 36, 16],
    backdrop: "sea",
    ground: 2,
    draw: () => <Dolphins />,
  },
  "bintang-jatuh": {
    box: [-30, -14, 36, 18],
    backdrop: "night",
    draw: () => <ShootingStar />,
  },
  pinisi: { box: [-34, -42, 58, 46], backdrop: "sea", draw: () => <Pinisi /> },
  penyu: { box: [-8, -6, 16, 8], backdrop: "beach", draw: () => <Turtle /> },
  paus: { box: [-24, -16, 40, 20], backdrop: "sea", draw: () => <Whale /> },
  komodo: { box: [-14, -6, 28, 8], backdrop: "beach", draw: () => <Komodo /> },
  cendrawasih: {
    box: [-18, -9, 24, 22],
    backdrop: "sky",
    draw: () => <BirdOfParadise />,
  },
  "tahun-baru": {
    box: [-14, -14, 28, 28],
    backdrop: "night",
    draw: () => <Burst color="#ffc83d" />,
  },
  kemerdekaan: {
    box: [-10, -25, 22, 27],
    backdrop: "sky",
    draw: () => <Flag />,
  },
  "hari-batik": {
    box: [-14, -11, 28, 20],
    backdrop: "paper",
    draw: () => <BatikCloth />,
  },
  "ulang-tahun": {
    box: [-8, -24, 24, 26],
    backdrop: "beach",
    draw: () => <Cake />,
  },
  "seratus-hari": {
    box: [-13, -13, 26, 26],
    backdrop: "sky",
    draw: () => <Hundred />,
  },
  rahasia: {
    box: [-14, -10, 28, 14],
    backdrop: "beach",
    ground: -10,
    draw: () => <Footprints />,
  },
  peribahasa: {
    box: [-8, -8, 16, 10],
    backdrop: "beach",
    draw: () => <Bottle />,
  },
  "kartu-pos": {
    box: [-16, -12, 32, 22],
    backdrop: "paper",
    draw: () => <Postcard />,
  },
  rumah: { box: [-22, -40, 44, 42], backdrop: "grass", draw: () => <House /> },
  kebun: { box: [-18, -15, 36, 17], backdrop: "grass", draw: () => <Garden /> },
  perahu: { box: [-20, -28, 40, 30], backdrop: "sea", draw: () => <Boat /> },
  warung: {
    box: [-20, -28, 40, 30],
    backdrop: "beach",
    draw: () => <FoodStall />,
  },
  dermaga: {
    box: [-4, -8, 66, 24],
    backdrop: "sea",
    ground: 6,
    draw: () => <Jetty />,
  },
  sawah: {
    box: [-20, -27, 40, 29],
    backdrop: "grass",
    draw: () => <RiceTerraces />,
  },
  pasar: { box: [-32, -23, 64, 25], backdrop: "beach", draw: () => <Market /> },
  "pulau-seberang": {
    box: [306, 124, 106, 36],
    backdrop: "sea",
    ground: 156,
    draw: () => <FarIsland temple={false} />,
  },
  sekolah: {
    box: [-22, -38, 62, 40],
    backdrop: "grass",
    draw: () => <School />,
  },
  mercusuar: {
    box: [-16, -46, 32, 48],
    backdrop: "beach",
    draw: () => <Lighthouse lit={false} beam="" />,
  },
  gunung: {
    box: [-96, -126, 192, 128],
    backdrop: "grass",
    draw: () => <Mountain fill="#7fa07a" waterfall={false} />,
  },
  pura: { box: [-10, -17, 20, 19], backdrop: "grass", draw: () => <Temple /> },
  "air-terjun": {
    box: [-96, -126, 192, 128],
    backdrop: "grass",
    draw: () => <Mountain fill="#7fa07a" waterfall />,
  },
  bianglala: {
    box: [-24, -50, 48, 52],
    backdrop: "grass",
    draw: () => <FerrisWheel />,
  },
  "balon-udara": {
    box: [-22, -44, 44, 62],
    backdrop: "sky",
    draw: () => <Balloon />,
  },
  pelangi: {
    box: [-126, -116, 252, 118],
    backdrop: "sky",
    draw: () => <Rainbow />,
  },
  "kembang-api": {
    box: [-14, -14, 28, 28],
    backdrop: "night",
    draw: () => <Burst color="#f472b6" />,
  },
  "layang-layang": {
    box: [110, 30, 170, 60],
    backdrop: "sky",
    ground: 1000,
    draw: () => <Kites />,
  },
  "pasar-malam": {
    box: [190, 176, 76, 14],
    backdrop: "night",
    draw: () => <Lanterns />,
  },
};

/** The picture for something found: levels show their building or a card. */
export function artFor(id: string, word = ""): string {
  if (ART[id]) return id;
  if (id.startsWith("peribahasa-")) return "peribahasa";
  const building = word.replace(" ", "-");
  return ART[building] ? building : "kartu-pos";
}

/** Widens the frame to 4:3 around its middle, so every picture fits. */
function framed([x, y, w, h]: Art["box"]): Art["box"] {
  const ratio = 4 / 3;
  if (w / h < ratio) {
    const width = h * ratio;
    return [x - (width - w) / 2, y, width, h];
  }
  const height = w / ratio;
  return [x, y - (height - h) / 2, w, height];
}

export default function DiscoveryArt({
  id,
  locked = false,
  className = "",
}: {
  /** An id from artFor(). */
  id: string;
  locked?: boolean;
  className?: string;
}) {
  const art = ART[id] ?? ART["kartu-pos"];
  const [x, y, w, h] = framed(art.box);
  const ground = art.ground ?? SEA_LINE;
  const groundFill = GROUND[art.backdrop];
  const classes = [
    "discovery-art",
    locked ? "discovery-art--locked" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <svg
      className={classes}
      viewBox={`${x} ${y} ${w} ${h}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect x={x} y={y} width={w} height={h} fill={SKY[art.backdrop]} />
      {groundFill && ground < y + h && (
        <rect
          x={x}
          y={ground}
          width={w}
          height={y + h - ground}
          fill={groundFill}
        />
      )}
      <g className="discovery-art__subject">{art.draw()}</g>
    </svg>
  );
}

const WEATHER_ICON: Record<Weather, ReactNode> = {
  cerah: (
    <g>
      <circle cx="12" cy="12" r="5" fill="#ffd84d" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2 -2M17 7l2 -2"
        stroke="#f6b73c"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </g>
  ),
  berawan: (
    <g>
      <circle cx="9" cy="9" r="4" fill="#ffd84d" />
      <path
        d="M6 18a4 4 0 0 1 1 -8a5 5 0 0 1 9.6 1.4a3.4 3.4 0 0 1 .4 6.6z"
        fill="#c7d0dc"
      />
    </g>
  ),
  gerimis: (
    <g>
      <path
        d="M5 14a4 4 0 0 1 1 -8a5 5 0 0 1 9.6 1.4a3.4 3.4 0 0 1 .4 6.6z"
        fill="#b6c2d1"
      />
      <path
        d="M8 17l-1 2M12 17l-1 2M16 17l-1 2"
        stroke="#60a5fa"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </g>
  ),
  hujan: (
    <g>
      <path
        d="M5 13a4 4 0 0 1 1 -8a5 5 0 0 1 9.6 1.4a3.4 3.4 0 0 1 .4 6.6z"
        fill="#8d98a8"
      />
      <path
        d="M7 16l-1.6 4M11 16l-1.6 4M15 16l-1.6 4M19 16l-1.6 4"
        stroke="#3b82f6"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </g>
  ),
  badai: (
    <g>
      <path
        d="M5 13a4 4 0 0 1 1 -8a5 5 0 0 1 9.6 1.4a3.4 3.4 0 0 1 .4 6.6z"
        fill="#5b6575"
      />
      <path d="M12 13l-3 5h3l-2 5l5 -7h-3l2 -3z" fill="#facc15" />
    </g>
  ),
};

/** A little picture of the day's weather. */
export function WeatherIcon({ weather }: { weather: Weather }) {
  return (
    <svg
      className="weather-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {WEATHER_ICON[weather]}
    </svg>
  );
}
