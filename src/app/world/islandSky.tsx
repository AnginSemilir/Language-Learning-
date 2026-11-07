// The island's days: rain and mist, kites and fishing boats, the night
// market's lanterns, bottles on the beach, flags and cake for celebrations,
// the island across the water, and what the island's secret leaves behind.
// Everything is drawn on the island's 400 × 250 canvas unless it says
// otherwise (then (0, 0) is where it stands).

import type { Weather } from "@/logic/game/calendar";
import { Boat, Palm } from "./islandParts";

/**
 * Streaks of rain, as one path: a lattice that looks the same moved by one
 * step (-7, 24), so the falling loop has no seam.
 */
function rainPath(columns: number, spacing: number): string {
  const parts: string[] = [];
  for (let row = -2; row < 12; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * spacing - row * 7 + 40;
      const y = row * 24 + ((col * 11) % 24);
      parts.push(`M${x} ${y}l-1.75 6`);
    }
  }
  return parts.join("");
}

const RAIN = rainPath(16, 28);
const DRIZZLE = rainPath(10, 44);

const DIM: Partial<Record<Weather, number>> = {
  berawan: 0.12,
  gerimis: 0.16,
  hujan: 0.28,
  badai: 0.42,
};

/** Grey clouds and a dimmer sky, for cloudy and wet days. */
export function Overcast({ weather }: { weather: Weather }) {
  const dim = DIM[weather];
  if (!dim) return null;
  return (
    <g>
      <rect width="400" height="250" fill="#3b4a5e" opacity={dim} />
      <g fill="#8d98a8" opacity={0.5 + dim}>
        <ellipse cx="40" cy="22" rx="46" ry="14" />
        <ellipse cx="130" cy="14" rx="56" ry="16" />
        <ellipse cx="236" cy="20" rx="50" ry="15" />
        <ellipse cx="340" cy="12" rx="62" ry="17" />
      </g>
    </g>
  );
}

/** Falling rain over everything; heavier in a storm, light in a drizzle. */
export function Rain({ weather }: { weather: Weather }) {
  if (weather !== "gerimis" && weather !== "hujan" && weather !== "badai") {
    return null;
  }
  const light = weather === "gerimis";
  return (
    <g className="island__rain">
      <path
        d={light ? DRIZZLE : RAIN}
        stroke="#e2f1ff"
        strokeWidth={light ? 0.5 : 0.7}
        opacity={light ? 0.55 : 0.7}
        strokeLinecap="round"
      />
    </g>
  );
}

/** A flash of lightning now and then, in a storm. */
export function Lightning() {
  return (
    <g className="island__lightning">
      <rect width="400" height="250" fill="#ffffff" opacity="0.35" />
      <path
        d="M282 8l-10 22h8l-12 26l22 -32h-9l9 -16z"
        fill="#fff8d6"
        stroke="#ffe680"
        strokeWidth="0.6"
      />
    </g>
  );
}

/** Morning mist lying over the sea. */
export function Mist() {
  return (
    <g className="island__mist" fill="#ffffff">
      <ellipse cx="70" cy="158" rx="120" ry="6" opacity="0.5" />
      <ellipse cx="320" cy="160" rx="130" ry="5" opacity="0.45" />
      <ellipse cx="200" cy="232" rx="190" ry="6" opacity="0.3" />
    </g>
  );
}

const KITES = [
  { x: 128, y: 58, color: "#e8553f", tail: "#ffc83d", to: [140, 202] },
  { x: 198, y: 38, color: "#ffc83d", tail: "#2f8fd8", to: [184, 204] },
  { x: 262, y: 66, color: "#2f8fd8", tail: "#e8553f", to: [246, 203] },
];

/** Layang-layang: kites over the beach, on breezy days. */
export function Kites() {
  return (
    <g>
      {KITES.map((k) => {
        const [tx, ty] = k.to;
        const string = `M${k.x} ${k.y + 6}Q${(k.x + tx) / 2 + 12} ${(k.y + ty) / 2} ${tx} ${ty}`;
        return (
          <g key={k.color}>
            <path d={string} stroke="#ffffff" strokeWidth="0.4" opacity="0.7" />
            <g transform={`translate(${k.x} ${k.y})`}>
              <g className="island__kite">
                <path d="M0 -6l4.4 6l-4.4 6l-4.4 -6z" fill={k.color} />
                <path
                  d="M0 -6v12M-4.4 0h8.8"
                  stroke="#ffffff"
                  strokeWidth="0.4"
                  opacity="0.7"
                />
                <path
                  d="M0 6c1.6 2 -1.6 4 0 6c1.6 2 -1.6 4 0 6"
                  stroke={k.tail}
                  strokeWidth="0.8"
                />
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
}

const FISHING_BOATS = [
  { x: 14, y: 168, scale: 0.42 },
  { x: 40, y: 163, scale: 0.34 },
];

/** Nelayan: fishing boats coming home at dusk, lamps lit. */
export function FishingBoats() {
  return (
    <g className="island__homeward">
      {FISHING_BOATS.map((b) => (
        <g key={b.x} transform={`translate(${b.x} ${b.y}) scale(${b.scale})`}>
          <Boat />
          <circle className="island__lantern" cy="-27" r="2.4" fill="#ffd35a" />
        </g>
      ))}
    </g>
  );
}

const LANTERN_COLORS = ["#ff6b4a", "#ffc83d", "#ff9f43", "#ffd35a"];
const LANTERN_AT = [0.08, 0.24, 0.4, 0.56, 0.72, 0.88];

/** Pasar malam: lanterns strung over the market on Saturday nights. */
export function Lanterns() {
  return (
    <g>
      <path d="M194 180Q228 190 262 180" stroke="#5b4636" strokeWidth="0.5" />
      {LANTERN_AT.map((t, i) => {
        const x = 194 + 68 * t;
        const y = 180 + 20 * t * (1 - t);
        return (
          <g key={t} transform={`translate(${x} ${y})`}>
            <path d="M0 0v1.4" stroke="#5b4636" strokeWidth="0.4" />
            <rect
              className="island__lantern"
              x="-1.6"
              y="1.4"
              width="3.2"
              height="3.6"
              rx="1.4"
              fill={LANTERN_COLORS[i % LANTERN_COLORS.length]}
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          </g>
        );
      })}
    </g>
  );
}

/** Pesan dalam botol: a bottle washed up on the beach, glinting. */
export function Bottle() {
  return (
    <g className="island__bottle">
      <ellipse cx="0" cy="0.6" rx="4.6" ry="1" fill="#000000" opacity="0.12" />
      <g transform="rotate(-18)">
        <rect
          x="-4"
          y="-2"
          width="6.4"
          height="3.6"
          rx="1.4"
          fill="#7cc9a6"
          opacity="0.9"
        />
        <rect x="2.2" y="-1.2" width="2.2" height="2" rx="0.5" fill="#7cc9a6" />
        <rect
          x="4.2"
          y="-1.1"
          width="1.2"
          height="1.8"
          rx="0.3"
          fill="#b9814a"
        />
        <rect x="-3" y="-1.2" width="4" height="2" rx="0.6" fill="#fff4dc" />
        <path
          d="M-2.6 -0.4h3M-2.6 0.4h2.4"
          stroke="#c9a46a"
          strokeWidth="0.3"
        />
      </g>
      <path
        className="island__sparkle"
        d="M5 -6l.6 1.6l1.6 .6l-1.6 .6l-.6 1.6l-.6 -1.6l-1.6 -.6l1.6 -.6z"
        fill="#fff6c9"
      />
    </g>
  );
}

/** A string of little flags from one point to another, sagging a little. */
export function Bunting({
  from,
  to,
  colors,
}: {
  from: [number, number];
  to: [number, number];
  colors: string[];
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 + 8;
  const count = Math.max(4, Math.round((x2 - x1) / 7));
  const flags = Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count;
    const x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2;
    const y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2;
    return { key: t, x, y, fill: colors[i % colors.length] };
  });
  return (
    <g>
      <path
        d={`M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`}
        stroke="#5b4636"
        strokeWidth="0.4"
      />
      {flags.map((f) => (
        <path
          key={f.key}
          d={`M${f.x - 2} ${f.y}h4l-2 4z`}
          fill={f.fill}
          stroke="#00000022"
          strokeWidth="0.2"
        />
      ))}
    </g>
  );
}

/** Panjat pinang: the greased pole of Independence Day, prizes on top. */
export function GreasedPole() {
  const prizes = [
    { x: -5, fill: "#e8553f" },
    { x: -2, fill: "#2f8fd8" },
    { x: 1.4, fill: "#ffc83d" },
    { x: 4.6, fill: "#7cc35a" },
  ];
  return (
    <g>
      <path d="M0 0v-40" stroke="#b08a5a" strokeWidth="1.6" />
      <ellipse cx="0" cy="-36" rx="6" ry="1.4" stroke="#8a5a2b" />
      {prizes.map((p) => (
        <g key={p.x}>
          <path d={`M${p.x} -35.6v2`} stroke="#5b4636" strokeWidth="0.3" />
          <rect x={p.x - 0.8} y="-33.6" width="1.6" height="2" fill={p.fill} />
        </g>
      ))}
      <path d="M0 -40v-6" stroke="#8a8f98" strokeWidth="0.6" />
      <g className="island__flag">
        <rect x="0.3" y="-46" width="5" height="1.6" fill="#e23b3b" />
        <rect x="0.3" y="-44.4" width="5" height="1.6" fill="#ffffff" />
      </g>
    </g>
  );
}

const BALLOONS = [
  { x: 9, y: -16, fill: "#f472b6" },
  { x: 13, y: -21, fill: "#60a5fa" },
  { x: 6, y: -22, fill: "#ffc83d" },
];

/** Kue ulang tahun: a birthday cake on the beach, with balloons. */
export function Cake() {
  return (
    <g>
      {BALLOONS.map((b) => (
        <g key={b.fill}>
          <path
            d={`M${b.x} ${b.y + 3}L4 -4`}
            stroke="#7a7f89"
            strokeWidth="0.3"
          />
          <ellipse
            className="island__float"
            cx={b.x}
            cy={b.y}
            rx="2.2"
            ry="2.8"
            fill={b.fill}
          />
        </g>
      ))}
      <rect x="-5" y="-5" width="10" height="5" rx="1" fill="#f9c6d6" />
      <rect x="-3.4" y="-8.6" width="6.8" height="3.8" rx="1" fill="#fff4f7" />
      <path
        d="M-5 -3.6c1.6 1 3.4 1 5 0s3.4 -1 5 0"
        stroke="#ffffff"
        strokeWidth="0.7"
      />
      {[-2, 0, 2].map((x) => (
        <g key={x} transform={`translate(${x} 0)`}>
          <rect x="-0.3" y="-11" width="0.6" height="2.4" fill="#60a5fa" />
          <path
            className="island__candle"
            d="M0 -11.4c-.6 -.6 -.4 -1.4 0 -1.8c.4 .4 .6 1.2 0 1.8z"
            fill="#ffc83d"
          />
        </g>
      ))}
    </g>
  );
}

/** Pura: a split temple gate (candi bentar), in grey volcanic stone. */
export function Temple() {
  return (
    <g>
      <rect x="-7.4" y="-1.2" width="14.8" height="1.4" fill="#7d6f63" />
      <path
        d="M-1 0V-14L-2 -13V-11L-3 -10V-8L-4 -7V-5L-5.6 -4V0z"
        fill="#9a8b7d"
      />
      <path d="M1 0V-14L2 -13V-11L3 -10V-8L4 -7V-5L5.6 -4V0z" fill="#8c7d70" />
      <path
        d="M-4.4 -2.4h2.6M1.8 -2.4h2.6M-3 -6h1.6M1.4 -6h1.6"
        stroke="#6e6157"
        strokeWidth="0.4"
      />
    </g>
  );
}

/** Where the trees grow on the island across, back to front. */
export const FAR_SLOTS: [number, number][] = [
  [356, 141],
  [378, 140],
  [345, 144],
  [366, 144],
  [389, 143],
  [336, 147],
  [355, 147],
  [375, 147],
  [396, 146],
  [327, 151],
  [346, 151],
  [364, 151],
  [384, 151],
  [337, 154],
  [372, 154],
  [392, 154],
];

/** Pulau seberang: the island across the water, on the horizon. */
export function FarIsland({ temple }: { temple: boolean }) {
  return (
    <g>
      <path
        d="M316 157C330 146 348 137 368 136C386 135 400 141 412 149V157z"
        fill="#8fc78a"
      />
      <path d="M309 157C332 153 384 152 412 154V158H309z" fill="#ead6aa" />
      <g transform="translate(326 156) scale(0.42)">
        <Palm />
      </g>
      <g transform="translate(404 154) scale(-0.38 0.38)">
        <Palm />
      </g>
      {temple && (
        <g transform="translate(372 137)">
          <Temple />
        </g>
      )}
    </g>
  );
}

/** Pohon emas: the golden tree that grows when the secret is solved. */
export function GoldenTree() {
  return (
    <g>
      <path d="M0 0v-8" stroke="#8a5a2b" strokeWidth="1.6" />
      <g className="island__glow">
        <circle cx="0" cy="-12" r="6" fill="#f5c542" />
        <circle cx="-4" cy="-9" r="3.6" fill="#f0b429" />
        <circle cx="4" cy="-9.4" r="3.6" fill="#ffd95c" />
        <circle cx="1.6" cy="-15" r="2.6" fill="#ffe680" />
      </g>
      <path
        className="island__sparkle"
        d="M7 -16l.5 1.4l1.4 .5l-1.4 .5l-.5 1.4l-.5 -1.4l-1.4 -.5l1.4 -.5z"
        fill="#fffbe0"
      />
    </g>
  );
}

/** A blue glow, where the stranger's lamp has been. */
export function BlueGlow({ gradient }: { gradient: string }) {
  return (
    <g className="island__bluelamp">
      <circle r="7" fill={`url(#${gradient})`} />
      <circle r="1.4" fill="#cfe8ff" />
    </g>
  );
}
