import assert from "node:assert/strict";

import { SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import {
  claimedFields,
  columnsFromModel,
  modelCellKind,
  readModelValue,
} from "@sincpro/web-ui/components/listing/modelColumns";
import type { ModelDefinition } from "@sincpro/web-ui/components/search/model";
import type { DataColumn } from "@sincpro/web-ui/primitives/table/DataTable";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/* Lo que el servidor manda bajo `model_meta_data`, recortado: dos campos que la
   vista dibuja a mano y dos que nadie declaró. */
const MODEL: ModelDefinition = {
  aggregate: "dataset",
  identity: "dataset_id",
  fields: {
    name: { type: "text", nullable: false, sortable: true, ops: ["eq", "like"] },
    row_count: { type: "integer", nullable: false, sortable: true, ops: ["gt"] },
    fingerprint: { type: "text", nullable: false, sortable: true, ops: ["eq"] },
    derived_from: { type: "text[]", nullable: true, sortable: false, ops: ["contains"] },
  },
};

type Row = { name: string; row_count: number; fingerprint: string; derived_from: string[] };

const DECLARED: DataColumn<Row>[] = [
  { id: "name", header: "nombre", value: (row) => row.name },
  { id: "rows", field: "row_count", header: "filas", value: (row) => row.row_count },
];

test("un campo que ninguna columna contestaba aparece, con su nombre tal cual", () => {
  const columns = columnsFromModel(DECLARED, MODEL);

  assert.deepEqual(
    columns.map((one) => one.id),
    ["name", "rows", "fingerprint", "derived_from"],
  );
  assert.equal(columns[2]!.header, "fingerprint");
});

test("lo agregado entra apagado y se puede encender", () => {
  const added = columnsFromModel(DECLARED, MODEL).slice(2);

  assert.ok(added.every((one) => one.optional === true && one.defaultHidden === true));
});

test("una columna que se llama distinto del campo no lo duplica", () => {
  const ids = columnsFromModel(DECLARED, MODEL).map((one) => one.id);

  assert.ok(!ids.includes("row_count"));
  assert.deepEqual([...claimedFields(DECLARED)], ["name", "row_count", "rows"]);
});

test("sin definición del modelo quedan las declaradas, y nada más", () => {
  assert.deepEqual(columnsFromModel(DECLARED, null), DECLARED);
  assert.deepEqual(columnsFromModel(DECLARED, undefined), DECLARED);
});

test("el valor sale legible: una lista se junta, lo vacío es nada", () => {
  const derived = columnsFromModel(DECLARED, MODEL).find((one) => one.id === "derived_from")!;
  const row = (from: string[]): Row => ({
    name: "x",
    row_count: 1,
    fingerprint: "f",
    derived_from: from,
  });

  assert.equal(derived.value(row(["ds_1", "ds_2"])), "ds_1, ds_2");
  assert.equal(derived.value(row([])), null);
});

test("un número sigue siendo número, para que la columna ordene como número", () => {
  const model: ModelDefinition = {
    ...MODEL,
    fields: { size_bytes: MODEL.fields["row_count"]! },
  };
  const size = columnsFromModel([], model)[0]!;

  assert.equal(size.numeric, true);
  assert.equal(size.value({ size_bytes: 5100 } as never), 5100);
});

test("lo que no llegó no es texto vacío", () => {
  assert.equal(readModelValue(null), null);
  assert.equal(readModelValue(undefined), null);
  assert.equal(readModelValue(""), null);
  assert.equal(readModelValue(false), false);
});

/* ====================================================================== *
 *  EL RÓTULO DE LO AGREGADO SALE DE `translations`, NO DEL NOMBRE CRUDO.
 *
 *  Antes esto era a propósito «feo»: el nombre del campo tal cual, para no
 *  inventar una traducción que se desincronizara con el motor. Ahora
 *  `model_meta_data` trae `translations` de la MISMA respuesta que nombra el
 *  campo, así que usarla no puede desincronizarse — y no usarla es la regresión.
 * ====================================================================== */

const MODEL_CON_PALABRAS: ModelDefinition = {
  ...MODEL,
  translations: {
    name: { default: "Dataset" },
    labels: {
      fingerprint: { default: "Fingerprint", es: "Huella" },
      derived_from: { default: "Derived from" },
    },
  },
};

test("una columna agregada usa el rótulo del idioma pedido", () => {
  const columns = columnsFromModel(DECLARED, MODEL_CON_PALABRAS, "es");
  const fingerprint = columns.find((one) => one.id === "fingerprint")!;

  assert.equal(fingerprint.header, "Huella");
});

test("un idioma que el modelo no declaró cae al default que el modelo sí declaró", () => {
  const columns = columnsFromModel(DECLARED, MODEL_CON_PALABRAS, "en");
  const derived = columns.find((one) => one.id === "derived_from")!;

  // El modelo no declaró "en" para `derived_from`, sólo "default" — y eso es lo que se ve,
  // nunca el nombre crudo del campo mientras el modelo haya dicho algo sobre él.
  assert.equal(derived.header, "Derived from");
});

test("un campo sin ninguna palabra declarada muestra su nombre tal cual", () => {
  const columns = columnsFromModel(DECLARED, MODEL, "es");
  const fingerprint = columns.find((one) => one.id === "fingerprint")!;

  assert.equal(fingerprint.header, "fingerprint");
});

/* ====================================================================== *
 *  A COLUMN NOBODY DECLARED IS DRAWN BY WHAT THE MODEL SAYS IT IS.
 *
 *  Before this an email was a string to select and paste, a `float_time` read
 *  «8.5» and a boolean «true». Now the cell is what the record's read mode is:
 *  a `mailto:`, a `tel:`, the website in a new tab, «8:30», «sí» with a check.
 * ====================================================================== */

const CONTACT_MODEL: ModelDefinition = {
  aggregate: "partner",
  identity: "id",
  fields: {
    email: { type: "Email", nullable: true, sortable: true, ops: ["eq"] },
    website: { type: "url", nullable: true, sortable: true, ops: ["eq"] },
    phone: { type: "phone", nullable: true, sortable: true, ops: ["eq"] },
    hours: { type: "float_time", nullable: true, sortable: true, ops: ["gt"] },
    active: { type: "boolean", nullable: false, sortable: true, ops: ["eq"] },
    birthday: { type: "date", nullable: true, sortable: true, ops: ["gt"] },
    payload: { type: "jsonb", nullable: true, sortable: false, ops: [] },
  },
};

const cellOf = (id: string, row: Record<string, unknown>): string => {
  const column = columnsFromModel([], CONTACT_MODEL).find((one) => one.id === id)!;
  return renderToStaticMarkup(
    createElement(UiCopyProvider, {
      copy: SPANISH_COPY,
      children: column.cell!(row as never),
    }),
  );
};

test("the kind comes from the type, in any case; an unknown type stays text", () => {
  assert.equal(modelCellKind("Email"), "email");
  assert.equal(modelCellKind("WEBSITE"), "url");
  assert.equal(modelCellKind("tel"), "phone");
  assert.equal(modelCellKind("float_time"), "duration");
  assert.equal(modelCellKind("bool"), "boolean");
  assert.equal(modelCellKind("datetime"), "datetime");
  assert.equal(modelCellKind("monetary"), "number");
  assert.equal(modelCellKind("jsonb"), "text");
});

test("an email is a mailto link and a phone a tel link", () => {
  assert.match(
    cellOf("email", { email: "ana@sincpro.com.bo" }),
    /href="mailto:ana@sincpro\.com\.bo"/,
  );
  assert.match(cellOf("phone", { phone: "+591 7 123-4567" }), /href="tel:\+59171234567"/);
  // Something that is not an email is not a link — the text, as before.
  assert.doesNotMatch(cellOf("email", { email: "ana" }), /<a /);
});

test("a website opens in a new tab, read without its scheme, and a script is never a link", () => {
  const html = cellOf("website", { website: "https://www.sincpro.com.bo/" });
  assert.match(html, /href="https:\/\/www\.sincpro\.com\.bo\/"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, />sincpro\.com\.bo</);
  assert.match(html, /se abre en otra pestaña/);

  const script = cellOf("website", { website: "javascript:alert(1)" });
  assert.doesNotMatch(script, /href=/);
});

test("a duration reads hours and minutes, sorts as a number and totals as hours", () => {
  const column = columnsFromModel([], CONTACT_MODEL).find((one) => one.id === "hours")!;
  assert.match(cellOf("hours", { hours: 8.5 }), />8:30</);
  assert.equal(column.numeric, true);
  assert.equal(column.value({ hours: 8.5 } as never), 8.5);
  assert.equal(column.format!(42.5), "42:30");
  assert.equal(column.text!({ hours: 0.25 } as never), "0:15");
});

test("a boolean says yes or no in words, the check only next to the yes", () => {
  const yes = cellOf("active", { active: true });
  const no = cellOf("active", { active: false });
  assert.match(yes, /sí/);
  assert.match(yes, /<svg/);
  assert.match(no, />no</);
  assert.doesNotMatch(no, /<svg/);
});

test("a date is a DateValue, and an unknown type keeps the plain text", () => {
  assert.match(cellOf("birthday", { birthday: "2026-09-15" }), /<time[^>]*>15\/09\/2026</);
  const payload = cellOf("payload", { payload: "{}" });
  assert.match(payload, /title="\{\}"/);
  assert.doesNotMatch(payload, /<a |<time/);
});

test("nothing is still the dash, whatever the type", () => {
  assert.match(cellOf("email", { email: null }), />—</);
  assert.match(cellOf("hours", {}), />—</);
});
