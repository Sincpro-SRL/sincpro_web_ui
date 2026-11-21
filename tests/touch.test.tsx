import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  isPointer,
  List,
  POINTER_ATTRIBUTE,
  pointerAttributes,
  SPANISH_COPY,
  Tags,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a till is a touch monitor with a mouse plugged in, so `pointer: coarse` is false
 * there and the cashier got 30 px targets. The application can now SAY it (`data-pointer`),
 * the `touch:` variant follows the same decision, and what is drawn small answers to
 * `--size-target` around it. A chip's «×» measured 16 × 16 under a finger; these pin what
 * makes it answer to 44.
 */

const TOKENS = readFileSync(join(import.meta.dirname, "..", "src", "tokens.css"), "utf8");

test("the application can say the pointer, and «auto» leaves it to the device", () => {
  assert.equal(POINTER_ATTRIBUTE, "data-pointer");
  assert.deepEqual(pointerAttributes("touch"), { "data-pointer": "touch" });
  assert.deepEqual(pointerAttributes("fine"), { "data-pointer": "fine" });
  assert.deepEqual(pointerAttributes("auto"), {});
  assert.ok(isPointer("touch") && isPointer("fine") && isPointer("auto"));
  assert.ok(!isPointer("coarse") && !isPointer(null));
});

test("the stylesheet sizes for a finger by the device AND by the application's word", () => {
  /* The device's answer, unless the application said «fine». */
  assert.match(
    TOKENS,
    /@media \(pointer: coarse\) \{\s*:root:not\(\[data-pointer="fine"\]\)/,
  );
  /* The application's word, on <html> or on a zone. */
  assert.match(
    TOKENS,
    /\[data-pointer="touch"\] \{[^}]*--size-control-sm: 44px;[^}]*--size-target: 44px;/,
  );
  assert.match(TOKENS, /\[data-pointer="fine"\] \{[^}]*--size-control-sm: 30px;/);
  /* What is not a size follows the same decision. */
  assert.match(TOKENS, /@custom-variant touch \{/);
  assert.match(TOKENS, /@utility hit-target \{/);
});

test("no component asks the browser alone — `touch:` replaced `pointer-coarse:`", () => {
  const offenders = ["clipboard", "RowActions", "CellCopy", "SearchEntry", "Row"].filter(
    (name) => {
      const where = {
        clipboard: "src/primitives/field/clipboard.tsx",
        RowActions: "src/primitives/table/RowActions.tsx",
        CellCopy: "src/primitives/table/CellCopy.tsx",
        SearchEntry: "src/components/shell/SearchEntry.tsx",
        Row: "src/components/listing/Row.tsx",
      }[name]!;
      return readFileSync(join(import.meta.dirname, "..", where), "utf8").includes(
        "pointer-coarse:",
      );
    },
  );
  assert.deepEqual(offenders, []);
});

test("a chip's remove and a row's box answer to the target size, not to their drawing", () => {
  const chips = renderToStaticMarkup(
    <Tags items={[{ id: "a", label: "Andina", onRemove: () => {} }]} label="Filtros" />,
  );
  assert.match(chips, /<button[^>]*class="[^"]*hit-target/);
  const list = renderToStaticMarkup(
    <List<{ id: string }>
      items={[{ id: "1" }]}
      keyOf={(r) => r.id}
      selection={{ has: () => false, toggle: () => {}, count: 0, clear: () => {} }}
    >
      <List.Rows<{ id: string }> row={(r) => ({ name: r.id })} />
    </List>,
  );
  assert.match(list, /<label class="hit-target[^"]*"><input type="checkbox"/);
});

test("chips come in three sizes, and a count is drawn as a figure", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Tags
        size="lg"
        scroll
        label="Categorías"
        items={[
          { id: "all", label: "Todo", count: 42, selected: true, onSelect: () => {} },
          { id: "drinks", label: "Bebidas", count: 12, selected: false, onSelect: () => {} },
        ]}
      />
    </UiCopyProvider>,
  );
  assert.match(html, /data-size="lg"/);
  assert.match(html, /h-\(--size-control-lg\)/);
  assert.match(html, /<span data-ui="tags.count"[^>]*>12<\/span>/);
  /* One line that scrolls, not three that wrap. */
  assert.match(html, /flex-nowrap[^"]*overflow-x-auto/);
  /* A choice: the strip says which is chosen. */
  assert.match(html, /aria-selected="true"/);
});

test("a list is its own stacking context: its sticky bar never climbs over a host's modal", () => {
  const html = renderToStaticMarkup(
    <List<{ id: string }> items={[{ id: "1" }]} keyOf={(r) => r.id}>
      <List.Bar>
        <List.Identity title="Pedidos" />
      </List.Bar>
      <List.Rows<{ id: string }> row={(r) => ({ name: r.id })} />
    </List>,
  );
  assert.match(html, /<div class="isolate flex min-w-0 flex-col/);
});
