// Flashcard statistics, like Anki's: today's work, the forest of cards from
// seed to grand oak, the review forecast, the last 30 days, how well cards
// are remembered, the best time of day, and the hardest cards (tap one to
// edit it). Worked out by logic/cardStats from each card's review log.

import { BarChart } from "@/components/BarChart/BarChart";
import { GrowthIcon } from "@/components/GrowthIcon/GrowthIcon";
import { Paper, Text } from "@/components/ui";
import { noteText } from "@/lector/flashcards";
import {
  type CardStats,
  LEECH_LAPSES,
  STATS_DAYS,
  bestHour,
  computeCardStats,
  ratio,
} from "@/logic/cardStats";
import { buildDailyQueue } from "@/logic/dailyQueue";
import { db } from "@/logic/db";
import { GROWTH_STAGES, GROWTH_STAGE_NAME } from "@/logic/growth";
import type { Note, NoteType } from "@/logic/note/note";
import { getDailyLimits } from "@/logic/settings/dailyLimits";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import EditNoteModal from "../editor/EditNoteModal";
import "./FlashcardStats.css";

const STAGE_HINT = [
  "new",
  "learning",
  "next review in under 21 days",
  "21–89 days",
  "90 days or more",
];

const percent = (value: number | null) =>
  value === null ? "–" : `${Math.round(value * 100)}%`;

function dayLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function hourLabel(hour: number) {
  return new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: "numeric" });
}

function Tile({
  value,
  label,
  detail,
}: {
  value: string | number;
  label: string;
  detail?: string;
}) {
  return (
    <Paper withBorder className="card-stats__tile">
      <span className="card-stats__value">{value}</span>
      <span className="card-stats__label">{label}</span>
      {detail && <span className="card-stats__detail">{detail}</span>}
    </Paper>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-stats__section">
      <div>
        <h3 className="card-stats__heading">{title}</h3>
        {subtitle && <Text size="sm">{subtitle}</Text>}
      </div>
      {children}
    </section>
  );
}

function AnswerButtons({ ratings }: { ratings: CardStats["ratings"] }) {
  const rows = [
    ["Again", ratings.again],
    ["Hard", ratings.hard],
    ["Good", ratings.good],
    ["Easy", ratings.easy],
  ] as const;
  const total = rows.reduce((s, [, n]) => s + n, 0);
  if (total === 0)
    return <Text size="sm">No answers in the last 30 days.</Text>;
  return (
    <div className="card-stats__hbars" role="list">
      {rows.map(([name, n]) => (
        <div key={name} className="card-stats__hbar" role="listitem">
          <span className="card-stats__hbar-name">{name}</span>
          <span className="card-stats__hbar-track">
            <span
              className="card-stats__hbar-fill"
              style={{ width: `${(n / total) * 100}%` }}
            />
          </span>
          <span className="card-stats__hbar-value">
            {percent(n / total)} <span>({n.toLocaleString()})</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FlashcardStats() {
  const data = useLiveQuery(async () => {
    const [cards, notes, limits] = await Promise.all([
      db.cards.toArray(),
      db.notes.toArray(),
      getDailyLimits(),
    ]);
    return { cards, notes, limits };
  }, []);
  const [editing, setEditing] = useState<Note<NoteType> | null>(null);

  const view = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const stats = computeCardStats(data.cards, now, data.limits.dayStartHour);
    const queue = buildDailyQueue(data.cards, data.limits, now);
    const notes = new Map(data.notes.map((n) => [n.id, n]));
    return { stats, queue, notes };
  }, [data]);

  if (!view) return null;
  const { stats, queue, notes } = view;
  if (stats.totalReviews === 0 && data?.cards.length === 0) return null;

  const toDo =
    queue.learning.length + queue.reviews.length + queue.newCards.length;
  const studiedDays = stats.history.filter((n) => n > 0).length;
  const last30 = stats.history.reduce((a, b) => a + b, 0);
  const weekAhead = stats.forecast.slice(1, 8).reduce((a, b) => a + b, 0);
  const best = bestHour(stats.hours);
  const hourRates = stats.hours.map((h) =>
    h.answers >= 5 ? Math.round((h.correct / h.answers) * 100) : null
  );
  const forecastMax = stats.forecast.indexOf(Math.max(...stats.forecast));
  const dayTicks = [0, 7, 14, 21, STATS_DAYS - 1];

  const cardText = (cardId: string) => {
    const card = data?.cards.find((c) => c.id === cardId);
    const note = card ? notes.get(card.note) : undefined;
    const text = note ? noteText(note.content) : null;
    if (!card || !text) return { prompt: "?", answer: "", note };
    const reverse =
      (card.content as { frontIsField1?: boolean }).frontIsField1 === false;
    return reverse
      ? { prompt: text.back, answer: text.front, note }
      : { prompt: text.front, answer: text.back, note };
  };

  return (
    <div className="card-stats">
      <h2 className="card-stats__title">Flashcards</h2>

      <div className="card-stats__tiles">
        <Tile value={stats.today.reviewed} label="answered today" />
        <Tile
          value={percent(stats.today.correct)}
          label="remembered today"
          detail={
            stats.today.reviewed
              ? `${stats.today.again} × Again`
              : "no answers yet"
          }
        />
        <Tile value={stats.today.newStarted} label="new cards started" />
        <Tile
          value={toDo}
          label="still to do today"
          detail={`${queue.reviews.length} reviews · ${queue.newCards.length} new`}
        />
      </div>

      <Section
        title="Your forest"
        subtitle="Every card grows from a seed to a grand oak as the gap between its reviews gets longer."
      >
        <div className="card-stats__forest">
          {GROWTH_STAGES.map((stage) => (
            <Paper withBorder key={stage} className="card-stats__tree">
              <GrowthIcon stage={stage} size={56} />
              <span className="card-stats__value">
                {stats.stages[stage].toLocaleString()}
              </span>
              <span className="card-stats__label">
                {GROWTH_STAGE_NAME[stage]}
              </span>
              <span className="card-stats__detail">{STAGE_HINT[stage]}</span>
            </Paper>
          ))}
        </div>
      </Section>

      <Section
        title="Coming up"
        subtitle="Cards due on each of the next 30 days (new cards not included)."
      >
        <div className="card-stats__tiles">
          <Tile value={stats.forecast[0]} label="due today" />
          <Tile value={stats.forecast[1]} label="due tomorrow" />
          <Tile value={weekAhead} label="due in the next 7 days" />
        </div>
        <BarChart
          title="Cards due per day, next 30 days"
          values={stats.forecast}
          labels={stats.forecast.map((_, i) =>
            i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayLabel(i)
          )}
          xTicks={dayTicks.map((i) => ({
            index: i,
            label: i === 0 ? "Today" : dayLabel(i),
          }))}
          labelled={stats.forecast[forecastMax] > 0 ? [forecastMax] : []}
          tableHeadings={["Day", "Cards due"]}
        />
      </Section>

      <Section
        title="Last 30 days"
        subtitle="Answers on each day, new and review cards together."
      >
        <div className="card-stats__tiles">
          <Tile value={last30.toLocaleString()} label="answers" />
          <Tile value={`${studiedDays} / 30`} label="days studied" />
          <Tile
            value={studiedDays ? Math.round(last30 / studiedDays) : 0}
            label="a day, on days studied"
          />
        </div>
        <BarChart
          title="Answers per day, last 30 days"
          values={stats.history}
          labels={stats.history.map((_, i) => {
            const offset = i - (STATS_DAYS - 1);
            return offset === 0 ? "Today" : dayLabel(offset);
          })}
          xTicks={[0, 7, 14, 21, STATS_DAYS - 1].map((i) => {
            const offset = i - (STATS_DAYS - 1);
            return {
              index: i,
              label: offset === 0 ? "Today" : dayLabel(offset),
            };
          })}
          labelled={stats.history[STATS_DAYS - 1] > 0 ? [STATS_DAYS - 1] : []}
          tableHeadings={["Day", "Answers"]}
        />
      </Section>

      <Section
        title="How well you remember"
        subtitle="Recall is the share of review answers that weren't Again, over the last 30 days. Anki aims for about 90%."
      >
        <div className="card-stats__tiles">
          <Tile
            value={percent(ratio(stats.recall.all))}
            label="recall, all reviews"
            detail={`${stats.recall.all.total.toLocaleString()} reviews`}
          />
          <Tile
            value={percent(ratio(stats.recall.young))}
            label="young cards"
            detail="gap under 21 days"
          />
          <Tile
            value={percent(ratio(stats.recall.mature))}
            label="mature cards"
            detail="gap of 21 days or more"
          />
        </div>
        <Text size="sm" weight="medium">
          Answer buttons, last 30 days
        </Text>
        <AnswerButtons ratings={stats.ratings} />
      </Section>

      <Section
        title="Best time of day"
        subtitle={
          best === null
            ? "Share of answers you got right, by hour. Needs a few more reviews."
            : `Share of answers you got right, by hour. You do best around ${hourLabel(best)} (${hourRates[best]}% right).`
        }
      >
        <BarChart
          title="Percentage right by hour of the day"
          values={hourRates}
          labels={hourRates.map(
            (_, h) => `${hourLabel(h)}–${hourLabel((h + 1) % 24)}`
          )}
          xTicks={[0, 6, 12, 18, 23].map((h) => ({
            index: h,
            label: hourLabel(h),
          }))}
          formatValue={(v) => `${Math.round(v)}%`}
          yMax={100}
          emphasis={best}
          labelled={best === null ? [] : [best]}
          emptyText="too few answers"
          tableHeadings={["Hour", "Right"]}
        />
      </Section>

      <Section
        title="Hardest cards"
        subtitle={`The cards you forget most. A card forgotten ${LEECH_LAPSES} times or more is a leech: try rewording it or adding an example. Tap one to edit it.`}
      >
        {stats.hardest.length === 0 ? (
          <Text size="sm">No hard cards yet: nothing has been forgotten.</Text>
        ) : (
          <ol className="card-stats__hardest">
            {stats.hardest.map((h) => {
              const text = cardText(h.card.id);
              return (
                <li key={h.card.id}>
                  <button
                    type="button"
                    className="card-stats__hard"
                    onClick={() => text.note && setEditing(text.note)}
                  >
                    <span className="card-stats__hard-text">
                      <span className="card-stats__hard-prompt" lang="id">
                        {text.prompt}
                      </span>
                      <span className="card-stats__hard-answer">
                        {text.answer}
                      </span>
                    </span>
                    <span className="card-stats__hard-numbers">
                      {h.leech && (
                        <span className="card-stats__leech">leech</span>
                      )}
                      <span>
                        forgotten {h.lapses}×
                        {h.again > h.lapses ? ` · Again ${h.again}×` : ""}
                      </span>
                      <span className="card-stats__detail">
                        {h.reviews} answers
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {stats.leeches > 0 && (
          <Text size="sm">
            {stats.leeches} leech{stats.leeches === 1 ? "" : "es"} in all.
          </Text>
        )}
      </Section>

      {editing && (
        <EditNoteModal
          note={editing}
          opened={!!editing}
          setClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
