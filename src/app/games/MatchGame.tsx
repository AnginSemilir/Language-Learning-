// Cocok! Match each Indonesian word to its meaning before the minute is up.
// A right pair scores more the longer your run (×2 from 3 in a row, up to
// ×5) and every fifth in a row adds 3 seconds; a wrong pair costs 2 seconds
// and ends the run. Matched pairs are replaced at once by new words.

import { speak } from "@/lector/tts";
import { type GameWord, shuffled } from "@/logic/game/gameWords";
import { IconClock } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { sfx } from "./sfx";
import { type GameProps, cheer, multiplier } from "./types";
import { useGameClock } from "./useGameClock";
import "./MatchGame.css";

const DURATION_MS = 60000;
const BOARD = 5;
const PENALTY_MS = 2000;
const BONUS_MS = 3000;

type Side = "left" | "right";

interface Flash {
  left: number;
  right: number;
  kind: "right" | "wrong";
}

interface Popup {
  id: number;
  text: string;
  kind: "points" | "time" | "penalty" | "cheer";
}

export default function MatchGame({ words, sound, onFinish }: GameProps) {
  const size = Math.min(BOARD, words.length);
  const [left, setLeft] = useState<GameWord[]>(() => words.slice(0, size));
  const [right, setRight] = useState<GameWord[]>(() =>
    shuffled(words.slice(0, size))
  );
  // Words still to come; refilled (shuffled again) when used up.
  const queue = useRef<GameWord[]>(words.slice(size));
  const [selected, setSelected] = useState<{ side: Side; index: number }>();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [missed, setMissed] = useState<GameWord[]>([]);
  const [popup, setPopup] = useState<Popup | null>(null);
  const clock = useGameClock(DURATION_MS);
  const finished = useRef(false);

  const say = (text: string, kind: Popup["kind"]) =>
    setPopup({ id: Date.now(), text, kind });

  // The last ten seconds tick.
  const seconds = Math.ceil(clock.left / 1000);
  useEffect(() => {
    if (sound && seconds > 0 && seconds <= 10) sfx.tick();
  }, [seconds, sound]);

  useEffect(() => {
    if (clock.left > 0 || finished.current) return;
    finished.current = true;
    if (sound) sfx.end();
    onFinish({ game: "match", score, correct, mistakes, bestCombo, missed });
  }, [clock.left]);

  /** The next word from the queue that isn't on the board. */
  const draw = (board: GameWord[]): GameWord | undefined => {
    const onBoard = new Set(board.map((w) => w.id));
    for (let tries = 0; tries < 2; tries++) {
      const i = queue.current.findIndex((w) => !onBoard.has(w.id));
      if (i >= 0) return queue.current.splice(i, 1)[0];
      queue.current = shuffled(words);
    }
    return undefined;
  };

  const settle = (li: number, ri: number) => {
    setFlash(null);
    const fresh = draw(left);
    if (!fresh) {
      // Too few words to bring in new ones: shuffle the board instead.
      setLeft(shuffled(left));
      setRight(shuffled(right));
      return;
    }
    queue.current.push(left[li]);
    const nextLeft = [...left];
    const nextRight = [...right];
    nextLeft[li] = fresh;
    nextRight[ri] = fresh;
    // Keep the meanings shuffled: the new one swaps with a random other.
    const j = Math.floor(Math.random() * nextRight.length);
    [nextRight[ri], nextRight[j]] = [nextRight[j], nextRight[ri]];
    setLeft(nextLeft);
    setRight(nextRight);
  };

  const check = (li: number, ri: number) => {
    const word = left[li];
    if (word.id === right[ri].id) {
      const run = combo + 1;
      const points = 10 * multiplier(run, 5);
      setScore((s) => s + points);
      setCombo(run);
      setBestCombo((b) => Math.max(b, run));
      setCorrect((c) => c + 1);
      setFlash({ left: li, right: ri, kind: "right" });
      const praise = cheer(run);
      if (run % 5 === 0) {
        clock.add(BONUS_MS);
        say("+3 s", "time");
      } else if (praise) {
        say(praise, "cheer");
      } else {
        say(`+${points}`, "points");
      }
      if (sound) {
        if (run % 3 === 0) sfx.combo(run / 3);
        else sfx.right();
        speak(word.term);
      }
      setTimeout(() => settle(li, ri), 260);
    } else {
      setCombo(0);
      setMistakes((m) => m + 1);
      setMissed((list) =>
        list.some((w) => w.id === word.id) ? list : [...list, word]
      );
      clock.add(-PENALTY_MS);
      say("−2 s", "penalty");
      if (sound) sfx.wrong();
      setFlash({ left: li, right: ri, kind: "wrong" });
      setTimeout(() => setFlash(null), 420);
    }
    setSelected(undefined);
  };

  const tap = (side: Side, index: number) => {
    if (flash || clock.left <= 0) return;
    if (!selected || selected.side === side) {
      setSelected({ side, index });
      return;
    }
    const li = side === "left" ? index : selected.index;
    const ri = side === "right" ? index : selected.index;
    check(li, ri);
  };

  const tileClass = (side: Side, index: number) => {
    const classes = [
      "match__tile",
      side === "left" ? "match__tile--word" : "match__tile--meaning",
    ];
    if (selected?.side === side && selected.index === index) {
      classes.push("match__tile--selected");
    }
    if (flash && flash[side] === index) {
      classes.push(
        flash.kind === "right" ? "match__tile--correct" : "match__tile--wrong"
      );
    }
    return classes.join(" ");
  };

  const timeShare = Math.max(0, Math.min(1, clock.left / DURATION_MS));

  return (
    <div className={`match ${clock.paused ? "match--paused" : ""}`}>
      <div className="match__hud">
        <div className="match__time" aria-label={`${seconds} seconds left`}>
          <IconClock size={18} />
          <span className={seconds <= 10 ? "match__seconds--low" : ""}>
            {seconds}
          </span>
        </div>
        <div className="match__score" aria-live="polite">
          <span className="match__score-value">{score}</span>
          {combo >= 3 && (
            <span className="match__combo">×{multiplier(combo, 5)}</span>
          )}
        </div>
      </div>
      <div className="match__timer" aria-hidden="true">
        <div
          className={
            seconds <= 10 ? "match__timer-fill--low" : "match__timer-fill"
          }
          style={{ width: `${timeShare * 100}%` }}
        />
      </div>

      <div className="match__board">
        <div className="match__column">
          {left.map((word, i) => (
            <button
              type="button"
              key={`${word.id}-l`}
              className={tileClass("left", i)}
              onClick={() => tap("left", i)}
              lang="id"
            >
              {word.term}
            </button>
          ))}
        </div>
        <div className="match__column">
          {right.map((word, i) => (
            <button
              type="button"
              key={`${word.id}-r`}
              className={tileClass("right", i)}
              onClick={() => tap("right", i)}
            >
              {word.meaning}
            </button>
          ))}
        </div>
        {popup && (
          <span
            key={popup.id}
            className={`match__popup match__popup--${popup.kind}`}
          >
            {popup.text}
          </span>
        )}
      </div>
      <p className="match__help">
        Tap a word, then its meaning. Five in a row adds three seconds.
      </p>
    </div>
  );
}
