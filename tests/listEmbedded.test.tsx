import assert from "node:assert/strict";
import { test } from "node:test";

import {
  type DataColumn,
  List,
  SearchField,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { HeaderSlotContext } from "@sincpro/web-ui/components/shell/headerSlot";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * A LIST INSIDE A RECORD — a one2many shown as a collection — is the same `List` as a
 * module's main one, laid out for where it sits: ONE line (search, count, sort · columns ·
 * switcher), no identity, no crumbs, no sticky band and never carried into the frame's
 * header slot. The full-page list keeps its two rows.
 */

type Apunte = { id: string; cuenta: string; debe: number };

const APUNTES: Apunte[] = [
  { id: "a1", cuenta: "1.1.03.01 Cuentas por cobrar", debe: 78752.9 },
  { id: "a2", cuenta: "2.1.04.01 IVA débito fiscal", debe: 0 },
];

const COLUMNAS: DataColumn<Apunte>[] = [
  { id: "cuenta", header: "cuenta", value: (a) => a.cuenta },
  { id: "debe", header: "debe", value: (a) => a.debe, numeric: true, aggregate: "sum" },
];

const draw = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

function Apuntes({
  embedded,
  selected = 0,
  search = true,
  faces = 2,
}: {
  embedded?: boolean;
  selected?: number;
  search?: boolean;
  faces?: 1 | 2;
}) {
  return (
    <List<Apunte>
      items={APUNTES}
      keyOf={(a) => a.id}
      {...(embedded === undefined ? {} : { embedded })}
      sortable={faces === 2 ? [{ field: "cuenta", label: "cuenta" }] : []}
      selection={{
        has: () => false,
        toggle: () => {},
        count: selected,
        clear: () => {},
      }}
    >
      <List.Bar>
        <List.Crumbs crumbs={[{ label: "Contabilidad" }, { label: "Apuntes" }]} />
        <List.Identity title="Apuntes contables" />
        {search ? (
          <List.Search>
            <SearchField value="" placeholder="Buscar una cuenta…" />
          </List.Search>
        ) : null}
      </List.Bar>
      <List.Rows<Apunte> row={(a) => ({ name: a.cuenta })} />
      {faces === 2 ? <List.Table<Apunte> columns={COLUMNAS} /> : null}
    </List>
  );
}

test("embedded, the bar is one line: no identity, no crumbs, and it does not stick", () => {
  const page = draw(<Apuntes />);
  const inside = draw(<Apuntes embedded />);

  /* The page list is untouched: it sticks and names itself. */
  assert.match(page, /sticky z-30/);
  assert.ok(page.includes("Apuntes contables"));
  assert.ok(page.includes("Contabilidad"));

  assert.doesNotMatch(inside, /sticky z-30/);
  assert.ok(!inside.includes("Apuntes contables"), "the record's tab already names it");
  assert.ok(!inside.includes("Contabilidad"), "the record's crumbs already say where");
  assert.ok(!inside.includes("border-b border-line pb-2"), "no rule between two rows");
});

test("embedded, the line says how many there are, as a live region", () => {
  const inside = draw(<Apuntes embedded />);
  assert.match(inside, /role="status"[^>]*>2 registros</);
  assert.ok(inside.includes('aria-label="Buscar una cuenta"'), "the search is named");
  /* Sort and the presentation switcher are on the same line. */
  assert.ok(inside.includes(SPANISH_COPY.present?.table ?? "Tabla"));
});

test("embedded with nothing to offer draws no bar at all", () => {
  const bare = draw(<Apuntes embedded search={false} faces={1} />);
  assert.doesNotMatch(bare, /role="status"/, "a count alone repeats the rows");
  /* The controls alone are enough for a line. */
  const controls = draw(<Apuntes embedded search={false} />);
  assert.match(controls, /role="status"/);
});

test("embedded, a selection takes the search's place on the same line", () => {
  const inside = draw(<Apuntes embedded selected={2} />);
  assert.ok(inside.includes(SPANISH_COPY.selection?.chosen ?? "elegidos"));
  assert.ok(!inside.includes('aria-label="Buscar una cuenta"'));
});

test("embedded under a sidebar, the bar stays in the record and is not portaled", () => {
  /* With a sidebar the frame offers a header slot and a sticky list bar moves into it. A
     list inside a record must not: its bar would leave the record for the top of the page.
     (The server renderer cannot draw a portal, so reaching for one throws here.) */
  const slot = {} as HTMLElement;
  const inside = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <HeaderSlotContext value={slot}>
        <Apuntes embedded />
      </HeaderSlotContext>
    </UiCopyProvider>,
  );
  assert.ok(inside.includes('aria-label="Buscar una cuenta"'));
});

test("a search box is never nameless", () => {
  const silenced: unknown[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => silenced.push(args);
  try {
    assert.match(
      draw(<SearchField value="" aria-label="Buscar contactos" />),
      /aria-label="Buscar contactos"/,
    );
    /* The placeholder is what the eye reads; its trailing ellipsis is not a word. */
    assert.match(
      draw(<SearchField value="" placeholder="Buscar una cuenta…" />),
      /aria-label="Buscar una cuenta"/,
    );
    /* Nothing at all: the copy table's word, in the copy's language. */
    assert.match(draw(<SearchField value="" />), /aria-label="Buscar"/);
  } finally {
    console.warn = warn;
  }
  assert.equal(
    silenced.filter((args) => String(args).includes("aria-label")).length,
    0,
    "React Aria did not have to warn about a missing label",
  );
});
