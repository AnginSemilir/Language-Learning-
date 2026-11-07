// How many of the top 1,000 / 2,000 / 5,000 / 10,000 Indonesian words you know.
// Each row opens the list of those words by frequency.
import { Progress, Text } from "@/components/ui";
import { BANDS } from "@/lector/frequency";
import { IconChevronRight } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { BandCoverage } from "./useFrequency";
import "./reading.css";

/** One decimal under 10% (0.2%), whole numbers above (62%). */
export function formatPercent(known: number, total: number) {
  const pct = (known / total) * 100;
  return `${pct > 0 && pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}

export default function KnownCoverage({
  coverage,
  error,
}: {
  coverage: BandCoverage[] | null;
  error?: boolean;
}) {
  const navigate = useNavigate();
  if (error) {
    return <Text size="sm">The word-frequency list could not be loaded.</Text>;
  }
  return (
    <div className="known-coverage">
      {(coverage ?? BANDS.map((band) => ({ band, known: 0 }))).map(
        ({ band, known }) => {
          const pct = Math.round((known / band) * 100);
          return (
            <button
              key={band}
              type="button"
              className="known-coverage__row"
              onClick={() => navigate(`/read/known/top/${band}`)}
              disabled={!coverage}
            >
              <span className="known-coverage__label">
                {/* One string: the React Compiler dropped the space in "Top {band}". */}
                {`Top ${band.toLocaleString()} words`}
              </span>
              <span className="known-coverage__value">
                {coverage ? formatPercent(known, band) : "…"}
              </span>
              <IconChevronRight size={16} className="known-coverage__chevron" />
              <Progress
                value={coverage ? pct : 0}
                className="known-coverage__bar"
              />
              <span className="known-coverage__detail">
                {coverage
                  ? `${known.toLocaleString()} of ${band.toLocaleString()} known`
                  : "Loading…"}
              </span>
            </button>
          );
        }
      )}
    </div>
  );
}
