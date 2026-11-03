import assert from "node:assert/strict";

import { List, RecordCard } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: two requests from web-framework. A list asked again (typing in the search,
 * another page) swapped its rows for a skeleton on every question: the table blinked and a
 * click could land on a row that was gone. And a person's card drew a square photo — or
 * nothing — where the link next to it drew a face.
 */

type Row = { id: string; name: string };
const ROWS: Row[] = [
  { id: "a", name: "Andina" },
  { id: "b", name: "Illimani" },
];

const list = (state: { loading?: boolean; refreshing?: boolean }) =>
  renderToStaticMarkup(
    <List<Row> items={ROWS} keyOf={(r) => r.id} state={state}>
      <List.Rows<Row> row={(r) => ({ name: r.name })} />
    </List>,
  );

test("refreshing keeps the rows and says, discreetly, that it is asking", () => {
  const out = list({ refreshing: true });
  assert.match(out, /Andina/);
  assert.match(out, /Illimani/);
  const bar = /<div[^>]*role="progressbar"[^>]*>/.exec(out)?.[0] ?? "";
  assert.match(bar, /aria-label="Updating the list…"/);
  /* Indeterminate: no figure, because it cannot say how far it is. */
  assert.doesNotMatch(bar, /aria-valuenow/);
  assert.match(out, /aria-busy="true"/);
});

test("the first read is the skeleton, with no rows yet", () => {
  const out = list({ loading: true });
  assert.doesNotMatch(out, /Andina/);
  assert.doesNotMatch(out, /Updating the list/);
});

test("at rest the list is not busy and draws no bar", () => {
  const out = list({});
  assert.match(out, /aria-busy="false"/);
  assert.doesNotMatch(out, /progressbar/);
});

test("a person's card draws a face — the initials without a photo", () => {
  const out = renderToStaticMarkup(
    <RecordCard title="Josefa Muñoz" media={{ person: true }} onOpen={() => {}} />,
  );
  assert.match(out, /rounded-pill/);
  assert.match(out, />JM</);
});
