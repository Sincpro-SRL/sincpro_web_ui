import {
  type BuiltCondition,
  type BuiltFilter,
  filterCriteria,
  type RecordOption,
  type SearchCriteria,
} from "@sincpro/web-ui/components/search/criteria";
import {
  choiceLabel,
  type FieldDefinition,
  fieldLabel,
  isFilterable,
  isNumericType,
  type ModelDefinition,
} from "@sincpro/web-ui/components/search/model";
import {
  recordsFilter,
  type RecordTarget,
  recordTarget,
  sameKey,
} from "@sincpro/web-ui/components/search/records";
import { matches as contains } from "@sincpro/web-ui/foundations/match";
import { currentCopy, fillCopy } from "@sincpro/web-ui/foundations/uiCopy";

/* ==================================================================== *
 *  THE BAR'S GRAMMAR — what can be asked, and with what.
 *
 *  Context: the bar offered «buscar «test» en el nombre / en las columnas», and
 *  that is a single question —is the text inside?— repeated per field. With
 *  that you cannot ask for «menos de cien filas», nor «los .csv», nor «los de este
 *  proyecto»: three questions the engine answers and the bar did not know how to
 *  write.
 *
 *  ── The model already says everything that is needed ────────────────
 *
 *  None of this is written by hand. `model_meta_data` publishes, per field, its
 *  `type`, the `ops` it accepts, whether it is a `relation` and by which column it is
 *  identified, and its `choices` if it is an enum. What is offered comes from there: a
 *  text field offers «contiene», a numeric one offers «menor que», and a
 *  relational one is searched by the column that names it. Adding a column to the
 *  model makes it appear here, with its operators, without touching this file.
 *
 *  ── How to start, and what each thing narrows down ─────────────────
 *
 *      #            choose the ATTRIBUTE. What follows is a field's name and
 *                   not a value — «nombre» is written the same both ways,
 *                   and with the hash sign there is no guessing which.
 *      texto        the fields that have letters inside.
 *      *.csv        the same, but as a PATTERN: what ends in «.csv».
 *      =  !=        all of them. Anything is compared against itself, so
 *                   equality does not discriminate by type.
 *      >  >=  <  <= only what is ORDERED: numbers and dates. «Mayor que» on a
 *                   text is an alphabetical comparison nobody asked for.
 *
 *  The operator is looked at before the value: writing `>` already leaves out the texts
 *  even though what to compare against has not been written yet.
 *
 *  ── A question is THREE steps, and they are written in one ──────────
 *
 *      filas  →  menor que  →  100
 *      ↑ field   ↑ operator   ↑ value
 *
 *  They are chosen one at a time and each step offers what the previous one left possible — but
 *  **you do not have to go through all three**. What is written is READ: `<= 100` already brings
 *  its operator and its value, so only the field to compare against is missing; `*.csv` is a
 *  pattern and not a text; `test` is a text and only the fields
 *  that have letters inside can answer it. That is why the first list does not offer the fields that
 *  cannot answer what was written: offering «filas» for `*.csv` is
 *  offering a question that gives zero.
 * ==================================================================== */

/** What kind of value a field has. It comes from the `type` the model publishes and is
 *  what decides what can be asked of it. */
export type QueryKind = "text" | "number" | "date" | "boolean" | "choice" | "relation";

/** A field that can be asked about from the bar. */
export type QueryField = {
  /** Which field the condition goes against. For a relational it is the column that
   *  identifies it and not the relational itself: the engine does not compare an aggregate. */
  field: string;
  label: string;
  kind: QueryKind;
  /** The operators the model accepts for it, in the order it published them. */
  ops: readonly string[];
  /** The possible values, when it is an enum: the third list comes from there. */
  choices?: readonly string[];
  /** The word for each value of the enum, when the model has one: «Pagada» for `paid`. */
  choiceLabels?: Readonly<Record<string, string>>;
  /** When reached through a relation: which aggregate is really being asked
   *  about. It is what lets you write «el proyecto se llama X» without anyone
   *  knowing that inside, another column is compared. */
  through?: string;
  /**
   * For a relation: how it is compared once records of it are chosen by name — directly by a
   * column of this record (a many2one) or crossing it (a one2many, a many2many). A to-many
   * relation has no column here, so its `ops` are empty: it is asked ONLY by its records.
   */
  relation?: RecordTarget;
};

/** How a value of a field reads: an enum's word, or the value as it is. */
export function valueLabel(field: QueryField, value: string): string {
  return field.choiceLabels?.[value] ?? value;
}

/** What shape what somebody wrote has. It is what decides which fields can
 *  answer it. */
export type ValueShape = "empty" | "text" | "glob" | "number" | "date";

/** What was typed, already read: the operator it brings in front —if it does— and its shape. */
export type TypedValue = {
  op?: string;
  value: string;
  shape: ValueShape;
  /** `#` was written: the ATTRIBUTE is being chosen and not a value. */
  attribute?: true;
  /** `#and`, `#or` or `#not` was written: no attribute is being chosen, a
   *  GROUP is being OPENED to put what comes next inside. */
  opens?: "all" | "any" | "not";
};

/**
 * The words that, after the hash sign, open a GROUP instead of naming an
 * attribute.
 *
 * They are written as they are thought —`#and`, `#or`, `#not`— and also as they are read in
 * the bar —`#todas`, `#cualquiera`, `#ninguna`—, because they are the same thing said
 * in two ways and forcing only one is forcing people to learn it.
 */
const OPENS: Readonly<Record<string, "all" | "any" | "not">> = {
  and: "all",
  all: "all",
  todas: "all",
  or: "any",
  any: "any",
  cualquiera: "any",
  not: "not",
  none: "not",
  ninguna: "not",
};

/* The operators that can be written in front of the value, from longest to
   shortest: if `<` were tried before `<=`, «<=100» would be read as «< =100». */
const WRITTEN_OPS: readonly string[] = ["<=", ">=", "!=", "<", ">", "="];

/**
 * Those that ORDER. Only something that has an order can answer them —a number, a
 * date—, and not because the field does not publish the operator: «mayor que» on a
 * text is an alphabetical comparison nobody ever asked for and that gives results
 * that cannot be explained.
 */
const ORDERING = new Set([">", ">=", "<", "<="]);

/**
 * Those that only compare EQUALITY. These do not discriminate by type: anything can be
 * compared against itself, so writing `=` opens the whole list instead of
 * guessing what kind of thing has not been written yet.
 */
const EQUALITY = new Set(["=", "!="]);

/** Which kinds have an order. An enum does not: its values are words even if
 *  they are written with numbers. */
const ORDERED = new Set<QueryKind>(["number", "date"]);

const NUMBER = /^-?\d+([.,]\d+)?$/;
const DATE = /^\d{4}-\d{2}(-\d{2})?$/;

/**
 * Reads what somebody wrote: the operator it brings in front, the value, and what
 * shape it is.
 *
 * A pattern —`*.csv`, `ventas_*`— is different from a text: it is searched with `like` and
 * the `*` is translated to the engine's wildcard. A loose text is NOT an implicit
 * pattern: whoever writes `test` is asking for what contains «test», and whoever
 * writes `*.csv` is asking for what ENDS in «.csv», which is another question.
 */
export function readTyped(text: string): TypedValue {
  const clean = text.trim();
  if (clean === "") return { value: "", shape: "empty" };

  /* `#` is «choose the attribute»: what follows is not a value, it is the name of the
     field to be asked about. It exists because the two intentions are
     written with the same letters —«nombre» can be the field or the text being
     searched— and until now you had to trust the bar to guess which. With
     the hash sign there is nothing to guess. */
  if (clean.startsWith("#")) {
    const rest = clean.slice(1).trim();
    const opens = OPENS[rest.toLowerCase()];
    /* `#and` is not an attribute called «and»: it is the order to open a
       group. It is looked at first because a model could have a field called
       `and`, and between the two readings the one somebody wrote on purpose wins
       —nobody types the hash sign to search for the word «or». */
    /* A bare `#` is «choose the attribute» without having started to name it: the shape
       is «empty», as anywhere else. Saying «text» of an empty string is
       lying about what is written. */
    const shape: ValueShape = rest === "" ? "empty" : "text";
    if (opens !== undefined) return { value: rest, shape, attribute: true, opens };
    return { value: rest, shape, attribute: true };
  }

  const written = WRITTEN_OPS.find((op) => clean.startsWith(op));
  const rest = written === undefined ? clean : clean.slice(written.length).trim();
  const quoted =
    rest.length > 1 && rest.startsWith('"') && rest.endsWith('"')
      ? rest.slice(1, -1)
      : undefined;
  const value = quoted ?? rest;

  const shape: ValueShape =
    value === ""
      ? "empty"
      : quoted !== undefined
        ? "text"
        : NUMBER.test(value)
          ? "number"
          : DATE.test(value)
            ? "date"
            : value.includes("*")
              ? "glob"
              : "text";

  return { ...(written === undefined ? {} : { op: written }), value, shape };
}

/** The pattern, with the wildcard the engine understands. `*` is what people
 *  write —and what a terminal writes— and `%` is what a `like` understands. */
export function globToLike(value: string): string {
  return value.replace(/\*/g, "%");
}

/** What kind of value a field is, read from the type the model publishes. */
function kindOf(definition: FieldDefinition): QueryKind {
  if (definition.kind === "relation") return "relation";
  if (definition.choices !== undefined && definition.choices.length > 0) return "choice";
  const type = definition.type.toLowerCase();
  /* An amount is a number: «decimal» and «monetary» read as text made «total <= 1000»
     impossible to ask of an invoice. */
  if (isNumericType(type)) return "number";
  if (type === "date" || type === "datetime") return "date";
  if (type === "boolean" || type === "bool") return "boolean";
  return "text";
}

/**
 * The fields the bar can ask about, taken from the model.
 *
 * A relational enters through the column that IDENTIFIES it and with the relation's
 * label: asking «el cliente se llama Ferretería» is a question about the
 * customer even if inside it compares its name. A relational without `identifiedBy`
 * does not enter: there is nothing to compare against, and offering it would be offering a
 * question that cannot be answered.
 */
export function queryFields(model: ModelDefinition, locale: string): QueryField[] {
  /* The columns that already name a relation are not offered on their own: they are
     the same question with two labels —«proyecto» and «nombre del proyecto»— and the
     one that is understood is the relation's. */
  const naming = new Set(
    Object.values(model.fields)
      .filter((one) => one.kind === "relation" && one.many !== true)
      .map((one) => one.identifiedBy)
      .filter((one): one is string => one !== null && one !== undefined),
  );

  const out: QueryField[] = [];
  for (const [name, definition] of Object.entries(model.fields)) {
    const kind = kindOf(definition);

    if (kind === "relation") {
      /* A to-one relation is compared by a column of this record —its foreign key, or a
         column that names it—. A to-many one has none here (the column that points back lives
         on the other side): it enters with no operators, and is asked only by its records —
         `suggest` drops it when nobody can search them. */
      const target = recordTarget(model, name);
      if (target === undefined) continue;
      out.push({
        field: target.column ?? name,
        label: fieldLabel(model, name, locale),
        kind: "relation",
        ops: target.ops,
        through: target.relation,
        relation: target,
      });
      continue;
    }

    if (!isFilterable(definition) || naming.has(name)) continue;
    const choices = definition.choices?.map((one) => String(one));
    out.push({
      field: name,
      label: fieldLabel(model, name, locale),
      kind,
      ops: definition.ops,
      ...(choices === undefined
        ? {}
        : {
            choices,
            choiceLabels: Object.fromEntries(
              choices.map((one) => [one, choiceLabel(model, name, one, locale)]),
            ),
          }),
    });
  }
  return out;
}

/** One field of the bar by its name in the model — a relation by the relational field
 *  («customer_id»), anything else by itself. It is what an application uses to build, by code,
 *  the same chips the bar builds: `valuesCriteria(queryField(model, "customer_id", locale)!, …)`. */
export function queryField(
  model: ModelDefinition,
  name: string,
  locale: string,
): QueryField | undefined {
  return queryFields(model, locale).find(
    (one) =>
      one.relation?.name === name || (one.relation === undefined && one.field === name),
  );
}

/**
 * Whether a field can answer what was written.
 *
 * The OPERATOR rules when one was written, because it is what says what kind of
 * question it is:
 *
 *     = / !=        everything. Anything is compared against itself, so
 *                   writing `=` opens the whole list instead of guessing what
 *                   kind a value that has not been written yet is.
 *     > >= < <=     only what is ORDERED —a number, a date—. «Mayor que» on
 *                   a text is an alphabetical comparison nobody asked for.
 *
 * With no operator written the value's SHAPE rules: `*.csv` is a pattern and only
 * something with letters answers it; `100` only something with numbers. Offering «filas» for
 * `*.csv` is offering a question that gives zero.
 */
export function answers(field: QueryField, typed: TypedValue): boolean {
  /* The operator is looked at BEFORE the value, and not after: writing `>` already
     discards the texts even though what to compare against has not been written yet. The other way round,
     the bar offered the five columns until the first digit was typed. */
  if (typed.op !== undefined) {
    if (!field.ops.includes(typed.op)) return false;
    if (EQUALITY.has(typed.op)) return true;
    if (ORDERING.has(typed.op) && !ORDERED.has(field.kind)) return false;
  }
  if (typed.shape === "empty") return true;
  /* A relation answers a text only through a column that NAMES it —one that takes `like`—.
     Through its foreign key, «cliente es andres» compares a name against a number: a question
     that gives zero. Its records, chosen by name, are the way to ask it (`searchRecords`). */
  const named = field.kind === "relation" && field.ops.includes("like");
  switch (typed.shape) {
    case "number":
      return field.kind === "number" || field.kind === "choice";
    case "date":
      return field.kind === "date";
    case "glob":
      return field.kind === "text" || named;
    default:
      /* A text is answered by what has letters inside, and also an enum: its
         values are words. A number does not —«test» is not a number— and a date
         neither. */
      return field.kind === "text" || named || field.kind === "choice";
  }
}

/**
 * Which operator to ask with, when nobody chose one.
 *
 * The one written wins. Otherwise, the one the shape asks for: a pattern is asked with
 * `like`, a text with `like` if the field accepts it —«contiene» is what whoever
 * writes half a word wants— and everything else with `=`.
 */
export function defaultOp(field: QueryField, typed: TypedValue): string {
  if (typed.op !== undefined && field.ops.includes(typed.op)) return typed.op;
  if (typed.shape === "glob" && field.ops.includes("like")) return "like";
  if (typed.shape === "text" && field.ops.includes("like")) return "like";
  return field.ops.includes("=") ? "=" : (field.ops[0] ?? "=");
}

/** The value as it travels: a pattern is translated to the engine's wildcard, and the rest
 *  goes as it was written. */
export function valueFor(op: string, typed: TypedValue): string {
  return op === "like" && typed.shape === "glob" ? globToLike(typed.value) : typed.value;
}

/* ---------------------------------------------------------------- *
 *  What is offered, step by step
 * ---------------------------------------------------------------- */

/** A half-written question: what has already been chosen and what is being
 *  typed. */
export type QueryDraft = {
  field?: QueryField;
  op?: string;
  text: string;
};

export type QuerySuggestion =
  /** Continue with this field. The operator and the value are still missing. */
  | { kind: "field"; id: string; label: string; hint?: string; field: QueryField }
  /** Ask with this operator. */
  | { kind: "op"; id: string; label: string; op: string }
  /** Open a GROUP: what is written afterwards goes inside. */
  | { kind: "group"; id: string; label: string; join: "all" | "any" | "not" }
  /** The whole question, ready to enter as a chip. With `unfolds`, it can also open the
   *  records it is about (→): «Cliente contiene andres» or one Andrés in particular. */
  | {
      kind: "condition";
      id: string;
      label: string;
      hint: string;
      field: QueryField;
      op: string;
      value: string;
      unfolds?: true;
    }
  /**
   * A field asked by its VALUES, which choosing it unfolds: a relation by its records (they
   * come from `searchRecords`), an enum by the values that contain what was typed. Nothing is
   * put until one is chosen — a relation through its foreign key has no text to compare.
   */
  | {
      kind: "unfold";
      id: string;
      label: string;
      hint: string;
      field: QueryField;
      text: string;
    }
  /**
   * ONE VALUE of a field, ready to enter: a record of a relation, a value of an enum. Values
   * of the same field enter as one chip — «Estado: Pagada o Vencida» (`withValue`). `under`
   * is the row it was unfolded from.
   */
  | {
      kind: "value";
      id: string;
      label: string;
      hint: string;
      field: QueryField;
      option: RecordOption;
      under?: string;
    }
  /** The set's own search over the text — every field it searches, at once. What it asks is
   *  the consumer's (`SearchBar literal`): the bar only offers it and puts the chip. */
  | { kind: "literal"; id: string; label: string; hint: string; text: string };

/** What an operator is called for whoever reads it. It comes from the copy, so an
 *  operator the server adds appears with its symbol until somebody gives it
 *  a word — and does not disappear. */
export function opLabel(op: string): string {
  return currentCopy().ops[op] ?? op;
}

/** Whether the operator takes no value: asking whether something is empty needs nothing
 *  to be written. */
export function withoutValue(op: string): boolean {
  return op === "is null" || op === "is not null";
}

/**
 * Whether the operator compares against TWO values.
 *
 * The bar writes ONE —it is a line, not a form— so these are not
 * offered here: choosing «está entre» and writing a number builds half a range, which
 * is not a laxer question but one the engine cannot answer. They are
 * asked in the builder, which has both fields.
 */
export function withTwoValues(op: string): boolean {
  return op === "between";
}

function matches(field: QueryField, text: string): boolean {
  const needle = text.trim().toLowerCase();
  if (needle === "") return true;
  return (
    field.label.toLowerCase().includes(needle) || field.field.toLowerCase().includes(needle)
  );
}

/** Two words are the same one, whatever their case and accents: «pagada» is «Pagada». */
function same(a: string, b: string): boolean {
  return a.trim() !== "" && contains(a, b) && contains(b, a);
}

/** Which field a value chip belongs to: a relation by the relational field, anything else
 *  by itself. Two chips with the same key are the same question with more values. */
export function fieldKey(field: QueryField): string {
  return field.relation?.name ?? field.field;
}

/** The values of an enum that contain what was typed — by their word or their value — as
 *  options: what an unfolded enum shows, and what the builder offers. */
export function choiceValues(field: QueryField, text: string): RecordOption[] {
  return (field.choices ?? [])
    .map((value) => ({ id: value, name: valueLabel(field, value) }))
    .filter(
      (one) => text.trim() === "" || contains(one.name, text) || contains(one.id, text),
    );
}

/** Whether the field can be asked anything from the bar: it has operators, or its records
 *  can be searched. A to-many relation has neither without `searchRecords`. */
function askable(field: QueryField, records: boolean): boolean {
  return field.ops.length > 0 || (records && field.relation !== undefined);
}

/**
 * Whether the MODEL reads what was typed as a question of its own: an operator written in
 * front («> 100»), the name of a field («estado»), a value of an enum («pagada»), or a number or
 * a date that a field with order can answer. Plain text («Globex») is none of those — every
 * text field «contains» it, which says nothing — so the literal search goes first for it.
 */
function readByModel(
  typed: TypedValue,
  byName: readonly QuerySuggestion[],
  fields: readonly QueryField[],
): boolean {
  if (typed.op !== undefined || byName.length > 0) return true;
  if (
    fields.some((field) =>
      field.choices?.some(
        (one) => same(one, typed.value) || same(valueLabel(field, one), typed.value),
      ),
    )
  )
    return true;
  return (
    (typed.shape === "number" || typed.shape === "date") &&
    fields.some((field) => ORDERED.has(field.kind) && answers(field, typed))
  );
}

/**
 * The first step's question about ONE field, for what was typed — or none.
 *
 *      an enum            its value when one is exactly what was typed («pagada» → Estado:
 *                         Pagada); else a row that unfolds the values that contain it; none
 *                         when no value does — «estado es xyz» gives zero
 *      a relation         by the column that names it («contiene»), which ALSO unfolds its
 *                         records when they can be searched
 *      anything else      the condition, with the operator the shape asks for
 */
function questionAbout(
  field: QueryField,
  typed: TypedValue,
  records: boolean,
): QuerySuggestion | null {
  if (field.choices !== undefined && (typed.op === undefined || typed.op === "=")) {
    const values = choiceValues(field, typed.value);
    const exact = values.find(
      (one) => same(one.name, typed.value) || same(String(one.id), typed.value),
    );
    if (exact !== undefined) {
      return {
        kind: "value",
        id: `v:${fieldKey(field)}:${exact.id}`,
        label: field.label,
        hint: exact.name,
        field,
        option: exact,
      };
    }
    if (values.length === 0) return null;
    return {
      kind: "unfold",
      id: `u:${fieldKey(field)}`,
      label: field.label,
      hint: typed.value,
      field,
      text: typed.value,
    };
  }
  const op = defaultOp(field, typed);
  return {
    kind: "condition",
    id: `c:${field.field}`,
    label: field.label,
    hint: `${opLabel(op)} ${valueFor(op, typed)}`,
    field,
    op,
    value: valueFor(op, typed),
    ...(records && field.relation !== undefined && op === "like"
      ? { unfolds: true as const }
      : {}),
  };
}

/**
 * What is offered right now.
 *
 * It is a single list and not three screens: in the first step the fields
 * named like what was typed coexist —«nombr» → «nombre»— with the whole questions
 * that what was typed already allows building —«test» en el nombre—. Whoever writes a field's
 * name wants to continue that way; whoever writes a value wants to ask it
 * right away. The two intentions are written the same, so both are offered, with the
 * fields first: it is the step that has not decided anything yet.
 *
 * With `records` (the bar has `searchRecords`) a relation is ALSO asked by its records: its
 * row unfolds them, and a relation that cannot compare a text —its foreign key, a many2many—
 * is offered only that way.
 */
export function suggest(
  draft: QueryDraft,
  all: readonly QueryField[],
  options: {
    /** The set has a literal search (`SearchBar literal`): offer it for free text. */
    literal?: boolean;
    /** The records of a relation can be searched (`SearchBar searchRecords`). */
    records?: boolean;
  } = {},
): QuerySuggestion[] {
  const records = options.records === true;
  const fields = all.filter((field) => askable(field, records));
  const typed = readTyped(draft.text);

  /* Step 3 — the field and the operator are already there: the value is missing. */
  if (draft.field !== undefined && draft.op !== undefined) {
    const field = draft.field;
    /* A relation chosen by its name, with its records searchable: what is typed searches
       them —the bar unfolds them below—, and the text itself is a question only through a
       column that names it. */
    if (records && field.relation !== undefined) {
      if (typed.shape === "empty" || !field.ops.includes("like")) return [];
      return [
        {
          kind: "condition",
          id: "v:typed",
          label: valueFor("like", typed),
          hint: `${field.label} ${opLabel("like")}`,
          field,
          op: "like",
          value: valueFor("like", typed),
        },
      ];
    }
    /* Writing a pattern CHANGES the comparison: «igual a ventas_*» searches for a
       name that ends in an asterisk, which does not exist and nobody meant to ask for.
       It only overrides equality —whoever chose «mayor que» and wrote a `*` is
       writing something else entirely— and only if the field publishes `like`. */
    const op =
      typed.shape === "glob" && EQUALITY.has(draft.op) && field.ops.includes("like")
        ? "like"
        : draft.op;
    /* An enum's values, by their word. With «es» each one is a VALUE —choosing two makes one
       chip, «Estado: Pagada o Vencida»—; with any other comparison, a question of its own. */
    const values = choiceValues(field, typed.value);
    const ready: QuerySuggestion[] = values.map((one) =>
      op === "="
        ? {
            kind: "value",
            id: `v:${fieldKey(field)}:${one.id}`,
            label: one.name,
            hint: `${field.label} ${opLabel(op)}`,
            field,
            option: one,
          }
        : {
            kind: "condition",
            id: `v:${one.id}`,
            label: one.name,
            hint: `${field.label} ${opLabel(op)}`,
            field,
            op,
            value: String(one.id),
          },
    );
    if (typed.shape !== "empty" && !values.some((one) => same(one.name, typed.value))) {
      ready.unshift({
        kind: "condition",
        id: "v:typed",
        label: valueFor(op, typed),
        hint: `${field.label} ${opLabel(op)}`,
        field,
        op,
        value: valueFor(op, typed),
      });
    }
    return ready;
  }

  /* Step 2 — the field is already there: ITS operators are offered. The one the shape of what was
     typed asks for goes first, because writing «100» after choosing «filas» is
     almost always «igual a 100». */
  if (draft.field !== undefined) {
    const field = draft.field;
    const first = defaultOp(field, typed);
    const ops = [first, ...field.ops.filter((one) => one !== first)].filter(
      (op) => !withTwoValues(op) && field.ops.includes(op),
    );
    return ops.map((op) =>
      /* The one that takes NO value is a whole question as soon as it is chosen: sending it
         to the value step left whoever chose «está vacío» typing something that
         means nothing, with an empty list below and Enter doing nothing. */
      withoutValue(op)
        ? {
            kind: "condition" as const,
            id: `op:${op}`,
            label: opLabel(op),
            hint: field.label,
            field,
            op,
            value: "",
          }
        : { kind: "op" as const, id: `op:${op}`, label: opLabel(op), op },
    );
  }

  /* `#and`, `#or`, `#not`: what was asked for is to open a group, not to choose a
     field. ONLY THAT is offered — whoever wrote it already knows what they want. */
  if (typed.opens !== undefined) {
    const join = typed.opens;
    return [
      {
        kind: "group",
        id: `g:${join}`,
        label: currentCopy().search.joins[join === "not" ? "none" : join],
        join,
      },
    ];
  }

  /* With a bare `#` the ATTRIBUTE is being chosen, so the fields are offered
     —and the three group openers, because they are also asked for with the hash sign and
     hiding them would be having a notation nobody discovers. */
  if (typed.attribute === true) {
    const opening: QuerySuggestion[] =
      typed.value === ""
        ? (["all", "any", "not"] as const).map((join) => ({
            kind: "group",
            id: `g:${join}`,
            label: currentCopy().search.joins[join === "not" ? "none" : join],
            join,
          }))
        : [];
    return [
      ...opening,
      ...fields
        .filter((field) => matches(field, typed.value))
        .map((field) => ({
          kind: "field" as const,
          id: `f:${fieldKey(field)}`,
          label: field.label,
          ...(field.through === undefined ? {} : { hint: field.through }),
          field,
        })),
    ];
  }

  /* Step 1 — nothing has been chosen yet. */
  const byName: QuerySuggestion[] =
    typed.shape === "empty"
      ? []
      : fields
          .filter((field) => matches(field, draft.text))
          .map((field) => ({
            kind: "field",
            id: `f:${fieldKey(field)}`,
            label: field.label,
            ...(field.through === undefined ? {} : { hint: field.through }),
            field,
          }));

  /* Without a VALUE there is no question to build yet —a question without a value
     is not a question— so fields are offered. But if the operator was already written,
     that alone narrows: `>` keeps those that have an order and drops the texts
     before the first digit is written. */
  if (typed.shape === "empty") {
    return fields
      .filter((field) => answers(field, typed))
      .map((field) => ({
        kind: "field",
        id: `f:${fieldKey(field)}`,
        label: field.label,
        ...(field.through === undefined ? {} : { hint: field.through }),
        field,
      }));
  }

  const asked = fields
    .filter((field) => answers(field, typed))
    .map((field) => questionAbout(field, typed, records))
    .filter((one): one is QuerySuggestion => one !== null);
  /* An enum's value written whole —«pagada»— is the likeliest reading of all: it goes before
     «número contiene pagada», which every text field would answer. */
  const ready = [
    ...asked.filter((one) => one.kind === "value"),
    ...asked.filter((one) => one.kind !== "value"),
  ];

  /* A relation that cannot compare a text —its foreign key, a many2many— is asked by its
     records: the row unfolds the ones that match what was typed. Only for a text: a number
     or an operator written in front is a question about a column, not a name. */
  const byRecords: QuerySuggestion[] =
    records && typed.op === undefined && (typed.shape === "text" || typed.shape === "glob")
      ? fields
          .filter((field) => field.relation !== undefined && !answers(field, typed))
          .map((field) => ({
            kind: "unfold",
            id: `u:${fieldKey(field)}`,
            label: field.label,
            hint: typed.value,
            field,
            text: typed.value,
          }))
      : [];

  /* A field named like what was typed is not offered twice: if «nombre»
     appears above to continue by it, below it is no longer needed as a
     question already made — unless what was typed is also a reasonable value, which is
     precisely the case of «test». */
  const named = new Set(
    byName.map((one) => (one.kind === "field" ? fieldKey(one.field) : "")),
  );
  const byModel = [
    ...byName,
    ...[...ready, ...byRecords].filter(
      (one) =>
        (one.kind !== "condition" && one.kind !== "unfold") ||
        !named.has(fieldKey(one.field)),
    ),
  ];
  if (options.literal !== true) return byModel;
  /* The literal search is always offered for text: what the model reads goes first, and
     when it reads nothing, the literal search is what Enter takes. */
  const text = draft.text.trim();
  const literal: QuerySuggestion = {
    kind: "literal",
    id: "l:literal",
    label: currentCopy().search.literal,
    hint: text,
    text,
  };
  return readByModel(typed, byName, fields) ? [...byModel, literal] : [literal, ...byModel];
}

/**
 * HOW A CONDITION IS READ, in one place.
 *
 * It is used by the bar —for the chip of what somebody just asked— and the
 * builder —for the chip and for the tree of what is already built—. Only
 * one, because the same condition written two ways reads differently on two
 * screens and nobody knows which of the two is the one that filters.
 *
 * It takes the label ALREADY resolved and not the field: who knows what
 * `row_count` is called is the model, and this only knows how to build the sentence.
 */
export function sayCondition(label: string, op: string, value: string): string {
  return withoutValue(op)
    ? `${label} ${opLabel(op)}`
    : fillCopy(currentCopy().search.condition, { field: label, op: opLabel(op), value });
}

/** How an already-made question reads, for the chip: «el nombre contiene test». */
export function describeCondition(field: QueryField, op: string, value: string): string {
  return sayCondition(field.label, op, value);
}

/* ---------------------------------------------------------------- *
 *  Chips made by code — the same ones the bar makes
 *
 *  A list that opens on «mis facturas», a chooser that opens on the customer of the form, a
 *  link that carries «Estado: Vencida»: the application puts the SAME instances the bar puts
 *  when somebody types, so they read, open in the builder and are removed the same. The bar
 *  is controlled (`criteria`), so a default is the first value of that state.
 * ---------------------------------------------------------------- */

/** The question about one field as a chip — what the bar puts when a condition is chosen:
 *  «nombre contiene test». */
export function conditionCriteria(
  field: QueryField,
  op: string,
  value: string,
): SearchCriteria {
  return filterCriteria(
    /* The one that takes no value travels with `true`, which is what the engine expects of
       «está vacío»: sending it the empty string would be asking for the field that is "". */
    { field: field.field, operator: op, value: withoutValue(op) ? true : value },
    describeCondition(field, op, value),
  );
}

/**
 * A chip's PARTS — the field, the comparison and the value —, when the chip is a question the
 * bar itself writes.
 *
 * Context: «total como mucho 1000» read at one weight, and changing 1000 to 2000 meant opening
 * the whole builder. Split, the chip reads the way the eye scans it —the field quiet, the
 * comparison a small word, the value strong— and each part is touched on its own. Only a chip
 * that DESCRIBES itself splits: a declared one keeps its name («sólo vencidas») and is one
 * piece, since that name is somebody's decision and not the condition read aloud.
 */
export type ChipParts =
  | { kind: "condition"; field: QueryField; op: string; value: string }
  | { kind: "values"; field: QueryField; values: readonly RecordOption[] };

export function chipParts(
  node: SearchCriteria,
  fields: readonly QueryField[],
): ChipParts | undefined {
  if (node.kind !== "filter" || node.selection === undefined) return undefined;
  if (node.values !== undefined) {
    const field = fields.find((one) => node.id === `v:${fieldKey(one)}`);
    return field === undefined || node.values.length === 0
      ? undefined
      : { kind: "values", field, values: node.values };
  }
  const selection = node.selection;
  if (!("operator" in selection)) return undefined;
  const op = selection.operator;
  const raw = selection.value;
  const value = withoutValue(op)
    ? ""
    : typeof raw === "string" || typeof raw === "number"
      ? String(raw)
      : undefined;
  if (value === undefined) return undefined;
  const field = fields.find(
    (one) =>
      one.field === selection.field && node.label === describeCondition(one, op, value),
  );
  return field === undefined ? undefined : { kind: "condition", field, op, value };
}

/** The same chip asking with another comparison or value — its identity (`id`) kept, so it
 *  stays where it was and nothing that points at it loses it. */
export function withParts(
  node: SearchCriteria,
  field: QueryField,
  op: string,
  value: string,
): SearchCriteria {
  return { ...conditionCriteria(field, op, value), id: node.id };
}

/** What asks for these values of a field: records of a relation by their key (see
 *  `recordsFilter`), values of an enum or of any column with `=` / `in`. */
export function valuesSelection(
  field: QueryField,
  values: readonly RecordOption[],
): BuiltCondition | BuiltFilter {
  const keys = values.map((one) => one.id);
  if (field.relation !== undefined) return recordsFilter(field.relation, keys);
  if (keys.length === 1) return { field: field.field, operator: "=", value: keys[0] };
  if (field.ops.includes("in")) return { field: field.field, operator: "in", value: keys };
  return { any: keys.map((key) => ({ field: field.field, operator: "=", value: key })) };
}

/** How a chip of values reads: «Cliente: Andrés Pérez o Andrés Gutiérrez». Past three, the
 *  rest is counted — the builder shows them whole. */
export function sayValues(field: QueryField, values: readonly RecordOption[]): string {
  const copy = currentCopy();
  const names = values.slice(0, 3).map((one) => one.name);
  const said =
    values.length > 3
      ? `${names.join(", ")} ${fillCopy(copy.search.andMore, { count: values.length - 3 })}`
      : names.join(` ${copy.search.or} `);
  return fillCopy(copy.search.valuesChip, { field: field.label, values: said });
}

/** The chip that asks for these values of a field. Its id says which field, so a second value
 *  chosen lands in the SAME chip (`withValue`). */
export function valuesCriteria(
  field: QueryField,
  values: readonly RecordOption[],
): SearchCriteria {
  return {
    id: `v:${fieldKey(field)}`,
    kind: "filter",
    label: sayValues(field, values),
    selection: valuesSelection(field, values),
    values: [...values],
  };
}

/**
 * One more value of a field, where the bar puts things: into the chip that already asks about
 * that field —«Cliente: Andrés Pérez» becomes «… o Andrés Gutiérrez»— or as a new chip at the
 * end. Choosing a value that is already there changes nothing.
 */
export function withValue(
  all: readonly SearchCriteria[],
  field: QueryField,
  value: RecordOption,
): SearchCriteria[] {
  const id = `v:${fieldKey(field)}`;
  const at = all.findIndex((one) => one.id === id && one.kind === "filter");
  if (at < 0) return [...all, valuesCriteria(field, [value])];
  const held = all[at];
  const before = held?.kind === "filter" ? (held.values ?? []) : [];
  if (before.some((one) => sameKey(one.id, value.id))) return [...all];
  return all.map((one, index) =>
    index === at ? valuesCriteria(field, [...before, value]) : one,
  );
}
