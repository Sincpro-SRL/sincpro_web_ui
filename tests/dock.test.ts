import assert from "node:assert/strict";

import {
  type DockAction,
  dockPlan,
  moreGroups,
} from "@sincpro/web-ui/components/record/dock";
import { test } from "vitest";

/**
 * QUÉ SE VE EN LA PÍLDORA, y qué espera en «Más». La regla se aplica una vez, acá, y no en
 * cada pantalla que escribe sus botones a mano.
 */

const a = (id: string, extra: Partial<DockAction> = {}): DockAction => ({
  id,
  label: id,
  ...extra,
});

const ACTIONS: DockAction[] = [
  a("enviar"),
  a("pago", { primary: true }),
  a("imprimir", { items: [a("factura"), a("remito")] }),
  a("nota"),
  a("duplicar"),
  a("enlace", { tucked: true }),
  a("anular", { danger: true }),
];

const ids = (list: readonly DockAction[]) => list.map((one) => one.id);

test("la principal siempre, aparte de las visibles; las demás en orden", () => {
  const plan = dockPlan(ACTIONS, 2);
  assert.equal(plan.primary?.id, "pago");
  assert.deepEqual(ids(plan.shown), ["enviar", "imprimir"]);
  assert.deepEqual(ids(plan.more), ["nota", "duplicar", "enlace"]);
  assert.deepEqual(ids(plan.danger), ["anular"]);
});

test("lo que deshace nunca se ve al lado de la principal, aunque haya lugar", () => {
  const plan = dockPlan(ACTIONS, 10);
  assert.ok(!ids(plan.shown).includes("anular"));
  assert.deepEqual(ids(plan.danger), ["anular"]);
});

test("lo guardado a propósito va a «Más» aunque haya lugar", () => {
  assert.deepEqual(ids(dockPlan(ACTIONS, 10).more), ["enlace"]);
});

test("un «Más» de una sola acción no se dibuja: se dibuja esa acción", () => {
  const plan = dockPlan([a("pago", { primary: true }), a("enviar"), a("imprimir")], 1);
  assert.deepEqual(ids(plan.shown), ["enviar", "imprimir"]);
  assert.deepEqual(plan.more, []);
  // …salvo que lo que deshace la acompañe: entonces el menú existe igual.
  const withDanger = dockPlan([a("enviar"), a("imprimir"), a("anular", { danger: true })], 1);
  assert.deepEqual(ids(withDanger.more), ["imprimir"]);
});

test("«Más» son dos grupos: el resto, y aparte lo que deshace; las subacciones, submenú", () => {
  const groups = moreGroups(dockPlan(ACTIONS, 1));
  assert.equal(groups.length, 2);
  const print = groups[0]!.options.find((one) => one.id === "imprimir");
  assert.deepEqual(
    print?.items?.map((one) => one.id),
    ["factura", "remito"],
  );
  assert.deepEqual(
    groups[1]!.options.map((one) => one.id),
    ["anular"],
  );
});

test("sin principal, la píldora es sólo secundarias", () => {
  const plan = dockPlan([a("enviar"), a("imprimir")], 2);
  assert.equal(plan.primary, undefined);
  assert.deepEqual(ids(plan.shown), ["enviar", "imprimir"]);
});
