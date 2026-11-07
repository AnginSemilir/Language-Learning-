// Permainan: two word games with the words you're learning now. Cocok! is
// a race against the clock to match words and meanings; Hujan Kata has
// words falling like rain, to catch the right one before it hits the sea.
// They only read your flashcards (reviews are left alone) and every game
// counts for XP, the day's quests and the streak.

import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { Button, Paper, SegmentedControl, Switch } from "@/components/ui";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import {
  type GameWord,
  MIN_GAME_WORDS,
  shuffled,
} from "@/logic/game/gameWords";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import { setSetting } from "@/logic/settings/setSetting";
import {
  IconCards,
  IconClock,
  IconCloudRain,
  IconHeart,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppHeaderContent } from "../shell/Header/Header";
import GameResults from "./GameResults";
import MatchGame from "./MatchGame";
import RainGame from "./RainGame";
import { BEST_SCORE_SETTING, recordGame } from "./recordGame";
import { sfx } from "./sfx";
import type { GameId, GameResult } from "./types";
import { useGameWords } from "./useGameWords";
import "./games.css";

interface GameInfo {
  name: string;
  english: string;
  blurb: string;
}

const GAMES: Record<GameId, GameInfo> = {
  match: {
    name: "Cocok!",
    english: "Match",
    blurb:
      "Pair each word with its meaning before the minute runs out. Keep a run going for bonus points and extra seconds.",
  },
  rain: {
    name: "Hujan Kata",
    english: "Word Rain",
    blurb:
      "Words fall like rain. Catch the one that matches the cloud before it reaches the sea. Three hearts, and it keeps getting faster.",
  },
};

const NOT_ENOUGH = `The games need at least ${MIN_GAME_WORDS} words on your flashcards. Add a few cards (or import a CSV) and come back.`;

const GAME_IDS: GameId[] = ["match", "rain"];

function isGame(id: string | undefined): id is GameId {
  return id === "match" || id === "rain";
}

/** "1 word", "12 words". */
function wordCount(n: number): string {
  return n === 1 ? "1 word" : `${n} words`;
}

export default function GamesView() {
  const { game } = useParams();
  return isGame(game) ? <GamePlay game={game} key={game} /> : <GamesHub />;
}

function GamesHub() {
  useDocumentTitle("Games");
  const navigate = useNavigate();
  const [choice] = useSetting("#games_words");
  const [sound] = useSetting("#games_sound");
  const [bestMatch] = useSetting(BEST_SCORE_SETTING.match);
  const [bestRain] = useSetting(BEST_SCORE_SETTING.rain);
  const pool = useGameWords(choice);
  const enough = !!pool && pool.words.length >= MIN_GAME_WORDS;
  const best: Record<GameId, number> = { match: bestMatch, rain: bestRain };

  let poolText = "Loading your words…";
  if (pool && pool.words.length === 0) {
    poolText = "No words on your flashcards yet.";
  } else if (pool && choice === "all") {
    poolText = `All ${wordCount(pool.words.length)} from your flashcards.`;
  } else if (pool && pool.learningNow === 0) {
    poolText = `You're not learning any words right now, so the games use ${wordCount(pool.words.length)} from your flashcards.`;
  } else if (pool && pool.learningNow >= pool.words.length) {
    poolText = `${wordCount(pool.learningNow)} you're learning now in your flashcards.`;
  } else if (pool) {
    poolText = `${wordCount(pool.learningNow)} you're learning now, with new and known words to make up the numbers.`;
  }

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs segments={[{ label: "Games" }]} />
      </AppHeaderContent>
      <div className="games-view">
        <header className="games-view__intro">
          <h1 className="games-view__title">
            Permainan <span>Word games</span>
          </h1>
          <p>Play with the words on your flashcards. Every game earns XP.</p>
        </header>

        <Paper withBorder className="games-view__pool">
          <p className="games-view__pool-text">{poolText}</p>
          {pool && pool.words.length > 0 && (
            <div className="games-view__chips">
              {pool.words.slice(0, 12).map((word) => (
                <span key={word.id} className="games-view__chip" lang="id">
                  {word.term}
                </span>
              ))}
              {pool.words.length > 12 && (
                <span className="games-view__chip games-view__chip--more">
                  +{pool.words.length - 12}
                </span>
              )}
            </div>
          )}
          <div className="games-view__options">
            <SegmentedControl
              value={choice}
              onChange={(v) =>
                setSetting("#games_words", v === "all" ? "all" : "learning")
              }
              data={[
                { value: "learning", label: "Learning now" },
                { value: "all", label: "All my words" },
              ]}
            />
            <Switch
              label="Sound and spoken words"
              checked={sound}
              onChange={(e) => setSetting("#games_sound", e.target.checked)}
            />
          </div>
        </Paper>

        {pool && !enough && (
          <Paper withBorder className="games-view__empty">
            <p>{NOT_ENOUGH}</p>
            <Button
              leftSection={<IconCards />}
              onClick={() => navigate("/home")}
            >
              Go to my decks
            </Button>
          </Paper>
        )}

        <div className="games-view__list">
          {GAME_IDS.map((id) => {
            const Icon = id === "match" ? IconClock : IconHeart;
            const Art = id === "match" ? MatchArt : RainArt;
            return (
              <article key={id} className={`game-card game-card--${id}`}>
                <div className="game-card__art" aria-hidden="true">
                  <Art />
                </div>
                <div className="game-card__body">
                  <h2 className="game-card__name">
                    {GAMES[id].name} <span>{GAMES[id].english}</span>
                  </h2>
                  <p className="game-card__blurb">{GAMES[id].blurb}</p>
                  <div className="game-card__footer">
                    <span className="game-card__meta">
                      <Icon size={16} />
                      {id === "match" ? "60 seconds" : "3 hearts"}
                      {best[id] > 0 && ` · best ${best[id]}`}
                    </span>
                    <Button
                      variant="primary"
                      leftSection={<IconPlayerPlay />}
                      disabled={!enough}
                      onClick={() => navigate(`/games/${id}`)}
                    >
                      Play
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}

function MatchArt() {
  return (
    <div className="game-art game-art--match">
      <span lang="id">rumah</span>
      <span>house</span>
      <span lang="id">makan</span>
      <span>to eat</span>
    </div>
  );
}

function RainArt() {
  return (
    <div className="game-art game-art--rain">
      <IconCloudRain size={34} />
      <span lang="id">air</span>
      <span lang="id">hujan</span>
      <span lang="id">laut</span>
    </div>
  );
}

type Phase = "countdown" | "playing" | "done";

function GamePlay({ game }: { game: GameId }) {
  useDocumentTitle(GAMES[game].name);
  const navigate = useNavigate();
  const [choice] = useSetting("#games_words");
  const [sound] = useSetting("#games_sound");
  const pool = useGameWords(choice);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [count, setCount] = useState(3);
  const [round, setRound] = useState(0);
  const [words, setWords] = useState<GameWord[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [previousBest, setPreviousBest] = useState<number>();

  // 3, 2, 1… then the words are shuffled and the game begins.
  useEffect(() => {
    if (phase !== "countdown" || !pool) return;
    if (pool.words.length < MIN_GAME_WORDS) return;
    if (count === 0) {
      setWords(shuffled(pool.words));
      setPhase("playing");
      if (sound) sfx.go();
      return;
    }
    if (sound) sfx.tick();
    const timer = setTimeout(() => setCount((c) => c - 1), 700);
    return () => clearTimeout(timer);
  }, [phase, count, pool, sound]);

  const finish = (r: GameResult) => {
    setResult(r);
    setPhase("done");
    setPreviousBest(undefined);
    recordGame(game, r.score).then(({ previousBest }) => {
      setPreviousBest(previousBest);
      if (sound && r.score > previousBest && r.score > 0) sfx.best();
    });
  };

  const replay = () => {
    setResult(null);
    setCount(3);
    setRound((n) => n + 1);
    setPhase("countdown");
  };

  const Game = game === "match" ? MatchGame : RainGame;
  const ready = !!pool && pool.words.length >= MIN_GAME_WORDS;

  return (
    <>
      <AppHeaderContent>
        <AppBreadcrumbs
          segments={[
            { label: "Games", path: "/games" },
            { label: GAMES[game].name },
          ]}
        />
        <Button
          variant="ghost"
          leftSection={<IconX />}
          onClick={() => navigate("/games")}
        >
          Stop
        </Button>
      </AppHeaderContent>
      <div className={`games-play games-play--${game}`}>
        {pool && !ready && (
          <Paper withBorder className="games-view__empty">
            <p>{NOT_ENOUGH}</p>
          </Paper>
        )}
        {phase === "countdown" && ready && (
          <div className="games-play__countdown" key={count}>
            <span className="games-play__count">
              {count > 0 ? count : "Mulai!"}
            </span>
            <span className="games-play__count-label">{GAMES[game].name}</span>
          </div>
        )}
        {phase === "playing" && (
          <Game key={round} words={words} sound={sound} onFinish={finish} />
        )}
        {phase === "done" && result && (
          <GameResults
            result={result}
            previousBest={previousBest}
            onReplay={replay}
          />
        )}
      </div>
    </>
  );
}
