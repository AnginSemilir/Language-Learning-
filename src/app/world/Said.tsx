// A line in Indonesian, with a button to hear it and one to show the
// English: read first, then check.

import { speak } from "@/lector/tts";
import { IconVolume } from "@tabler/icons-react";
import { useState } from "react";
import "./Said.css";

/** Indonesian with a button to hear it and one to show the English. */
export function Said({
  text,
  en,
  className = "",
}: {
  text: string;
  en: string;
  className?: string;
}) {
  const [english, setEnglish] = useState(false);
  return (
    <div className={`said ${className}`}>
      <p className="said__id" lang="id">
        {text}
      </p>
      <div className="said__tools">
        <button
          type="button"
          className="said__tool"
          onClick={() => speak(text)}
          aria-label="Listen"
        >
          <IconVolume size={16} />
        </button>
        <button
          type="button"
          className="said__tool"
          onClick={() => setEnglish((open) => !open)}
          aria-expanded={english}
        >
          {english ? "Hide English" : "English"}
        </button>
      </div>
      {english && <p className="said__en">{en}</p>}
    </div>
  );
}
