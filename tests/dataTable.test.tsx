import assert from "node:assert/strict";

import {
  type DataColumn,
  DataTable,
  dateKey,
  dateLabel,
  type GroupColumn,
  type GroupLevel,
  levelKey,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Lo que la tabla tenía mal y ninguna prueba veía: agrupaba con OTRA máquina.
 *
 * Partía por columna y usaba `value` como clave —que para una fecha son los
 * milisegundos, porque `value` es la clave de ORDEN— así que un montón por mes
 * salía dibujado «1789294903895», y dos granos del mismo campo eran el mismo id
 * de columna repetido. Ahora parte por NIVEL y con la clave del motor, que es la
 * misma que arman las otras cinco presentaciones.
 */

type Fila = { id: string; nombre: string; registrado: Date };

const FILAS: Fila[] = [
  { id: "a", nombre: "ventas_marzo.csv", registrado: new Date(2026, 8, 15) },
  { id: "b", nombre: "ventas_abril.csv", registrado: new Date(2026, 8, 16) },
  { id: "c", nombre: "ventas_mayo.csv", registrado: new Date(2026, 7, 3) },
];

/* La columna de una fecha mide en milisegundos: es lo que la deja ordenar. */
const COLUMNS: DataColumn<Fila>[] = [
  { id: "nombre", header: "nombre", value: (row) => row.nombre },
  {
    id: "registered",
    field: "registrado",
    header: "registrado",
    value: (row) => row.registrado.getTime(),
  },
];

const levelOf = (level: GroupLevel): GroupColumn<Fila> => ({
  id: levelKey(level),
  label: "registrado",
  keyOf: (row) => dateKey(row.registrado, level.grain!),
  labelOf: (key) => dateLabel(key, level.grain!),
});

const draw = (levels: readonly GroupColumn<Fila>[]) =>
  renderToStaticMarkup(
    <DataTable data={FILAS} columns={COLUMNS} getRowId={(row) => row.id} levels={levels} />,
  );

test("un montón de fecha se rotula, no se dibuja en milisegundos", () => {
  const out = draw([levelOf({ field: "registrado", grain: "month" })]);
  assert.ok(out.includes("September 2026"), "el rótulo del mes");
  assert.ok(out.includes("August 2026"));
  assert.ok(
    !out.includes(String(FILAS[0]!.registrado.getTime())),
    "los milisegundos son la clave de ORDEN y no tienen que verse",
  );
});

/* El caso que el id de columna no podía expresar: un mismo campo con dos granos
   son DOS cortes, y con el nombre de la columna eran el mismo id repetido. */
test("dos granos del mismo campo son dos niveles, no uno repetido", () => {
  const out = draw([
    levelOf({ field: "registrado", grain: "month" }),
    levelOf({ field: "registrado", grain: "day" }),
  ]);
  assert.ok(out.includes("September 2026"));
  /* Adentro del mes, el día ya no repite el mes: dice el día. */
  assert.ok(out.includes("Tuesday, Sep 15"));
  assert.ok(out.includes("Monday, Aug 3"));
});

/* Lo plegado se guarda por RUTA, y la ruta son las claves del motor: las mismas
   que arma `pilesFrom`. Si la tabla usara otras, plegar en filas no plegaría en
   tabla. */
test("la ruta de un montón son las claves del motor", () => {
  const out = draw([levelOf({ field: "registrado", grain: "month" })]);
  assert.ok(out.includes("aria-expanded"));
  assert.ok(!out.includes("1789"), "ninguna clave cruda de milisegundos en el marcado");
});
