import { fieldLabel, type ModelDefinition } from "@sincpro/web-ui/components/search/model";
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

/** Cuánto ancho merece un campo, por su tipo. Una huella son 64 caracteres y
 *  una cuenta son seis: darles el mismo ancho arruina las dos. */
function widthFor(type: string): number {
  if (type === "integer" || type === "number") return 120;
  if (type === "datetime" || type === "date") return 190;
  if (type === "boolean") return 90;
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
    const numeric = definition.type === "integer" || definition.type === "number";
    extra.push({
      id: field,
      field,
      header: fieldLabel(model, field, locale),
      value: (row) => readModelValue((row as Record<string, unknown>)[field]),
      /* El valor entero en el `title`: una huella de 64 caracteres no entra en
         ninguna celda, y cortada no sirve para nada — salvo para pasar el mouse
         por encima y leerla. */
      cell: (row) => {
        const value = readModelValue((row as Record<string, unknown>)[field]);
        if (value === null) return <span className="text-subtle">—</span>;
        const text = String(value);
        return (
          <span className="block truncate text-muted" title={text}>
            {text}
          </span>
        );
      },
      ...(numeric ? { numeric: true } : {}),
      sortable: definition.sortable,
      optional: true,
      defaultHidden: true,
      width: widthFor(definition.type),
    });
  }

  return [...declared, ...extra];
}
