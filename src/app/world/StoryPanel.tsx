// Rahasia Pulau Kata: where the island's secret stands, the old map pieced
// together so far, the latest chapter, a nudge (or a riddle) for the next
// one, and a notebook of the chapters before.

import { Button } from "@/components/ui";
import {
  type StoryState,
  type StoryStep,
  checkAnswer,
  riddleHint,
} from "@/logic/game/story";
import { IconLock } from "@tabler/icons-react";
import { type FormEvent, useId, useState } from "react";
import { Said } from "./Said";
import "./StoryPanel.css";

/** Which quarter of the map each piece is: left, right; top, bottom. */
const QUARTERS: [number, number][] = [
  [0, 0],
  [0, 40],
  [60, 40],
  [60, 0],
];

/** The old map, with the pieces found so far; the X shows when it's whole. */
export function MapPieces({
  pieces,
  fresh = false,
  className = "",
}: {
  pieces: number;
  /** The last piece was just found: it glows. */
  fresh?: boolean;
  className?: string;
}) {
  const uid = `map${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const found = QUARTERS.slice(0, pieces);
  const missing = QUARTERS.slice(pieces);
  const whole = pieces >= QUARTERS.length;
  return (
    <svg
      className={`map-pieces ${className}`}
      viewBox="0 0 120 80"
      role="img"
      aria-label={`The old map: ${pieces} of 4 pieces`}
    >
      <defs>
        <clipPath id={`${uid}-found`}>
          {found.map(([x, y]) => (
            <rect key={`${x} ${y}`} x={x} y={y} width="60" height="40" />
          ))}
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-found)`}>
        <rect width="120" height="80" fill="#f4e4c1" />
        <path
          d="M10 70c6 -2 12 -2 18 0M86 12c6 -2 12 -2 18 0M92 72c6 -2 12 -2 18 0"
          stroke="#9cc4d4"
          strokeWidth="0.8"
        />
        <path
          d="M14 52C18 36 36 26 60 24C84 22 104 32 108 48C110 58 96 64 60 64C30 64 12 62 14 52Z"
          fill="#ead6aa"
          stroke="#8a5a2b"
          strokeWidth="0.8"
        />
        <path d="M48 40L60 22L72 40" stroke="#8a5a2b" strokeWidth="0.9" />
        <path
          d="M98 46v-12h4v12M97 34h6l-3 -3z"
          fill="#f4e4c1"
          stroke="#8a5a2b"
          strokeWidth="0.6"
        />
        <path d="M76 58l3 -5l3 5z" fill="#e8553f" />
        <path
          d="M79 56Q92 62 100 50Q104 40 96 38Q76 30 62 32"
          stroke="#b5532a"
          strokeWidth="0.7"
          strokeDasharray="2 2"
        />
        <g transform="translate(14 14)">
          <path d="M0 -7l2 7l-2 7l-2 -7z" fill="#8a5a2b" />
          <text className="map-pieces__n" y="-8.5" textAnchor="middle">
            U
          </text>
        </g>
        <path
          className={whole ? "map-pieces__x" : undefined}
          d="M55 24l10 10M65 24l-10 10"
          stroke="#d62828"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
      {missing.map(([x, y]) => (
        <g key={`${x} ${y}`}>
          <rect
            x={x + 1}
            y={y + 1}
            width="58"
            height="38"
            rx="2"
            className="map-pieces__missing"
          />
          <text
            className="map-pieces__q"
            x={x + 30}
            y={y + 25}
            textAnchor="middle"
          >
            ?
          </text>
        </g>
      ))}
      {fresh && pieces > 0 && (
        <rect
          className="map-pieces__fresh"
          x={QUARTERS[pieces - 1][0] + 1}
          y={QUARTERS[pieces - 1][1] + 1}
          width="58"
          height="38"
          rx="2"
        />
      )}
    </svg>
  );
}

const WRONG = "Belum tepat. Coba lagi!";
const IN_ENGLISH = "Betul! Tapi dalam bahasa Indonesia?";

/** A riddle to answer in Indonesian, with hints after wrong guesses. */
export function RiddleForm({
  step,
  onSolved,
}: {
  step: StoryStep;
  onSolved: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputId = useId();
  if (!step.riddle) return null;
  const [riddle, riddleEn] = step.riddle;
  const hint = riddleHint(step, wrong);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    const result = checkAnswer(step, answer);
    if (result === "right") {
      setFeedback(null);
      onSolved();
    } else if (result === "english") {
      setFeedback(IN_ENGLISH);
    } else {
      setWrong((w) => w + 1);
      setFeedback(WRONG);
    }
  };

  return (
    <div className="riddle">
      <p className="riddle__label">
        Teka-teki <span>A riddle</span>
      </p>
      <Said text={riddle} en={riddleEn} className="riddle__question" />
      <form className="riddle__form" onSubmit={submit}>
        <input
          id={inputId}
          aria-label="Your answer, in Indonesian"
          className="riddle__input"
          lang="id"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Jawabanmu…"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          data-autofocus
        />
        <Button type="submit" variant="primary">
          Jawab
        </Button>
      </form>
      {feedback && (
        <p className="riddle__feedback" aria-live="polite">
          {feedback}
        </p>
      )}
      {hint && <p className="riddle__hint">{hint}</p>}
    </div>
  );
}

const LOCKED =
  "Ada sesuatu yang tersembunyi di pulau ini… Something is hidden on this island. Reach level 2 to start looking.";

/** The island's secret, on the island page. */
export default function StoryPanel({
  story,
  onSolve,
}: {
  story: StoryState;
  /** A riddle answered: the step to mark done. */
  onSolve: (step: StoryStep) => void;
}) {
  const latest = story.done[story.done.length - 1];
  const next = story.next;
  const earlier = story.done.slice(0, -1).reverse();
  const riddle = next?.trigger.kind === "riddle" && story.ready ? next : null;

  return (
    <section className="secret">
      <header className="secret__head">
        <div>
          <h2 className="secret__title">
            Rahasia Pulau Kata <span>The island's secret</span>
          </h2>
          {latest && (
            <p className="secret__chapter">
              {`Bab ${latest.chapter} · ${latest.titleEn}`}
            </p>
          )}
        </div>
        <MapPieces pieces={story.mapPieces} className="secret__map" />
      </header>

      {!latest && (
        <p className="secret__locked">
          <IconLock size={16} />
          {LOCKED}
        </p>
      )}

      {latest && (
        <article className="secret__latest">
          <h3 className="secret__latest-title" lang="id">
            {latest.title}
          </h3>
          <Said text={latest.text} en={latest.textEn} />
        </article>
      )}

      {riddle && <RiddleForm step={riddle} onSolved={() => onSolve(riddle)} />}

      {latest && next && !riddle && (
        <div className="secret__clue">
          <p className="secret__clue-label">
            Petunjuk <span>Clue</span>
          </p>
          <p className="secret__clue-id" lang="id">
            {next.clue}
          </p>
          <p className="secret__clue-en">{next.clueEn}</p>
        </div>
      )}

      {story.finished && (
        <p className="secret__end" lang="id">
          Tamat… atau belum? <span>The end… or is it?</span>
        </p>
      )}

      {earlier.length > 0 && (
        <details className="secret__notebook">
          <summary>{`Buku catatan · ${earlier.length} earlier`}</summary>
          <ol>
            {earlier.map((step) => (
              <li key={step.id}>
                <strong lang="id">{`Bab ${step.chapter}: ${step.title}`}</strong>
                <Said text={step.text} en={step.textEn} />
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
