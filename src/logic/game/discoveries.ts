// What turns up on Pulau Kata as you go: animals that come to live there at
// milestones, visitors on lucky days, proverbs in bottles washed up on the
// beach, celebrations, and a postcard from the village at every level. All
// of it is worked out from your history (see journey.ts), so it's the same
// on every device; only which ones you've already been shown is stored.

import { BUILDINGS } from "./buildings";
import {
  CELEBRATIONS,
  type Season,
  type Weather,
  celebrationOn,
  eventsFor,
  mistFor,
  seasonOf,
  weatherFor,
} from "./calendar";
import { type JourneyDay, chance } from "./journey";

export type DiscoveryKind =
  | "level"
  | "animal"
  | "visitor"
  | "proverb"
  | "celebration"
  | "story";

export interface Discovery {
  id: string;
  kind: DiscoveryKind;
  /** Its name in Indonesian, and in English. */
  word: string;
  meaning: string;
  /** A sentence about it in Indonesian, and the translation. */
  line: string;
  lineEn: string;
  /** How to find it, shown while it's still a mystery. */
  hint: string;
}

export interface Found extends Discovery {
  /** The day it was found, when that's known. */
  date: string | null;
}

/** What the island knows now that the history doesn't say day by day. */
export interface IslandNow {
  /** Words at each growth stage, seed (0) to grand oak (4). */
  forest: Record<0 | 1 | 2 | 3 | 4, number>;
  knownWords: number;
}

interface Animal extends Discovery {
  /** Met on a day of the history… */
  reached?: (day: JourneyDay) => boolean;
  /** …or only known now (the forest has no history). */
  now?: (island: IslandNow) => boolean;
}

const animal = (a: Omit<Animal, "kind">): Animal => ({ ...a, kind: "animal" });

export const ANIMALS: Animal[] = [
  animal({
    id: "ayam",
    word: "ayam",
    meaning: "chicken",
    line: "Kukuruyuk! Ayam jantan membangunkan desa setiap pagi.",
    lineEn: "Cock-a-doodle-doo! The rooster wakes the village every morning.",
    hint: "Comes on your first day of study.",
    reached: (d) => d.totals.activeDays >= 1,
  }),
  animal({
    id: "kucing",
    word: "kucing",
    meaning: "cat",
    line: "Seekor kucing tidur di depan warung. Dia suka ikan.",
    lineEn: "A cat sleeps in front of the food stall. It likes fish.",
    hint: "Study three days in a row.",
    reached: (d) => d.longestStreak >= 3,
  }),
  animal({
    id: "kupu-kupu",
    word: "kupu-kupu",
    meaning: "butterflies",
    line: "Kupu-kupu menari di atas kebun.",
    lineEn: "Butterflies dance above the garden.",
    hint: "Have a garden, and finish all three quests on three days.",
    reached: (d) => d.level >= 3 && d.totals.questDays >= 3,
  }),
  animal({
    id: "kambing",
    word: "kambing",
    meaning: "goat",
    line: "Mbeek! Kambing makan rumput di bukit.",
    lineEn: "Baa! The goat is eating grass on the hill.",
    hint: "Answer 250 flashcards.",
    reached: (d) => d.totals.reviews >= 250,
  }),
  animal({
    id: "kerbau",
    word: "kerbau",
    meaning: "water buffalo",
    line: "Kerbau membantu petani di sawah.",
    lineEn: "The water buffalo helps the farmer in the rice field.",
    hint: "Have a rice field, and study seven days in a row.",
    reached: (d) => d.level >= 7 && d.longestStreak >= 7,
  }),
  animal({
    id: "ikan",
    word: "ikan",
    meaning: "fish",
    line: "Lihat, ada ikan melompat dari laut!",
    lineEn: "Look, a fish is jumping out of the sea!",
    hint: "Answer 1,000 flashcards.",
    reached: (d) => d.totals.reviews >= 1000,
  }),
  animal({
    id: "monyet",
    word: "monyet",
    meaning: "monkey",
    line: "Monyet bergelantungan di pohon. Awas pisangmu!",
    lineEn: "A monkey is swinging in the trees. Watch your banana!",
    hint: "Grow 50 words to young oaks or bigger.",
    now: (i) => i.forest[2] + i.forest[3] + i.forest[4] >= 50,
  }),
  animal({
    id: "kakatua",
    word: "burung kakatua",
    meaning: "cockatoo",
    line: "Burung kakatua hinggap di pohon kelapa.",
    lineEn: "A cockatoo has landed in the coconut palm.",
    hint: "Read 5,000 words in the reader.",
    reached: (d) => d.totals.wordsRead >= 5000,
  }),
  animal({
    id: "rusa",
    word: "rusa",
    meaning: "deer",
    line: "Seekor rusa datang dari hutan. Dia pemalu.",
    lineEn: "A deer has come out of the forest. It's shy.",
    hint: "Study thirty days in a row.",
    reached: (d) => d.longestStreak >= 30,
  }),
  animal({
    id: "orangutan",
    word: "orangutan",
    meaning: "orangutan",
    line: "Orangutan artinya 'orang hutan'. Dia suka pohon-pohonmu yang besar.",
    lineEn: "Orangutan means 'person of the forest'. It loves your big trees.",
    hint: "Grow 25 words into grand oaks.",
    now: (i) => i.forest[4] >= 25,
  }),
  animal({
    id: "gajah",
    word: "gajah",
    meaning: "elephant",
    line: "Gajah sumatra datang berkunjung, lalu memutuskan untuk tinggal.",
    lineEn: "A Sumatran elephant came to visit, then decided to stay.",
    hint: "Study on a hundred different days.",
    reached: (d) => d.totals.activeDays >= 100,
  }),
];

interface Visitor extends Discovery {
  /** From this level on… */
  from: number;
  /** …the share of days it comes. */
  odds: number;
}

const visitor = (v: Omit<Visitor, "kind">): Visitor => ({
  ...v,
  kind: "visitor",
});

export const VISITORS: Visitor[] = [
  visitor({
    id: "lumba-lumba",
    word: "lumba-lumba",
    meaning: "dolphins",
    line: "Lumba-lumba melompat di dekat pantai!",
    lineEn: "Dolphins are leaping near the beach!",
    hint: "Swim by now and then, from level 4.",
    from: 4,
    odds: 0.1,
  }),
  visitor({
    id: "bintang-jatuh",
    word: "bintang jatuh",
    meaning: "shooting star",
    line: "Ada bintang jatuh! Cepat, buat permohonan.",
    lineEn: "A shooting star! Quick, make a wish.",
    hint: "Falls on some nights, from level 5.",
    from: 5,
    odds: 0.07,
  }),
  visitor({
    id: "pinisi",
    word: "kapal pinisi",
    meaning: "pinisi schooner",
    line: "Kapal pinisi dari Sulawesi singgah di pulau kita.",
    lineEn: "A pinisi schooner from Sulawesi is calling at our island.",
    hint: "Sails in on some days, once there's a jetty.",
    from: 6,
    odds: 0.09,
  }),
  visitor({
    id: "penyu",
    word: "penyu",
    meaning: "sea turtle",
    line: "Penyu naik ke pantai untuk bertelur.",
    lineEn: "A sea turtle has come up the beach to lay her eggs.",
    hint: "Comes ashore now and then, from level 8.",
    from: 8,
    odds: 0.06,
  }),
  visitor({
    id: "paus",
    word: "paus",
    meaning: "whale",
    line: "Paus besar menyemburkan air di kejauhan.",
    lineEn: "A great whale is spouting in the distance.",
    hint: "Rare. From level 10.",
    from: 10,
    odds: 0.035,
  }),
  visitor({
    id: "komodo",
    word: "komodo",
    meaning: "Komodo dragon",
    line: "Seekor komodo berenang ke sini dari Pulau Komodo. Jangan dekat-dekat!",
    lineEn:
      "A Komodo dragon swam here from Komodo Island. Don't get too close!",
    hint: "Very rare. From level 15.",
    from: 15,
    odds: 0.02,
  }),
  visitor({
    id: "cendrawasih",
    word: "burung cendrawasih",
    meaning: "bird of paradise",
    line: "Burung cendrawasih dari Papua! Bulunya indah sekali.",
    lineEn: "A bird of paradise from Papua! Its feathers are so beautiful.",
    hint: "The rarest visitor of all. From level 20.",
    from: 20,
    odds: 0.015,
  }),
];

export interface Proverb {
  id: string;
  text: string;
  /** Word for word, then what it means. */
  literal: string;
  meaning: string;
}

/** Peribahasa, one in each bottle, in this order. */
export const PROVERBS: Proverb[] = [
  {
    id: "sedikit-demi-sedikit",
    text: "Sedikit demi sedikit, lama-lama menjadi bukit.",
    literal: "Little by little, in time it becomes a hill.",
    meaning: "Small, steady steps add up.",
  },
  {
    id: "rajin-pangkal-pandai",
    text: "Rajin pangkal pandai.",
    literal: "Diligence is the root of cleverness.",
    meaning: "Hard work makes you clever.",
  },
  {
    id: "malu-bertanya",
    text: "Malu bertanya, sesat di jalan.",
    literal: "Too shy to ask, lost on the road.",
    meaning: "If you don't know, ask.",
  },
  {
    id: "tak-kenal",
    text: "Tak kenal maka tak sayang.",
    literal: "Not knowing, so not loving.",
    meaning: "You come to love what you get to know.",
  },
  {
    id: "sekali-dayung",
    text: "Sekali dayung, dua tiga pulau terlampaui.",
    literal: "One stroke of the paddle, two or three islands passed.",
    meaning: "Killing two birds with one stone.",
  },
  {
    id: "ada-kemauan",
    text: "Di mana ada kemauan, di situ ada jalan.",
    literal: "Where there is a will, there is a way.",
    meaning: "Determination finds a way.",
  },
  {
    id: "berakit-rakit",
    text: "Berakit-rakit ke hulu, berenang-renang ke tepian. Bersakit-sakit dahulu, bersenang-senang kemudian.",
    literal:
      "Rafting upstream, swimming to the shore. Hardship first, joy later.",
    meaning: "Work hard now and enjoy it later.",
  },
  {
    id: "ada-gula",
    text: "Ada gula, ada semut.",
    literal: "Where there's sugar, there are ants.",
    meaning: "People flock to where the good things are.",
  },
  {
    id: "air-beriak",
    text: "Air beriak tanda tak dalam.",
    literal: "Rippling water is a sign it isn't deep.",
    meaning: "Those who boast the most often know the least.",
  },
  {
    id: "bersatu",
    text: "Bersatu kita teguh, bercerai kita runtuh.",
    literal: "United we stand firm, divided we fall.",
    meaning: "There's strength in sticking together.",
  },
  {
    id: "katak-dalam-tempurung",
    text: "Seperti katak dalam tempurung.",
    literal: "Like a frog under a coconut shell.",
    meaning: "Someone who knows little of the wider world.",
  },
  {
    id: "nasi-sudah-menjadi-bubur",
    text: "Nasi sudah menjadi bubur.",
    literal: "The rice has already turned to porridge.",
    meaning: "What's done is done.",
  },
  {
    id: "buah-jatuh",
    text: "Buah jatuh tidak jauh dari pohonnya.",
    literal: "Fruit falls not far from its tree.",
    meaning: "Children take after their parents.",
  },
  {
    id: "pinang-dibelah-dua",
    text: "Bagai pinang dibelah dua.",
    literal: "Like an areca nut split in two.",
    meaning: "As alike as two peas in a pod.",
  },
  {
    id: "hemat-pangkal-kaya",
    text: "Hemat pangkal kaya.",
    literal: "Thrift is the root of wealth.",
    meaning: "Save, and you'll prosper.",
  },
  {
    id: "tong-kosong",
    text: "Tong kosong nyaring bunyinya.",
    literal: "An empty barrel makes the loudest noise.",
    meaning: "Empty vessels make the most noise.",
  },
  {
    id: "ada-udang",
    text: "Ada udang di balik batu.",
    literal: "There's a shrimp behind the rock.",
    meaning: "There's a hidden motive.",
  },
  {
    id: "air-tenang",
    text: "Air tenang menghanyutkan.",
    literal: "Calm water can sweep you away.",
    meaning: "Still waters run deep.",
  },
  {
    id: "lain-lubuk",
    text: "Lain lubuk lain ikannya.",
    literal: "Different pools, different fish.",
    meaning: "Every place has its own ways.",
  },
  {
    id: "bangau-terbang",
    text: "Setinggi-tinggi bangau terbang, akhirnya ke kubangan juga.",
    literal: "However high the heron flies, it comes back to the mud.",
    meaning: "Everyone comes home in the end.",
  },
  {
    id: "air-di-daun-talas",
    text: "Bagai air di daun talas.",
    literal: "Like water on a taro leaf.",
    meaning: "Never settling; always changing one's mind.",
  },
  {
    id: "besar-pasak",
    text: "Besar pasak daripada tiang.",
    literal: "The peg is bigger than the post.",
    meaning: "Spending more than you earn.",
  },
  {
    id: "gajah-di-pelupuk-mata",
    text: "Gajah di pelupuk mata tak tampak, kuman di seberang lautan tampak.",
    literal:
      "An elephant on your own eyelid goes unseen; a germ across the sea is seen.",
    meaning: "We see others' faults but not our own.",
  },
  {
    id: "gading-retak",
    text: "Tak ada gading yang tak retak.",
    literal: "There's no ivory without a crack.",
    meaning: "Nobody's perfect.",
  },
];

/** A proverb as something found, for the collection and the reveal. */
export function proverbFound(p: Proverb, date: string | null): Found {
  return {
    id: `peribahasa-${p.id}`,
    kind: "proverb",
    word: p.text,
    meaning: p.meaning,
    line: p.text,
    lineEn: p.literal,
    hint: "Find a message in a bottle on the beach.",
    date,
  };
}

/** Bottles wash up on about one day in seven, from level 2. */
export const BOTTLE_ODDS = 0.15;

/** A line from the village for each level without a new building. */
const POSTCARDS: [string, string][] = [
  ["Desa kita makin ramai.", "Our village is getting busier."],
  ["Pulau ini tumbuh karena kamu.", "This island grows because of you."],
  [
    "Semua orang membicarakan kata-kata barumu.",
    "Everyone is talking about your new words.",
  ],
  ["Satu kata lagi, satu pohon lagi.", "One more word, one more tree."],
  [
    "Nelayan pulang dengan banyak ikan hari ini.",
    "The fishermen came home with lots of fish today.",
  ],
  [
    "Anak-anak menulis namamu di pasir.",
    "The children wrote your name in the sand.",
  ],
  [
    "Langkah kecil setiap hari membuat perjalanan panjang.",
    "Small steps every day make a long journey.",
  ],
  [
    "Kamu sudah jauh dari kata pertamamu.",
    "You've come a long way from your first word.",
  ],
  ["Pak kepala desa bangga padamu.", "The village head is proud of you."],
  [
    "Malam ini ada pesta kecil di pantai.",
    "There's a little party on the beach tonight.",
  ],
  [
    "Burung-burung bernyanyi lebih keras pagi ini.",
    "The birds sang louder this morning.",
  ],
  [
    "Hari ini panen padi. Terima kasih atas kerja kerasmu!",
    "It's rice harvest today. Thank you for your hard work!",
  ],
];

/** What a building says when it arrives. */
const BUILDING_LINES: Record<string, [string, string]> = {
  rumah: [
    "Rumah pertama sudah berdiri. Selamat datang di desa!",
    "The first house is up. Welcome to the village!",
  ],
  kebun: [
    "Ada kebun sayur di samping rumah.",
    "There's a vegetable garden beside the house.",
  ],
  perahu: [
    "Sekarang kita punya perahu untuk menangkap ikan.",
    "Now we have a boat to go fishing.",
  ],
  warung: [
    "Warung baru sudah buka. Mau makan nasi goreng?",
    "A new food stall has opened. Fancy some fried rice?",
  ],
  dermaga: [
    "Dermaga ini menunggu kapal dari pulau lain.",
    "This jetty is waiting for ships from other islands.",
  ],
  sawah: [
    "Padi mulai tumbuh di sawah.",
    "Rice has begun to grow in the paddy field.",
  ],
  pasar: ["Pasar ramai setiap pagi.", "The market is busy every morning."],
  "pulau-seberang": [
    "Dari pantai terlihat pulau seberang. Kata-katamu tumbuh di sana juga.",
    "From the beach you can see the island across. Your words grow there too.",
  ],
  sekolah: [
    "Anak-anak belajar di sekolah, sama seperti kamu.",
    "The children study at school, just like you.",
  ],
  mercusuar: [
    "Mercusuar menjaga kapal-kapal pada malam hari.",
    "The lighthouse watches over the ships at night.",
  ],
  gunung: [
    "Dari jauh terlihat gunung berapi. Tenang, dia sedang tidur.",
    "A volcano can be seen in the distance. Don't worry, it's asleep.",
  ],
  pura: [
    "Sebuah pura berdiri di pulau seberang.",
    "A temple now stands on the island across.",
  ],
  "air-terjun": [
    "Air terjun mengalir dari gunung.",
    "A waterfall flows down from the mountain.",
  ],
  bianglala: [
    "Ayo naik bianglala! Pemandangannya indah sekali.",
    "Let's ride the Ferris wheel! The view is beautiful.",
  ],
  "balon-udara": [
    "Balon udara terbang di atas pulau.",
    "A hot-air balloon is flying over the island.",
  ],
  pelangi: [
    "Pelangi muncul dan tidak mau pergi.",
    "A rainbow appeared and doesn't want to leave.",
  ],
  "kembang-api": [
    "Kembang api untuk merayakan level tiga puluh!",
    "Fireworks to celebrate level thirty!",
  ],
};

/** The reveal for reaching a level: its building, or news from the village. */
export function levelDiscovery(level: number): Discovery {
  const building = BUILDINGS.find((b) => b.level === level);
  if (building) {
    const [line, lineEn] = BUILDING_LINES[building.id] ?? ["", ""];
    return {
      id: `level-${level}`,
      kind: "level",
      word: building.word,
      meaning: building.meaning,
      line,
      lineEn,
      hint: `Reach level ${level}.`,
    };
  }
  const [line, lineEn] = POSTCARDS[level % POSTCARDS.length];
  return {
    id: `level-${level}`,
    kind: "level",
    word: "kartu pos",
    meaning: "a postcard from the village",
    line,
    lineEn,
    hint: `Reach level ${level}.`,
  };
}

/** The start of the island's mystery (see story.ts). */
export const SECRET: Discovery = {
  id: "rahasia",
  kind: "story",
  word: "rahasia",
  meaning: "a secret",
  line: "Ada jejak kaki misterius di pantai…",
  lineEn: "There are mysterious footprints on the beach…",
  hint: "Reach level 2.",
};

export interface IslandDay {
  date: string;
  season: Season;
  weather: Weather;
  mist: boolean;
  /** See calendar.ts: kites, fishermen, night market, a rainbow. */
  events: string[];
  /** Visitors here today (ids). */
  visitors: string[];
  /** The proverb in today's bottle, if one washed up. */
  bottle: Proverb | null;
  /** Today's celebration (id), if any. */
  celebration: string | null;
  /** Whether today counts yet: finds go into the collection on study days. */
  studied: boolean;
}

/** The visitors and the bottle of a day, at the level of that day. */
function luck(date: string, level: number) {
  const weather = weatherFor(date);
  const calm = weather !== "badai";
  const visitors: string[] = [];
  for (const v of VISITORS) {
    if (calm && level >= v.from && chance(`${date}|${v.id}`) < v.odds) {
      visitors.push(v.id);
    }
  }
  const bottle = calm && level >= 2 && chance(`${date}|botol`) < BOTTLE_ODDS;
  return { weather, visitors, bottle };
}

export interface Discoveries {
  /** Everything found so far, in the order found. */
  found: Found[];
  day: IslandDay;
}

/**
 * Goes through the history day by day: levels reached, animals met, and on
 * each study day the visitors, bottles and celebrations of that day.
 */
export function discover(input: {
  journey: JourneyDay[];
  today: string;
  island: IslandNow;
}): Discoveries {
  const { journey, today, island } = input;
  const found: Found[] = [];
  const seen = new Set<string>();
  const add = (d: Discovery, date: string | null) => {
    if (seen.has(d.id)) return;
    seen.add(d.id);
    found.push({ ...d, date });
  };

  let level = 1;
  let proverbs = 0;
  let todayProverb: Proverb | null = null;
  const firstDay = journey.find((d) => d.active)?.date;
  for (const day of journey) {
    for (let l = level + 1; l <= day.level; l++) {
      add(levelDiscovery(l), day.date);
      if (l === 2) add(SECRET, day.date);
    }
    level = Math.max(level, day.level);
    for (const a of ANIMALS) {
      if (a.reached?.(day)) add(a, day.date);
    }
    if (!day.active) continue;
    const roll = luck(day.date, day.level);
    for (const id of roll.visitors) {
      const v = VISITORS.find((x) => x.id === id);
      if (v) add(v, day.date);
    }
    if (roll.bottle) {
      const proverb = PROVERBS[proverbs % PROVERBS.length];
      const isNew = proverbs < PROVERBS.length;
      if (isNew) add(proverbFound(proverb, null), day.date);
      if (day.date === today) todayProverb = proverb;
      proverbs++;
    }
    const party = celebrationOn(day.date, firstDay, day.totals.activeDays);
    const c = CELEBRATIONS.find((x) => x.id === party);
    if (c) add({ ...c, kind: "celebration" as const }, day.date);
  }
  for (const a of ANIMALS) {
    if (a.now?.(island)) add(a, null);
  }

  const last = journey[journey.length - 1];
  const studied = last?.date === today && last.active;
  const roll = luck(today, level);
  if (roll.bottle && !todayProverb) {
    todayProverb = PROVERBS[proverbs % PROVERBS.length];
  }
  const studyDays = last && studied ? last.totals.activeDays : -1;
  const celebration = celebrationOn(today, firstDay, studyDays) ?? null;
  return {
    found,
    day: {
      date: today,
      season: seasonOf(today),
      weather: roll.weather,
      mist: mistFor(today),
      events: eventsFor(today, level),
      visitors: roll.visitors,
      bottle: roll.bottle ? todayProverb : null,
      celebration,
      studied,
    },
  };
}

/** Everything that can be found, for the collection (levels aside). */
export const COLLECTION: { kind: DiscoveryKind; items: Discovery[] }[] = [
  { kind: "animal", items: ANIMALS },
  { kind: "visitor", items: VISITORS },
  {
    kind: "celebration",
    items: CELEBRATIONS.map((c) => ({ ...c, kind: "celebration" as const })),
  },
  { kind: "proverb", items: PROVERBS.map((p) => proverbFound(p, null)) },
];
