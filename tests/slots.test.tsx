import assert from "node:assert/strict";
import { test } from "node:test";

import { List } from "@sincpro/web-ui";
import {
  flatten,
  loose,
  pick,
  pickAll,
  propsOf,
  slot,
  slotOf,
} from "@sincpro/web-ui/foundations/slots";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * EL MECANISMO DE LAS RANURAS, y lo que garantiza.
 *
 * Una ranura declara y no dibuja; los fragmentos no la esconden; y lo que no es
 * ninguna ranura sigue siendo suyo de quien lo escribió. Las tres son lo que
 * hace que un arquetipo se pueda escribir como árbol sin perder nada por el
 * camino.
 */

type Name = "uno" | "dos";

const Uno = slot("uno", (_props: { valor: number; children?: ReactNode }) => null);
const Dos = slot("dos", (_props: { children?: ReactNode }) => null);

test("una ranura declara y no dibuja", () => {
  assert.equal(renderToStaticMarkup(<Uno valor={1} />), "");
  assert.equal(slotOf<Name>(<Uno valor={1} />), "uno");
  assert.equal(slotOf<Name>(<span />), undefined);
});

/* Un `<>…</>` en el medio —lo que escribe cualquiera que ponga dos ranuras bajo
   un condicional— escondería lo que tiene adentro. */
test("los fragmentos no esconden ranuras", () => {
  const nodes = flatten(
    <>
      <Uno valor={1} />
      <>
        <Dos />
      </>
    </>,
  );
  assert.equal(nodes.length, 2);
  assert.equal(slotOf<Name>(nodes[1]), "dos");
});

test("se lee la ranura por nombre, y sus props", () => {
  const nodes = flatten(
    <>
      <span>suelto</span>
      <Uno valor={7} />
      <Uno valor={9} />
    </>,
  );
  assert.equal(propsOf<{ valor: number }>(pick(nodes, "uno"))?.valor, 7);
  assert.equal(pickAll(nodes, "uno").length, 2);
  assert.equal(loose(nodes, ["uno", "dos"]).length, 1);
});

/* ---------------------------------------------------------------- *
 *  El árbol de una lista
 * ---------------------------------------------------------------- */

type Fila = { id: string; nombre: string };
const FILAS: Fila[] = [
  { id: "a", nombre: "ventas_marzo.csv" },
  { id: "b", nombre: "ventas_abril.csv" },
];

const COLUMNS = [{ id: "nombre", header: "nombre", value: (row: Fila) => row.nombre }];

/* La cara que hay es la que está escrita: con una sola no hay conmutador que
   ofrecer, así que no se dibuja. */
test("con una sola cara escrita no hay conmutador", () => {
  const out = renderToStaticMarkup(
    <List items={FILAS} keyOf={(row) => row.id}>
      <List.Rows<Fila> row={(row) => ({ name: row.nombre })} />
    </List>,
  );
  assert.ok(out.includes("ventas_marzo.csv"));
  assert.ok(!out.includes('role="radiogroup"') && !out.includes("Table"));
});

/* Y con dos, el conmutador ofrece LAS DOS — en el orden en que se escribieron.
   No hay una lista aparte que declare cuáles son: es el mismo nodo que dibuja. */
test("las caras que se ofrecen son las que están escritas", () => {
  const out = renderToStaticMarkup(
    <List items={FILAS} keyOf={(row) => row.id} present="table">
      <List.Rows<Fila> row={(row) => ({ name: row.nombre })} />
      <List.Table<Fila> columns={COLUMNS} />
    </List>,
  );
  /* Dibuja la tabla, así que el encabezado de columna está. */
  assert.ok(out.includes("nombre"));
  assert.ok(out.includes("ventas_abril.csv"));
});

test("la barra pone cada pieza donde va, y sin barra no hay banda", () => {
  const conBarra = renderToStaticMarkup(
    <List items={FILAS} keyOf={(row) => row.id}>
      <List.Bar>
        <List.Identity title="Catálogo" />
        <List.Search>
          <input aria-label="buscar" />
        </List.Search>
        <List.Actions>
          <button type="button">Subir</button>
        </List.Actions>
      </List.Bar>
      <List.Rows<Fila> row={(row) => ({ name: row.nombre })} />
    </List>,
  );
  assert.ok(conBarra.includes("Catálogo"));
  assert.ok(conBarra.includes('aria-label="buscar"'));
  assert.ok(conBarra.includes("Subir"));

  const sinBarra = renderToStaticMarkup(
    <List items={FILAS} keyOf={(row) => row.id}>
      <List.Rows<Fila> row={(row) => ({ name: row.nombre })} />
    </List>,
  );
  assert.ok(!sinBarra.includes("Catálogo"));
});

/* La escotilla: lo que el arquetipo no previó se dibuja igual. Que aparezca algo
   acá es la señal de que al arquetipo le falta una pieza. */
test("lo que no es ninguna ranura se dibuja igual", () => {
  const out = renderToStaticMarkup(
    <List items={FILAS} keyOf={(row) => row.id}>
      <List.Rows<Fila> row={(row) => ({ name: row.nombre })} />
      <p>una nota al pie</p>
    </List>,
  );
  assert.ok(out.includes("una nota al pie"));
});
