import type {
  BuiltFilter,
  RecordKey,
  RecordOption,
} from "@sincpro/web-ui/components/search/criteria";
import { isFilterable, type ModelDefinition } from "@sincpro/web-ui/components/search/model";

export type { RecordKey, RecordOption };

/* ==================================================================== *
 *  THE RECORDS OF A RELATION — chosen by their name, sent by their key.
 *
 *  Context: «andres» in Odoo's bar offers «Search Contact for: andres ▸», and the ▸ unfolds the
 *  contacts that match — Andrés Pérez, Andrés Gutiérrez. Choosing one filters BY THAT RECORD,
 *  not by a text that a second Andrés would also answer. The builder asks the same: «Cliente
 *  es [Andrés Pérez]», picked from a search, never typed as an id.
 *
 *  ── web-ui draws; the application searches ──────────────────────────
 *
 *  web-ui does not know where the contacts live. The application gives ONE function,
 *  `searchRecords`, shared by the bar and the builder: given which relation and what was typed,
 *  it answers the records that match — its literal search, the same a many2one asks. Given
 *  KEYS instead of a text, it answers their names: a filter read back from a URL or a JSON
 *  carries keys, and a person reads names.
 *
 *  ── What travels is the key ─────────────────────────────────────────
 *
 *      a many2one, with a column of its own     {field: "customer_id", operator: "in", value: [7, 9]}
 *      a one2many / many2many                    {through: "tags", selection: {field: "id", operator: "in", value: [3]}}
 *
 *  The person sees «Cliente: Andrés Pérez o Andrés Gutiérrez». The name is the screen's; the
 *  key is the server's — and a renamed contact still matches.
 * ==================================================================== */

/** What a records search is asked. */
export interface RecordSearch {
  /** The aggregate on the other side — WHICH records: «Partner», «Tag». */
  relation: string;
  /** The relational field, from the root record: `["customer_id"]`, `["lines", "product_id"]`. */
  path: readonly string[];
  /** What was typed. Empty: the first ones, in their own order. */
  text: string;
  /** Instead of a text: name THESE records. A filter read back carries keys; the screen needs
   *  their names. */
  keys?: readonly RecordKey[];
  /** The question was replaced by a newer one (more was typed): stop. */
  signal: AbortSignal;
}

/** The application's search over the records of a relation. A few are enough — a dropdown is
 *  not a page; the rest are reached by typing more. */
export type SearchRecords = (search: RecordSearch) => Promise<readonly RecordOption[]>;

/**
 * What «Buscar más…» is asked: the whole list of a relation's records, to choose from where the
 * dropdown's few are not enough. The application opens its chooser —a `List onChoose` with its
 * OWN search bar, in a modal or beside—, and answers with `choose`.
 */
export interface RecordBrowse {
  /** The aggregate on the other side — WHICH records: «Country». */
  relation: string;
  /** The relational field, from the root record: `["customer", "country"]`. */
  path: readonly string[];
  /** How the relation reads: «País». The chooser's title. */
  label: string;
  /** What was typed: the chooser opens on the same search. */
  text: string;
  /** The place takes several (a chip, «está en») or one («es»): a chooser of many ticks. */
  many: boolean;
  /** What is already chosen there: a chooser of many leaves it out. */
  chosen: readonly RecordOption[];
  /** The answer: the records chosen. */
  choose: (records: readonly RecordOption[]) => void;
}

/** The application's «Buscar más…» over a relation. */
export type BrowseRecords = (browse: RecordBrowse) => void;

/** How a relation is compared once records of it are chosen. */
export interface RecordTarget {
  /** The relational field: «customer_id», «tags». */
  name: string;
  /** The aggregate on the other side. */
  relation: string;
  /** It reaches many records: one2many, many2many. */
  many: boolean;
  /** The key of the records on the other side, compared through the relation. */
  key: string;
  /** A column of this record that identifies the one on the other side (a many2one's foreign
   *  key or name): compared directly, without crossing. */
  column?: string;
  /** The operators that column accepts. */
  ops: readonly string[];
}

/**
 * How a relation of the model is compared once records of it are chosen — or `undefined`
 * when the field is not a relation.
 *
 * A to-one relation is compared by a column of this record (its foreign key, or a column that
 * names it) when the model has it; a to-many one —or a to-one without that column— crossing
 * it, by the key of the records on the other side.
 */
export function recordTarget(model: ModelDefinition, name: string): RecordTarget | undefined {
  const definition = model.fields[name];
  if (definition === undefined) return undefined;
  const relational =
    definition.kind === "relation" ||
    (definition.relation !== undefined && definition.relation !== null);
  if (!relational) return undefined;
  const many = definition.many === true;
  const column = many ? undefined : (definition.identifiedBy ?? undefined);
  const identifying = column === undefined ? undefined : model.fields[column];
  const local =
    column !== undefined && identifying !== undefined && isFilterable(identifying);
  return {
    name,
    relation: definition.relation ?? name,
    many,
    key: definition.relationKey ?? "id",
    ...(local ? { column } : {}),
    ops: local ? identifying.ops : [],
  };
}

/** The same key compared to each one: what is left when a column does not take `in`. */
function eachOf(field: string, keys: readonly RecordKey[]): BuiltFilter {
  const each = keys.map((key) => ({ field, operator: "=", value: key }));
  return each.length === 1 ? each[0]! : { any: each };
}

/**
 * The filter that asks for these records.
 *
 *      in   Cliente (many2one, column customer_id), keys [7]
 *      out  {field: "customer_id", operator: "=", value: 7}
 *
 *      in   Cliente, keys [7, 9]
 *      out  {field: "customer_id", operator: "in", value: [7, 9]}
 *
 *      in   Etiquetas (many2many), keys [3, 4]
 *      out  {through: "tags", selection: {field: "id", operator: "in", value: [3, 4]}}
 *
 * `negate` asks for the rest: «no es ninguno de», «ninguna etiqueta entre».
 */
export function recordsFilter(
  target: RecordTarget,
  keys: readonly RecordKey[],
  negate = false,
): BuiltFilter {
  const one = keys.length === 1;
  if (!target.many && target.column !== undefined) {
    const op = negate ? (one ? "!=" : "not in") : one ? "=" : "in";
    if (target.ops.includes(op)) {
      return { field: target.column, operator: op, value: one ? keys[0] : [...keys] };
    }
    const asked = eachOf(target.column, keys);
    return negate ? { negate: asked } : asked;
  }
  const inner: BuiltFilter = one
    ? { field: target.key, operator: "=", value: keys[0] }
    : { field: target.key, operator: "in", value: [...keys] };
  const crossed: BuiltFilter = { through: target.name, selection: inner };
  return negate ? { negate: crossed } : crossed;
}

/** The keys a filter asks for, when it is exactly what `recordsFilter` writes for this target;
 *  `null` otherwise. It is how a filter read back is shown as names again. */
export function recordsOf(
  target: RecordTarget,
  filter: unknown,
): { keys: RecordKey[]; negate: boolean } | null {
  if (typeof filter !== "object" || filter === null) return null;
  const node = filter as Record<string, unknown>;
  if ("negate" in node) {
    const inside = recordsOf(target, node.negate);
    return inside === null || inside.negate ? null : { keys: inside.keys, negate: true };
  }
  const keysOf = (value: unknown, op: unknown): RecordKey[] | null => {
    if (op === "=" && (typeof value === "string" || typeof value === "number"))
      return [value];
    if (op === "in" && Array.isArray(value)) return value as RecordKey[];
    return null;
  };
  if (!target.many && target.column !== undefined) {
    if (node.field === target.column) {
      if (node.operator === "!=" || node.operator === "not in") {
        const keys = keysOf(node.value, node.operator === "!=" ? "=" : "in");
        return keys === null ? null : { keys, negate: true };
      }
      const keys = keysOf(node.value, node.operator);
      return keys === null ? null : { keys, negate: false };
    }
    if (Array.isArray(node.any)) {
      const keys: RecordKey[] = [];
      for (const each of node.any as unknown[]) {
        const one = recordsOf(target, each);
        if (one === null || one.negate || one.keys.length !== 1) return null;
        keys.push(one.keys[0]!);
      }
      return keys.length === 0 ? null : { keys, negate: false };
    }
    return null;
  }
  if (node.through !== target.name || typeof node.selection !== "object") return null;
  const inner = node.selection as Record<string, unknown>;
  if (inner === null || inner.field !== target.key) return null;
  const keys = keysOf(inner.value, inner.operator);
  return keys === null ? null : { keys, negate: false };
}

/** The same key, whatever its type: `7` and `"7"` are one record on the screen. */
export function sameKey(a: RecordKey, b: RecordKey): boolean {
  return String(a) === String(b);
}
