import assert from "node:assert/strict";
import { test } from "node:test";

import { Dialog, Peek, SPANISH_COPY, UiCopyProvider, Wizard } from "@sincpro/web-ui";
import { DialogSurface } from "@sincpro/web-ui/primitives/dialog/Dialog";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: the focus trap, Escape, the return of focus and the scroll lock are React Aria's
 * and were driven in a browser (they need one). What is ours is the contract on top: the
 * dialog is named by its title and described by its subtitle, it says what it is about,
 * every way out reports through `onClose`; the peek is NOT modal; the wizard never lets you
 * jump ahead and always says why «next» is off.
 */

const noop = () => {};

test("a closed dialog draws nothing", () => {
  const html = renderToStaticMarkup(
    <Dialog open={false} title="Registrar pago" onClose={noop}>
      x
    </Dialog>,
  );
  assert.equal(html, "");
});

test("the dialog is named by its title and described by its subtitle", () => {
  const html = renderToStaticMarkup(
    <DialogSurface
      title="Registrar pago"
      subtitle="El saldo baja en el momento."
      onClose={noop}
    >
      cuerpo
    </DialogSurface>,
  );
  assert.match(html, /role="dialog"/);
  // React Aria makes it modal with `inert` on the rest of the page, not with `aria-modal`.
  assert.doesNotMatch(html, /aria-modal/);
  const labelledBy = /aria-labelledby="([^"]+)"/.exec(html)?.[1];
  assert.ok(labelledBy, "the dialog has aria-labelledby");
  assert.match(html, new RegExp(`<h2[^>]*id="${labelledBy}"[^>]*>Registrar pago</h2>`));
  const describedBy = /aria-describedby="([^"]+)"/.exec(html)?.[1];
  assert.ok(describedBy, "the dialog has aria-describedby");
  assert.match(html, new RegExp(`id="${describedBy}"[^>]*>El saldo baja en el momento.<`));
});

test("without a subtitle the dialog is not described by anything", () => {
  const html = renderToStaticMarkup(
    <DialogSurface title="Aplicar descuento" onClose={noop}>
      x
    </DialogSurface>,
  );
  assert.doesNotMatch(html, /aria-describedby/);
});

test("the dialog says what it is about before the title", () => {
  const html = renderToStaticMarkup(
    <DialogSurface
      title="Registrar pago"
      context={{ kind: "factura", label: "FAC/2026/0110", detail: "saldo Bs. 99.500,00" }}
      onClose={noop}
    >
      x
    </DialogSurface>,
  );
  const at = (text: string) => html.indexOf(text);
  assert.ok(at("factura") > -1 && at("FAC/2026/0110") > -1 && at("saldo Bs. 99.500,00") > -1);
  assert.ok(at("FAC/2026/0110") < at("Registrar pago"));
});

test("close is always there, expand only with onExpand — both named from the copy", () => {
  const closed = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <DialogSurface title="Anular" onClose={noop}>
        x
      </DialogSurface>
    </UiCopyProvider>,
  );
  assert.match(closed, /aria-label="Cerrar"/);
  assert.doesNotMatch(closed, /aria-label="Agrandar a panel"/);

  const expandable = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <DialogSurface title="Nueva orden" onClose={noop} onExpand={noop}>
        x
      </DialogSurface>
    </UiCopyProvider>,
  );
  assert.match(expandable, /aria-label="Agrandar a panel"/);

  const named = renderToStaticMarkup(
    <DialogSurface
      title="Nueva orden"
      onClose={noop}
      onExpand={noop}
      expandLabel="Abrir el catálogo"
    >
      x
    </DialogSurface>,
  );
  assert.match(named, /aria-label="Abrir el catálogo"/);
});

test("the footer is drawn only when given", () => {
  const bare = renderToStaticMarkup(
    <DialogSurface title="t" onClose={noop}>
      x
    </DialogSurface>,
  );
  assert.doesNotMatch(bare, /<footer/);
  const withFooter = renderToStaticMarkup(
    <DialogSurface title="t" onClose={noop} footer={<button type="button">Aplicar</button>}>
      x
    </DialogSurface>,
  );
  assert.match(withFooter, /<footer[^>]*>.*Aplicar/);
});

test("the public API of Dialog is unchanged", () => {
  // A compile-time check as much as a runtime one: every prop the old dialog took.
  const element = (
    <Dialog
      open={false}
      title="Registrar pago"
      subtitle="s"
      context={{ kind: "factura", label: "FAC/2026/0110", detail: "d" }}
      width="lg"
      onClose={noop}
      onExpand={noop}
      expandLabel="e"
      footer={null}
    >
      x
    </Dialog>
  );
  assert.equal(renderToStaticMarkup(element), "");
});

const STEPS = [
  { id: "proveedor", label: "Proveedor" },
  { id: "condiciones", label: "Condiciones", blocked: "Elegí el plazo de pago." },
  { id: "revisar", label: "Revisar" },
];

test("the wizard marks the current step and never lets you jump ahead", () => {
  const html = renderToStaticMarkup(
    <Wizard steps={STEPS} current="proveedor" onNext={noop}>
      paso
    </Wizard>,
  );
  assert.equal(html.match(/aria-current="step"/g)?.length, 1);
  assert.match(html, /data-state="current"[^>]*>.*Proveedor/);
  assert.equal(html.match(/data-state="pending"/g)?.length, 2);
  assert.equal(html.match(/<button[^>]*disabled=""[^>]*data-state="pending"/g)?.length, 2);
});

test("a blocked step turns «next» off and says why", () => {
  const html = renderToStaticMarkup(
    <Wizard steps={STEPS} current="condiciones" onNext={noop} onBack={noop}>
      paso
    </Wizard>,
  );
  assert.match(html, /Elegí el plazo de pago\./);
  assert.match(html, /<button[^>]*disabled=""[^>]*data-emphasis="primary"/);
  // Done steps stay pressable: going back is reviewing.
  assert.match(html, /<button type="button" data-state="done"/);
});

test("«back» only from the second step on", () => {
  const first = renderToStaticMarkup(
    <Wizard steps={STEPS} current="proveedor" onBack={noop}>
      x
    </Wizard>,
  );
  assert.doesNotMatch(first, /Atrás/);
  const second = renderToStaticMarkup(
    <Wizard steps={STEPS} current="revisar" onBack={noop}>
      x
    </Wizard>,
  );
  assert.match(second, /Atrás/);
});

test("on the last step «next» names what happens", () => {
  const named = renderToStaticMarkup(
    <Wizard steps={STEPS} current="revisar" nextLabel="Crear orden de compra">
      x
    </Wizard>,
  );
  assert.match(named, /Crear orden de compra/);
  const busy = renderToStaticMarkup(
    <Wizard steps={STEPS} current="revisar" nextLabel="Crear orden de compra" busy>
      x
    </Wizard>,
  );
  assert.match(busy, /aria-busy="true"/);
  assert.doesNotMatch(busy, /Crear orden de compra/);
});

test("the peek is a non-modal dialog named by its title, inside the preview landmark", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Peek open title="FAC/2026/0118" subtitle="Constructora Illimani" onClose={noop}>
        cuerpo
      </Peek>
    </UiCopyProvider>,
  );
  assert.match(html, /<aside[^>]*aria-label="Vista previa"/);
  assert.match(html, /role="dialog"/);
  assert.doesNotMatch(html, /aria-modal|inert/);
  const labelledBy = /aria-labelledby="([^"]+)"/.exec(html)?.[1];
  assert.ok(labelledBy);
  assert.match(html, new RegExp(`<h2[^>]*id="${labelledBy}"[^>]*>FAC/2026/0118</h2>`));
  assert.match(html, /aria-label="Cerrar la vista previa"/);
  // No scrim: nothing but the drawer covers the list.
  assert.doesNotMatch(html, /bg-ink\/30/);
});

test("the peek draws its action bar only when there is something to do", () => {
  const bare = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Peek open title="Cliente" onClose={noop}>
        x
      </Peek>
    </UiCopyProvider>,
  );
  assert.doesNotMatch(bare, /Abrir como panel/);
  const promotable = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Peek open title="Cliente" onClose={noop} onPromote={noop}>
        x
      </Peek>
    </UiCopyProvider>,
  );
  assert.match(promotable, /Abrir como panel/);
  assert.equal(
    renderToStaticMarkup(
      <Peek open={false} title="Cliente" onClose={noop}>
        x
      </Peek>,
    ),
    "",
  );
});
