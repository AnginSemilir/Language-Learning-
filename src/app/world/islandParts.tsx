// The pieces of the island, each drawn around its own anchor: (0, 0) is
// where it stands on the ground. Island.tsx places them; Island.css moves
// them (waves, flags, smoke, the Ferris wheel).

const WOOD = "#8a5a2b";
const WOOD_DARK = "#6b4220";
const ROOF = "#c4553b";
const ROOF_DARK = "#9c3f2b";
const WALL = "#f3dcae";
const WALL_EDGE = "#c99a5e";
const LEAF = "#3fa34d";
const LEAF_DARK = "#2c7f3b";

/** The point at an angle (degrees) and distance from the anchor. */
function xy(angle: number, r: number): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [
    Math.round(r * Math.cos(rad) * 100) / 100,
    Math.round(r * Math.sin(rad) * 100) / 100,
  ];
}

/** A window that lights up at night. */
function Window({ x, y }: { x: number; y: number }) {
  return (
    <rect
      className="island__window"
      x={x}
      y={y}
      width="4"
      height="4"
      rx="0.6"
    />
  );
}

/** Rumah panggung: a wooden house on stilts. */
export function House() {
  return (
    <g>
      <path d="M-13 0v-9M-5 0v-9M5 0v-9M13 0v-9" stroke={WOOD_DARK} />
      <path d="M-17 -2l6 -7" stroke={WOOD} strokeWidth="1.2" />
      <rect x="-15" y="-23" width="30" height="14" fill={WALL} rx="1" />
      <path d="M-15 -9h30" stroke={WALL_EDGE} />
      <rect x="-3" y="-19" width="6" height="10" fill={WOOD} rx="0.8" />
      <Window x={-11} y={-19} />
      <Window x={7} y={-19} />
      <path d="M-20 -22L0 -38l20 16z" fill={ROOF} />
      <path d="M-20 -22L0 -38" stroke={ROOF_DARK} strokeWidth="1.4" />
      <path
        d="M-6 -33l-3 -6M6 -33l3 -6"
        stroke={ROOF_DARK}
        strokeWidth="1.6"
      />
    </g>
  );
}

/** Kebun: a vegetable garden with a little fence. */
export function Garden() {
  return (
    <g>
      <ellipse cx="0" cy="-3" rx="15" ry="4.5" fill="#8b5a33" />
      <path d="M-11 -4h22M-9 -1h18" stroke="#6e4426" strokeWidth="0.8" />
      {[-9, -4, 1, 6, 11].map((x) => (
        <g key={x} transform={`translate(${x} -5)`}>
          <path d="M0 0c-2 -2 -2 -4 0 -5c2 1 2 3 0 5z" fill="#6cc04a" />
          <circle cx="1.6" cy="-1.4" r="1" fill="#e8553f" />
        </g>
      ))}
      <path
        d="M-16 0v-6M-12 0v-6M12 0v-6M16 0v-6M-17 -4h7M10 -4h7"
        stroke="#d8b483"
        strokeWidth="1"
      />
      <g transform="translate(13 -9)">
        <path d="M0 9V0" stroke="#4d8a35" />
        <circle cx="0" cy="-1" r="2.6" fill="#ffc83d" />
        <circle cx="0" cy="-1" r="1" fill="#8a5a2b" />
      </g>
    </g>
  );
}

/** Perahu: an outrigger boat with a sail. */
export function Boat() {
  return (
    <g className="island__bob">
      <path d="M-14 -3h28" stroke={WOOD_DARK} strokeWidth="1" />
      <ellipse cx="-14" cy="-1" rx="4" ry="1.2" fill={WOOD} />
      <ellipse cx="14" cy="-1" rx="4" ry="1.2" fill={WOOD} />
      <path d="M-11 -6h22c-2 5 -6 6 -11 6s-9 -1 -11 -6z" fill="#e2553f" />
      <path d="M-10 -4.5h20" stroke="#fff4e0" strokeWidth="1" />
      <path d="M0 -6v-20" stroke={WOOD_DARK} strokeWidth="1.2" />
      <path d="M1 -25c7 4 10 10 9 17h-9z" fill="#ffe2a8" />
      <path d="M-1 -23c-5 4 -7 9 -6 14h6z" fill="#fff3d6" />
    </g>
  );
}

/** Warung: a food stall, with steam rising from the pot. */
export function FoodStall() {
  const stripes = [0, 1, 2, 3, 4, 5];
  return (
    <g>
      <rect x="-12" y="-12" width="24" height="12" fill="#d99a5b" rx="1" />
      <rect x="-12" y="-12" width="24" height="3" fill="#b9783f" />
      <path d="M-11 -12v-10M11 -12v-10" stroke={WOOD_DARK} />
      {stripes.map((i) => (
        <rect
          key={i}
          x={-14 + (i * 28) / 6}
          y="-26"
          width={28 / 6}
          height="5"
          fill={i % 2 ? "#fff6e6" : "#e8553f"}
        />
      ))}
      <path d="M-14 -21h28" stroke="#b8402f" strokeWidth="0.8" />
      <rect x="-5" y="-16" width="10" height="4" fill="#5b5b66" rx="1.5" />
      <g className="island__steam">
        <path d="M-2 -17c-2 -2 2 -3 0 -5" stroke="#fff" strokeWidth="0.9" />
        <path d="M2 -17c-2 -2 2 -3 0 -5" stroke="#fff" strokeWidth="0.9" />
      </g>
      <circle cx="-16" cy="-3" r="2.4" fill="#c98d52" />
      <circle cx="16" cy="-3" r="2.4" fill="#c98d52" />
    </g>
  );
}

/** Dermaga: a wooden jetty out into the sea (from the beach, going right). */
export function Jetty() {
  const posts = [8, 22, 36, 50];
  return (
    <g>
      {posts.map((x) => (
        <path
          key={x}
          d={`M${x} ${x * 0.2 + 3}v9`}
          stroke={WOOD_DARK}
          strokeWidth="1.6"
        />
      ))}
      <path d="M0 0L58 11.6l-1 3.4L-1 3.4z" fill="#b5834e" />
      <path d="M0 1.6L58 13.2" stroke="#8f6237" strokeWidth="0.6" />
    </g>
  );
}

const TERRACES = [
  { y: -24, w: 18, fill: "#a8dc63" },
  { y: -17, w: 24, fill: "#8fd14f" },
  { y: -10, w: 30, fill: "#77c043" },
  { y: -3, w: 36, fill: "#5fae3b" },
];

/** Sawah: rice terraces stepping down the hill. */
export function RiceTerraces() {
  return (
    <g>
      {TERRACES.map((b) => (
        <g key={b.y}>
          <rect
            x={-b.w / 2}
            y={b.y}
            width={b.w}
            height="6"
            rx="3"
            fill={b.fill}
          />
          <path
            d={`M${-b.w / 2 + 3} ${b.y + 3.5}h${b.w - 6}`}
            stroke="#c8f0ff"
            strokeWidth="0.7"
            opacity="0.8"
          />
        </g>
      ))}
      <path d="M5 -13l3 -2.2l3 2.2z" fill="#e9c77a" />
    </g>
  );
}

const STALLS = [
  { x: -20, color: "#f08c2e", fruit: ["#e8553f", "#ffc83d", "#7cc35a"] },
  { x: 0, color: "#2f8fd8", fruit: ["#ffc83d", "#e8553f", "#f6a03a"] },
  { x: 20, color: "#e2b12f", fruit: ["#7cc35a", "#a855f7", "#e8553f"] },
];

/** Pasar: a market of three stalls with striped awnings. */
export function Market() {
  return (
    <g>
      {STALLS.map((s) => (
        <g key={s.x} transform={`translate(${s.x} 0)`}>
          <path d="M-8 0v-15M8 0v-15" stroke={WOOD_DARK} />
          <rect x="-9" y="-8" width="18" height="8" fill="#c98d52" rx="1" />
          {s.fruit.map((fill, i) => (
            <circle key={fill} cx={-5 + i * 5} cy="-9" r="2" fill={fill} />
          ))}
          <path d="M-10 -15h20l-2 -5h-16z" fill={s.color} />
          <path d="M-5 -20l-1 5M0 -20v5M5 -20l1 5" stroke="#fff" />
        </g>
      ))}
    </g>
  );
}

/** Sekolah: the school, with the red and white flag. */
export function School() {
  const windows = [-12, -5, 5, 12];
  return (
    <g>
      <rect x="-17" y="-16" width="34" height="16" fill="#fbf6ec" rx="1" />
      <path d="M-17 -6h34" stroke="#e0d3bd" />
      {windows.map((x) => (
        <Window key={x} x={x - 2} y={-13} />
      ))}
      <rect x="-3" y="-9" width="6" height="9" fill="#a8693a" rx="0.8" />
      <path d="M-20 -16l20 -10l20 10z" fill={ROOF} />
      <path d="M-20 -16l20 -10l20 10" stroke={ROOF_DARK} fill="none" />
      <path d="M24 0v-34" stroke="#8a8f98" strokeWidth="1" />
      <g className="island__flag">
        <rect x="24.5" y="-34" width="11" height="3.5" fill="#e23b3b" />
        <rect x="24.5" y="-30.5" width="11" height="3.5" fill="#ffffff" />
      </g>
    </g>
  );
}

/** Mercusuar: a lighthouse on the rocks, its light sweeping at night. */
export function Lighthouse({ lit, beam }: { lit: boolean; beam: string }) {
  return (
    <g>
      <ellipse cx="0" cy="-1" rx="13" ry="4" fill="#8f8a82" />
      <ellipse cx="-5" cy="-2" rx="5" ry="3" fill="#a7a197" />
      {lit && (
        <path
          className="island__beam"
          d="M0 -37L-60 -48v22z"
          fill={`url(#${beam})`}
        />
      )}
      <path d="M-6 -3l2 -30h8l2 30z" fill="#fffaf2" />
      <path d="M-5.6 -9h11.2l-.5 -6h-10.2z" fill="#e2553f" />
      <path d="M-4.6 -21h9.2l-.4 -6h-8.4z" fill="#e2553f" />
      <rect x="-5" y="-38" width="10" height="5" fill="#33363d" rx="1" />
      <rect
        className="island__lamp"
        x="-3.2"
        y="-37.2"
        width="6.4"
        height="3.4"
        rx="0.8"
      />
      <path d="M-6 -38h12l-6 -5z" fill="#e2553f" />
    </g>
  );
}

/** Gunung: a volcano behind the island, with a puff of smoke. */
export function Mountain({
  fill,
  waterfall,
}: {
  fill: string;
  waterfall: boolean;
}) {
  return (
    <g>
      <path d="M-90 0L-14 -92c8 -7 20 -7 28 0L96 0z" fill={fill} />
      <path
        d="M-14 -92c8 -7 20 -7 28 0l-6 10c-5 -3 -11 -3 -16 0z"
        fill="#7a6d63"
      />
      <path d="M-30 -60l9 4l7 -7l8 5l9 -4" stroke="#ffffff" opacity="0.35" />
      <g className="island__smoke">
        <circle cx="0" cy="-100" r="5" fill="#e9e4dc" opacity="0.8" />
        <circle cx="6" cy="-108" r="6" fill="#efebe5" opacity="0.6" />
        <circle cx="13" cy="-117" r="7" fill="#f4f1ec" opacity="0.4" />
      </g>
      {waterfall && (
        <g>
          <path
            d="M22 -60c-2 18 2 34 6 60h8c-4 -26 -7 -42 -5 -60z"
            fill="#8fd8f5"
          />
          <path
            className="island__falls"
            d="M25 -58c-1 18 2 34 6 58M29 -58c-1 18 2 34 6 58"
            stroke="#e9f9ff"
            strokeWidth="1"
            strokeDasharray="4 5"
          />
          <ellipse cx="32" cy="0" rx="9" ry="3" fill="#e9f9ff" />
        </g>
      )}
    </g>
  );
}

const CARS = [0, 45, 90, 135, 180, 225, 270, 315];
const CAR_COLORS = ["#e8553f", "#ffc83d", "#2f8fd8", "#7cc35a"];

/** Bianglala: a Ferris wheel, turning slowly. */
export function FerrisWheel() {
  return (
    <g>
      <path d="M-12 0L0 -26L12 0" stroke="#7a7f89" strokeWidth="1.6" />
      <g transform="translate(0 -26)">
        <g className="island__wheel">
          <circle r="20" stroke="#c9ced8" strokeWidth="1.2" fill="none" />
          {CARS.map((angle) => {
            const [x, y] = xy(angle, 20);
            return (
              <path
                key={angle}
                d={`M0 0L${x} ${y}`}
                stroke="#c9ced8"
                strokeWidth="0.6"
              />
            );
          })}
          {CARS.map((angle, i) => {
            const [x, y] = xy(angle, 20);
            const fill = CAR_COLORS[i % CAR_COLORS.length];
            return <circle key={angle} cx={x} cy={y} r="3" fill={fill} />;
          })}
          <circle r="2.5" fill="#7a7f89" />
        </g>
      </g>
    </g>
  );
}

/** Balon udara: a hot-air balloon drifting over the island. */
export function Balloon() {
  return (
    <g className="island__float">
      <path
        d="M0 -40c-12 0 -18 9 -18 18c0 10 12 18 18 26c6 -8 18 -16 18 -26c0 -9 -6 -18 -18 -18z"
        fill="#e8553f"
      />
      <path
        d="M0 -40c-5 0 -8 9 -8 18c0 10 5 18 8 26c3 -8 8 -16 8 -26c0 -9 -3 -18 -8 -18z"
        fill="#ffc83d"
      />
      <path d="M-6 4l2 6M6 4l-2 6" stroke={WOOD_DARK} strokeWidth="0.6" />
      <rect x="-4" y="9" width="8" height="5" fill={WOOD} rx="1" />
    </g>
  );
}

const RAINBOW = ["#ef4444", "#f97316", "#facc15", "#4ade80", "#38bdf8"];

/** An arc of the rainbow, `i` bands in from the outside. */
function rainbowArc(i: number) {
  const rx = 120 - i * 5;
  const ry = 110 - i * 5;
  return `M${-rx} 0a${rx} ${ry} 0 0 1 ${rx * 2} 0`;
}

/** Pelangi: a rainbow behind everything. */
export function Rainbow() {
  return (
    <g opacity="0.5">
      {RAINBOW.map((stroke, i) => (
        <path
          key={stroke}
          d={rainbowArc(i)}
          stroke={stroke}
          strokeWidth="5"
          fill="none"
        />
      ))}
    </g>
  );
}

const BURSTS = [
  { x: 118, y: 46, color: "#ffc83d", delay: "0s" },
  { x: 250, y: 34, color: "#f472b6", delay: "0.8s" },
  { x: 330, y: 66, color: "#60a5fa", delay: "1.6s" },
];
const RAYS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

/** A ray of a firework, from 4 to 12 units out. */
function ray(angle: number) {
  const [x1, y1] = xy(angle, 4);
  const [x2, y2] = xy(angle, 12);
  return `M${x1} ${y1}L${x2} ${y2}`;
}

/** Kembang api: fireworks, for nights and days with all quests done. */
export function Fireworks() {
  return (
    <g>
      {BURSTS.map((b) => (
        <g key={b.x} transform={`translate(${b.x} ${b.y})`}>
          <g className="island__burst" style={{ animationDelay: b.delay }}>
            {RAYS.map((angle) => (
              <path
                key={angle}
                d={ray(angle)}
                stroke={b.color}
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            ))}
          </g>
        </g>
      ))}
    </g>
  );
}

/** A coconut palm on the beach. */
export function Palm() {
  return (
    <g>
      <path d="M0 0c1 -10 3 -20 9 -30" stroke={WOOD} strokeWidth="3" />
      <g transform="translate(9 -30)">
        <g className="island__fronds">
          <path d="M0 0c-6 -6 -14 -5 -18 1c6 -3 12 -3 18 -1z" fill={LEAF} />
          <path
            d="M0 0c-3 -8 -10 -11 -15 -9c6 1 11 4 15 9z"
            fill={LEAF_DARK}
          />
          <path d="M0 0c3 -8 10 -11 16 -8c-7 0 -12 3 -16 8z" fill={LEAF} />
          <path
            d="M0 0c6 -5 14 -3 17 3c-6 -3 -12 -3 -17 -3z"
            fill={LEAF_DARK}
          />
          <path d="M0 0c1 -6 0 -11 -3 -14c1 5 2 9 3 14z" fill="#56b65b" />
          <circle cx="-1.5" cy="2" r="1.8" fill="#7a4b1f" />
          <circle cx="1.5" cy="2.4" r="1.8" fill="#6b3e1a" />
        </g>
      </g>
    </g>
  );
}

/** The campfire: burning on days you study, a wisp of smoke otherwise. */
export function Campfire({ lit }: { lit: boolean }) {
  return (
    <g>
      <ellipse cx="0" cy="-0.5" rx="9" ry="2.4" fill="#000" opacity="0.12" />
      <path
        d="M-7 -1l14 -4M-7 -5l14 4"
        stroke={WOOD_DARK}
        strokeWidth="2.4"
      />
      {lit ? (
        <g className="island__flame">
          <path
            d="M0 -4c-5 -2 -6 -8 -2 -13c0 4 3 4 3 7c2 -2 1 -5 0 -7c5 3 6 9 2 13z"
            fill="#ff8a3d"
          />
          <path
            d="M0 -4c-3 -1 -3 -5 -1 -8c0 3 2 3 2 5c1 -1 1 -3 1 -4c2 2 3 6 1 7z"
            fill="#ffd24d"
          />
        </g>
      ) : (
        <path
          className="island__wisp"
          d="M0 -5c-3 -3 3 -5 0 -8c-3 -3 2 -5 0 -8"
          stroke="#b9b4ac"
          strokeWidth="1"
          fill="none"
        />
      )}
    </g>
  );
}

const SKIN = ["#f2c7a0", "#d9a074", "#a86b45", "#7b4a2c"];
const SHIRT = ["#2f8fd8", "#e8553f", "#7cc35a", "#ffc83d", "#a855f7"];

/** A villager walking along the beach. */
export function Villager({ index }: { index: number }) {
  const walk = {
    animationDuration: `${14 + index * 3}s`,
    animationDelay: `${-index * 4}s`,
  };
  return (
    <g className="island__walker" style={walk}>
      <g className="island__step">
        <path d="M-1.4 0v-4M1.4 0v-4" stroke="#3b3b44" strokeWidth="1.2" />
        <rect
          x="-2.6"
          y="-9.5"
          width="5.2"
          height="6"
          rx="2"
          fill={SHIRT[index % SHIRT.length]}
        />
        <circle cx="0" cy="-12" r="2.4" fill={SKIN[index % SKIN.length]} />
      </g>
    </g>
  );
}

/** Birds over the island, for days with all quests done. */
export function Birds() {
  return (
    <g className="island__birds" stroke="#3b3f4a" strokeWidth="1" fill="none">
      <path d="M0 0c2 -2 4 -2 5 0c1 -2 3 -2 5 0" />
      <path d="M16 -8c1.6 -1.6 3.2 -1.6 4 0c.8 -1.6 2.4 -1.6 4 0" />
      <path d="M30 4c1.4 -1.4 2.8 -1.4 3.5 0c.7 -1.4 2.1 -1.4 3.5 0" />
    </g>
  );
}
