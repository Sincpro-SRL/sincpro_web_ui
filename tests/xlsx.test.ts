import assert from "node:assert/strict";

import {
  columnName,
  type GroupLevel,
  type PivotFold,
  pivotFrom,
  pivotSheet,
  pivotXlsx,
  writeXlsx,
  type XlsxSheet,
} from "@sincpro/web-ui";
import { test } from "vitest";

/**
 * Un `.xlsx` mal armado no falla: abre con un aviso de «contenido ilegible» y
 * pierde una parte sin decir cuál. Así que esto **descomprime lo que se escribió
 * y lee el XML**, que es lo único que prueba algo de un formato binario.
 *
 * El lector es de diez líneas porque las entradas van sin comprimir: se camina
 * el directorio central, que es lo mismo que hace Excel al abrir el archivo — si
 * las posiciones estuvieran mal, esto no encontraría nada.
 */
function entriesOf(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();

  // El fin del directorio central está al final, y su firma lo delata.
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  assert.ok(end >= 0, "el archivo no termina en un directorio central");

  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const out = new Map<string, string>();

  for (let i = 0; i < count; i += 1) {
    assert.equal(view.getUint32(at, true), 0x02014b50);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));

    // En la entrada local, los datos arrancan después del nombre y los extras.
    assert.equal(view.getUint32(local, true), 0x04034b50);
    const from =
      local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    out.set(name, decoder.decode(bytes.subarray(from, from + size)));

    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return out;
}

const HOJA: XlsxSheet = {
  name: "Ventas",
  cells: [
    { row: 0, column: 0, value: "sucursal", bold: true },
    { row: 0, column: 1, value: "2026", bold: true },
    { row: 1, column: 0, value: "La Paz" },
    { row: 1, column: 1, value: 1234.5, format: "#,##0.00" },
  ],
  merges: [{ row: 0, column: 1, rows: 1, columns: 2 }],
  widths: [24, 14, 14],
  freeze: { rows: 1, columns: 1 },
};

test("el libro trae las seis partes que Excel busca", () => {
  const parts = entriesOf(writeXlsx(HOJA));
  assert.deepEqual([...parts.keys()].sort(), [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/workbook.xml",
    "xl/worksheets/sheet1.xml",
  ]);
});

test("un número entra como número y un texto como texto", () => {
  const sheet = entriesOf(writeXlsx(HOJA)).get("xl/worksheets/sheet1.xml") ?? "";
  // Sin `t`, la celda es numérica: es lo que deja sumarla del otro lado.
  assert.ok(sheet.includes('<c r="B2" s="2"><v>1234.5</v></c>'));
  assert.ok(sheet.includes('t="inlineStr"'));
  assert.ok(sheet.includes('<t xml:space="preserve">La Paz</t>'));
});

test("la combinación, el ancho y el panel congelado viajan", () => {
  const sheet = entriesOf(writeXlsx(HOJA)).get("xl/worksheets/sheet1.xml") ?? "";
  assert.ok(sheet.includes('<mergeCell ref="B1:C1"/>'));
  assert.ok(sheet.includes('<col min="1" max="1" width="24" customWidth="1"/>'));
  assert.ok(sheet.includes('<pane xSplit="1" ySplit="1" topLeftCell="B2"'));
});

test("sólo se declaran los estilos que se usan, y el formato no pisa a los de Excel", () => {
  const styles = entriesOf(writeXlsx(HOJA)).get("xl/styles.xml") ?? "";
  // 164 es el primer id libre: del 0 al 163 son los que Excel trae puestos.
  assert.ok(styles.includes('<numFmt numFmtId="164" formatCode="#,##0.00"/>'));
  // Tres: el normal, la negrita y el número con formato.
  assert.ok(styles.includes('<cellXfs count="3">'));
});

test("un nombre de pestaña que Excel no acepta se recorta en vez de romper el archivo", () => {
  const book = entriesOf(writeXlsx({ ...HOJA, name: "Ventas/2026: [todas]" }));
  assert.ok((book.get("xl/workbook.xml") ?? "").includes('name="Ventas 2026 todas"'));
});

/* ---------------------------------------------------------------- *
 *  EL PIVOTE, COMO PLANILLA
 * ---------------------------------------------------------------- */

type Venta = { sucursal: string; anio: string; trimestre: string; importe: number };

const VENTAS: Venta[] = [
  { sucursal: "La Paz", anio: "2026", trimestre: "Q1", importe: 100 },
  { sucursal: "La Paz", anio: "2026", trimestre: "Q2", importe: 50 },
  { sucursal: "Tarija", anio: "2026", trimestre: "Q2", importe: 20 },
];

const of = (venta: Venta, level: GroupLevel): string =>
  level.field === "sucursal"
    ? venta.sucursal
    : level.field === "anio"
      ? venta.anio
      : venta.trimestre;

const IMPORTE: PivotFold<Venta> = {
  id: "importe",
  header: "importe",
  fold: (items) => (items.length === 0 ? null : items.reduce((a, b) => a + b.importe, 0)),
  numberFormat: "#,##0.00",
};

const PIVOTE = pivotFrom(VENTAS, {
  rows: [{ field: "sucursal" }],
  columns: [{ field: "anio" }, { field: "trimestre" }],
  of,
  measures: [IMPORTE],
  labelOf: (level) => level.field,
});

test("el encabezado de dos niveles sale combinado", () => {
  const sheet = pivotSheet(PIVOTE);
  assert.deepEqual(sheet.merges, [
    // «2026» cubre sus dos trimestres, una columna cada uno.
    { row: 0, column: 1, rows: 1, columns: 2 },
    // Y «Total» cubre los dos renglones del encabezado, porque no cuelga de
    // ningún año: es el margen de la fila entera.
    { row: 0, column: 3, rows: 2, columns: 1 },
  ]);
});

test("un agujero no escribe ninguna celda", () => {
  const sheet = pivotSheet(PIVOTE);
  // Tarija no tiene Q1, así que en su fila no hay celda en esa columna.
  const tarija = sheet.cells.filter((cell) => cell.row === 3);
  assert.deepEqual(
    tarija.map((cell) => cell.column),
    /* El rótulo, el Q2 y el margen de la fila. La columna 1 —el Q1— no
       existe. */
    [0, 2, 3],
  );
});

test("los márgenes van en negrita y con el formato de su medida", () => {
  const margin = pivotSheet(PIVOTE).cells.find((cell) => cell.row === 2 && cell.column === 3);
  assert.equal(margin?.value, 150);
  assert.equal(margin?.bold, true);
  assert.equal(margin?.format, "#,##0.00");
});

test("el encabezado y los rótulos quedan congelados", () => {
  assert.deepEqual(pivotSheet(PIVOTE).freeze, { rows: 2, columns: 1 });
  // Con un título arriba, todo baja un renglón y el congelado lo sigue.
  assert.deepEqual(pivotSheet(PIVOTE, { caption: "Ventas" }).freeze, { rows: 3, columns: 1 });
});

test("la grilla entera termina en un archivo que se puede abrir", () => {
  const sheet = entriesOf(pivotXlsx(PIVOTE, { name: "Ventas", caption: "Ventas 2026" })).get(
    "xl/worksheets/sheet1.xml",
  );
  assert.ok(sheet?.includes("Ventas 2026"));
  assert.ok(sheet?.includes("La Paz"));
  // El total general: 100 + 50 + 20, plegado sobre la base.
  assert.ok(sheet?.includes("<v>170</v>"));
});

test("una grilla grande no tira la pila", () => {
  /* Doscientas filas por cincuenta columnas: diez mil celdas y una hoja de
     varios cientos de kilobytes. Armar el archivo byte por byte —un argumento
     por byte— revienta acá y en ningún otro lado, y es el tamaño de una grilla
     de verdad, no un caso patológico. */
  const cells = Array.from({ length: 200 }, (_row, row) =>
    Array.from({ length: 50 }, (_column, column) => ({
      row,
      column,
      value: row * 50 + column,
      format: "#,##0.00",
    })),
  ).flat();

  const bytes = writeXlsx({ name: "Grande", cells });
  const sheet = entriesOf(bytes).get("xl/worksheets/sheet1.xml") ?? "";
  assert.ok(bytes.length > 200_000);
  assert.ok(sheet.includes('<c r="AX200"'));
});

test("las columnas se nombran como las nombra Excel", () => {
  assert.deepEqual([0, 1, 25, 26, 27, 51, 52].map(columnName), [
    "A",
    "B",
    "Z",
    "AA",
    "AB",
    "AZ",
    "BA",
  ]);
});
