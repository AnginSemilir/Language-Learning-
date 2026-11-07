// Kejutan! The surprises of Pulau Kata, shown over the page: what's new on
// the island since you last looked, a message in a bottle, and the next
// chapter of the island's secret.

import { Button } from "@/components/ui";
import type { Found, Proverb } from "@/logic/game/discoveries";
import type { StoryStep } from "@/logic/game/story";
import { IconX } from "@tabler/icons-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import DiscoveryArt, { artFor } from "./DiscoveryArt";
import "./Kejutan.css";
import { Said } from "./Said";
import { MapPieces } from "./StoryPanel";

/** A card over the page, closed with the button, Escape or a tap outside. */
export function Overlay({
  label,
  tone = "surprise",
  onClose,
  children,
}: {
  label: string;
  tone?: "surprise" | "secret";
  onClose: () => void;
  children: ReactNode;
}) {
  const card = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  // On opening: focus the main button, close on Escape; on closing, give
  // the focus back to where it was.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    card.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, []);
  return (
    <div className={`kejutan kejutan--${tone}`}>
      <button
        type="button"
        className="kejutan__backdrop"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={card}
        className="kejutan__card"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="kejutan__rays" aria-hidden="true" />
        <button
          type="button"
          className="kejutan__close"
          aria-label="Close"
          onClick={onClose}
        >
          <IconX size={18} />
        </button>
        <div className="kejutan__content">{children}</div>
      </div>
    </div>
  );
}

const KICKER: Record<Found["kind"], [string, string]> = {
  level: ["Naik level!", "Level up!"],
  animal: ["Penghuni baru!", "A new neighbour!"],
  visitor: ["Ada tamu!", "A visitor!"],
  proverb: ["Pesan dalam botol", "A message in a bottle"],
  celebration: ["Perayaan!", "A celebration!"],
  story: ["Rahasia…", "A secret…"],
};

function FoundCard({ found }: { found: Found }) {
  const [kicker, kickerEn] = KICKER[found.kind];
  const level = found.kind === "level" ? found.id.replace("level-", "") : "";
  return (
    <>
      <p className="kejutan__kicker">
        {kicker} <span>{level ? `Level ${level}` : kickerEn}</span>
      </p>
      <DiscoveryArt
        id={artFor(found.id, found.word)}
        className="kejutan__art"
      />
      {found.kind !== "proverb" && (
        <>
          <h2 className="kejutan__word" lang="id">
            {found.word}
          </h2>
          <p className="kejutan__meaning">{found.meaning}</p>
        </>
      )}
      <Said text={found.line} en={found.lineEn} className="kejutan__said" />
      {found.kind === "proverb" && (
        <p className="kejutan__meaning">{found.meaning}</p>
      )}
    </>
  );
}

/** What's new on the island, one at a time. */
export function DiscoveryReveal({
  items,
  onDone,
}: {
  items: Found[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const found = items[Math.min(index, items.length - 1)];
  const last = index >= items.length - 1;
  const next = () => (last ? onDone() : setIndex((i) => i + 1));
  return (
    <Overlay label="Kejutan" onClose={onDone}>
      <FoundCard key={found.id} found={found} />
      <div className="kejutan__actions">
        {items.length > 1 && (
          <span className="kejutan__count">
            {index + 1} / {items.length}
          </span>
        )}
        <Button variant="primary" onClick={next} data-autofocus>
          {last ? "Selesai" : "Lanjut"}
        </Button>
      </div>
    </Overlay>
  );
}

const SUMMARY_LIMIT = 12;

const FIRST_VISIT =
  "While you studied, these came to the island. From now on, each new one is a surprise.";

/** The first visit: everything that came while you studied, all at once. */
export function FirstVisit({
  items,
  onDone,
}: {
  items: Found[];
  onDone: () => void;
}) {
  const shown = items.filter((f) => f.kind !== "level").slice(0, SUMMARY_LIMIT);
  const levels = items.filter((f) => f.kind === "level").length;
  const more = items.length - levels - shown.length;
  return (
    <Overlay label="Kejutan" onClose={onDone}>
      <p className="kejutan__kicker">
        Kejutan! <span>Surprises</span>
      </p>
      <h2 className="kejutan__title">Pulau Kata has been busy</h2>
      <p className="kejutan__meaning">{FIRST_VISIT}</p>
      <ul className="kejutan__grid">
        {shown.map((f) => (
          <li key={f.id}>
            <DiscoveryArt id={artFor(f.id, f.word)} />
            <span lang="id">
              {f.kind === "proverb" ? "peribahasa" : f.word}
            </span>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="kejutan__more">{`…and ${more} more.`}</p>}
      <div className="kejutan__actions">
        <Button variant="primary" onClick={onDone} data-autofocus>
          Lihat pulaumu
        </Button>
      </div>
    </Overlay>
  );
}

/** A proverb from the bottle on the beach. */
export function ProverbReveal({
  proverb,
  counts,
  onClose,
}: {
  proverb: Proverb;
  /** Whether it goes into the collection (today is a study day). */
  counts: boolean;
  onClose: () => void;
}) {
  return (
    <Overlay label="Pesan dalam botol" onClose={onClose}>
      <p className="kejutan__kicker">
        Pesan dalam botol <span>A message in a bottle</span>
      </p>
      <DiscoveryArt id="peribahasa" className="kejutan__art" />
      <Said text={proverb.text} en={proverb.literal} />
      <p className="kejutan__meaning">{proverb.meaning}</p>
      {!counts && (
        <p className="kejutan__note">
          Study today to keep this proverb in your collection.
        </p>
      )}
      <div className="kejutan__actions">
        <Button variant="primary" onClick={onClose} data-autofocus>
          Simpan
        </Button>
      </div>
    </Overlay>
  );
}

/** A chapter of the island's secret, just found. */
export function StoryReveal({
  step,
  mapPieces,
  onClose,
  children,
}: {
  step: StoryStep;
  mapPieces: number;
  onClose: () => void;
  /** What comes straight after: a riddle to answer. */
  children?: ReactNode;
}) {
  return (
    <Overlay label={step.title} tone="secret" onClose={onClose}>
      <p className="kejutan__kicker">
        {`Bab ${step.chapter}`} <span>Rahasia Pulau Kata</span>
      </p>
      <h2 className="kejutan__title" lang="id">
        {step.title}
      </h2>
      {step.mapPiece && (
        <MapPieces pieces={mapPieces} className="kejutan__map" fresh />
      )}
      <Said text={step.text} en={step.textEn} />
      {children}
      {!children && (
        <div className="kejutan__actions">
          <Button variant="primary" onClick={onClose} data-autofocus>
            Lanjut
          </Button>
        </div>
      )}
    </Overlay>
  );
}
