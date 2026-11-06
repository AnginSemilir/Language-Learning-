// A single-series column chart in SVG: thin bars (at most 24px) with rounded
// tops on one baseline and a 2px gap between neighbours, a hairline grid, a
// tooltip on hover, tap or keyboard focus (the whole column is the target),
// optional emphasis on one bar with the rest in grey, and a table view.

import { useEffect, useRef, useState } from "react";
import "./BarChart.css";

export interface BarChartProps {
  /** One value per bar; null draws no bar (e.g. too little data). */
  values: (number | null)[];
  /** Each bar's name, for the tooltip and the table. */
  labels: string[];
  /** Labels under the axis, at these bar positions. */
  xTicks: { index: number; label: string }[];
  formatValue?: (value: number) => string;
  /** Fixed top of the scale (e.g. 100 for percentages); otherwise from the data. */
  yMax?: number;
  /** Highlight this bar and grey the others. */
  emphasis?: number | null;
  /** Bars whose value is printed above them (sparingly). */
  labelled?: number[];
  /** Text for the "null" bars in the tooltip and table. */
  emptyText?: string;
  /** Accessible name of the chart. */
  title: string;
  /** Column headings of the table view. */
  tableHeadings: [string, string];
  height?: number;
}

const LEFT = 40;
const TOP = 18;
const BOTTOM = 22;
const MAX_BAR = 24;
const GAP = 2;

/** A round top for the scale; counts get a whole number that halves evenly. */
function niceMax(max: number) {
  if (max <= 1) return 2;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 4, 5, 10]) {
    const top = step * pow;
    if (top >= max && Number.isInteger(top / 2)) return top;
  }
  return 10 * pow;
}

/** A bar with a rounded top and a square base. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export function BarChart({
  values,
  labels,
  xTicks,
  formatValue = (v) => v.toLocaleString(),
  yMax,
  emphasis = null,
  labelled = [],
  emptyText = "—",
  title,
  tableHeadings,
  height = 170,
}: BarChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const max = yMax ?? niceMax(Math.max(0, ...values.map((v) => v ?? 0)));
  const plotW = Math.max(0, width - LEFT);
  const plotH = height - TOP - BOTTOM;
  const band = values.length ? plotW / values.length : 0;
  const barW = Math.max(2, Math.min(MAX_BAR, band - GAP));
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];

  const show = (i: number) => setActive(i);
  const hide = () => setActive(null);
  const activeValue = active === null ? null : values[active];

  return (
    <div className="bar-chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={title}
          className="bar-chart__svg"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                className="bar-chart__grid"
                x1={LEFT}
                x2={width}
                y1={y(t)}
                y2={y(t)}
              />
              <text
                className="bar-chart__axis-label"
                x={LEFT - 6}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {formatValue(t)}
              </text>
            </g>
          ))}
          {values.map((v, i) => {
            const x = LEFT + i * band + (band - barW) / 2;
            const muted = emphasis !== null && emphasis !== i;
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a button; it takes focus for the tooltip.
              <g
                // biome-ignore lint/suspicious/noArrayIndexKey: bars are positions on a fixed axis.
                key={i}
                className={`bar-chart__bar${active === i ? " bar-chart__bar--active" : ""}${muted ? " bar-chart__bar--muted" : ""}`}
                tabIndex={0}
                role="button"
                aria-label={`${labels[i]}: ${v === null ? emptyText : formatValue(v)}`}
                onPointerEnter={() => show(i)}
                onPointerDown={() => show(i)}
                onPointerLeave={hide}
                onFocus={() => show(i)}
                onBlur={hide}
              >
                <rect
                  className="bar-chart__hit"
                  x={LEFT + i * band}
                  y={TOP}
                  width={band}
                  height={plotH}
                />
                {v !== null && v > 0 && (
                  <path d={barPath(x, y(v), barW, TOP + plotH - y(v))} />
                )}
                {v !== null && labelled.includes(i) && (
                  <text
                    className="bar-chart__value"
                    x={x + barW / 2}
                    y={y(v) - 5}
                    textAnchor="middle"
                  >
                    {formatValue(v)}
                  </text>
                )}
              </g>
            );
          })}
          <line
            className="bar-chart__baseline"
            x1={LEFT}
            x2={width}
            y1={TOP + plotH}
            y2={TOP + plotH}
          />
          {xTicks.map((t) => (
            <text
              key={t.index}
              className="bar-chart__axis-label"
              x={Math.min(
                width - 2,
                Math.max(LEFT, LEFT + t.index * band + band / 2)
              )}
              y={height - 6}
              textAnchor={
                t.index === 0
                  ? "start"
                  : t.index === values.length - 1
                    ? "end"
                    : "middle"
              }
            >
              {t.label}
            </text>
          ))}
        </svg>
      )}
      {active !== null && width > 0 && (
        <div
          className="bar-chart__tooltip"
          style={{
            left: Math.min(
              Math.max(LEFT + active * band + band / 2, 60),
              width - 60
            ),
          }}
          aria-hidden="true"
        >
          <strong>
            {activeValue === null ? emptyText : formatValue(activeValue)}
          </strong>
          <span>{labels[active]}</span>
        </div>
      )}
      <details className="bar-chart__table">
        <summary>Show as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{tableHeadings[0]}</th>
              <th scope="col">{tableHeadings[1]}</th>
            </tr>
          </thead>
          <tbody>
            {values.map((v, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are positions on a fixed axis.
              <tr key={i}>
                <td>{labels[i]}</td>
                <td>{v === null ? emptyText : formatValue(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
