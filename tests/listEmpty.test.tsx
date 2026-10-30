import assert from "node:assert/strict";
import { test } from "node:test";

import { installCopy } from "@sincpro/web-ui/foundations/copy";
import { ListView } from "@sincpro/web-ui/views/list/ListView";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * UNA LISTA VACÍA SIEMPRE DICE POR QUÉ.
 *
 * Declarar el aviso es opcional, y sin declararlo no se dibujaba nada: un panel
 * en blanco, sin filas y sin explicación, que no dice si no hay nada o si el
 * recorte se comió todo. Lo declarado gana igual —«subí un CSV» sabe qué se
 * puede hacer— y esto es lo que se dice cuando nadie sabía qué decir.
 */

installCopy({
  locale: "es-BO",
  list: { empty: "Todavía no hay nada acá.", emptyFiltered: "Nada coincide." },
});

type Fila = { id: string };

const draw = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

/** Cómo se dibuja una fila. Es obligatorio aunque no haya ninguna: una lista
 *  declara cómo se lee su contenido antes de saber si tiene. */
const fila = (one: Fila) => ({ name: one.id });

test("sin nada declarado, igual se dice que no hay nada", () => {
  const out = draw(<ListView<Fila> items={[]} keyOf={(one) => one.id} row={fila} />);
  assert.ok(out.includes("Todavía no hay nada acá."));
});

/* Vacía POR EL RECORTE es otra situación: no falta contenido, sobra un filtro. */
test("vacía por el recorte se dice distinto", () => {
  const out = draw(<ListView<Fila> items={[]} keyOf={(one) => one.id} row={fila} filtered />);
  assert.ok(out.includes("Nada coincide."));
  assert.ok(!out.includes("Todavía no hay nada acá."));
});

/* Lo declarado gana: sabe qué se puede hacer, y una frase general no. */
test("lo declarado gana sobre el respaldo", () => {
  const out = draw(
    <ListView<Fila>
      items={[]}
      keyOf={(one) => one.id}
      row={fila}
      empty={{ sentence: "Subí un CSV para empezar." }}
    />,
  );
  assert.ok(out.includes("Subí un CSV para empezar."));
  assert.ok(!out.includes("Todavía no hay nada acá."));
});

/* Cargando no es vacío: la frase de «no hay nada» contestaría otra pregunta
   mientras los datos siguen en camino. La silueta ocupa el lugar y la frase
   de carga queda para quien no ve las barras. */
test("cargando no se dice como un vacío", () => {
  const out = draw(
    <ListView<Fila>
      items={[]}
      keyOf={(one) => one.id}
      row={fila}
      state={{ loading: true }}
    />,
  );
  assert.ok(out.includes("Loading"));
  assert.ok(out.includes('aria-busy="true"'));
  assert.ok(!out.includes("Todavía no hay nada acá."));
  assert.ok(!out.includes("Nada coincide."));
});

/* Y con filas no se dice nada de esto. */
test("con filas no hay aviso de vacío", () => {
  const out = draw(
    <ListView<Fila> items={[{ id: "a" }]} keyOf={(one) => one.id} row={fila} />,
  );
  assert.ok(!out.includes("Todavía no hay nada acá."));
  assert.ok(!out.includes("Nada coincide."));
});
