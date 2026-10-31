import assert from "node:assert/strict";

import { dateKey } from "@sincpro/web-ui/foundations/calendar";
import { installCopy } from "@sincpro/web-ui/foundations/copy";
import {
  type GroupLevel,
  levelKey,
  moveLevel,
  normalizeLevels,
  pathKey,
  pathLabels,
  type Pile,
  pileCount,
  pileIsOpen,
  pileItems,
  pilesFrom,
  pilesOf,
} from "@sincpro/web-ui/foundations/grouping";
import { test } from "vitest";

type Row = { id: string; origin: string; month: string };

const ROWS: Row[] = [
  { id: "a", origin: "sintético", month: "2026-09" },
  { id: "b", origin: "traído", month: "2026-09" },
  { id: "c", origin: "sintético", month: "2026-08" },
  { id: "d", origin: "sintético", month: "2026-09" },
  { id: "e", origin: "traído", month: "2026-08" },
];

const of = (row: Row, level: GroupLevel): string =>
  level.field === "origin" ? row.origin : row.month;

const BY_ORIGIN: GroupLevel[] = [{ field: "origin" }];
const BY_BOTH: GroupLevel[] = [{ field: "origin" }, { field: "month", grain: "month" }];

const ids = <T extends { id: string }>(items: readonly T[]): string[] =>
  items.map((one) => one.id);

test("sin niveles no hay montones", () => {
  assert.deepEqual(pilesFrom(ROWS, [], of), []);
});

test("un nivel parte por el campo, en orden de primera aparición", () => {
  const piles = pilesFrom(ROWS, BY_ORIGIN, of);
  assert.deepEqual(
    piles.map((one) => one.label),
    ["sintético", "traído"],
  );
  assert.deepEqual(
    piles.map((one) => one.count),
    [3, 2],
  );
  assert.deepEqual(ids(piles[0]!.items), ["a", "c", "d"]);
});

test("las filas viven SÓLO en el nivel más profundo", () => {
  const piles = pilesFrom(ROWS, BY_BOTH, of);
  // El de arriba no las repite: si las tuviera, un total las contaría dos veces.
  assert.deepEqual(piles[0]!.items, []);
  assert.equal(piles[0]!.piles.length, 2);
  assert.deepEqual(ids(piles[0]!.piles[0]!.items), ["a", "d"]);
});

test("el conteo del padre es el de todos sus hijos", () => {
  const piles = pilesFrom(ROWS, BY_BOTH, of);
  for (const pile of piles) {
    assert.equal(pile.count, pileCount(pile.piles));
  }
  assert.equal(pileCount(piles), ROWS.length);
});

/* El caso que obliga a que la identidad sea la RUTA: «2026-09» existe adentro
   de los dos orígenes, y plegar uno no puede plegar el otro. */
test("dos montones homónimos en ramas distintas tienen rutas distintas", () => {
  const piles = pilesFrom(ROWS, BY_BOTH, of);
  const sintetico = piles[0]!.piles.find((one) => one.key === "2026-09")!;
  const traido = piles[1]!.piles.find((one) => one.key === "2026-09")!;

  assert.equal(sintetico.key, traido.key);
  assert.notEqual(pathKey(sintetico.path), pathKey(traido.path));
  assert.deepEqual(sintetico.path, ["sintético", "2026-09"]);
  assert.deepEqual(traido.path, ["traído", "2026-09"]);
});

/* ---------------------------------------------------------------- *
 *  La clave identifica; el rótulo se lee
 * ---------------------------------------------------------------- */

/* El árbol de calendario entero, que es para lo que existen los cuatro granos:
 *
 *     2026
 *       Septiembre
 *         Semana 38
 *           Martes
 *
 * Cada renglón dice sólo lo que el de arriba no dijo, y la ruta que los pliega
 * sigue siendo la del motor: `["2026", "2026-09", "2026-W38", "2026-09-15"]`.
 */
test("un árbol de fechas se lee de arriba hacia abajo, sin repetirse", () => {
  installCopy({
    locale: "es-BO",
    calendar: { week: "Semana {n}", weekOfYear: "Semana {n} de {year}" },
  });

  const cuando = new Date(2026, 8, 15);
  const levels: GroupLevel[] = (["year", "month", "week", "day"] as const).map((grain) => ({
    field: "registrado",
    grain,
  }));
  const piles = pilesFrom([{ id: "a", registrado: cuando }], levels, (row, level) =>
    dateKey(row.registrado, level.grain!),
  );

  const año = piles[0]!;
  const mes = año.piles[0]!;
  const semana = mes.piles[0]!;
  const día = semana.piles[0]!;

  assert.deepEqual(
    [año.label, mes.label, semana.label, día.label],
    ["2026", "Septiembre", "Semana 38", "Martes"],
  );
  assert.deepEqual(día.path, ["2026", "2026-09", "2026-W38", "2026-09-15"]);

  installCopy();
});

/* El caso que obliga a separar las dos: con el rótulo por identidad, dos
   septiembres de años distintos serían un montón —«Septiembre» y «Septiembre»—
   y el conteo de uno se llevaría las filas del otro. */
test("la clave identifica y el rótulo se lee, y no son el mismo texto", () => {
  const rows = [
    { id: "a", mes: new Date(2026, 8, 1) },
    { id: "b", mes: new Date(2025, 8, 1) },
  ];
  const piles = pilesFrom(rows, [{ field: "mes", grain: "month" }], (row, level) =>
    dateKey(row.mes, level.grain!),
  );

  assert.deepEqual(
    piles.map((one) => one.key),
    ["2026-09", "2025-09"],
  );
  assert.deepEqual(
    piles.map((one) => one.label),
    ["September 2026", "September 2025"],
  );
  assert.deepEqual(
    piles.map((one) => one.count),
    [1, 1],
  );
});

/* Lo que no es una fecha se identifica y se lee con la misma palabra: traducir
   «sintético» sería inventar un valor que nadie guardó. */
test("un campo que no es fecha tiene la misma clave y el mismo rótulo", () => {
  const piles = pilesFrom(ROWS, BY_ORIGIN, of);
  for (const pile of piles) assert.equal(pile.key, pile.label);
});

test("el rótulo se puede poner desde afuera, y manda", () => {
  const piles = pilesFrom(ROWS, BY_ORIGIN, of, (key) => key.toUpperCase());
  assert.deepEqual(
    piles.map((one) => one.label),
    ["SINTÉTICO", "TRAÍDO"],
  );
  assert.deepEqual(
    piles.map((one) => one.key),
    ["sintético", "traído"],
  );
});

test("la profundidad la lleva cada montón", () => {
  const piles = pilesFrom(ROWS, BY_BOTH, of);
  assert.equal(piles[0]!.depth, 0);
  assert.equal(piles[0]!.piles[0]!.depth, 1);
});

test("cada montón dice por qué campo se partió", () => {
  const piles = pilesFrom(ROWS, BY_BOTH, of);
  assert.equal(piles[0]!.field, "origin");
  assert.equal(piles[0]!.piles[0]!.field, "month");
});

/* Un objeto ordena solo las claves que parecen enteros, así que agrupar por año
   devolvería 2025 antes que 2026 aunque las filas vinieran al revés — y el orden
   de las filas ya lo decidió alguien. */
test("las claves numéricas conservan el orden de aparición", () => {
  type Year = { id: string; year: string };
  const rows: Year[] = [
    { id: "a", year: "2026" },
    { id: "b", year: "2024" },
    { id: "c", year: "2025" },
  ];
  const piles = pilesFrom(rows, [{ field: "year" }], (row) => row.year);
  assert.deepEqual(
    piles.map((one) => one.label),
    ["2026", "2024", "2025"],
  );
});

test("pileItems devuelve las filas en el orden dibujado", () => {
  const piles = pilesFrom(ROWS, BY_BOTH, of);
  assert.deepEqual(ids(pileItems(piles) as Row[]), ["a", "d", "c", "b", "e"]);
});

test("una ruta de un solo tramo no se confunde con una de dos", () => {
  assert.notEqual(pathKey(["a", "b"]), pathKey(["ab"]));
});

/* ---------------------------------------------------------------- *
 *  El orden de los niveles ES la jerarquía
 * ---------------------------------------------------------------- */

const LEVELS: GroupLevel[] = [{ field: "a" }, { field: "b" }, { field: "c" }];

test("mover un nivel lo cambia de lugar", () => {
  assert.deepEqual(
    moveLevel(LEVELS, "c", -1).map((one) => one.field),
    ["a", "c", "b"],
  );
});

test("en los bordes se queda, no da la vuelta", () => {
  assert.deepEqual(
    moveLevel(LEVELS, "a", -1).map((one) => one.field),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    moveLevel(LEVELS, "c", 1).map((one) => one.field),
    ["a", "b", "c"],
  );
});

test("mover un nivel que no está puesto no cambia nada", () => {
  assert.deepEqual(moveLevel(LEVELS, "z", 1), LEVELS);
});

/* Los montones los puede contar quien guarda los datos, y entonces `pilesFrom`
   no participa: la presentación recibe el árbol ya hecho. Este test fija que el
   tipo alcanza para expresarlo sin filas en la mano. */
test("un árbol contado afuera es un Pile válido, sin filas", () => {
  const contado: Pile<Row>[] = [
    {
      path: ["sintético"],
      depth: 0,
      field: "origin",
      key: "sintético",
      label: "sintético",
      count: 187,
      items: [],
      piles: [],
    },
  ];
  assert.equal(pileCount(contado), 187);
  assert.deepEqual(pileItems(contado), []);
});

/* ---------------------------------------------------------------- *
 *  Los granos de un mismo campo se ordenan SOLOS, de grueso a fino
 * ---------------------------------------------------------------- */

const fields = (levels: readonly GroupLevel[]): string[] => levels.map(levelKey);

test("tildar día y después mes da «mes › día», no el orden en que se tildó", () => {
  assert.deepEqual(
    fields(
      normalizeLevels([
        { field: "f", grain: "day" },
        { field: "f", grain: "month" },
      ]),
    ),
    ["f:month", "f:day"],
  );
});

test("los cuatro granos quedan de grueso a fino", () => {
  assert.deepEqual(
    fields(
      normalizeLevels([
        { field: "f", grain: "day" },
        { field: "f", grain: "year" },
        { field: "f", grain: "week" },
        { field: "f", grain: "month" },
      ]),
    ),
    ["f:year", "f:month", "f:week", "f:day"],
  );
});

/* Dos cortes de la MISMA fecha separados por otro campo no son una jerarquía:
   son un tropiezo. Quedan juntos. */
test("los niveles de un mismo campo quedan contiguos", () => {
  assert.deepEqual(
    fields(
      normalizeLevels([
        { field: "fecha", grain: "month" },
        { field: "origen" },
        { field: "fecha", grain: "day" },
      ]),
    ),
    ["fecha:month", "fecha:day", "origen"],
  );
});

/* Entre CAMPOS distintos manda quien agrupa: es una pregunta del dominio y no
   del calendario, así que se respeta el orden de primera aparición. */
test("el orden entre campos distintos no se toca", () => {
  assert.deepEqual(
    fields(normalizeLevels([{ field: "b" }, { field: "a" }, { field: "c" }])),
    ["b", "a", "c"],
  );
});

test("un campo y un grano del mismo nombre no son el mismo nivel", () => {
  assert.notEqual(levelKey({ field: "fecha" }), levelKey({ field: "fecha", grain: "month" }));
});

/* ---------------------------------------------------------------- *
 *  EL CONTRATO: lo que alcanza para que una vista agrupe
 * ---------------------------------------------------------------- */

test("sin niveles no se agrupa, y eso NO es un árbol vacío", () => {
  // `null` es «no se agrupó»; `[]` sería «se agrupó y no quedó nada».
  assert.equal(pilesOf(ROWS, undefined), null);
  assert.equal(pilesOf(ROWS, { levels: [], of }), null);
  assert.deepEqual(pilesOf([], { levels: BY_ORIGIN, of }), []);
});

test("el árbol que le pasan gana sobre el que armaría", () => {
  const contado: Pile<Row>[] = [
    {
      path: ["todo"],
      depth: 0,
      field: "origin",
      key: "todo",
      label: "todo",
      count: 187,
      items: [],
      piles: [],
    },
  ];
  // Las filas en la mano son cinco; el conteo dice 187 porque lo contó quien
  // tiene el conjunto entero. La vista dibuja lo que le pasaron.
  const piles = pilesOf(ROWS, { levels: BY_ORIGIN, of, piles: contado });
  assert.equal(pileCount(piles ?? []), 187);
});

test("abierto es el default: plegar es lo que se declara", () => {
  const piles = pilesFrom(ROWS, BY_ORIGIN, of);
  const primero = piles[0]!;
  assert.equal(pileIsOpen(primero, { levels: BY_ORIGIN, of }), true);
  assert.equal(
    pileIsOpen(primero, { levels: BY_ORIGIN, of, collapsed: [pathKey(primero.path)] }),
    false,
  );
});

/* Un marco agrupa ÍNDICES y no registros: sus filas no tienen identidad propia,
   son la fila 12 del archivo. Que el mismo contrato sirva sin cambiarle nada es
   la prueba de que no es restrictivo. */
test("el contrato sirve para cosas que no son registros", () => {
  const filas = [0, 1, 2, 3, 4, 5];
  const piles = pilesOf(filas, {
    levels: [{ field: "paridad" }],
    of: (row) => (row % 2 === 0 ? "par" : "impar"),
  });
  assert.deepEqual(
    piles?.map((one) => one.label),
    ["par", "impar"],
  );
  assert.deepEqual(
    piles?.map((one) => one.count),
    [3, 3],
  );
});

/* ---------------------------------------------------------------- *
 *  Cómo se lee una ruta
 * ---------------------------------------------------------------- */

/* Una ruta es lo que titula un montón, lo que rotula un eje de pivote y lo que
   arma una miga. Se lee en un solo lugar: una ruta que se lee distinta según
   quién la dibuje es el mismo corte con dos caras. */
test("una ruta se lee por tramos, y la fecha con el nombre de su corte", () => {
  assert.deepEqual(pathLabels(BY_BOTH, ["sintético", "2026-09"]), [
    "sintético",
    "September 2026",
  ]);
});

/* Con el año afuera, el mes no lo repite: eso ya está escrito un tramo antes. */
test("un tramo no repite lo que dijo el de arriba", () => {
  const porFecha: GroupLevel[] = [
    { field: "month", grain: "year" },
    { field: "month", grain: "month" },
  ];
  assert.deepEqual(pathLabels(porFecha, ["2026", "2026-09"]), ["2026", "September"]);
});

/* Un tramo sin nivel que lo explique se dice como vino: es lo mejor que se puede
   decir sin preguntarle a nadie. */
test("un tramo de más se dice tal cual", () => {
  assert.deepEqual(pathLabels(BY_ORIGIN, ["sintético", "2026-09"]), ["sintético", "2026-09"]);
});
