import { Button } from "@/components/ui";
import { speak } from "@/lector/tts";
import { XP } from "@/logic/game/progress";
import {
  IconArrowLeft,
  IconRefresh,
  IconTrees,
  IconTrophy,
  IconVolume,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { GameResult } from "./types";

const CONFETTI = [
  "#f97316",
  "#facc15",
  "#22c55e",
  "#38bdf8",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#f472b6",
];

interface GameResultsProps {
  result: GameResult;
  /** The best score before this game; undefined while it's being saved. */
  previousBest: number | undefined;
  onReplay: () => void;
}

export default function GameResults({
  result,
  previousBest,
  onReplay,
}: GameResultsProps) {
  const navigate = useNavigate();
  const newBest =
    previousBest !== undefined &&
    result.score > 0 &&
    result.score > previousBest;
  let note = "points";
  if (!newBest && previousBest) note = `points · best ${previousBest}`;
  const answers = result.correct + result.mistakes;
  const accuracy = answers ? Math.round((result.correct / answers) * 100) : 0;
  const xp = Math.floor(result.score / XP.gamePointsPerXp);
  const title = result.game === "match" ? "Waktu habis!" : "Selesai!";
  const subtitle = result.game === "match" ? "Time's up!" : "Game over!";

  return (
    <div className="game-results">
      {newBest && (
        <div className="game-results__confetti" aria-hidden="true">
          {CONFETTI.map((color, i) => (
            <span
              key={color}
              style={{
                backgroundColor: color,
                left: `${8 + i * 12}%`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      )}
      <h1 className="game-results__title">
        {title} <span>{subtitle}</span>
      </h1>
      <div className="game-results__score">
        <span className="game-results__score-value">{result.score}</span>
        <span className="game-results__score-label">
          {newBest && <IconTrophy size={16} />}
          {newBest ? "New best score!" : note}
        </span>
      </div>

      <div className="game-results__stats">
        <div>
          <strong>{result.correct}</strong>
          <span>right</span>
        </div>
        <div>
          <strong>{result.bestCombo}</strong>
          <span>best run</span>
        </div>
        <div>
          <strong>{accuracy}%</strong>
          <span>accuracy</span>
        </div>
      </div>

      <button
        type="button"
        className="game-results__xp"
        onClick={() => navigate("/world")}
      >
        <IconTrees size={20} />
        <span>
          <strong>+{xp} XP</strong> for your island
        </span>
      </button>

      {result.missed.length > 0 && (
        <section className="game-results__missed">
          <h2>
            Words to look at again <span lang="id">Kata untuk diulang</span>
          </h2>
          <ul>
            {result.missed.map((word) => (
              <li key={word.id}>
                <button
                  type="button"
                  className="game-results__speak"
                  onClick={() => speak(word.term)}
                  aria-label={`Hear ${word.term}`}
                >
                  <IconVolume size={16} />
                </button>
                <span className="game-results__term" lang="id">
                  {word.term}
                </span>
                <span className="game-results__meaning">{word.fullMeaning}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="game-results__actions">
        <Button
          variant="primary"
          size="lg"
          leftSection={<IconRefresh />}
          onClick={onReplay}
        >
          Play again
        </Button>
        <Button
          variant="ghost"
          leftSection={<IconArrowLeft />}
          onClick={() => navigate("/games")}
        >
          All games
        </Button>
      </div>
    </div>
  );
}
