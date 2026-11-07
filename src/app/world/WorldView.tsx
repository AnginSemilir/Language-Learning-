// Pulau Kata: the island that grows as you learn, with your level, streak,
// today's quests, your forest of words and everything built so far; what's
// happening on the island today, news from the village, the collection of
// everything found, and the island's secret.

import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { GrowthIcon } from "@/components/GrowthIcon/GrowthIcon";
import { Button, Paper } from "@/components/ui";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import type { Found, Proverb } from "@/logic/game/discoveries";
import { XP } from "@/logic/game/progress";
import { type StoryStep, tapAdvances } from "@/logic/game/story";
import { villageNews } from "@/logic/game/village";
import { BUILDINGS } from "@/logic/game/world";
import { GROWTH_STAGES, GROWTH_STAGE_NAME } from "@/logic/growth";
import { IconDeviceGamepad2, IconLock } from "@tabler/icons-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import Island, { type IslandThing } from "./Island";
import {
  DiscoveryReveal,
  FirstVisit,
  ProverbReveal,
  StoryReveal,
} from "./Kejutan";
import StoryPanel, { RiddleForm } from "./StoryPanel";
import { LevelBadge, QuestList, StreakChip, XpBar } from "./WorldBits";
import { Collection, TodayPanel, VillageNews } from "./WorldPanels";
import "./WorldView.css";
import { type IslandView, useIsland } from "./useIsland";
import { usePhase } from "./usePhase";

const INTRO =
  "Every word on your flashcards is a tree here, growing from a seed to a grand oak as you learn it. Study to earn XP, level up and build the island, one Indonesian word at a time. Animals, visitors and a secret or two turn up along the way.";

const BOTTLE: IslandThing = {
  id: "botol",
  word: "pesan dalam botol",
  meaning: "message in a bottle",
};

const VANISHED =
  "The stranger slips away behind the coconut palms before you can reach her…";

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
  const island = useIsland();
  const phase = usePhase();
  const [picked, setPicked] = useState<IslandThing | null>(null);
  const [reveal, setReveal] = useState<Found[] | null>(null);
  const [firstVisit, setFirstVisit] = useState(false);
  const [proverb, setProverb] = useState<Proverb | null>(null);
  const [chapter, setChapter] = useState<StoryStep | null>(null);
  const arrived = useRef(false);

  // On arrival, show what's new on the island since last time.
  useEffect(() => {
    if (!island || arrived.current) return;
    arrived.current = true;
    if (island.unseen.length > 0) {
      setFirstVisit(island.firstVisit);
      setReveal(island.unseen);
    }
  }, [island]);

  if (!island) {
    return <div className="world-view world-view--loading" />;
  }

  const { world, story, scene } = island;
  const { level, next } = world;
  const trees = GROWTH_STAGES.reduce<number>((n, s) => n + world.forest[s], 0);
  const hint =
    world.unlocked.length > 0
      ? "Tap anything on the island to see what it's called."
      : "Reach level 2 for your first house.";

  const closeReveal = () => {
    if (reveal) island.markSeen(reveal);
    setReveal(null);
  };

  const advance = (step: StoryStep) => {
    island.completeStep(step.id);
    setChapter(step);
  };

  const pick = (thing: IslandThing) => {
    setPicked(thing);
    const step = story.next;
    if (step && tapAdvances(story, thing.id, phase)) {
      advance(step);
    } else if (thing.id === "botol" && world.day.bottle) {
      if (step && story.ready && step.trigger.kind === "bottle") advance(step);
      else setProverb(world.day.bottle);
    }
  };

  // After a chapter, its riddle (if it has one) comes straight away.
  const riddle =
    story.ready &&
    story.next?.trigger.kind === "riddle" &&
    story.next.id !== chapter?.id
      ? story.next
      : null;

  let storyStep: string | null = null;
  if (story.finished) storyStep = "tamat";
  else if (story.ready && story.next) storyStep = story.next.id;
  const news = villageNews({
    day: world.day,
    phase,
    villagers: world.villagers,
    studied: world.studiedToday,
    streak: world.streak.current,
    questsLeft: world.quests.filter((q) => !q.complete).length,
    next,
    trees,
    knownWords: world.knownWords,
    storyStep,
  });

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
            scene={scene}
            phase={phase}
            onPick={pick}
            picked={picked?.id}
          />
          <p className="world-view__caption" aria-live="polite">
            {picked ? caption(picked, island) : hint}
          </p>
        </section>

        <TodayPanel day={world.day} onOpenBottle={() => pick(BOTTLE)} />

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

        <StoryPanel story={story} onSolve={advance} />

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

        <VillageNews lines={news} />

        <Collection found={world.found} />

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

      {reveal && firstVisit && reveal.length > 3 && (
        <FirstVisit items={reveal} onDone={closeReveal} />
      )}
      {reveal && !(firstVisit && reveal.length > 3) && (
        <DiscoveryReveal items={reveal} onDone={closeReveal} />
      )}
      {proverb && (
        <ProverbReveal
          proverb={proverb}
          counts={world.day.studied}
          onClose={() => setProverb(null)}
        />
      )}
      {chapter && (
        <StoryReveal
          step={chapter}
          mapPieces={story.mapPieces}
          onClose={() => setChapter(null)}
        >
          {riddle && (
            <RiddleForm step={riddle} onSolved={() => advance(riddle)} />
          )}
        </StoryReveal>
      )}
    </>
  );
}

/** What the thing tapped on the island is called, and a word about it. */
function caption(thing: IslandThing, island: IslandView): ReactNode {
  const { world, story } = island;
  if (thing.id === "orang-asing" && !story.finished) return VANISHED;
  const building = world.unlocked.find((b) => b.id === thing.id);
  const found = world.found.find((f) => f.id === thing.id);
  let more = "";
  if (building) more = ` It came with level ${building.level}.`;
  else if (thing.id === "api-unggun") more = " It burns on days you study.";
  else if (found) more = ` ${found.lineEn}`;
  return (
    <>
      <strong lang="id">{thing.word}</strong>
      {` means “${thing.meaning}”.${more}`}
    </>
  );
}
