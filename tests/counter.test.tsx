import assert from "node:assert/strict";

import {
  Field,
  Keypad,
  KioskFrame,
  Outcome,
  Receipt,
  SPANISH_COPY,
  Stepper,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the counter's own pieces — a quantity pressed with «−» and «+», the pad's screen, the
 * end of an operation said big, the printed ticket and the kiosk's frame. Each is generic (no
 * «POS» in the package): a cart's line and the people at a table are the same stepper.
 */

const es = (node: React.ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

test("a stepper is one spin button between «−» and «+», named by its unit", () => {
  const html = es(
    <Stepper value={2} onChange={() => {}} min={1} max={9} unitLabel="Capuchino" />,
  );
  assert.match(
    html,
    /role="spinbutton"[^>]*aria-valuenow="2"[^>]*aria-valuemin="1"[^>]*aria-valuemax="9"/,
  );
  assert.match(html, /aria-label="Uno menos: Capuchino"/);
  assert.match(html, /aria-label="Uno más: Capuchino"/);
  /* The buttons are not tab stops: the spin button is, and the arrows step it. */
  assert.equal(html.match(/tabindex="-1"/g)?.length, 2);
});

test("at the minimum, «−» removes the line when the screen allows it — and stops otherwise", () => {
  const removes = es(<Stepper value={1} onChange={() => {}} min={1} onRemove={() => {}} />);
  assert.match(removes, /aria-label="Quitar"/);
  assert.doesNotMatch(removes, /<button[^>]*disabled=""[^>]*aria-label="Quitar"/);
  const stops = es(<Stepper value={1} onChange={() => {}} min={1} />);
  assert.match(stops, /<button[^>]*disabled=""[^>]*aria-label="Uno menos"/);
});

test("inside a field the field names the stepper; in read mode it is the figure", () => {
  const html = renderToStaticMarkup(
    <Field label="Personas">
      <Stepper value={4} onChange={() => {}} />
    </Field>,
  );
  assert.match(html, /role="spinbutton"[^>]*aria-labelledby=/);
  const read = renderToStaticMarkup(<Stepper value={4} onChange={() => {}} mode="read" />);
  assert.doesNotMatch(read, /spinbutton/);
  assert.match(read, />4</);
});

test("the pad's screen shows what is typed, live, and what it is", () => {
  const html = es(
    <Keypad
      value="12.5"
      onChange={() => {}}
      screen={{ label: "Capuchino · Precio", value: "12,5" }}
    />,
  );
  assert.match(html, /data-ui="keypad.screen" aria-live="polite"/);
  assert.match(html, /Capuchino · Precio/);
  assert.match(html, />12,5<\/span>/);
});

test("an outcome is a status: what happened, the one figure, the way on", () => {
  const html = es(
    <Outcome
      title="Pedido confirmado"
      figure="118"
      figureLabel="Tu número"
      detail="Te llamamos en pantalla."
      action={<button type="button">Nuevo pedido</button>}
    />,
  );
  assert.match(html, /role="status" data-ui="outcome" data-tone="good"/);
  assert.match(html, /Tu número<\/span><span[^>]*>118<\/span>/);
  assert.match(html, /Nuevo pedido/);
});

test("a receipt is the ticket's fixed form: issuer, document, facts, lines, totals, legend", () => {
  const html = renderToStaticMarkup(
    <Receipt
      issuer="Café Illimani"
      issuerLines={["NIT 1023456028", "Av. Arce 2631, La Paz"]}
      document="FACTURA"
      facts={[{ label: "N.º", value: "00047" }]}
      lines={[
        { quantity: 2, name: "Capuchino", amount: "Bs 40,00" },
        { quantity: 3, name: "Salteña de pollo", amount: "Bs 36,00", note: "sin picante" },
      ]}
      totals={[{ label: "Total", value: "Bs 76,00", total: true }]}
      footer={["¡Gracias por su compra!"]}
    />,
  );
  assert.match(html, /data-ui="receipt" data-look="paper"/);
  assert.match(html, /max-w-\(--container-receipt\)/);
  assert.match(html, /data-ui="receipt.document"[^>]*>FACTURA</);
  assert.equal(html.match(/<li/g)?.length, 2);
  assert.match(html, /sin picante/);
  assert.match(html, /¡Gracias por su compra!/);
});

test("a kiosk waits on its attract screen, pressed whole, and says «touch» for its area", () => {
  const html = es(
    <KioskFrame
      attract={{ title: "Pedí aquí", subtitle: "Sin filas", call: "Tocá para pedir" }}
    >
      <p>flujo</p>
    </KioskFrame>,
  );
  assert.match(html, /data-ui="kiosk" data-pointer="touch"/);
  assert.match(html, /<button type="button" data-ui="kiosk.attract"/);
  assert.match(html, /Tocá para pedir/);
  assert.doesNotMatch(html, /flujo/);
  const running = es(
    <KioskFrame attract={{ title: "Pedí aquí" }} waiting={false}>
      <p>flujo</p>
    </KioskFrame>,
  );
  assert.match(running, /flujo/);
  assert.match(running, /aria-label="Bajar la pantalla al alcance"/);
});
