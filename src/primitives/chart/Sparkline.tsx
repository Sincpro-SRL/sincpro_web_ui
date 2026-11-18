/**
 * A SPARKLINE: the shape of the last periods, drawn under a figure — no axis, no grid, no
 * tooltip. It answers «and lately?» beside a number that answers «how much now?».
 *
 * Context: a board's headline figure said one number and nothing about its direction; the
 * only way to see the trend was a whole chart. A sparkline is the trend at the size of a
 * word. It is not a small chart, and it does not try to be one: no scale (its height is the
 * series' own range), so it is never read for a value — the figure beside it says the
 * value. That is why it draws in the soft data hue and marks only the LAST point in the full
 * one: the current period is the one the figure talks about.
 *
 *  - A series flat at zero is drawn flat on the floor, not in the middle: nothing happened,
 *    and the baseline is where nothing is.
 *  - A hole is a hole — the line breaks — because there is no axis here to say why.
 *  - With nothing to draw (no values, all holes) it draws nothing, not an empty frame.
 *
 * Pure SVG and no Recharts: a board with eight of them should not load a chart engine for
 * lines without axes. The SVG stretches to its box (`preserveAspectRatio="none"`) with a
 * stroke that does not stretch (`non-scaling-stroke`); the end dot is an HTML mark laid over
 * it, so it stays round at any width.
 */
export type SparklineProps = {
  /** The values, oldest first. `null` is a period with nothing recorded. */
  values: readonly (number | null)[];
  /** What it shows, for a screen reader: «Mensajes recibidos, últimas 24 horas». */
  label: string;
  /** The wash under the line, for a quantity read as an amount (memory, stock). */
  area?: boolean;
};

const WIDTH = 100;
const HEIGHT = 40;
/* Room for the stroke and the end dot at the top and the bottom. */
const PAD = 4;

export function Sparkline({ values, label, area = true }: SparklineProps) {
  const known = values.filter((value): value is number => value !== null);
  if (known.length === 0) return null;

  /* Its own range, not from zero: memory between 40 and 66 MB drawn from 0 is a flat block
     with a ripple on top, and the turn is what a sparkline is for. */
  const low = Math.min(...known);
  const high = Math.max(...known);
  const range = high - low;
  const x = (at: number) =>
    values.length === 1 ? WIDTH / 2 : (at / (values.length - 1)) * WIDTH;
  /* Flat at zero sits on the floor; flat anywhere else, in the middle. */
  const y = (value: number) =>
    range === 0
      ? high === 0
        ? HEIGHT - PAD
        : HEIGHT / 2
      : PAD + (1 - (value - low) / range) * (HEIGHT - 2 * PAD);

  /* The runs between holes, each its own stroke. */
  const runs: { at: number; value: number }[][] = [];
  values.forEach((value, at) => {
    if (value === null) return;
    const previous = values[at - 1];
    if (at === 0 || previous === null || previous === undefined) runs.push([]);
    runs[runs.length - 1]!.push({ at, value });
  });
  const point = (one: { at: number; value: number }) =>
    `${x(one.at).toFixed(2)},${y(one.value).toFixed(2)}`;
  const line = (run: { at: number; value: number }[]) => `M${run.map(point).join(" L")}`;
  const wash = (run: { at: number; value: number }[]) => {
    const first = run[0]!;
    const last = run[run.length - 1]!;
    return `${line(run)} L${x(last.at).toFixed(2)},${HEIGHT} L${x(first.at).toFixed(2)},${HEIGHT} Z`;
  };

  let lastAt = values.length - 1;
  while (values[lastAt] === null) lastAt -= 1;
  const end = { x: x(lastAt), y: y(values[lastAt] as number) };

  return (
    <div className="relative h-(--size-sparkline) w-full min-w-0">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
        preserveAspectRatio="none"
        className="block size-full overflow-visible"
      >
        {area
          ? runs
              .filter((run) => run.length > 1)
              .map((run) => (
                <path
                  key={`wash-${String(run[0]!.at)}`}
                  d={wash(run)}
                  fill="var(--color-data-soft)"
                  fillOpacity={0.1}
                />
              ))
          : null}
        {runs
          .filter((run) => run.length > 1)
          .map((run) => (
            <path
              key={`line-${String(run[0]!.at)}`}
              d={line(run)}
              fill="none"
              stroke="var(--color-data-soft)"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </svg>
      {/* Now: the period the figure beside it talks about. */}
      <span
        aria-hidden
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-data ring-2 ring-surface"
        style={{
          left: `${String((end.x / WIDTH) * 100)}%`,
          top: `${String((end.y / HEIGHT) * 100)}%`,
        }}
      />
    </div>
  );
}
