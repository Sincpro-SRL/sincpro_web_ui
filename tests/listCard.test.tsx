import assert from "node:assert/strict";

import { type CardWays, List } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a board's own card replaced the built-in one and lost, with it, what a press does —
 * the application wired «open» by hand. The card now receives the list's three ways, bound to
 * its record, with the same rules as a `List.Present`: `press` is the list's rule, `peek` and
 * `open` are absent while the list chooses.
 */

type Deal = { id: string; name: string };
const DEALS: Deal[] = [{ id: "d1", name: "Andina" }];

function waysOf(props: Partial<Parameters<typeof List<Deal>>[0]>): CardWays {
  let seen: CardWays | undefined;
  renderToStaticMarkup(
    <List<Deal> items={DEALS} keyOf={(d) => d.id} present="board" {...props}>
      <List.Board<Deal>
        card={(d, ways) => {
          seen = ways;
          return <span>{d.name}</span>;
        }}
      />
    </List>,
  );
  assert.ok(seen !== undefined, "the card was drawn");
  return seen;
}

test("a card of its own gets the list's press rule, bound to its record", () => {
  const said: string[] = [];
  const ways = waysOf({
    onPeek: (d) => said.push(`peek ${d.id}`),
    onOpen: (d) => said.push(`open ${d.id}`),
  });
  ways.press?.();
  ways.peek?.();
  ways.open?.();
  /* A look first, like a row. */
  assert.deepEqual(said, ["peek d1", "peek d1", "open d1"]);
});

test("rowClick «open» makes the press open", () => {
  const said: string[] = [];
  const ways = waysOf({
    rowClick: "open",
    onPeek: (d) => said.push(`peek ${d.id}`),
    onOpen: (d) => said.push(`open ${d.id}`),
  });
  ways.press?.();
  assert.deepEqual(said, ["open d1"]);
});

test("choosing, the press chooses and the ways in are not offered", () => {
  const said: string[] = [];
  const ways = waysOf({
    onChoose: (d) => said.push(`choose ${d.id}`),
    onPeek: () => said.push("peek"),
    onOpen: () => said.push("open"),
  });
  ways.press?.();
  assert.deepEqual(said, ["choose d1"]);
  assert.equal(ways.peek, undefined);
  assert.equal(ways.open, undefined);
});

test("a read-only list gives a card no press", () => {
  assert.deepEqual(waysOf({}), {});
});
