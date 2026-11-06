import "./AnswerCardButton.css";

const BASE = "answer-card-button";

interface AnswerCardButtonProps {
  label: string;
  timeInfo: string;
  color: string;
  /** Keyboard shortcut, shown on devices with a mouse. */
  shortcut?: string;
  action: Function;
}

export default function AnswerCardButton({
  label,
  timeInfo,
  color,
  shortcut,
  action,
}: AnswerCardButtonProps) {
  return (
    <button
      type="button"
      className={`${BASE} ${BASE}--${color}`}
      onClick={() => action()}
      aria-keyshortcuts={shortcut}
    >
      {shortcut && <kbd className={`${BASE}__key`}>{shortcut}</kbd>}
      <span className={`${BASE}__time-info`}>{timeInfo}</span>
      <span className={`${BASE}__label`}>{label}</span>
    </button>
  );
}
