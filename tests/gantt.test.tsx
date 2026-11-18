import assert from "node:assert/strict";

import { RecordGantt } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: SVAR paints the Gantt's grid with a canvas, which only a browser has. Rendered on a
 * server (Next.js), the chart's HTML did not match the browser's first render — a hydration
 * error. On the server the Gantt draws its toolbar and the skeleton; the chart comes in the
 * browser (the story's `play` checks it is drawn there).
 */
type Task = { id: string; name: string; start: Date; end: Date };

const TASKS: Task[] = [
  { id: "1", name: "Relevamiento", start: new Date(2026, 10, 2), end: new Date(2026, 10, 9) },
];

test("en el servidor el Gantt dibuja el esqueleto, no el gráfico", () => {
  const html = renderToStaticMarkup(
    <RecordGantt<Task>
      items={TASKS}
      keyOf={(t) => t.id}
      titleOf={(t) => t.name}
      startOf={(t) => t.start}
      endOf={(t) => t.end}
    />,
  );
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /wx-/);
});
