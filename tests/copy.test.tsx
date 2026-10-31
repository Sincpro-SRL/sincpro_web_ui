import assert from "node:assert/strict";

import { writeANote } from "@sincpro/web-ui/components/activity/Messages";
import {
  currentCopy,
  installCopy,
  UiCopyProvider,
  useUiCopy,
} from "@sincpro/web-ui/foundations/copy";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * LA COPIA, una sola.
 *
 * Se instala una vez y la lee todo el mundo: los componentes y también lo que no
 * es un componente —el que arma la frase de una condición, el que nombra un mes—.
 * Que haya UNA es lo que impide que la misma pantalla diga «cualquiera» en una
 * ficha y «any» dos centímetros más allá.
 */

function Dice() {
  const copy = useUiCopy();
  return <span>{copy.search.groupedBy}</span>;
}

installCopy({ locale: "es-BO", search: { groupedBy: "agrupado por" } });

/* Sin provider se lee la INSTALADA. Antes se leía el inglés de fábrica que el
   contexto se había guardado al crearse, así que instalar el castellano no
   alcanzaba: había que envolver, y lo que no estaba envuelto hablaba en otro
   idioma en la misma pantalla. */
test("un componente sin provider lee la copia instalada", () => {
  assert.equal(renderToStaticMarkup(<Dice />), "<span>agrupado por</span>");
});

/* Y lo que no es un componente lee la misma. */
test("lo que no dibuja lee la misma copia", () => {
  assert.equal(currentCopy().search.groupedBy, "agrupado por");
});

/* Un provider la cambia para lo que tiene adentro: es para una parte, no para
   otra fuente de verdad. */
test("un provider manda adentro de su rama", () => {
  const out = renderToStaticMarkup(
    <UiCopyProvider copy={{ search: { groupedBy: "por" } }}>
      <Dice />
    </UiCopyProvider>,
  );
  assert.equal(out, "<span>por</span>");
});

/* Lo que el override no nombra queda como estaba: instalar una palabra no
   vacía las otras doscientas. */
test("lo que no se nombra no se pierde", () => {
  assert.equal(currentCopy().builder.apply, "Apply");
});

/* Una manera de escribir declarada como CONSTANTE del módulo se quedaría con las
   palabras que hubiera al cargarlo —las de fábrica— por más que después se
   instale otra. Por eso se arma cada vez que se pide. */
test("la manera de escribir una nota se arma con la copia de ahora", () => {
  installCopy({ locale: "es-BO", activity: { writeNote: "Registrar una nota" } });
  assert.equal(writeANote().label, "Registrar una nota");

  installCopy({ locale: "en", activity: { writeNote: "Log a note" } });
  assert.equal(writeANote().label, "Log a note");
});
