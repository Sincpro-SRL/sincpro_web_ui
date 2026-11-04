import { ModelCell, type ModelCellKind } from "@sincpro/web-ui/components/listing/modelCells";
import {
  fieldLabel,
  isNumericType,
  type ModelDefinition,
} from "@sincpro/web-ui/components/search/model";
import { formatDuration } from "@sincpro/web-ui/primitives/field/duration";
import type { DataColumn } from "@sincpro/web-ui/primitives/table/DataTable";

/* ====================================================================== *
 *  LAS COLUMNAS QUE NADIE DECLARÓ, LEÍDAS DEL MODELO.
 *
 *  Una vista declara a mano las columnas que sabe dibujar bien: la que abre el
 *  registro, la que lleva una ficha de color, la que se lee en kB. Son seis, y
 *  el modelo tiene doce. Las otras seis no estaban en ningún lado — ni en la
 *  tabla, ni en el menú de columnas— así que el `fingerprint` o el
 *  `storage_key` de un dato no se podían mirar aunque el servidor los mande en
 *  cada fila.
 *
 *  Esto las agrega. **No hay una lista de campos escrita acá**: son los del
 *  `model_meta_data` que el servidor deriva del modelo, los mismos que ya
 *  alimentan el constructor de filtros. Agregar una columna a la tabla del
 *  motor la hace aparecer acá, apagada y con su nombre tal cual, sin que nadie
 *  toque el frontend.
 *
 *  Van todas `optional` y `defaultHidden`: aparecen en el menú de columnas y
 *  empiezan apagadas. La vista sigue abriendo como abría; lo que cambia es que
 *  ahora lo demás EXISTE y se puede encender.
 * ====================================================================== */

/** Qué campo del modelo muestra una columna declarada a mano.
 *
 *  Sin esto, «filas» y `row_count` son dos cosas distintas y el campo
 *  aparecería dos veces: una con el rótulo bueno y otra cruda. */
export type ClaimedField = { id: string; field?: string };

/** Los campos que las columnas declaradas ya contestan.
 *
 *      in            [{id:"rows", field:"row_count"}, {id:"name"}]
 *      out           Set {"row_count", "name"}
 *
 *  El `id` cuenta como reclamo cuando coincide con el nombre del campo: la
 *  mayoría de las columnas se llaman como lo que muestran. */
export function claimedFields(columns: readonly ClaimedField[]): Set<string> {
  const claimed = new Set<string>();
  for (const column of columns) {
    claimed.add(column.field ?? column.id);
    if (column.field !== undefined) claimed.add(column.id);
  }
  return claimed;
}

/** Un valor del registro, en algo que una celda pueda ordenar y dibujar.
 *
 *      in            ["edad","sexo"]     un `text[]`
 *      out           "edad, sexo"
 *      in            []                  una lista vacía no es un texto vacío
 *      out           null                la tabla dibuja «—»
 *      in            "2026-09-13T04:17:00"
 *      out           "2026-09-13T04:17:00"
 *
 *  Las fechas se dejan como vienen —ISO— porque en ISO el orden alfabético ES
 *  el cronológico, y así la columna ordena bien sin parsear nada. */
export function readModelValue(raw: unknown): string | number | boolean | null {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) return raw.length === 0 ? null : raw.join(", ");
  if (typeof raw === "number" || typeof raw === "boolean") return raw;
  if (typeof raw === "string") return raw === "" ? null : raw;
  return JSON.stringify(raw);
}

/** The names an engine publishes for each kind it knows how to draw — Odoo's (`char` with a
 *  widget aside, `float_time`, `boolean`, `date`, `datetime`) and the plain ones a schema
 *  uses (`email`, `url`, `phone`, `duration`, `bool`, `timestamp`). */
const KIND_OF_TYPE: Readonly<Record<string, ModelCellKind>> = {
  email: "email",
  mail: "email",
  url: "url",
  uri: "url",
  website: "url",
  phone: "phone",
  tel: "phone",
  float_time: "duration",
  duration: "duration",
  boolean: "boolean",
  bool: "boolean",
  date: "date",
  datetime: "datetime",
  timestamp: "datetime",
};

/** How a field of the model is drawn, by its `type` and in any case — «Email» and `email` are
 *  the same field. A type not known here stays `text`, exactly as before.
 *
 *      in    "monetary"      out  "number"
 *      in    "float_time"    out  "duration"   «8:30», not «8.5»
 *      in    "jsonb"         out  "text"
 */
export function modelCellKind(type: string): ModelCellKind {
  if (isNumericType(type)) return "number";
  return KIND_OF_TYPE[type.toLowerCase()] ?? "text";
}

/** Cuánto ancho merece un campo, por su tipo. Una huella son 64 caracteres y
 *  una cuenta son seis: darles el mismo ancho arruina las dos. */
function widthFor(kind: ModelCellKind): number {
  if (kind === "number" || kind === "duration") return 120;
  if (kind === "datetime" || kind === "date") return 190;
  if (kind === "boolean") return 90;
  return 260;
}

/**
 * Las columnas declaradas, más una por cada campo del modelo que ninguna
 * contestaba.
 *
 *     in    model     el `model_meta_data` de `account.move` — 12 campos
 *     in    declared  6 columnas escritas a mano en la vista
 *     out             las 6, y detrás `journal_id`, `currency_id`, `invoice_origin`,
 *                     `payment_reference`, `fiscal_position_id`, `company_id`,
 *                     `move_type`, todas apagadas
 *
 * El rótulo de las agregadas sale de `model.translations` en el idioma pedido —el mismo
 * `translations()` que el modelo publica para todo lo demás—, con el `default` que ese mismo
 * modelo declaró si el idioma no está, y el nombre del campo tal cual sólo si el modelo no
 * dijo ninguna palabra sobre él. Nunca puede desincronizarse con el motor porque sale de la
 * MISMA respuesta que nombra el campo — a diferencia de un diccionario mantenido acá.
 *
 * `model === null` —todavía no llegó la definición— devuelve las declaradas sin
 * tocar, que es exactamente lo que había antes.
 */
export function columnsFromModel<T extends object>(
  declared: readonly DataColumn<T>[],
  model: ModelDefinition | null | undefined,
  locale = "default",
): DataColumn<T>[] {
  if (model === null || model === undefined) return [...declared];

  const claimed = claimedFields(declared);
  const extra: DataColumn<T>[] = [];

  for (const [field, definition] of Object.entries(model.fields)) {
    if (claimed.has(field)) continue;
    const kind = modelCellKind(definition.type);
    /* A duration is a number of hours: it sorts, sums and aligns as one. */
    const numeric = kind === "number" || kind === "duration";
    const read = (row: T) => readModelValue((row as Record<string, unknown>)[field]);
    extra.push({
      id: field,
      field,
      header: fieldLabel(model, field, locale),
      value: read,
      /* Drawn by what the model says the field IS (`modelCells.tsx`); a plain text keeps
         its whole value in the `title` — a 64 character fingerprint fits no cell. */
      cell: (row) => {
        const value = read(row);
        if (value === null) return <span className="text-subtle">—</span>;
        return <ModelCell kind={kind} value={value} />;
      },
      /* Where a node cannot be drawn — the sheet, the footer's total — a duration still
         reads «42:30» and never «42.5». */
      ...(kind === "duration"
        ? {
            format: formatDuration,
            text: (row: T) => {
              const value = read(row);
              return typeof value === "number" ? formatDuration(value) : String(value ?? "");
            },
          }
        : {}),
      ...(numeric ? { numeric: true } : {}),
      sortable: definition.sortable,
      optional: true,
      defaultHidden: true,
      width: widthFor(kind),
    });
  }

  return [...declared, ...extra];
}
