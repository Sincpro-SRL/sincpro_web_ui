import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  Button,
  buttonClasses,
  DensityProvider,
  Field,
  FormActions,
  Peek,
  Record,
  SheetGroup,
  SheetGroups,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { dialogStyles } from "@sincpro/web-ui/primitives/dialog/Dialog";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the phone layer is CSS — container and window queries — so a browser is what
 * shows it working (the 390 px screenshots). What a test can hold is the contract those
 * queries hang from: the classes that turn a dialog and a peek into a bottom sheet, and the
 * thumb bar of a record — that it exists only when there is something to put in it, that it
 * holds exactly the primary (or Save and Discard when there are changes), that the rail's
 * copy of the primary is the one that hides when the bar shows, and that the bar is the last
 * thing in the record and sticky, which is what reserves its space.
 */

const noop = () => {};
const html = (node: ReactNode) => renderToStaticMarkup(node);

/** Everything from the thumb bar to the end of the record: the bar is the last thing in it. */
function barOf(out: string): string {
  const at = out.indexOf("data-thumb-bar=");
  assert.ok(at >= 0, "there is a thumb bar");
  return out.slice(at);
}

const count = (out: string, needle: string) => out.split(needle).length - 1;

function Invoice({
  dirty,
  extra,
  surface,
}: {
  dirty?: boolean;
  extra?: ReactNode;
  surface?: "canvas" | "chrome";
}) {
  return (
    <Record
      identity={{ title: "FAC/2026/0118" }}
      {...(dirty === true ? { dirty: { onSave: noop, onDiscard: noop } } : {})}
    >
      <Record.Rail {...(surface === undefined ? {} : { surface })}>
        <Record.Crumbs
          crumbs={[{ label: "Facturas", onClick: noop }, { label: "FAC/2026/0118" }]}
        />
        <Record.Actions>
          <Button role="primary" size="sm">
            Registrar pago
          </Button>
          <Button role="secondary" size="sm">
            Imprimir
          </Button>
          {extra}
        </Record.Actions>
      </Record.Rail>
      <Record.Paper>
        <p>Constructora Illimani</p>
      </Record.Paper>
    </Record>
  );
}

/* ---------------------------------------------------------------- *
 *  The record's thumb bar
 * ---------------------------------------------------------------- */

test("the thumb bar holds the primary and nothing else", () => {
  const bar = barOf(html(<Invoice />));
  assert.match(bar, /^data-thumb-bar="primary"/);
  assert.equal(count(bar, 'data-emphasis="primary"'), 1);
  assert.equal(count(bar, "data-emphasis="), 1, "no secondary action in the bar");
  assert.ok(bar.includes("Registrar pago"));
  assert.ok(!bar.includes("Imprimir"));
});

test("on the bar the primary is the light, single-action button whatever the rail's surface", () => {
  const bar = barOf(html(<Invoice />));
  assert.ok(bar.includes(`class="${buttonClasses("primary", "lg", "canvas")}"`));
});

test("the rail is light by default and its buttons follow it; chrome is an explicit choice", () => {
  const light = html(<Invoice />);
  const rail = light.slice(0, light.indexOf("data-thumb-bar="));
  assert.ok(!rail.includes("bg-chrome"), "no dark band in the record by default");
  assert.ok(rail.includes("border-b border-line bg-surface"));
  assert.ok(rail.includes(buttonClasses("primary", "sm", "canvas")));

  const dark = html(<Invoice surface="chrome" />);
  const darkRail = dark.slice(0, dark.indexOf("data-thumb-bar="));
  assert.ok(darkRail.includes("bg-chrome"));
  assert.ok(
    darkRail.includes(buttonClasses("primary", "sm", "chrome")),
    "buttons written without `surface` take the dark rail's",
  );
  assert.ok(
    barOf(dark).includes(`class="${buttonClasses("primary", "lg", "canvas")}"`),
    "the thumb bar stays light on a dark rail",
  );
});

test("the rail's copy of the primary hides exactly when the bar shows", () => {
  const out = html(<Invoice />);
  const rail = out.slice(0, out.indexOf("data-thumb-bar="));
  /* Two copies in the markup, one per width: the rail's hides below `handheld`, the bar
     is `hidden` and shows below `handheld`. Never both, never neither. */
  assert.equal(count(out, 'data-emphasis="primary"'), 2);
  assert.match(
    rail,
    /<span data-thumb-moves="" class="contents @max-handheld\/record:hidden"><button[^>]*data-emphasis="primary"/,
  );
  assert.match(out, /data-thumb-bar="primary" class="hidden [^"]*@max-handheld\/record:flex/);
  /* The secondary stays in the rail at every width. */
  assert.match(rail, /<button[^>]*data-emphasis="secondary"[^>]*>Imprimir/);
  assert.ok(!/data-thumb-moves=""[^>]*><button[^>]*>Imprimir/.test(rail));
});

test("the bar is the last thing in the record, sticky to the bottom — its own reserved space", () => {
  const out = html(<Invoice />);
  assert.match(
    out,
    /<div class="@container\/record sticky bottom-0 z-20 mt-auto"><div data-thumb-bar="primary"/,
  );
  assert.ok(out.endsWith("</div></div></article>"), "nothing after the bar");
  assert.match(out, /data-thumb-bar="primary" class="[^"]*safe-bottom/);
  /* The record fills its frame, so the bar reaches the bottom of a short screen. */
  assert.match(out, /<article class="flex min-w-0 flex-1 flex-col">/);
});

test("both narrow questions measure the record, by name — not an unnamed container", () => {
  const out = html(<Invoice />);
  assert.equal(count(out, 'class="@container/record"'), 1, "the rail's");
  assert.equal(count(out, "@container/record sticky"), 1, "the bar's");
  assert.ok(!/class="@container[ "]/.test(out), "no unnamed container around the sheet");
});

test("with changes the bar holds discard and save, and the primary leaves it", () => {
  const out = html(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Invoice dirty />
    </UiCopyProvider>,
  );
  const bar = barOf(out);
  assert.match(bar, /^data-thumb-bar="dirty"/);
  assert.ok(bar.includes("Guardar"));
  assert.ok(bar.includes("Descartar"));
  assert.ok(!bar.includes("Registrar pago"));
  assert.equal(count(bar, 'data-emphasis="primary"'), 1, "save is the one primary");
  /* The rail's save and discard hide when the bar shows. */
  const rail = out.slice(0, out.indexOf("data-thumb-bar="));
  assert.match(
    rail,
    /class="flex shrink-0 items-center gap-1\.5 @max-handheld\/record:hidden"/,
  );
});

test("no primary and no changes: no bar", () => {
  const out = html(
    <Record identity={{ title: "FAC/2026/0118" }}>
      <Record.Rail>
        <Record.Actions>
          <Button role="secondary" size="sm">
            Imprimir
          </Button>
        </Record.Actions>
      </Record.Rail>
    </Record>,
  );
  assert.ok(!out.includes("data-thumb-bar"));
  assert.ok(!out.includes("data-thumb-moves"));
});

test("a compact record (a drawer) has no rail and so no bar: its actions are the drawer's", () => {
  const out = html(
    <DensityProvider value="compact">
      <Invoice />
    </DensityProvider>,
  );
  assert.ok(!out.includes("data-thumb-bar"));
});

/* ---------------------------------------------------------------- *
 *  Bottom sheets
 * ---------------------------------------------------------------- */

test("on a phone the dialog is a bottom sheet", () => {
  const overlay = dialogStyles.overlay({});
  assert.match(overlay, /max-sm:items-end/);
  assert.match(overlay, /max-sm:p-0/);
  for (const width of ["sm", "md", "lg"] as const) {
    const modal = dialogStyles.modal({ width });
    for (const cls of [
      "max-sm:max-w-none",
      "max-sm:max-h-(--size-sheet)",
      "max-sm:rounded-b-none",
      "max-sm:border-b-0",
    ]) {
      assert.ok(modal.split(" ").includes(cls), `${width}: ${cls}`);
    }
  }
  /* It comes in from below and leaves the same way. */
  assert.match(
    dialogStyles.modal({ width: "md", isEntering: true }),
    /max-sm:translate-y-full/,
  );
  assert.match(
    dialogStyles.modal({ width: "md", isExiting: true }),
    /max-sm:translate-y-full/,
  );
});

test("on a phone the peek is a bottom sheet with its actions at the bottom edge", () => {
  const out = html(
    <Peek
      open
      title="FAC/2026/0118"
      onClose={noop}
      actions={
        <Button role="primary" size="sm">
          Registrar pago
        </Button>
      }
    >
      cuerpo
    </Peek>,
  );
  const aside = /<aside[^>]*class="([^"]+)"/.exec(out)?.[1] ?? "";
  for (const cls of [
    "max-sm:fixed",
    "max-sm:top-auto",
    "max-sm:left-0",
    "max-sm:w-full",
    "max-sm:max-h-(--size-sheet)",
    "max-sm:rounded-tr-panel",
    "max-sm:rounded-bl-none",
  ]) {
    assert.ok(aside.split(" ").includes(cls), cls);
  }
  /* Body scrolls under the inherited ceiling instead of clipping the header and actions. */
  assert.match(out, /class="[^"]*max-h-\[inherit\][^"]*"[^>]*role="dialog"/);
  /* The actions move to the end on a phone, but keep the desk's DOM (and Tab) order. */
  const actions = out.indexOf("max-sm:order-last");
  assert.ok(actions > out.indexOf("</header>"), "actions after the header");
  assert.ok(actions < out.indexOf("cuerpo"), "actions before the body in the DOM");
});

test("the sheet's tokens exist: 90dvh tall, 40rem the line of «handheld»", () => {
  const css = readFileSync(join(import.meta.dirname, "..", "src", "tokens.css"), "utf8");
  assert.match(css, /--size-sheet: 90dvh;/);
  assert.match(css, /--container-handheld: 40rem;/);
  assert.match(
    css,
    /@utility safe-bottom \{\s*padding-bottom: max\(0\.75rem, env\(safe-area-inset-bottom\)\);/,
  );
});

/* ---------------------------------------------------------------- *
 *  A form's action bar
 * ---------------------------------------------------------------- */

test("on a phone a form's actions stick to the bottom of what scrolls it", () => {
  const out = html(<FormActions primary={<Button role="primary">Guardar</Button>} />);
  for (const cls of [
    "max-sm:sticky",
    "max-sm:bottom-0",
    "max-sm:bg-surface",
    "max-sm:safe-bottom",
  ]) {
    assert.ok(out.includes(cls), cls);
  }
});

test("on a phone a row of sheet groups stacks, with the hairline on top instead of the side", () => {
  const html = renderToStaticMarkup(
    <SheetGroups>
      <SheetGroup title="Cliente">a</SheetGroup>
      <SheetGroup title="Condiciones">b</SheetGroup>
    </SheetGroups>,
  );
  // The query has to measure a wrapper: a grid that is its own container cannot ask its width.
  assert.match(
    html,
    /^<div class="@container min-w-0"><div class="grid min-w-0 grid-cols-2 @max-handheld:grid-cols-1"/,
  );
  assert.match(
    html,
    /border-l border-line pl-6 @max-handheld:border-l-0 @max-handheld:border-t/,
  );
});

test("a field with its label beside it stacks when its container is too narrow", () => {
  const html = renderToStaticMarkup(
    <Field label="Cliente" layout="inline" action={<span>x</span>}>
      <input />
    </Field>,
  );
  assert.match(html, /class="grid-label grid /);
  // The action sits under the control by attribute, not `col-start-2`: in one column a
  // fixed column 2 would open a second, empty column.
  assert.match(html, /data-under-control="true"/);
  assert.doesNotMatch(html, /col-start-2|grid-template-columns/);
  const css = readFileSync(join(import.meta.dirname, "..", "src", "tokens.css"), "utf8");
  const utility = css.slice(css.indexOf("@utility grid-label"));
  assert.match(
    utility,
    /@container \(width < 21rem\) \{\n {4}grid-template-columns: minmax\(0, 1fr\);/,
  );
});

test("the record's name is not cut to fit the figure: the figure wraps below", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Record
        identity={{
          title: "FAC/2026/0118",
          figure: { label: "Total", value: "Bs. 24.090,00" },
        }}
      />
    </UiCopyProvider>,
  );
  assert.match(html, /flex min-w-0 flex-wrap items-start gap-x-5 gap-y-2/);
});
