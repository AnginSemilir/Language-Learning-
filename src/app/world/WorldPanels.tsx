// Panels of the island page: today on the island, news from the village,
// and the collection of everything found (and the mysteries still left).

import {
  CELEBRATIONS,
  EVENTS,
  SEASON_WORDS,
  WEATHER_WORDS,
} from "@/logic/game/calendar";
import {
  COLLECTION,
  type Discovery,
  type DiscoveryKind,
  type Found,
  type IslandDay,
  VISITORS,
} from "@/logic/game/discoveries";
import type { VillageLine } from "@/logic/game/village";
import type { ReactNode } from "react";
import DiscoveryArt, { WeatherIcon, artFor } from "./DiscoveryArt";
import { Said } from "./Said";
import "./WorldPanels.css";

interface Chip {
  id: string;
  art: ReactNode;
  word: string;
  meaning: string;
  note?: string;
}

const STUDY_FIRST = "Study today, and today's finds go into your collection.";

/** Hari ini: the weather, what's on, who's visiting. */
export function TodayPanel({ day }: { day: IslandDay }) {
  const [weather, weatherEn] = WEATHER_WORDS[day.weather];
  const [season, seasonEn] = SEASON_WORDS[day.season];
  const chips: Chip[] = [
    {
      id: "cuaca",
      art: <WeatherIcon weather={day.weather} />,
      word: weather,
      meaning: weatherEn,
      note: `${season} · ${seasonEn}`,
    },
  ];
  const celebration = CELEBRATIONS.find((c) => c.id === day.celebration);
  if (celebration) {
    chips.push({
      id: celebration.id,
      art: <DiscoveryArt id={celebration.id} />,
      word: celebration.word,
      meaning: celebration.meaning,
    });
  }
  for (const id of day.events) {
    const event = EVENTS[id];
    chips.push({
      id,
      art: <DiscoveryArt id={artFor(id, event.word)} />,
      word: event.word,
      meaning: event.meaning,
      note: id === "nelayan" || id === "pasar-malam" ? "after dark" : undefined,
    });
  }
  for (const id of day.visitors) {
    const visitor = VISITORS.find((v) => v.id === id);
    if (!visitor) continue;
    chips.push({
      id,
      art: <DiscoveryArt id={id} />,
      word: visitor.word,
      meaning: visitor.meaning,
      note: id === "bintang-jatuh" ? "tonight" : undefined,
    });
  }
  if (day.bottle) {
    chips.push({
      id: "botol",
      art: <DiscoveryArt id="peribahasa" />,
      word: "pesan dalam botol",
      meaning: "a message in a bottle",
      note: "tap it on the beach",
    });
  }
  const finds = day.visitors.length > 0 || !!day.bottle || !!day.celebration;

  return (
    <section className="today">
      <h2 className="world-panel__title">
        Hari ini <span>Today on the island</span>
      </h2>
      <ul className="today__chips">
        {chips.map((chip) => (
          <li key={chip.id} className="today__chip">
            <span className="today__art">{chip.art}</span>
            <span className="today__text">
              <span className="today__word" lang="id">
                {chip.word}
              </span>
              <span className="today__meaning">
                {chip.note ? `${chip.meaning} · ${chip.note}` : chip.meaning}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {finds && !day.studied && <p className="today__note">{STUDY_FIRST}</p>}
    </section>
  );
}

/** Kabar desa: three lines from the villagers. */
export function VillageNews({ lines }: { lines: VillageLine[] }) {
  return (
    <section className="news">
      <h2 className="world-panel__title">
        Kabar desa <span>News from the village</span>
      </h2>
      <ul className="news__lines">
        {lines.map((line) => (
          <li key={`${line.who}-${line.text}`} className="news__line">
            <span className="news__who" aria-hidden="true">
              {line.who[0]}
            </span>
            <div className="news__body">
              <span className="news__name">{line.who}</span>
              <Said text={line.text} en={line.en} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const GROUPS: Partial<Record<DiscoveryKind, [string, string]>> = {
  animal: ["Satwa", "Animals living here"],
  visitor: ["Tamu", "Visitors"],
  celebration: ["Perayaan", "Celebrations"],
  proverb: ["Peribahasa", "Proverbs from bottles"],
};

function foundOn(date: string | null) {
  if (!date) return "Found";
  const day = new Date(`${date}T12:00:00`);
  const when = day.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  return `Found ${when}`;
}

function Card({ item, found }: { item: Discovery; found: Found | undefined }) {
  const art = artFor(item.id, item.word);
  if (!found) {
    return (
      <li className="collection__card collection__card--locked">
        <DiscoveryArt id={art} locked />
        <span className="collection__word">???</span>
        <span className="collection__hint">{item.hint}</span>
      </li>
    );
  }
  return (
    <li className="collection__card">
      <DiscoveryArt id={art} />
      <span className="collection__word" lang="id">
        {item.word}
      </span>
      <span className="collection__meaning">{item.meaning}</span>
      <span className="collection__date">{foundOn(found.date)}</span>
    </li>
  );
}

/** Koleksi: everything found, and silhouettes of what's still out there. */
export function Collection({ found }: { found: Found[] }) {
  const byId = new Map(found.map((f) => [f.id, f]));
  const total = COLLECTION.reduce((n, g) => n + g.items.length, 0);
  const have = COLLECTION.reduce(
    (n, g) => n + g.items.filter((i) => byId.has(i.id)).length,
    0
  );
  return (
    <section className="collection">
      <h2 className="world-panel__title">
        Koleksi <span>{`Collection · ${have} of ${total}`}</span>
      </h2>
      {COLLECTION.map((group) => {
        const [title, titleEn] = GROUPS[group.kind] ?? ["", ""];
        const count = group.items.filter((i) => byId.has(i.id)).length;
        const proverbs = group.kind === "proverb";
        const items = proverbs
          ? group.items.filter((i) => byId.has(i.id))
          : group.items;
        const left = group.items.length - count;
        return (
          <div key={group.kind} className="collection__group">
            <h3 className="collection__heading">
              <span lang="id">{title}</span>
              <span className="collection__heading-en">{titleEn}</span>
              <span className="collection__count">
                {`${count}/${group.items.length}`}
              </span>
            </h3>
            {proverbs ? (
              <ul className="collection__proverbs">
                {items.map((item) => (
                  <li key={item.id} className="collection__proverb">
                    <Said text={item.word} en={item.lineEn} />
                    <span className="collection__meaning">{item.meaning}</span>
                  </li>
                ))}
                {left > 0 && (
                  <li className="collection__proverb collection__proverb--more">
                    {`${left} more to find in bottles on the beach.`}
                  </li>
                )}
              </ul>
            ) : (
              <ul className="collection__grid">
                {items.map((item) => (
                  <Card key={item.id} item={item} found={byId.get(item.id)} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
