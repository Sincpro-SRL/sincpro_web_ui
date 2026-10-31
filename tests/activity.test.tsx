import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Activity,
  type ActivityEvent,
  type Message,
  MessageComposer,
  Record,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import {
  createNoteRegistry,
  NoteRegistryContext,
} from "@sincpro/web-ui/primitives/field/note";
import type { ReactNode } from "react";
import { renderToStaticMarkup as render } from "react-dom/server";

/**
 * Context: the activity is everything AROUND a record — its notices, the notes of its fields
 * and rows, its conversation and its history — in ONE column at the RIGHT of the sheet,
 * joined to it, open by default; below the sheet on a narrow page. Beside a wide record the
 * panel has two views never mixed: «Avisos» (what is true now; beside a wide record also the
 * LANE of the field notes) and «Línea de tiempo» (what happened, one stream by time). The record's notices live in it, and the rail's indicator
 * goes there instead of opening a popover.
 */

const renderToStaticMarkup = (node: ReactNode) =>
  render(<UiCopyProvider>{node}</UiCopyProvider>);
const inSpanish = (node: ReactNode) =>
  render(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const at = (html: string, text: string) => {
  const i = html.indexOf(text);
  assert.notEqual(i, -1, `«${text}» is drawn`);
  return i;
};

const EVENTS: ActivityEvent[] = [
  { id: "e1", label: "se creó la factura", at: "2026-10-12T10:00:00Z", by: "Carla Rojas" },
  { id: "e2", label: "se publicó", at: "2026-10-13T10:00:00Z" },
];
const MESSAGES: Message[] = [
  { id: "m1", author: "Josefa Muñoz", at: "2026-10-14T10:00:00Z", body: "¿Ya pagaron?" },
];

const RAIL = (
  <Record.Rail>
    <Record.Crumbs
      crumbs={[{ label: "Facturas", onClick: () => {} }, { label: "FAC/0115" }]}
    />
  </Record.Rail>
);

test("open by default: on a big screen you see what the record has", () => {
  const html = renderToStaticMarkup(
    <Record identity={{ title: "FAC/2026/0115" }}>
      {RAIL}
      <Record.Activity events={EVENTS} />
    </Record>,
  );
  assert.match(html, /data-activity="open"/);
  assert.match(html, /se creó la factura/);
});

test("folded, it is one button that still says how much there is", () => {
  const html = inSpanish(
    <Record identity={{ title: "FAC/2026/0115" }}>
      {RAIL}
      <Record.Notice tone="warn">Vencida hace 12 días.</Record.Notice>
      <Record.Activity defaultOpen={false} events={EVENTS} messages={MESSAGES} />
    </Record>,
  );
  const folded = /<button[^>]*data-activity="folded"[^>]*>([\s\S]*?)<\/button>/.exec(html);
  assert.ok(folded, "folded, it is one button");
  const face = folded[1]!;
  assert.match(face, /Actividad/);
  assert.match(face, /1 aviso/);
  /* The counts carry their words for a screen reader, not only an icon and a number. */
  assert.match(face, /1<span class="sr-only">Conversación<\/span>/);
  assert.match(face, /2<span class="sr-only">Historial<\/span>/);
  assert.doesNotMatch(html, /se creó la factura/, "the entries are behind the fold");
});

test("the record's notices live in the panel, and the rail's indicator goes to them", () => {
  const html = renderToStaticMarkup(
    <Record identity={{ title: "FAC/2026/0115" }}>
      {RAIL}
      <Record.Notice tone="info">Créditos pendientes.</Record.Notice>
      <Record.Notice tone="warn" action={<button type="button">Ver FAC/0098</button>}>
        Posible factura duplicada.
      </Record.Notice>
      <Record.Notice tone="bad">El SIN la rechazó.</Record.Notice>
      <Record.Activity events={EVENTS} />
    </Record>,
  );
  const section = /<section id="([^"]+)" tabindex="-1"[^>]*data-activity-alerts=""/.exec(
    html,
  );
  assert.ok(section, "the notices are a focusable section of the panel");
  const id = section[1]!;
  /* The indicator points at that section and is a plain button: no popover to open. */
  const chip = /<button[^>]*data-record-notices=""[^>]*>/.exec(html)?.[0] ?? "";
  assert.match(chip, new RegExp(`aria-controls="${id}"`));
  assert.doesNotMatch(chip, / aria-expanded="/);
  /* In urgency order, with their actions; the blocking one stays out, in its band. */
  const alerts = html.slice(at(html, "data-activity-alerts"));
  assert.ok(at(alerts, "Posible factura duplicada.") < at(alerts, "Créditos pendientes."));
  assert.match(alerts, /Ver FAC\/0098/);
  assert.equal(html.split("El SIN la rechazó.").length - 1, 1, "blocking: once, in the band");
});

test("without a panel the indicator still opens its popover", () => {
  const html = renderToStaticMarkup(
    <Record identity={{ title: "FAC/2026/0115" }}>
      {RAIL}
      <Record.Notice tone="warn">Vencida.</Record.Notice>
    </Record>,
  );
  const chip = /<button[^>]*data-record-notices=""[^>]*>/.exec(html)?.[0] ?? "";
  assert.match(chip, /aria-expanded="false"/);
  assert.doesNotMatch(chip, /aria-controls/);
});

test("on a wide page it is the column at the RIGHT of the sheet, joined to it", () => {
  const html = renderToStaticMarkup(
    <Record identity={{ title: "FAC/2026/0115" }}>
      {RAIL}
      <Record.Activity events={EVENTS} />
    </Record>,
  );
  /* After the sheet, in the DOM and on screen: the record first, what it has second. */
  assert.ok(at(html, "FAC/2026/0115</h1>") < at(html, 'data-activity="open"'));
  assert.match(html, /class="@container\/page"/);
  /* The pair, at most the sheet and the column wide. */
  assert.match(
    html,
    /class="flex [^"]*max-w-\(--container-record\)[^"]*@beside\/page:flex-row/,
  );
  assert.match(html, /@beside\/page:rounded-r-none/);
  assert.match(html, /@beside\/page:w-\(--container-activity\) @beside\/page:rounded-l-none/);
});

/* One column for the rail and the page: the buttons sit over the paper they act on, not at
   the screen's edge 250 px away from it. */
test("the rail lines up with the page column, and `full` frees both", () => {
  const reading = renderToStaticMarkup(
    <Record identity={{ title: "S00142" }}>
      {RAIL}
      <Record.Paper>body</Record.Paper>
    </Record>,
  );
  assert.equal(
    reading.split("mx-auto w-full max-w-(--container-sheet)").length - 1,
    2,
    "the rail's row and the page share the sheet's column",
  );
  const full = renderToStaticMarkup(
    <Record identity={{ title: "S00142" }}>
      {RAIL}
      <Record.Paper width="full">body</Record.Paper>
    </Record>,
  );
  assert.doesNotMatch(full, /max-w-\(--container-sheet\)/);
});

test("`below` keeps it under the sheet, at the sheet's width, on every width", () => {
  const html = renderToStaticMarkup(
    <Record identity={{ title: "FAC/2026/0115" }}>
      {RAIL}
      <Record.Activity layout="below" events={EVENTS} />
    </Record>,
  );
  assert.ok(at(html, "FAC/2026/0115</h1>") < at(html, 'data-activity="open"'));
  assert.doesNotMatch(html, /@beside\/page:/);
});

test("the open state can be the app's: `open` + `onOpenChange`", () => {
  const closed = renderToStaticMarkup(
    <Record identity={{ title: "FAC/2026/0115" }}>
      {RAIL}
      <Record.Activity open={false} onOpenChange={() => {}} events={EVENTS} />
    </Record>,
  );
  assert.match(closed, /data-activity="folded"/);
});

/* What is true now and what happened are two questions, both always in sight: the notices
   on top, compact, and the timeline under them — never behind a switch. */
test("the notices on top and the timeline under them, both always drawn, no switch", () => {
  const html = inSpanish(
    <Activity
      open
      onToggle={() => {}}
      alerts={[{ tone: "warn", children: "Vencida." }]}
      events={EVENTS}
      messages={MESSAGES}
    />,
  );
  assert.ok(at(html, "Vencida.") < at(html, ">Línea de tiempo<"));
  assert.ok(at(html, ">Línea de tiempo<") < at(html, "¿Ya pagaron?"));
  assert.doesNotMatch(html, /Qué ver|data-view=/);
});

test("more than three notices fold behind «Ver N más», so the timeline stays in sight", () => {
  const html = inSpanish(
    <Activity
      open
      onToggle={() => {}}
      alerts={["Uno.", "Dos.", "Tres.", "Cuatro.", "Cinco."].map((children) => ({
        tone: "info" as const,
        children,
      }))}
      events={EVENTS}
    />,
  );
  assert.match(html, /Tres\./);
  assert.doesNotMatch(html, /Cuatro\./);
  assert.match(html, /aria-expanded="false"[^>]*>Ver 2 más</);
});

/* A history is for knowing what came before what: ONE stream by time, not grouped by
   kind, split by day, with no notices in it. */
test("the timeline is one chronological stream, by day, without the notices", () => {
  const html = inSpanish(
    <Activity
      open
      onToggle={() => {}}

      alerts={[{ tone: "warn", children: "Vencida." }]}
      events={EVENTS}
      messages={MESSAGES}
      composer={<MessageComposer onSend={() => {}} />}
    />,
  );
  /* Newest first, messages and events interleaved: the message of the 14th, then the
     event of the 13th, then the one of the 12th. */
  assert.ok(at(html, "¿Ya pagaron?") < at(html, "se publicó"));
  assert.ok(at(html, "se publicó") < at(html, "se creó la factura"));
  /* A separator per day, named by its date. */
  assert.equal(
    html.match(/<li aria-hidden="true" class="flex items-center gap-2/g)?.length,
    3,
  );
  assert.match(html, /14 de octubre/);
  /* The composer heads it, and the system signs what nobody did. */
  assert.ok(at(html, "Registrar una nota") < at(html, "¿Ya pagaron?"));
  assert.match(html, /el sistema/);
});

test("the timeline filters by kind: messages, notes, events", () => {
  const html = inSpanish(
    <Activity
      open
      onToggle={() => {}}

      events={EVENTS}
      messages={[
        ...MESSAGES,
        {
          id: "m2",
          author: "Carla Rojas",
          at: "2026-10-15T10:00:00Z",
          body: "Llamé.",
          internal: true,
        },
      ]}
    />,
  );
  const filters = html.slice(at(html, 'aria-label="Mostrar"'));
  for (const word of ["Todo", "Mensajes · 1", "Notas · 1", "Eventos · 2"]) {
    assert.match(filters, new RegExp(word));
  }
});

test("each view says its own empty", () => {
  const html = inSpanish(<Activity open onToggle={() => {}} events={[]} messages={[]} />);
  assert.match(html, /Todavía nadie escribió acá\./);
  const onlyEvents = inSpanish(<Activity open onToggle={() => {}} events={[]} />);
  assert.match(onlyEvents, /Todavía no se registró nada\./);
});

test("«Avisos» lists the notes of fields and rows, saying what they belong to", () => {
  const registry = createNoteRegistry();
  registry.put({
    id: "n1",
    note: { tone: "info", label: "Tiene una nota de crédito sin aplicar" },
    owner: "Cliente",
    anchor: () => null,
  });
  const html = inSpanish(
    <NoteRegistryContext value={registry}>
      <Activity open onToggle={() => {}} events={EVENTS} />
    </NoteRegistryContext>,
  );
  const alerts = html.slice(at(html, "data-activity-alerts"));
  assert.match(alerts, /Tiene una nota de crédito sin aplicar/);
  assert.match(alerts, /title="Ir a Cliente"/);
  assert.match(alerts, />Cliente</);
});

test("the registry tells only when a note appears or goes", () => {
  const registry = createNoteRegistry();
  let told = 0;
  registry.subscribe(() => (told += 1));
  const entry = (label: string) => ({
    id: "n1",
    note: { label },
    owner: "Cliente",
    anchor: () => null,
  });
  registry.put(entry("uno"));
  const first = registry.snapshot();
  /* A form re-renders with a new `note` object: the words change, nothing is told, and the
     snapshot keeps its identity — else the record re-renders the field, for ever. */
  registry.put(entry("dos"));
  assert.equal(told, 1);
  assert.equal(registry.snapshot(), first);
  assert.equal(registry.snapshot()[0]?.note.label, "dos");
  registry.drop("n1");
  assert.equal(told, 2);
  assert.equal(registry.snapshot().length, 0);
});
