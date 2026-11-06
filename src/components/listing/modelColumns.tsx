import { ModelCell, type ModelCellKind } from "@sincpro/web-ui/components/listing/modelCells";
import {
  fieldLabel,
  isNumericType,
  type ModelDefinition,
} from "@sincpro/web-ui/components/search/model";
import { formatDuration } from "@sincpro/web-ui/primitives/field/duration";
import type { DataColumn } from "@sincpro/web-ui/primitives/table/DataTable";

/* ====================================================================== *
 *  THE COLUMNS NOBODY DECLARED, READ FROM THE MODEL.
 *
 *  A view declares by hand the columns it knows how to draw well: the one that opens the
 *  record, the one that carries a coloured card, the one read in kB. They are six, and
 *  the model has twelve. The other six were nowhere — neither in the
 *  table nor in the columns menu— so a datum's `fingerprint` or
 *  `storage_key` could not be looked at even though the server sends them in
 *  every row.
 *
 *  This adds them. **There is no list of fields written here**: they are those of the
 *  `model_meta_data` the server derives from the model, the same ones that already
 *  feed the filter builder. Adding a column to the engine's table
 *  makes it appear here, switched off and with its name as is, without anyone
 *  touching the frontend.
 *
 *  They all go `optional` and `defaultHidden`: they appear in the columns menu and
 *  start switched off. The view keeps opening as it used to; what changes is that
 *  now the rest EXISTS and can be switched on.
 * ====================================================================== */

/** Which model field a hand-declared column shows.
 *
 *  Without this, «filas» and `row_count` are two different things and the field
 *  would appear twice: once with the good label and once raw. */
export type ClaimedField = { id: string; field?: string };

/** The fields the declared columns already answer.
 *
 *      in            [{id:"rows", field:"row_count"}, {id:"name"}]
 *      out           Set {"row_count", "name"}
 *
 *  The `id` counts as a claim when it matches the field's name: most
 *  columns are named after what they show. */
export function claimedFields(columns: readonly ClaimedField[]): Set<string> {
  const claimed = new Set<string>();
  for (const column of columns) {
    claimed.add(column.field ?? column.id);
    if (column.field !== undefined) claimed.add(column.id);
  }
  return claimed;
}

/** A record value, into something a cell can sort and draw.
 *
 *      in            ["edad","sexo"]     a `text[]`
 *      out           "edad, sexo"
 *      in            []                  an empty list is not an empty text
 *      out           null                the table draws «—»
 *      in            "2026-09-13T04:17:00"
 *      out           "2026-09-13T04:17:00"
 *
 *  Dates are left as they come —ISO— because in ISO alphabetical order IS
 *  chronological, and so the column sorts well without parsing anything. */
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

/** How much width a field deserves, by its type. A fingerprint is 64 characters and
 *  an account is six: giving them the same width ruins both. */
function widthFor(kind: ModelCellKind): number {
  if (kind === "number" || kind === "duration") return 120;
  if (kind === "datetime" || kind === "date") return 190;
  if (kind === "boolean") return 90;
  return 260;
}

/**
 * The declared columns, plus one for each model field that none
 * answered.
 *
 *     in    model     the `model_meta_data` of `account.move` — 12 fields
 *     in    declared  6 columns written by hand in the view
 *     out             the 6, and behind them `journal_id`, `currency_id`, `invoice_origin`,
 *                     `payment_reference`, `fiscal_position_id`, `company_id`,
 *                     `move_type`, all switched off
 *
 * The label of the added ones comes from `model.translations` in the requested language —the same
 * `translations()` the model publishes for everything else—, with the `default` that same
 * model declared if the language is missing, and the field's name as is only if the model
 * said no word about it. It can never get out of sync with the engine because it comes from the
 * SAME answer that names the field — unlike a dictionary maintained here.
 *
 * `model === null` —the definition has not arrived yet— returns the declared ones
 * untouched, which is exactly what there was before.
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
