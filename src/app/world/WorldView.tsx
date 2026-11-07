// Pulau Kata: the island that grows as you learn, with your level, streak,
// today's quests, your forest of words and everything built so far.

import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { GrowthIcon } from "@/components/GrowthIcon/GrowthIcon";
import { Button, Paper } from "@/components/ui";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { XP } from "@/logic/game/progress";
import { useWorld } from "@/logic/game/useWorld";
import { BUILDINGS, type Building } from "@/logic/game/world";
import { GROWTH_STAGES, GROWTH_STAGE_NAME } from "@/logic/growth";
import { IconDeviceGamepad2, IconLock } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import Island from "./Island";
import { LevelBadge, QuestList, StreakChip, XpBar } from "./WorldBits";
import "./WorldView.css";
import { usePhase } from "./usePhase";

const INTRO =
  "Every word on your flashcards is a tree here, growing from a seed to a grand oak as you learn it. Study to earn XP, level up and build the island, one Indonesian word at a time.";

const XP_NOTE =
  "All your studying counts, on every device, including everything you did before the island existed. Games and practice never change your flashcard reviews.";

const XP_SOURCES: [string, string][] = [
  ["Flashcard answer", `${XP.flashcardAnswer} XP`],
  ["Gap-fill sentence", `${XP.clozeSentence} XP`],
  ["Reading", `1 XP per ${XP.wordsPerXp} words`],
  ["Word looked up or marked known", "1 XP"],
  ["New word saved from a text", `${XP.wordSaved} XP`],
  ["Word games", `1 XP per ${XP.gamePointsPerXp} points`],
  ["All three quests in a day", `${XP.questBonus} XP bonus`],
];

function forestNote(trees: number, known: number, villagers: number) {
  if (trees === 0) return "Add flashcards and each word plants a seed.";
  const people = villagers === 1 ? "villager lives" : "villagers live";
  return `${trees.toLocaleString()} words, ${known.toLocaleString()} of them known. ${villagers} ${people} here: one more for every 100 words you know.`;
}

export default function WorldView() {
  useDocumentTitle("Pulau Kata");
  const navigate = useNavigate();
  const world = useWorld();
  const phase = usePhase();
  const [picked, setPicked] = useState<Building | null>(null);

  if (!world) {
    return <div className="world-view world-view--loading" />;
  }

  const { level, next } = world;
  const trees = GROWTH_STAGES.reduce<number>((n, s) => n + world.forest[s], 0);
  const hint =
    world.unlocked.length > 0
      ? "Tap a building to see its Indonesian name."
      : "Reach level 2 for your first house.";

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs segments={[{ label: "Pulau Kata" }]} />
      </AppHeaderContent>

      <div className="world-view">
        <header className="world-view__intro">
          <h1 className="world-view__title">
            Pulau Kata <span>Word Island</span>
          </h1>
          <p>{INTRO}</p>
        </header>

        <section className="world-view__scene">
          <Island
            trees={world.trees}
            unlocked={world.unlocked}
            next={next}
            villagers={world.villagers}
            campfire={world.studiedToday}
            celebrate={world.questsDone}
            phase={phase}
            onPick={setPicked}
            picked={picked?.id}
          />
          <p className="world-view__caption" aria-live="polite">
            {picked ? (
              <>
                <strong lang="id">{picked.word}</strong>
                {` means “${picked.meaning}”. It came with level ${picked.level}.`}
              </>
            ) : (
              hint
            )}
          </p>
        </section>

        <Paper withBorder className="world-view__level">
          <LevelBadge level={level.level} />
          <div className="world-view__level-text">
            <XpBar level={level} />
            {next && (
              <p className="world-view__next">
                {`Level ${next.level} brings `}
                <strong lang="id">{next.word}</strong>
                {` (${next.meaning}).`}
              </p>
            )}
          </div>
          <StreakChip days={world.streak.current} active={world.studiedToday} />
        </Paper>

        <Paper withBorder className="world-view__quests">
          <QuestList quests={world.quests} />
          {!world.quests[1].complete && (
            <Button
              variant="primary"
              leftSection={<IconDeviceGamepad2 />}
              onClick={() => navigate("/games")}
            >
              Play a word game
            </Button>
          )}
        </Paper>

        <section className="world-view__section">
          <h2 className="world-view__heading">Your forest</h2>
          <p className="world-view__note">
            {forestNote(trees, world.knownWords, world.villagers)}
          </p>
          <div className="world-view__forest">
            {GROWTH_STAGES.map((stage) => (
              <div key={stage} className="world-view__stage">
                <GrowthIcon stage={stage} size={44} />
                <span className="world-view__stage-count">
                  {world.forest[stage].toLocaleString()}
                </span>
                <span className="world-view__stage-name">
                  {GROWTH_STAGE_NAME[stage]}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="world-view__section">
          <h2 className="world-view__heading">Built on the island</h2>
          <div className="world-view__buildings">
            {BUILDINGS.map((b) => {
              const built = b.level <= level.level;
              return (
                <div
                  key={b.id}
                  className={
                    built
                      ? "world-view__building"
                      : "world-view__building world-view__building--locked"
                  }
                >
                  <span className="world-view__building-level">
                    {built ? `Level ${b.level}` : <IconLock size={14} />}
                  </span>
                  <span className="world-view__building-word" lang="id">
                    {built ? b.word : `Level ${b.level}`}
                  </span>
                  <span className="world-view__building-meaning">
                    {built ? b.meaning : "Not built yet"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="world-view__section">
          <h2 className="world-view__heading">How you earn XP</h2>
          <p className="world-view__note">{XP_NOTE}</p>
          <table className="world-view__xp-table">
            <tbody>
              {XP_SOURCES.map(([what, xp]) => (
                <tr key={what}>
                  <td>{what}</td>
                  <td>{xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
