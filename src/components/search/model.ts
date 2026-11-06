/* ==================================================================== *
 *  THE MODEL'S VOCABULARY — what the server publishes about its fields.
 *
 *  `model_meta_data` says, per field, what type it is, which comparisons it accepts,
 *  whether it is relational and by which column it is identified, and which values it can
 *  take if it is an enum. Everything a screen offers about a model comes from
 *  here: the builder's filters, the grouping's levels and the search
 *  bar's questions.
 *
 *  It lives apart from whoever draws it because all three speak it. While it was
 *  inside `FilterBuilder.tsx`, the bar had to import from the filter builder
 *  to know what a field is called — and the builder, from the bar
 *  to know what an operator is called. A shared vocabulary cannot
 *  hang from one of those who speak it.
 * ==================================================================== */

/** A field, as the model describes it. Mirrors the server's `FieldMeta`.
 *
 *  An empty `ops` is the signal that this field is not filtered, sorted or grouped directly: it is
 *  published both by a value-object (`embedded`) and by any of the three relationals
 *  (`many2one`/`one2many`/`many2many`) — none has a comparison of its own. A relational
 *  is filtered by the column that identifies it (`identifiedBy`), which appears as ITS OWN
 *  scalar field in the model. */
export interface FieldDefinition {
  type: string;
  nullable: boolean;
  sortable: boolean;
  ops: readonly string[];
  /** The coarse answer to «what is this name»: a value in the row, a value-object inside
   *  (JSON, with no identity of its own) or another aggregate that has to be fetched. */
  kind?: "scalar" | "embedded" | "relation";
  /** Several of them: a `one2many`, a `many2many`, or a list of value-objects. */
  many?: boolean;
  /** For a relational field, the aggregate on the other side, by name. */
  relation?: string | null;
  /** For a relational field, the column that identifies it — the relational field
   *  itself is never offered as the target of a filter, an order or a grouping level. */
  identifiedBy?: string | null;
  /** The values an enum field can take — a `<select>` comes from there. */
  choices?: readonly unknown[];
}

/** The types an engine publishes for an AMOUNT — integer, float, decimal, money. A search
 *  compares them as numbers and a listing aligns and formats them as numbers: «monetary»
 *  read as text made «total <= 1000» impossible and drew «1234.5» flush left. */
const NUMERIC_TYPES = new Set(["integer", "number", "float", "decimal", "monetary", "money"]);

export function isNumericType(type: string): boolean {
  return NUMERIC_TYPES.has(type.toLowerCase());
}

/** Whether this field can be used in a `selection`, an `order` or a `grouping.group_by`, directly.
 *  `ops.length === 0` is enough as a signal: it is published by both `embedded` and the three
 *  relationals, so there is no need to look at `kind` separately. */
export function isFilterable(field: FieldDefinition): boolean {
  return field.ops.length > 0;
}

/** The model definition the server sends under `model_meta_data`. */
/** Every word a screen needs for the model or one of its fields: always
 *  `{"default": …, …languages}`. Mirrors the server's `Translated`. */
export interface ModelTranslations {
  name: Record<string, string>;
  labels: Record<string, Record<string, string>>;
  help?: Record<string, Record<string, string>>;
}

export interface ModelDefinition {
  aggregate: string;
  identity: string;
  fields: Record<string, FieldDefinition>;
  /** Absent in a hand-built model —the `where_measures` one that `CriteriaBuilder` builds,
   *  for example—; present in any real `model_meta_data`. */
  translations?: ModelTranslations;
}

/** A field's label in the requested language: the one the model published for that language, or the
 *  one it published as `default`, or the field's name as is if the model said nothing —a
 *  synthetic model, or one that has not arrived yet. It never invents a word: what is not in
 *  `translations` shows as it comes out of the table, and that already warns it needs declaring. */
export function fieldLabel(model: ModelDefinition, field: string, locale: string): string {
  const words = model.translations?.labels[field];
  return words?.[locale] ?? words?.default ?? field;
}

/** The model's names that can be used as the target of a filter, an order or a grouping level
 *  — never a relational or a value-object, filtered by `isFilterable`. Sorted,
 *  because it is the list that builds every `<select>` in this file. */
export function filterableNames(model: ModelDefinition): string[] {
  return Object.keys(model.fields)
    .filter((name) => isFilterable(model.fields[name]!))
    .sort();
}
