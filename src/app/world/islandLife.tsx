// The island's animals and visitors, each drawn around its own anchor: (0, 0)
// is where it stands (or swims). Island.tsx places them; Island.css makes
// them peck, swish, leap and glide.

const INK = "#2d2a25";

/** Ayam: a rooster, pecking at the ground. */
export function Chicken() {
  return (
    <g className="island__peck">
      <path d="M-1 0v-2M1.2 0v-2" stroke="#e8a33d" strokeWidth="0.7" />
      <path
        d="M-3 -4c-2.4 -.6 -3.4 -3.4 -2.2 -5.6c.4 1.8 1.6 3 3.2 3.6z"
        fill="#2c7f3b"
      />
      <ellipse cx="0" cy="-4" rx="3.6" ry="2.6" fill="#fffaf0" />
      <path
        d="M-1.6 -4.2c1 .9 2.4 1 3.4 .2"
        stroke="#e6dccb"
        strokeWidth="0.6"
      />
      <circle cx="2.9" cy="-6.6" r="1.7" fill="#fffaf0" />
      <path
        d="M2 -8.1c.3 -1 1.1 -1.1 1.4 -.2c.5 -.8 1.3 -.5 1.1 .5z"
        fill="#e8553f"
      />
      <path d="M4.5 -6.8l1.5 .5l-1.5 .5z" fill="#f5b83d" />
      <path d="M3.9 -5.6c.3 .8 .1 1.4 -.4 1.6" stroke="#e8553f" />
      <circle cx="3.4" cy="-7" r="0.35" fill={INK} />
    </g>
  );
}

/** Kucing: a ginger cat sitting by the food stall, swishing its tail. */
export function Cat() {
  return (
    <g>
      <path
        className="island__swish"
        d="M2 -1c3 .4 4.4 -1.6 3.6 -4.2"
        stroke="#e8902f"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M-2.8 0c-.4 -3 .2 -5.6 2.8 -6c2.6 .4 3.2 3 2.8 6z"
        fill="#f2a03d"
      />
      <circle cx="0" cy="-7" r="2.3" fill="#f2a03d" />
      <path
        d="M-2 -8.4l-.4 -2.4l1.8 1.4zM2 -8.4l.4 -2.4l-1.8 1.4z"
        fill="#f2a03d"
      />
      <path
        d="M-1.6 -3.6h3.2M-1.2 -2.2h2.4"
        stroke="#d9822a"
        strokeWidth="0.5"
      />
      <circle cx="-0.8" cy="-7.2" r="0.32" fill={INK} />
      <circle cx="0.8" cy="-7.2" r="0.32" fill={INK} />
      <path d="M-0.3 -6.4h.6l-.3 .4z" fill="#e87a7a" />
    </g>
  );
}

const BUTTERFLIES = [
  { x: -6, y: -12, color: "#ffc83d", delay: "0s" },
  { x: 4, y: -16, color: "#f472b6", delay: "-2.4s" },
  { x: 11, y: -9, color: "#60a5fa", delay: "-4.8s" },
];

/** Kupu-kupu: butterflies over the garden. */
export function Butterflies() {
  return (
    <g>
      {BUTTERFLIES.map((b) => (
        <g key={b.color} transform={`translate(${b.x} ${b.y})`}>
          <g className="island__flutter" style={{ animationDelay: b.delay }}>
            <g className="island__flap">
              <path
                d="M0 0c-1.6 -1.8 -3 -1.2 -2.6 .2c-.8 .4 -.8 1.6 .4 1.4z"
                fill={b.color}
              />
              <path
                d="M0 0c1.6 -1.8 3 -1.2 2.6 .2c.8 .4 .8 1.6 -.4 1.4z"
                fill={b.color}
              />
            </g>
          </g>
        </g>
      ))}
    </g>
  );
}

/** Kambing: a goat on the hill, grazing. */
export function Goat() {
  return (
    <g>
      <path
        d="M-3.4 0v-3.4M-1.8 0v-3.4M2 0v-3.4M3.4 0v-3.4"
        stroke="#8a8378"
        strokeWidth="0.9"
      />
      <ellipse cx="0" cy="-4.6" rx="4.6" ry="2.5" fill="#f4f1ea" />
      <path d="M-4.4 -5.4l-1.4 -1.4" stroke="#f4f1ea" strokeLinecap="round" />
      <g className="island__graze">
        <path
          d="M3.4 -5.6l1.6 -2.6"
          stroke="#f4f1ea"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="5.8" cy="-8.4" rx="1.9" ry="1.3" fill="#f4f1ea" />
        <path d="M5 -9.4c-.6 -1.6 -2 -2.2 -3 -1.8" stroke="#9c8f83" />
        <path d="M7 -7.4l.2 1.6" stroke="#d8d0c2" strokeWidth="0.7" />
        <circle cx="6.1" cy="-8.8" r="0.3" fill={INK} />
      </g>
    </g>
  );
}

/** Kerbau: a water buffalo by the rice terraces. */
export function Buffalo() {
  return (
    <g>
      <path
        d="M-4 0v-4M-2 0v-4M3 0v-4M5 0v-4"
        stroke="#4a4e57"
        strokeWidth="1.3"
      />
      <ellipse cx="0.6" cy="-5.4" rx="5.6" ry="3.2" fill="#5b5f68" />
      <path
        className="island__swish"
        d="M6 -6c1.4 1 1.6 3 1 4.4"
        stroke="#5b5f68"
        strokeWidth="0.8"
      />
      <ellipse cx="-5.4" cy="-6.2" rx="2.4" ry="1.9" fill="#5b5f68" />
      <path
        d="M-6.8 -7.4c-2.6 -.4 -3.8 -2.2 -3.2 -3.8M-4 -7.6c2 -.8 2.6 -2.6 1.8 -3.8"
        stroke="#ece6da"
        strokeLinecap="round"
      />
      <circle cx="-6.2" cy="-6.6" r="0.35" fill="#1d1b17" />
      <ellipse cx="-7.2" cy="-5.4" rx="0.9" ry="0.6" fill="#7a7e88" />
    </g>
  );
}

/** Ikan: a fish leaping out of the sea now and then. */
export function JumpingFish() {
  return (
    <g>
      <g className="island__jump">
        <path
          d="M-3 0c1.6 -1.8 4 -1.8 5.4 0c-1.4 1.8 -3.8 1.8 -5.4 0z"
          fill="#f6a03a"
        />
        <path d="M-3 0l-2 -1.6v3.2z" fill="#e8832a" />
        <circle cx="1.4" cy="-0.3" r="0.3" fill={INK} />
      </g>
      <ellipse
        className="island__splash"
        cx="0"
        cy="1"
        rx="4"
        ry="0.9"
        stroke="#e9f9ff"
        strokeWidth="0.6"
        fill="none"
      />
    </g>
  );
}

/** Monyet: a monkey swinging from a branch. */
export function Monkey() {
  return (
    <g>
      <path
        d="M-6 -16h12"
        stroke="#6b4220"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <g className="island__swing">
        <path d="M0 -16l.6 3.6" stroke="#8a5a2b" strokeWidth="1.1" />
        <ellipse cx="0.6" cy="-9.2" rx="2" ry="2.8" fill="#8a5a2b" />
        <circle cx="-1.2" cy="-12.4" r="1.9" fill="#8a5a2b" />
        <ellipse cx="-1.4" cy="-12" rx="1.2" ry="1" fill="#e8c39e" />
        <path
          d="M-0.4 -6.8l-.8 2.2M1.6 -6.8l.6 2.2"
          stroke="#8a5a2b"
          strokeWidth="0.9"
        />
        <path d="M2.4 -8c3 0 3.6 3 1.6 4" stroke="#8a5a2b" strokeWidth="0.7" />
        <circle cx="-1.8" cy="-12.4" r="0.28" fill={INK} />
      </g>
    </g>
  );
}

/** Burung kakatua: a white cockatoo with a yellow crest. */
export function Cockatoo() {
  return (
    <g className="island__tilt">
      <path d="M-1.4 -1.6l-1 2" stroke="#e9e4dc" strokeWidth="1.2" />
      <ellipse cx="0" cy="-3.2" rx="1.8" ry="3" fill="#fbfaf6" />
      <circle cx="0.4" cy="-6.6" r="1.6" fill="#fbfaf6" />
      <path
        d="M-0.4 -7.8l-1.4 -2.6l1.6 1.2l.2 -2.4l.8 2.2l1 -1.8l-.2 2.6z"
        fill="#ffd84d"
      />
      <path d="M1.8 -6.6c.8 .2 1 1 .4 1.4l-.8 -.4z" fill="#3b3b44" />
      <circle cx="0.8" cy="-7" r="0.3" fill="#1d1b17" />
    </g>
  );
}

/** Rusa: a deer come out of the forest. */
export function Deer() {
  return (
    <g>
      <path
        d="M-3.6 0v-4.6M-2.2 0v-4.6M2.6 0v-4.6M3.8 0v-4.6"
        stroke="#9a5c2a"
        strokeWidth="0.8"
      />
      <ellipse cx="0" cy="-5.6" rx="4.6" ry="2.3" fill="#c27a3a" />
      <path d="M-4.4 -6.6l-.8 -1" stroke="#c27a3a" />
      <path
        d="M3.2 -6.8l1.8 -3.6"
        stroke="#c27a3a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="5.8" cy="-10.6" rx="1.8" ry="1.1" fill="#c27a3a" />
      <path
        d="M5 -11.6l-1 -3.2M4.4 -13.6l-1.4 -.6M5.8 -11.6l.6 -3M6.2 -13.6l1.2 -.8"
        stroke="#8a5a2b"
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <path d="M4.6 -11.4l-1.2 -.4" stroke="#c27a3a" strokeWidth="0.8" />
      <circle cx="6.2" cy="-10.9" r="0.3" fill="#1d1b17" />
    </g>
  );
}

/** Gajah: a Sumatran elephant, swinging its trunk. */
export function Elephant() {
  return (
    <g>
      <rect x="-5.6" y="-5" width="2.6" height="5" rx="1" fill="#7e838c" />
      <rect x="-1.8" y="-5" width="2.6" height="5" rx="1" fill="#8f949c" />
      <rect x="2.4" y="-5" width="2.6" height="5" rx="1" fill="#7e838c" />
      <ellipse cx="0" cy="-7.6" rx="6.6" ry="4.6" fill="#8f949c" />
      <path d="M-6.4 -8.6c-1.2 .6 -1.6 2 -1 3" stroke="#8f949c" />
      <circle cx="6.2" cy="-9.4" r="3.6" fill="#8f949c" />
      <path
        d="M4.2 -11.8c-2.6 -.6 -3.8 2 -2.8 4.6c1.2 1.2 3 .6 3.4 -1z"
        fill="#a3a8b0"
      />
      <path
        className="island__trunk"
        d="M9 -8.6c1.6 1.4 1.8 4.4 .6 6.6"
        stroke="#8f949c"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="7.4" cy="-10.4" r="0.4" fill="#1d1b17" />
      <path
        d="M8.6 -7.6l1.4 .6"
        stroke="#fffaf0"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Orangutan: sitting high in the trees. */
export function Orangutan() {
  return (
    <g>
      <path
        d="M-3 -3c-2 -1 -3 -4 -2.4 -7"
        stroke="#b5532a"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <ellipse cx="0" cy="-3.4" rx="3" ry="3.4" fill="#c4562d" />
      <circle cx="0" cy="-8" r="2.4" fill="#c4562d" />
      <ellipse cx="0" cy="-7.6" rx="1.6" ry="1.3" fill="#e8b48a" />
      <circle cx="-0.6" cy="-8" r="0.3" fill={INK} />
      <circle cx="0.6" cy="-8" r="0.3" fill={INK} />
      <path
        d="M2.6 -2.6c2 .4 3.4 -.6 3.8 -2.4"
        stroke="#b5532a"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </g>
  );
}

function Dolphin() {
  return (
    <g>
      <path
        d="M-6 1c2 -5 8 -6 12 -2c-2 -.6 -4 -.4 -5 .6c-2 -.2 -4 .2 -7 1.4z"
        fill="#6f8fb0"
      />
      <path d="M-0.6 -3.4l1.6 -2.4l.6 2.2z" fill="#5b7a9a" />
      <path d="M-6 1l-2.4 -1.4l.6 2.6z" fill="#5b7a9a" />
      <circle cx="4.4" cy="-1.6" r="0.35" fill="#1d1b17" />
    </g>
  );
}

/** Lumba-lumba: two dolphins leaping, one after the other. */
export function Dolphins() {
  return (
    <g>
      <g className="island__leap">
        <Dolphin />
      </g>
      <g transform="translate(16 3)">
        <g className="island__leap" style={{ animationDelay: "-1.4s" }}>
          <Dolphin />
        </g>
      </g>
    </g>
  );
}

const SAIL = "#f6efe0";
const SAIL_EDGE = "#d9cdb8";

/** Kapal pinisi: a Bugis schooner with its many sails. */
export function Pinisi() {
  return (
    <g className="island__bob">
      <path d="M-32 -12l8 4" stroke="#4a2c12" strokeWidth="0.8" />
      <path d="M-24 -8c6 1 38 1 46 -2l-4 9h-38z" fill="#6b3e1a" />
      <path d="M-22 -5h38" stroke="#c98d52" strokeWidth="0.8" />
      <path d="M-8 -8v-27M8 -8v-23" stroke="#4a2c12" />
      <path
        d="M-8.6 -33L-31 -12h22zM-9 -25L-22 -12h13z"
        fill={SAIL}
        stroke={SAIL_EDGE}
        strokeWidth="0.4"
      />
      <path
        d="M-7.4 -32L5 -26v15l-12.4 1zM8.6 -29L18 -22v11h-9.4z"
        fill={SAIL}
        stroke={SAIL_EDGE}
        strokeWidth="0.4"
      />
      <g className="island__flag">
        <rect x="-8" y="-38" width="5" height="1.6" fill="#e23b3b" />
        <rect x="-8" y="-36.4" width="5" height="1.6" fill="#ffffff" />
      </g>
    </g>
  );
}

/** Penyu: a sea turtle on the beach, crawling slowly. */
export function Turtle() {
  return (
    <g className="island__crawl">
      <path
        d="M2.6 -0.4l2 1.2M-2.6 -0.4l-2 1.2M2 -2.8l2 -1.2M-2 -2.8l-2 -1.2"
        stroke="#8fb98a"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <ellipse cx="0" cy="-1.6" rx="4.4" ry="2.4" fill="#3f8f5a" />
      <path
        d="M-2 -3.2l1.4 1.4l-1.4 1.6M1 -3.4l1.2 1.6l-1.2 1.6"
        stroke="#2d6b42"
        strokeWidth="0.5"
      />
      <ellipse cx="5" cy="-1.4" rx="1.4" ry="1" fill="#8fb98a" />
      <circle cx="5.6" cy="-1.6" r="0.25" fill="#1d1b17" />
    </g>
  );
}

/** Bintang jatuh: a shooting star streaking across the night sky. */
export function ShootingStar() {
  return (
    <g className="island__shoot">
      <path
        d="M0 0L-24 -8"
        stroke="#fff6c9"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M0 0L-12 -4"
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle r="1.3" fill="#ffffff" />
    </g>
  );
}

/** Paus: a whale's back in the distance, spouting. */
export function Whale() {
  return (
    <g>
      <path d="M-14 0c3 -6 13 -8 22 -4c3 1.6 5 3 6 4z" fill="#3d5a7a" />
      <path d="M-14 0c-2 -3 -5 -4 -7 -3c2 1 3 2 4 3z" fill="#34506e" />
      <g className="island__spout">
        <path
          d="M2 -6c-1 -3 -3 -5 -5 -6M2 -6c0 -3 0 -5 0 -7M2 -6c1 -3 3 -5 5 -6"
          stroke="#e9f9ff"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

/** Komodo: a dragon from Komodo Island, flicking its tongue. */
export function Komodo() {
  return (
    <g className="island__crawl">
      <path
        d="M-2 -1l-1.4 1.4M3 -1l1.4 1.4M-4.6 -1l-1 1.4M5.4 -1.2l1 1.4"
        stroke="#5b5f3e"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M-12 -0.4c3 -.4 5 -1 8 -2c3 -1 7 -1.2 10 -.4c1.4 .4 2.4 .4 3.4 .2c-.6 1 -2 1.6 -3.6 1.6c-3 .4 -7 .6 -10 .6c-3 0 -5 .2 -7.8 0z"
        fill="#6b6f4a"
      />
      <circle cx="7.6" cy="-2.2" r="0.3" fill="#1d1b17" />
      <path
        className="island__tongue"
        d="M9.6 -1.4l1.8 .2M11.4 -1.2l.6 -.5M11.4 -1.2l.6 .4"
        stroke="#e8553f"
        strokeWidth="0.4"
      />
    </g>
  );
}

/** Burung cendrawasih: a bird of paradise gliding by, golden plumes. */
export function BirdOfParadise() {
  return (
    <g className="island__glide">
      <path d="M-2 0c-4 2 -8 6 -14 7c4 -2 8 -5 12 -8z" fill="#ffcf5c" />
      <path
        d="M-2 0c-5 4 -9 9 -15 11c5 -3 9 -7 13 -11z"
        fill="#ffe08a"
        opacity="0.8"
      />
      <ellipse cx="0" cy="-0.6" rx="2.6" ry="1.5" fill="#7a2e1d" />
      <circle cx="2.4" cy="-1.8" r="1.2" fill="#ffd84d" />
      <path d="M3.4 -1.8l1.2 .3l-1.2 .4z" fill="#9aa3ad" />
      <path
        className="island__wingbeat"
        d="M-0.8 -1.4c-1 -3 1 -5 3 -5.4c-1 1.6 -1.4 3.4 -1 5z"
        fill="#5b2416"
      />
    </g>
  );
}

/** Orang asing: a hooded stranger with a blue lamp, on dark evenings. */
export function Stranger({ glow }: { glow: string }) {
  return (
    <g>
      <circle cx="4.4" cy="-4.6" r="7" fill={`url(#${glow})`} />
      <path d="M-3 0c0 -5 1 -9 3 -11c2 2 3 6 3 11z" fill="#2b3040" />
      <path
        d="M-1.8 -10.4c.6 -2.4 3 -2.4 3.6 0c-.6 .6 -3 .6 -3.6 0z"
        fill="#22262f"
      />
      <path d="M2.6 -6l1.6 1" stroke="#5b5f68" strokeWidth="0.5" />
      <rect
        className="island__bluelamp"
        x="3.6"
        y="-5.6"
        width="1.6"
        height="2.2"
        rx="0.4"
        fill="#9fd0ff"
      />
    </g>
  );
}
