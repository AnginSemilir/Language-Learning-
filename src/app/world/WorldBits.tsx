// Small pieces of the island's game shared by the island page and the home
// page: the level badge, the XP bar, the streak flame and today's quests.

import { type LevelInfo, type Quest, XP } from "@/logic/game/progress";
import { IconCheck, IconFlame } from "@tabler/icons-react";
import "./WorldBits.css";

export function LevelBadge({ level }: { level: number }) {
  return (
    <span className="level-badge" title={`Level ${level}`}>
      <span className="level-badge__label">Level</span>
      <span className="level-badge__value">{level}</span>
    </span>
  );
}

export function XpBar({ level }: { level: LevelInfo }) {
  const toGo = level.nextLevel - level.xp;
  const percent = Math.round(level.progress * 100);
  // Whole strings: the React Compiler can drop a space before a {value}.
  const total = `${level.xp.toLocaleString()} XP`;
  const toNext = `${toGo.toLocaleString()} XP to level ${level.level + 1}`;
  return (
    <div className="xp-bar">
      <div
        className="xp-bar__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`${toGo} XP to level ${level.level + 1}`}
      >
        <div className="xp-bar__fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="xp-bar__text">
        <span>{total}</span>
        <span>{toNext}</span>
      </div>
    </div>
  );
}

export function StreakChip({
  days,
  active,
}: {
  days: number;
  active: boolean;
}) {
  const title = active
    ? "You've studied today"
    : "Study today to keep your streak";
  return (
    <span
      className={active ? "streak-chip streak-chip--active" : "streak-chip"}
      title={title}
    >
      <IconFlame size={18} />
      <span className="streak-chip__days">{days}</span>
      <span className="streak-chip__label">{days === 1 ? "day" : "days"}</span>
    </span>
  );
}

export function QuestList({
  quests,
  compact = false,
}: {
  quests: Quest[];
  compact?: boolean;
}) {
  const done = quests.every((q) => q.complete);
  return (
    <div className={compact ? "quest-list quest-list--compact" : "quest-list"}>
      <div className="quest-list__head">
        <h2 className="quest-list__title">Today’s quests</h2>
        <span className="quest-list__bonus">
          {done ? "Bonus earned!" : `All three: +${XP.questBonus} XP`}
        </span>
      </div>
      <ul className="quest-list__items">
        {quests.map((q) => (
          <li
            key={q.id}
            className={q.complete ? "quest quest--complete" : "quest"}
          >
            <span className="quest__check" aria-hidden="true">
              {q.complete && <IconCheck size={14} />}
            </span>
            <span className="quest__text">
              <span className="quest__title">{q.title}</span>
              <span className="quest__title-id" lang="id">
                {q.titleId}
              </span>
            </span>
            <span className="quest__count">
              {q.done}/{q.target}
            </span>
            <span className="quest__bar" aria-hidden="true">
              <span style={{ width: `${(q.done / q.target) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
