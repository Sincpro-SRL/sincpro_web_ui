import assert from "node:assert/strict";

import {
  Accordion,
  Button,
  Disclosure,
  Field,
  Hint,
  IconButton,
  Meter,
  meterLevel,
  PopoverTrigger,
  SPANISH_COPY,
  TextInput,
  Toolbar,
  ToolbarSeparator,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { Copy } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: keyboard, focus and announcements are React Aria's to test. What is ours is the
 * contract on top: the meter's color is the reading of its value against the thresholds,
 * the disclosure takes plain booleans and string ids, the toolbar is one named group, and
 * the popover's opener is the system's own button.
 */

test("a meter writes its range for assistive technology", () => {
  const html = renderToStaticMarkup(
    <Meter label="Crédito usado" value={42_500} maxValue={50_000} />,
  );
  assert.match(html, /role="meter/);
  assert.match(html, /aria-valuenow="42500"/);
  assert.match(html, /aria-valuemin="0"/);
  assert.match(html, /aria-valuemax="50000"/);
  assert.match(html, /aria-label="Crédito usado"/);
});

test("the meter's level follows the default thresholds: 70 and 90", () => {
  assert.equal(meterLevel(0), "good");
  assert.equal(meterLevel(69.9), "good");
  assert.equal(meterLevel(70), "warn");
  assert.equal(meterLevel(90), "warn");
  assert.equal(meterLevel(90.1), "danger");
  const level = (value: number) =>
    /data-level="(\w+)"/.exec(
      renderToStaticMarkup(<Meter label="Stock" value={value} />),
    )?.[1];
  assert.equal(level(40), "good");
  assert.equal(level(85), "warn");
  assert.equal(level(95), "danger");
});

test("the meter's thresholds can be moved", () => {
  const html = renderToStaticMarkup(
    <Meter label="Stock" value={93} thresholds={{ warn: 96, danger: 99 }} />,
  );
  assert.match(html, /data-level="good"/);
  assert.match(html, /bg-good/);
});

test("the meter's figure follows the locale of the copy", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Meter label="Presupuesto" value={1_240} maxValue={4_000} formatOptions={{}} />
    </UiCopyProvider>,
  );
  assert.match(html, /1\.240/);
  assert.match(html, /tabular-nums/);
});

test("a disclosure is closed by default and opens with defaultExpanded", () => {
  const closed = renderToStaticMarkup(<Disclosure title="Opciones avanzadas">x</Disclosure>);
  assert.match(closed, /aria-expanded="false"/);
  assert.match(closed, /hidden=""|hidden="until-found"/);
  const open = renderToStaticMarkup(
    <Disclosure title="Opciones avanzadas" defaultExpanded>
      x
    </Disclosure>,
  );
  assert.match(open, /aria-expanded="true"/);
  assert.match(open, /<h3/);
});

test("an accordion opens the sections named by id", () => {
  const html = renderToStaticMarkup(
    <Accordion defaultExpanded={["norte"]}>
      <Disclosure id="central" title="Almacén central">
        a
      </Disclosure>
      <Disclosure id="norte" title="Almacén norte">
        b
      </Disclosure>
    </Accordion>,
  );
  const states = [...html.matchAll(/aria-expanded="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(states, ["false", "true"]);
});

test("a toolbar is one named group, with the system's buttons inside", () => {
  const html = renderToStaticMarkup(
    <Toolbar label="Acciones de las líneas">
      <Button>Agregar línea</Button>
      <ToolbarSeparator />
      <IconButton icon={Copy} label="Duplicar" />
    </Toolbar>,
  );
  assert.match(html, /role="toolbar"/);
  assert.match(html, /aria-label="Acciones de las líneas"/);
  assert.match(html, /aria-orientation="horizontal"/);
  assert.match(html, /role="separator"/);
  assert.equal(html.match(/<button/g)?.length, 2);
});

test("a popover trigger draws the system's button, closed and saying so", () => {
  const html = renderToStaticMarkup(
    <PopoverTrigger title="Filtrar por monto" trigger={<Button>Filtrar por monto</Button>}>
      contenido
    </PopoverTrigger>,
  );
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.doesNotMatch(html, /contenido/);
  /* Anchored to the button itself: no wrapper element around it. */
  assert.match(html, /^<button/);
});

test("a hint is a press target whose sentence stays in the page for aria-describedby", () => {
  const html = renderToStaticMarkup(<Hint id="plazo-hint">En días desde la factura.</Hint>);
  assert.match(html, /<button[^>]*aria-expanded="false"/);
  assert.match(html, /<button[^>]*aria-label="En días desde la factura\."/);
  assert.match(html, /<span id="plazo-hint" hidden="">En días desde la factura\.<\/span>/);
  /* Closed: the popover is not drawn until it is pressed. */
  assert.doesNotMatch(html, /role="dialog"/);
});

test("a field's hint is the hidden sentence its control is described by", () => {
  const html = renderToStaticMarkup(
    <Field label="Plazo" htmlFor="plazo" hint="En días desde la factura.">
      <TextInput value="" />
    </Field>,
  );
  assert.match(html, /aria-describedby="plazo-hint"/);
  assert.match(html, /id="plazo-hint" hidden="">En días desde la factura\./);
});
