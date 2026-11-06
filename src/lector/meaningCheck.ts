// A cheap check that a machine translation of a sentence got a word right:
// some content word of the word's dictionary meaning appears in the English.
// Used when building the sentence pool (scripts/build-sentence-pool.ts): a
// machine translation is shown with a sentence only when it passes for the
// word the sentence practises. On a sample of news sentences this kept about
// two thirds of the translations and cut the wrong ones from 15% to 8%.

const STOP = new Set(
  `the a an to of be is are was or and in on at for with as by from into up out
  about it its that this which who what one someone something used use form forms
  active passive alternative spelling synonym initialism acronym nonstandard
  superseded intransitive transitive given name female male unknown gender
  person thing very some any`.split(/\s+/)
);

/** English words whose other forms don't start the same way (buy → bought). */
const IRREGULAR: Record<string, string[]> = {
  arise: ["arose", "arisen"],
  awake: ["awoke", "awoken"],
  bear: ["bore", "born"],
  begin: ["began", "begun"],
  bend: ["bent"],
  bite: ["bit"],
  bleed: ["bled"],
  blow: ["blew", "blown"],
  break: ["broke", "broken"],
  bring: ["brought"],
  build: ["built"],
  buy: ["bought"],
  catch: ["caught"],
  choose: ["chose", "chosen"],
  cling: ["clung"],
  come: ["came"],
  creep: ["crept"],
  deal: ["dealt"],
  dig: ["dug"],
  drink: ["drank", "drunk"],
  drive: ["drove", "driven"],
  eat: ["ate", "eaten"],
  fall: ["fell", "fallen"],
  feed: ["fed"],
  feel: ["felt"],
  fight: ["fought"],
  find: ["found"],
  flee: ["fled"],
  fly: ["flew", "flown", "flies"],
  forget: ["forgot"],
  forgive: ["forgave"],
  freeze: ["froze", "frozen"],
  get: ["got"],
  give: ["gave", "given"],
  go: ["went", "gone", "goes"],
  grow: ["grew", "grown"],
  hang: ["hung"],
  hear: ["heard"],
  hide: ["hid", "hidden"],
  hold: ["held"],
  keep: ["kept"],
  kneel: ["knelt"],
  know: ["knew", "known"],
  lead: ["led"],
  leave: ["left"],
  lend: ["lent"],
  lie: ["lay", "lain", "lying"],
  lose: ["lost"],
  make: ["made"],
  mean: ["meant"],
  meet: ["met"],
  pay: ["paid"],
  ride: ["rode", "ridden"],
  ring: ["rang", "rung"],
  rise: ["rose", "risen"],
  run: ["ran"],
  say: ["said"],
  see: ["saw", "seen"],
  seek: ["sought"],
  sell: ["sold"],
  send: ["sent"],
  shake: ["shook"],
  shine: ["shone"],
  shoot: ["shot"],
  sing: ["sang", "sung"],
  sink: ["sank", "sunk"],
  sit: ["sat"],
  sleep: ["slept"],
  speak: ["spoke", "spoken"],
  spend: ["spent"],
  stand: ["stood"],
  steal: ["stole", "stolen"],
  stick: ["stuck"],
  strike: ["struck"],
  swear: ["swore", "sworn"],
  sweep: ["swept"],
  swim: ["swam", "swum"],
  take: ["took", "taken"],
  teach: ["taught"],
  tear: ["tore", "torn"],
  tell: ["told"],
  think: ["thought"],
  throw: ["threw", "thrown"],
  understand: ["understood"],
  wake: ["woke", "woken"],
  wear: ["wore", "worn"],
  weep: ["wept"],
  win: ["won"],
  write: ["wrote", "written"],
  // Nouns and adjectives.
  man: ["men"],
  woman: ["women"],
  person: ["people"],
  foot: ["feet"],
  tooth: ["teeth"],
  mouse: ["mice"],
  good: ["better", "best"],
  bad: ["worse", "worst"],
  many: ["more", "most"],
  much: ["more", "most"],
  little: ["less", "least"],
};

/** The content words of a dictionary gloss. */
export function glossWords(gloss: string): string[] {
  const words = gloss.toLowerCase().match(/[a-z]+/g) ?? [];
  return [...new Set(words)].filter((w) => w.length > 2 && !STOP.has(w));
}

/** What to look for in the English: the word's stem, and irregular forms. */
function patterns(word: string): string[] {
  // Allow for endings: table → tables, happy → happiness, buy → buyer.
  const stem = word.slice(0, Math.max(4, word.length - 2));
  return [stem, ...(IRREGULAR[word] ?? [])];
}

const cache = new Map<string, RegExp | null>();

/**
 * Whether `translation` contains the meaning of a word with these glosses
 * (its dictionary senses; the first four are used).
 */
export function hasMeaning(translation: string, glosses: string[]): boolean {
  const text = translation.toLowerCase();
  for (const gloss of glosses.slice(0, 4)) {
    let re = cache.get(gloss);
    if (re === undefined) {
      const alternatives = glossWords(gloss).flatMap(patterns);
      re = alternatives.length
        ? new RegExp(`\\b(?:${alternatives.join("|")})`)
        : null;
      cache.set(gloss, re);
    }
    if (re?.test(text)) return true;
  }
  return false;
}
