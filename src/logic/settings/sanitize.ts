// Settings typed into a field can be empty, out of range or not a number at
// all (a cleared number field saves ""). These read them safely: anything
// unusable falls back to the default, so a cleared field can't schedule cards
// a hundred years away or stop new cards altogether.

/** A finite number within [min, max], or the fallback. */
export function numberSetting(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (value === "" || value === null || value === undefined) return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

/** A whole number within [min, max], or the fallback. */
export function integerSetting(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  return Math.round(numberSetting(value, fallback, min, max));
}

/**
 * FSRS weights from the comma-separated setting: as many as the defaults and
 * every one a finite number, or else the defaults.
 */
export function weightsSetting(value: unknown, fallback: string): number[] {
  const parse = (text: string) =>
    text.split(",").map((x) => Number.parseFloat(x.trim()));
  const defaults = parse(fallback);
  if (typeof value !== "string") return defaults;
  const weights = parse(value);
  const valid =
    weights.length === defaults.length &&
    weights.every((x) => Number.isFinite(x));
  return valid ? weights : defaults;
}
