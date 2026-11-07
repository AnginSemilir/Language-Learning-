// Hujan Kata: words fall like rain over the sea. Tap the one that means the
// word in the cloud before it lands in the water. The sooner you catch it,
// the more it's worth; a run of catches multiplies the score (up to ×4). A
// wrong word or a missed one costs a heart; three hearts and it's over. The
// rain gets faster as you go.

import { speak } from "@/lector/tts";
import { type GameWord, shuffled } from "@/logic/game/gameWords";
import { IconHeartFilled } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { sfx } from "./sfx";
import { type GameProps, cheer, multiplier } from "./types";
import "./RainGame.css";

const HEARTS = [1, 2, 3];
/** Seconds for a drop to fall, at first and at its fastest. */
const SLOWEST = 7;
const FASTEST = 3.2;

type DropState = "falling" | "caught" | "wrong" | "gone";

interface Drop {
  key: string;
  word: GameWord;
  lane: number;
  /** Seconds after the round starts that the drop starts falling. */
  delay: number;
  state: DropState;
}

interface Round {
  index: number;
  target: GameWord;
  lanes: number;
  /** Seconds a drop takes to fall. */
  fall: number;
  drops: Drop[];
  startedAt: number;
}

const withState = (drop: Drop, state: DropState): Drop => ({ ...drop, state });

function makeRound(
  index: number,
  words: GameWord[],
  previous?: GameWord
): Round {
  const lanes = Math.min(index < 6 ? 3 : 4, words.length);
  const choices = words.filter((w) => w.id !== previous?.id);
  const target = choices[Math.floor(Math.random() * choices.length)];
  const others = shuffled(words.filter((w) => w.id !== target.id));
  const inRound = shuffled([target, ...others.slice(0, lanes - 1)]);
  const delays = shuffled([0, 0.6, 1.2, 1.8].slice(0, lanes));
  return {
    index,
    target,
    lanes,
    fall: Math.max(FASTEST, SLOWEST - index * 0.22),
    drops: inRound.map(
      (word, lane): Drop => ({
        key: `${index}-${word.id}`,
        word,
        lane,
        delay: delays[lane],
        state: "falling",
      })
    ),
    startedAt: Date.now(),
  };
}

export default function RainGame({ words, sound, onFinish }: GameProps) {
  const [round, setRound] = useState(() => makeRound(0, words));
  const [hearts, setHearts] = useState(HEARTS.length);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [missed, setMissed] = useState<GameWord[]>([]);
  const [message, setMessage] = useState<{ id: number; text: string }>();
  const [paused, setPaused] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (hearts > 0 || finished.current) return;
    finished.current = true;
    if (sound) sfx.end();
    const result = { score, correct, mistakes, bestCombo, missed };
    const timer = setTimeout(() => onFinish({ game: "rain", ...result }), 900);
    return () => clearTimeout(timer);
  }, [hearts]);

  const show = (text: string) => setMessage({ id: Date.now(), text });

  const nextRound = (after: number) => {
    setTimeout(() => {
      if (finished.current) return;
      setRound((r) => makeRound(r.index + 1, words, r.target));
    }, after);
  };

  const markDrop = (key: string, state: DropState) =>
    setRound((r) => ({
      ...r,
      drops: r.drops.map((d) => (d.key === key ? withState(d, state) : d)),
    }));

  const remember = (word: GameWord) =>
    setMissed((list) =>
      list.some((w) => w.id === word.id) ? list : [...list, word]
    );

  const loseHeart = () => {
    setHearts((h) => h - 1);
    setCombo(0);
  };

  const tap = (drop: Drop) => {
    if (drop.state !== "falling" || hearts <= 0) return;
    if (drop.word.id === round.target.id) {
      // Caught early: up to 10 extra points.
      const fell = (Date.now() - round.startedAt) / 1000 - drop.delay;
      const early = Math.max(0, Math.min(1, 1 - fell / round.fall));
      const run = combo + 1;
      const points = (10 + Math.round(early * 10)) * multiplier(run, 4);
      setScore((s) => s + points);
      setCombo(run);
      setBestCombo((b) => Math.max(b, run));
      setCorrect((c) => c + 1);
      show(cheer(run) ?? `+${points}`);
      if (sound) {
        if (run % 3 === 0) sfx.combo(run / 3);
        else sfx.right();
        speak(drop.word.term);
      }
      setRound((r) => ({
        ...r,
        drops: r.drops.map((d) =>
          withState(d, d.key === drop.key ? "caught" : "gone")
        ),
      }));
      nextRound(520);
    } else {
      markDrop(drop.key, "wrong");
      setMistakes((m) => m + 1);
      remember(round.target);
      loseHeart();
      show(`${drop.word.term} = ${drop.word.meaning}`);
      if (sound) sfx.wrong();
    }
  };

  /** A drop reached the sea. */
  const landed = (drop: Drop) => {
    if (drop.state !== "falling") return;
    markDrop(drop.key, "gone");
    if (drop.word.id !== round.target.id || hearts <= 0) return;
    remember(round.target);
    loseHeart();
    setMistakes((m) => m + 1);
    show(`${round.target.term} = ${round.target.meaning}`);
    if (sound) sfx.wrong();
    nextRound(1100);
  };

  const classes = [
    "rain",
    paused && "rain--paused",
    hearts <= 0 && "rain--over",
  ]
    .filter(Boolean)
    .join(" ");
  const visible = round.drops.filter((d) => d.state !== "gone");

  return (
    <div className={classes}>
      <div className="rain__hud">
        <div className="rain__hearts" aria-label={`${hearts} hearts left`}>
          {HEARTS.map((n) => (
            <IconHeartFilled
              key={n}
              className={n <= hearts ? "rain__heart" : "rain__heart--lost"}
              size={22}
            />
          ))}
        </div>
        <div className="rain__score" aria-live="polite">
          <span className="rain__score-value">{score}</span>
          {combo >= 3 && (
            <span className="rain__combo">×{multiplier(combo, 4)}</span>
          )}
        </div>
      </div>

      <div className="rain__sky">
        <div className="rain__cloud" key={round.index}>
          <span className="rain__cloud-label">Which word means</span>
          <span className="rain__cloud-word">{round.target.meaning}</span>
        </div>

        {visible.map((drop) => (
          <button
            type="button"
            key={drop.key}
            className={`rain__drop rain__drop--${drop.state}`}
            style={{
              left: `${((drop.lane + 0.5) / round.lanes) * 100}%`,
              animationDuration: `${round.fall}s`,
              animationDelay: `${drop.delay}s`,
            }}
            onClick={() => tap(drop)}
            onAnimationEnd={(e) => {
              if (e.animationName === "rain-fall") landed(drop);
            }}
            lang="id"
          >
            <span className="rain__bubble">{drop.word.term}</span>
          </button>
        ))}

        {message && (
          <span key={message.id} className="rain__message">
            {message.text}
          </span>
        )}

        <div className="rain__sea" aria-hidden="true">
          <div className="rain__wave" />
          <div className="rain__wave rain__wave--back" />
        </div>
      </div>
      <p className="rain__help">
        Catch the word before it reaches the sea. Sooner is worth more.
      </p>
    </div>
  );
}
