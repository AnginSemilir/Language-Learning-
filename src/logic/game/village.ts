// Kabar desa, news from the village: a few lines from the villagers each
// day, in simple Indonesian. They notice what's going on (the weather,
// visitors, your streak, the island's secret) and change with the day.

import type { Building } from "./buildings";
import type { IslandDay } from "./discoveries";
import { chance } from "./journey";
import type { DayPhase } from "./world";

export const VILLAGER_NAMES = ["Ani", "Budi", "Citra", "Dewi", "Eko", "Fajar"];

export interface VillageLine {
  who: string;
  text: string;
  en: string;
}

type Line = [string, string];

const GREETINGS: Record<DayPhase, Line> = {
  dawn: ["Selamat pagi! Sudah sarapan?", "Good morning! Had breakfast yet?"],
  day: [
    "Selamat siang! Mau makan siang di warung?",
    "Good afternoon! Lunch at the food stall?",
  ],
  dusk: [
    "Selamat sore! Lihat, matahari mulai terbenam.",
    "Good evening! Look, the sun is setting.",
  ],
  night: [
    "Selamat malam! Jangan tidur terlalu larut, ya.",
    "Good night! Don't stay up too late.",
  ],
};

const WEATHER_LINES: Record<IslandDay["weather"], Line> = {
  cerah: [
    "Cuacanya cerah, cocok untuk ke pantai.",
    "It's sunny, just right for the beach.",
  ],
  berawan: [
    "Langit berawan, tapi tidak hujan.",
    "The sky is cloudy, but it isn't raining.",
  ],
  gerimis: ["Cuma gerimis, tidak apa-apa.", "It's only drizzle, no problem."],
  hujan: [
    "Hujan lagi! Untung aku bawa payung.",
    "Rain again! Good thing I brought an umbrella.",
  ],
  badai: [
    "Ada badai! Semua perahu tetap di dermaga.",
    "There's a storm! All the boats are staying at the jetty.",
  ],
};

const VISITOR_LINES: Record<string, Line> = {
  "lumba-lumba": [
    "Lumba-lumba bermain di dekat pantai!",
    "Dolphins are playing near the beach!",
  ],
  "bintang-jatuh": [
    "Nanti malam lihat ke langit. Mungkin ada bintang jatuh.",
    "Look at the sky tonight. There might be a shooting star.",
  ],
  pinisi: [
    "Ada kapal pinisi di teluk! Besar sekali.",
    "There's a pinisi in the bay! It's enormous.",
  ],
  penyu: [
    "Sst! Ada penyu di pantai. Jangan berisik.",
    "Shh! There's a turtle on the beach. Don't make a sound.",
  ],
  paus: ["Tadi aku melihat paus! Sungguh!", "I just saw a whale! Really!"],
  komodo: [
    "Hati-hati, ada komodo di pantai!",
    "Careful, there's a Komodo dragon on the beach!",
  ],
  cendrawasih: [
    "Burung cendrawasih! Aku belum pernah melihatnya.",
    "A bird of paradise! I've never seen one before.",
  ],
};

const BOTTLE_LINE: Line = [
  "Ada botol terdampar di pantai. Ada pesan di dalamnya!",
  "A bottle has washed up on the beach. There's a message inside!",
];

const EVENT_LINES: Record<string, Line> = {
  "pasar-malam": [
    "Nanti malam kita ke pasar malam, ya!",
    "Let's go to the night market tonight!",
  ],
  "layang-layang": [
    "Anginnya pas untuk main layang-layang.",
    "The wind is just right for flying kites.",
  ],
  nelayan: [
    "Perahu nelayan akan pulang saat senja.",
    "The fishing boats will be back at dusk.",
  ],
};

const CELEBRATION_LINES: Record<string, Line> = {
  "tahun-baru": [
    "Selamat tahun baru! Semoga kata-katamu makin banyak.",
    "Happy New Year! May your words keep multiplying.",
  ],
  kemerdekaan: [
    "Ayo ikut lomba panjat pinang!",
    "Come and join the greased-pole climb!",
  ],
  "hari-batik": ["Batikmu bagus sekali!", "Your batik is lovely!"],
  "ulang-tahun": [
    "Ada kue ulang tahun di pantai. Ayo tiup lilinnya!",
    "There's a birthday cake on the beach. Come and blow out the candles!",
  ],
  "seratus-hari": [
    "Seratus hari! Kami semua bangga padamu.",
    "A hundred days! We're all proud of you.",
  ],
};

/** Gossip about the island's secret, for the next step of the story. */
const STORY_LINES: Record<string, Line> = {
  abu: [
    "Abu api unggun itu masih hangat tadi pagi. Aneh…",
    "The campfire ashes were still warm this morning. Strange…",
  ],
  asing: [
    "Kamu sudah dengar? Ada orang asing di pulau kita.",
    "Have you heard? There's a stranger on our island.",
  ],
  lampu: [
    "Ada yang melihat lampu biru di dermaga tadi malam…",
    "Someone saw a blue light at the jetty last night…",
  ],
  buku: [
    "Pak Guru sedang membersihkan lemari buku di sekolah.",
    "The teacher is clearing out the bookcase at the school.",
  ],
  halaman: [
    "Nenek Laut? Kakekku dulu sering bercerita tentang dia.",
    "Grandmother Sea? My grandfather used to tell stories about her.",
  ],
  puncak: [
    "Kenapa lampu mercusuar berwarna biru tadi malam?",
    "Why was the lighthouse lamp blue last night?",
  ],
  pintu: [
    "Kata orang, ada pintu rahasia di kaki gunung.",
    "People say there's a secret door at the foot of the mountain.",
  ],
  nenek: [
    "Orang asing itu kembali. Dia menunggu di pantai.",
    "The stranger is back. She's waiting on the beach.",
  ],
  tamat: ["Halo, penjaga pulau!", "Hello, keeper of the island!"],
};

const FILLERS: Line[] = [
  [
    "Ikan di pasar segar sekali hari ini.",
    "The fish at the market is really fresh today.",
  ],
  ["Aku suka membaca di bawah pohon.", "I like reading under the trees."],
  ["Jangan lupa minum air putih, ya.", "Don't forget to drink some water."],
  ["Kopi di warung enak sekali.", "The coffee at the food stall is so good."],
  ["Belajar sedikit setiap hari, ya!", "A little study every day, okay?"],
];

function streakLine(input: VillageInput): Line {
  const { studied, streak, questsLeft } = input;
  if (studied && questsLeft === 0) {
    return [
      "Semua tugas hari ini selesai. Mantap!",
      "All of today's quests are done. Brilliant!",
    ];
  }
  if (studied && streak >= 2) {
    return [
      `Wah, sudah ${streak} hari berturut-turut! Hebat!`,
      `Wow, ${streak} days in a row! Great!`,
    ];
  }
  if (studied && questsLeft === 1) {
    return ["Tinggal satu tugas lagi hari ini.", "Just one more quest today."];
  }
  if (studied) {
    return [
      `Tinggal ${questsLeft} tugas lagi hari ini.`,
      `Just ${questsLeft} more quests today.`,
    ];
  }
  if (streak >= 1) {
    return [
      "Api unggun hampir padam. Ayo belajar hari ini!",
      "The campfire is nearly out. Let's study today!",
    ];
  }
  return ["Api unggun menunggumu.", "The campfire is waiting for you."];
}

export interface VillageInput {
  day: IslandDay;
  phase: DayPhase;
  villagers: number;
  studied: boolean;
  /** Days in a row, counting yesterday when today isn't done yet. */
  streak: number;
  questsLeft: number;
  next: Building | undefined;
  trees: number;
  knownWords: number;
  /** The next step of the island's secret (story.ts), or "tamat". */
  storyStep: string | null;
}

/** Three lines from the village today, the most newsworthy first. */
export function villageNews(input: VillageInput): VillageLine[] {
  const { day, phase, next } = input;
  const lines: Line[] = [];
  const add = (line: Line | undefined) => {
    if (line) lines.push(line);
  };
  add(input.storyStep ? STORY_LINES[input.storyStep] : undefined);
  add(streakLine(input));
  add(day.visitors.map((v) => VISITOR_LINES[v]).find(Boolean));
  add(day.bottle ? BOTTLE_LINE : undefined);
  add(day.celebration ? CELEBRATION_LINES[day.celebration] : undefined);
  add(day.events.map((e) => EVENT_LINES[e]).find(Boolean));
  add(WEATHER_LINES[day.weather]);

  const extras: Line[] = [GREETINGS[phase]];
  if (next) {
    extras.push([
      `Katanya ${next.word} akan muncul di level ${next.level}.`,
      `They say the ${next.meaning} comes at level ${next.level}.`,
    ]);
  }
  if (input.trees > 0) {
    extras.push([
      `Hutan kita sudah punya ${input.trees} pohon.`,
      `Our forest has ${input.trees} trees already.`,
    ]);
  }
  if (input.knownWords > 0) {
    extras.push([
      `Kamu sudah tahu ${input.knownWords} kata. Luar biasa!`,
      `You know ${input.knownWords} words already. Amazing!`,
    ]);
  }
  extras.push(...FILLERS);
  const pick = Math.floor(chance(`${day.date}|kabar`) * extras.length);
  lines.push(extras[pick]);

  const people = Math.max(1, Math.min(input.villagers, VILLAGER_NAMES.length));
  const first = Math.floor(chance(`${day.date}|siapa`) * people);
  const chosen = [lines[0], lines[1], lines[lines.length - 1]];
  return chosen.map(([text, en], i) => ({
    who: VILLAGER_NAMES[(first + i) % people],
    text,
    en,
  }));
}
