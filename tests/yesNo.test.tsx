import assert from "node:assert/strict";

import { DataTable } from "@sincpro/web-ui/primitives/table/DataTable";
import { YesNo } from "@sincpro/web-ui/primitives/value/YesNo";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * A YES / NO HAS LOOKS (#68): a column of booleans read «Sí»/«No» as plain text here, a bare ✓
 * and nothing there. The same piece, chosen per column — and every look still SAYS the answer.
 */

test("every look says yes or no in words, even the empty «no» of `check`", () => {
  for (const look of ["check", "icon", "word"] as const) {
    assert.match(renderToStaticMarkup(<YesNo value look={look} />), />yes</);
    assert.match(renderToStaticMarkup(<YesNo value={false} look={look} />), />no</);
  }
});

test("`icon` tells the answers apart by shape, not only by colour", () => {
  const yes = renderToStaticMarkup(<YesNo value look="icon" />);
  const no = renderToStaticMarkup(<YesNo value={false} look="icon" />);
  assert.match(yes, /lucide-check/);
  assert.match(yes, /text-good/);
  assert.match(no, /lucide-x/);
  assert.doesNotMatch(no, /text-good/);
});

type Course = { id: string; title: string; published: boolean };
const COURSES: Course[] = [
  { id: "1", title: "Excel avanzado", published: true },
  { id: "2", title: "Ética profesional", published: false },
];

const table = (yesNo: Parameters<typeof DataTable<Course>>[0]["columns"][number]["yesNo"]) =>
  renderToStaticMarkup(
    <DataTable<Course>
      data={COURSES}
      getRowId={(c) => c.id}
      columns={[
        { id: "title", header: "Título", value: (c) => c.title },
        {
          id: "published",
          header: "Publicado",
          value: (c) => c.published,
          ...(yesNo === undefined ? {} : { yesNo }),
        },
      ]}
    />,
  );

test("a boolean column reads as yes / no by default — not «true», not bare text", () => {
  const html = table(undefined);
  assert.equal(html.match(/data-ui="yes-no"/g)?.length, 2);
  assert.match(html, /lucide-check/);
});

test("with `onToggle` a column ticks from the list: a checkbox or a switch named by its column", () => {
  const toggle = () => {};
  const boxes = table({ look: "checkbox", onToggle: toggle });
  assert.equal(boxes.match(/type="checkbox"[^>]*aria-label="Publicado"/g)?.length, 2);
  const switches = table({ look: "switch", onToggle: toggle });
  assert.equal(switches.match(/role="switch"/g)?.length, 2);
  assert.equal(switches.match(/aria-label="Publicado"/g)?.length, 2);
});

test("a control that cannot be pressed is not drawn: without onToggle, or for a row `when` refuses", () => {
  assert.doesNotMatch(table({ look: "switch" }), /role="switch"/);
  const some = table({ look: "checkbox", onToggle: () => {}, when: (c) => c.published });
  assert.equal(some.match(/type="checkbox"/g)?.length, 1);
});
