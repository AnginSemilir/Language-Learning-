// Ported from Lector (heuwels/lector@eb393ce, AGPL-3.0-only):
// src/components/ActivityHeatmap/index.tsx
// Changes: base-ui tooltips replaced with a native title; Tailwind replaced
// with heatmap.css; theme read from Skola's data-theme attribute; "Anki" row
// relabelled "Flashcards".
import { useMemo } from "react";
import { DAYS_OF_WEEK } from "./constants";
import "./heatmap.css";
import { darkColorScheme, lightColorScheme } from "./theme";
import type { ActivityHeatmapProps, ActivityParts, HeatmapCell } from "./types";
import { buildHeatmapGrid, getColor, localEndDate } from "./utils";

const ACTIVITY_TYPES: {
  key: keyof ActivityParts;
  label: string;
  suffix?: string;
}[] = [
  { key: "ankiReviews", label: "Flashcards" },
  { key: "clozePracticed", label: "Cloze" },
  { key: "dictionaryLookups", label: "Lookups" },
  { key: "minutesRead", label: "Reading", suffix: " min" },
  { key: "wordsRead", label: "Reading", suffix: " words" },
  { key: "gamesPlayed", label: "Games" },
];

function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function cellTitle(day: HeatmapCell, unit: string) {
  const date = formatFullDate(day.date);
  if (!day.parts) return `${date}: ${day.count} ${unit}`;
  const rows = ACTIVITY_TYPES.filter((t) => (day.parts?.[t.key] ?? 0) > 0).map(
    (t) => `${t.label}: ${day.parts?.[t.key]}${t.suffix ?? ""}`
  );
  return rows.length ? `${date}\n${rows.join("\n")}` : `${date}\nNo activity`;
}

function isDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

export default function ActivityHeatmap({
  data,
  unit = "actions",
  endDate,
  colorScheme: colorSchemeProp,
}: ActivityHeatmapProps) {
  const colorScheme =
    colorSchemeProp || (isDark() ? darkColorScheme : lightColorScheme);
  const { weeks, maxCount, monthLabels, totalActivity, activeDays } =
    useMemo(() => {
      const maxCount = Math.max(1, ...data.map((d) => d.count));
      const totalActivity = data.reduce((sum, d) => sum + d.count, 0);
      const activeDays = data.filter((d) => d.count > 0).length;
      const { weeks, monthLabels } = buildHeatmapGrid(
        data,
        endDate ?? localEndDate()
      );
      return { weeks, maxCount, monthLabels, totalActivity, activeDays };
    }, [data, endDate]);

  return (
    <div className="heatmap">
      <div className="heatmap__header">
        <h3 className="heatmap__title">Activity</h3>
        <span className="heatmap__muted">
          {totalActivity.toLocaleString()} {unit} in the last year
        </span>
      </div>
      <div className="heatmap__scroll">
        <div className="heatmap__inner">
          <div className="heatmap__months">
            {monthLabels
              .filter((month) => month.span > 0)
              .map((month) => (
                <div
                  key={`${month.label}-${month.weekIndex}`}
                  style={{ gridColumn: `span ${month.span}` }}
                >
                  {month.label}
                </div>
              ))}
          </div>
          <div className="heatmap__grid-row">
            <div className="heatmap__days">
              {DAYS_OF_WEEK.map((day, i) => (
                <div
                  key={day}
                  style={{ visibility: i % 2 === 1 ? "visible" : "hidden" }}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="heatmap__weeks">
              {weeks.map((week) => (
                <div key={week[0]?.date} className="heatmap__week">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      className="heatmap__cell"
                      title={cellTitle(day, unit)}
                      style={{
                        backgroundColor: getColor(
                          day.count,
                          maxCount,
                          colorScheme
                        ),
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="heatmap__footer">
        <span className="heatmap__muted">
          Active days: <strong>{activeDays}</strong> · Avg per active day:{" "}
          <strong>
            {activeDays > 0
              ? Math.round(totalActivity / activeDays).toLocaleString()
              : 0}
          </strong>
        </span>
        <span className="heatmap__legend heatmap__muted">
          Less
          {(["empty", "level1", "level2", "level3", "level4"] as const).map(
            (k) => (
              <span
                key={k}
                className="heatmap__cell"
                style={{ backgroundColor: colorScheme[k] }}
              />
            )
          )}
          More
        </span>
      </div>
    </div>
  );
}
