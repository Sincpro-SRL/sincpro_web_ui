import assert from "node:assert/strict";
import { test } from "node:test";

import { type TabItem, Tabs } from "@sincpro/web-ui";
import { FileText } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Las dos marcas de una pestaña dicen cosas distintas, y la prueba está para que
 * sigan diciéndolas: el contador dice CUÁNTAS cosas hay —y «0» es una respuesta—
 * y la notificación dice que algo PIDE que lo mires, así que un cero ahí no
 * dibuja nada.
 */

const draw = (tabs: readonly TabItem[]) =>
  renderToStaticMarkup(<Tabs tabs={tabs} current="datos" />);

test("el contador dibuja el cero; la notificación no", () => {
  const out = draw([
    { id: "datos", label: "datos" },
    { id: "evaluacion", label: "evaluación", count: 0 },
    { id: "avisos", label: "avisos", notice: { label: "nada", count: 0 } },
  ]);
  assert.ok(out.includes(">0<"), "«no hay ninguna» es información y se dice");
  assert.ok(!out.includes("nada"), "un cero no pide atención, así que no se dibuja");
});

/* Sin número es un punto. Y un punto de color no va nunca solo: la palabra
   viaja en el nombre accesible y en el `title`, como en `StatusDot`. */
test("una notificación sin número es un punto que igual dice qué es", () => {
  const out = draw([
    { id: "datos", label: "datos" },
    { id: "historial", label: "historial", notice: { label: "algo nuevo", tone: "accent" } },
  ]);
  assert.ok(out.includes("bg-accent"));
  assert.ok(out.includes('title="algo nuevo"'));
  assert.ok(out.includes('aria-label="historial · algo nuevo"'));
});

test("con número, la notificación se cuenta y se pinta por su clase", () => {
  const out = draw([
    { id: "datos", label: "datos" },
    { id: "columnas", label: "columnas", count: 4, notice: { label: "2 rotas", count: 2 } },
  ]);
  /* Las dos marcas conviven: cuatro cosas, dos de ellas rotas. */
  assert.ok(out.includes(">4<"));
  assert.ok(out.includes(">2<"));
  assert.ok(out.includes("text-bad"), "sin tono, `bad`: es el caso por el que existe");
});

test("una pestaña puede llevar su ícono", () => {
  const out = draw([{ id: "datos", label: "datos", icon: FileText }]);
  assert.ok(out.includes("<svg"));
});
