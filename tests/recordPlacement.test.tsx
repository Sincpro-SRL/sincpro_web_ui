import assert from "node:assert/strict";

import { DensityProvider } from "@sincpro/web-ui/foundations/density";
import { Record } from "@sincpro/web-ui/views/record/Record";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * LA HOJA LA DECIDE DÓNDE ESTÁ EL REGISTRO, NO LO QUE LLEVA EL RIEL.
 *
 * Adivinarla por las migas, el paginador o las acciones cambiaba el árbol entero debajo del
 * papel cuando una de ellas llegaba tarde o se iba — y el campo que se estaba escribiendo se
 * desmontaba. Con `placement`, la hoja es un hecho del montaje.
 */

const dirty = { onSave: () => {}, onDiscard: () => {} };
const draw = (node: ReactNode) => renderToStaticMarkup(node);
/* The ground under the paper: only the page draws it. */
const onPaper = (html: string) => html.includes("bg-ground");

test("una página sin migas ni acciones igual va sobre la hoja", () => {
  const html = draw(<Record placement="page" identity={{ title: "FAC/2026/0118" }} />);
  assert.ok(onPaper(html));
});

test("una tarjeta con migas y acciones no va sobre la hoja", () => {
  const html = draw(
    <Record placement="card" identity={{ title: "FAC/2026/0118" }}>
      <Record.Rail>
        <Record.Crumbs crumbs={[{ label: "Facturas" }]} />
        <Record.Actions>
          <button type="button">Enviar</button>
        </Record.Actions>
      </Record.Rail>
    </Record>,
  );
  assert.ok(!onPaper(html));
});

test("escribir no cambia la hoja: con y sin cambios el registro sigue en el mismo lugar", () => {
  const before = draw(<Record placement="card" identity={{ title: "Ana" }} />);
  const after = draw(<Record placement="card" identity={{ title: "Ana" }} dirty={dirty} />);
  assert.equal(onPaper(before), onPaper(after));
  const page = draw(<Record placement="page" identity={{ title: "Ana" }} dirty={dirty} />);
  assert.ok(onPaper(page));
});

test("en compacto (la vista previa) nunca hay hoja, aunque se diga página", () => {
  const html = draw(
    <DensityProvider value="compact">
      <Record placement="page" identity={{ title: "Ana" }} />
    </DensityProvider>,
  );
  assert.ok(!onPaper(html));
});

test("sin `placement`, se sigue adivinando por el riel", () => {
  const bare = draw(<Record identity={{ title: "Ana" }} />);
  const crumbs = draw(
    <Record identity={{ title: "Ana" }}>
      <Record.Rail>
        <Record.Crumbs crumbs={[{ label: "Contactos" }]} />
      </Record.Rail>
    </Record>,
  );
  assert.ok(!onPaper(bare));
  assert.ok(onPaper(crumbs));
});

test("un riel oscuro con sólo la etapa es oscuro antes de escribir, no recién al escribir", () => {
  const rail = (
    <Record.Rail surface="chrome">
      <Record.Status stages={[{ id: "draft", label: "Borrador" }]} current="draft" />
    </Record.Rail>
  );
  const before = draw(<Record identity={{ title: "Ana" }}>{rail}</Record>);
  const after = draw(
    <Record identity={{ title: "Ana" }} dirty={dirty}>
      {rail}
    </Record>,
  );
  assert.ok(before.includes("bg-chrome"));
  assert.ok(after.includes("bg-chrome"));
});
