import {
  type FieldDefinition,
  fieldLabel,
  isFilterable,
  type ModelDefinition,
} from "@sincpro/web-ui/components/search/model";
import { currentCopy, fillCopy } from "@sincpro/web-ui/foundations/copy";

/* ==================================================================== *
 *  LA GRAMÁTICA DE LA BARRA — qué se puede preguntar, y con qué.
 *
 *  Context: la barra ofrecía «buscar «test» en el nombre / en las columnas», y
 *  eso es una sola pregunta —¿el texto está adentro?— repetida por campo. Con
 *  eso no se puede pedir «menos de cien filas», ni «los .csv», ni «los de este
 *  proyecto»: tres preguntas que el motor contesta y que la barra no sabía
 *  escribir.
 *
 *  ── El modelo ya dice todo lo que hace falta ────────────────────────
 *
 *  Nada de esto está escrito a mano. `model_meta_data` publica, por campo, su
 *  `type`, los `ops` que acepta, si es `relation` y por qué columna se lo
 *  identifica, y sus `choices` si es un enum. De ahí sale qué se ofrece: un
 *  campo de texto ofrece «contiene», uno numérico ofrece «menor que», y uno
 *  relacional se busca por la columna que lo nombra. Agregar una columna al
 *  modelo la hace aparecer acá, con sus operadores, sin tocar este archivo.
 *
 *  ── Cómo se empieza, y qué recorta cada cosa ───────────────────────
 *
 *      #            elegir el ATRIBUTO. Lo que sigue es el nombre de un campo y
 *                   no un valor — «nombre» se escribe igual de las dos maneras,
 *                   y con el numeral no hay que adivinar cuál.
 *      texto        los campos que tienen letras adentro.
 *      *.csv        lo mismo, pero como MOLDE: lo que termina en «.csv».
 *      =  !=        todos. Cualquier cosa se compara contra sí misma, así que la
 *                   igualdad no discrimina por tipo.
 *      >  >=  <  <= sólo lo ORDENADO: números y fechas. «Mayor que» sobre un
 *                   texto es una comparación alfabética que nadie pidió.
 *
 *  El operador se mira antes que el valor: escribir `>` ya deja fuera los textos
 *  aunque todavía no se haya escrito contra qué.
 *
 *  ── Una pregunta son TRES pasos, y se escriben en uno ───────────────
 *
 *      filas  →  menor que  →  100
 *      ↑ campo   ↑ operador   ↑ valor
 *
 *  Se eligen de a uno y cada paso ofrece lo que el anterior dejó posible — pero
 *  **no hay que recorrer los tres**. Lo que se escribe se LEE: `<= 100` ya trae
 *  su operador y su valor, así que sólo falta contra qué campo; `*.csv` es un
 *  molde y no un texto; `test` es un texto y sólo lo pueden contestar los campos
 *  que tienen letras adentro. Por eso la primera lista no ofrece los campos que
 *  no pueden contestar lo que se escribió: ofrecer «filas» para `*.csv` es
 *  ofrecer una pregunta que da cero.
 * ==================================================================== */

/** Qué clase de valor tiene un campo. Sale del `type` que publica el modelo y es
 *  lo que decide qué se le puede preguntar. */
export type QueryKind = "text" | "number" | "date" | "boolean" | "choice" | "relation";

/** Un campo por el que se puede preguntar desde la barra. */
export type QueryField = {
  /** Contra qué campo va la condición. Para un relacional es la columna que lo
   *  identifica y no el relacional en sí: el motor no compara un agregado. */
  field: string;
  label: string;
  kind: QueryKind;
  /** Los operadores que el modelo acepta para él, en el orden que los publicó. */
  ops: readonly string[];
  /** Los valores posibles, cuando es un enum: de ahí sale la tercera lista. */
  choices?: readonly string[];
  /** Cuando se llega por una relación: contra qué agregado se está preguntando
   *  de verdad. Es lo que deja escribir «el proyecto se llama X» sin que nadie
   *  sepa que por dentro se compara otra columna. */
  through?: string;
};

/** Qué forma tiene lo que alguien escribió. Es lo que decide qué campos pueden
 *  contestarlo. */
export type ValueShape = "empty" | "text" | "glob" | "number" | "date";

/** Lo tipeado, ya leído: el operador que trae puesto —si lo trae— y su forma. */
export type TypedValue = {
  op?: string;
  value: string;
  shape: ValueShape;
  /** Se escribió `#`: se está eligiendo el ATRIBUTO y no un valor. */
  attribute?: true;
  /** Se escribió `#and`, `#or` o `#not`: no se está eligiendo un atributo, se
   *  está ABRIENDO UN GRUPO para meter adentro lo que venga. */
  opens?: "all" | "any" | "not";
};

/**
 * Las palabras que, después del numeral, abren un GRUPO en vez de nombrar un
 * atributo.
 *
 * Se escriben como se piensan —`#and`, `#or`, `#not`— y también como se leen en
 * la barra —`#todas`, `#cualquiera`, `#ninguna`—, porque son la misma cosa dicha
 * de dos maneras y obligar a una sola es obligar a aprenderla.
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

/* Los operadores que se pueden escribir adelante del valor, de más largo a más
   corto: si `<` se probara antes que `<=`, «<=100» se leería como «< =100». */
const WRITTEN_OPS: readonly string[] = ["<=", ">=", "!=", "<", ">", "="];

/**
 * Los que ORDENAN. Sólo los puede contestar algo que tenga orden —un número, una
 * fecha—, y no porque el campo no publique el operador: «mayor que» sobre un
 * texto es una comparación alfabética que nadie pidió nunca y que da resultados
 * que no se pueden explicar.
 */
const ORDERING = new Set([">", ">=", "<", "<="]);

/**
 * Los que sólo comparan IGUALDAD. Estos no discriminan por tipo: todo se puede
 * comparar contra sí mismo, así que escribir `=` abre la lista entera en vez de
 * adivinar de qué clase es lo que todavía no se escribió.
 */
const EQUALITY = new Set(["=", "!="]);

/** Qué clases tienen orden. Un enum no: sus valores son palabras aunque se
 *  escriban con números. */
const ORDERED = new Set<QueryKind>(["number", "date"]);

const NUMBER = /^-?\d+([.,]\d+)?$/;
const DATE = /^\d{4}-\d{2}(-\d{2})?$/;

/**
 * Lee lo que alguien escribió: el operador que trae adelante, el valor, y de qué
 * forma es.
 *
 * Un molde —`*.csv`, `ventas_*`— es distinto de un texto: se busca con `like` y
 * el `*` se traduce al comodín del motor. Un texto suelto NO es un molde
 * implícito: quien escribe `test` está pidiendo lo que contenga «test», y quien
 * escribe `*.csv` está pidiendo lo que TERMINE en «.csv», que es otra pregunta.
 */
export function readTyped(text: string): TypedValue {
  const clean = text.trim();
  if (clean === "") return { value: "", shape: "empty" };

  /* `#` es «elegí el atributo»: lo que sigue no es un valor, es el nombre del
     campo por el que se va a preguntar. Existe porque las dos intenciones se
     escriben con las mismas letras —«nombre» puede ser el campo o el texto que
     se busca— y hasta acá había que confiar en que la barra adivinara cuál. Con
     el numeral no hay nada que adivinar. */
  if (clean.startsWith("#")) {
    const rest = clean.slice(1).trim();
    const opens = OPENS[rest.toLowerCase()];
    /* `#and` no es un atributo que se llame «and»: es la orden de abrir un
       grupo. Se mira primero porque un modelo podría tener un campo llamado
       `and`, y entre las dos lecturas gana la que alguien escribió a propósito
       —nadie tipea el numeral para buscar la palabra «or». */
    /* `#` a secas es «elegí el atributo» sin haber empezado a nombrarlo: la forma
       es «vacío», como en cualquier otro lado. Decir «texto» de una cadena vacía
       es mentir sobre lo que hay escrito. */
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

/** El molde, con el comodín que entiende el motor. `*` es lo que la gente
 *  escribe —y lo que escribe una terminal— y `%` es lo que entiende un `like`. */
export function globToLike(value: string): string {
  return value.replace(/\*/g, "%");
}

/** Qué clase de valor es un campo, leída del tipo que publica el modelo. */
function kindOf(definition: FieldDefinition): QueryKind {
  if (definition.kind === "relation") return "relation";
  if (definition.choices !== undefined && definition.choices.length > 0) return "choice";
  const type = definition.type.toLowerCase();
  if (type === "integer" || type === "number" || type === "float") return "number";
  if (type === "date" || type === "datetime") return "date";
  if (type === "boolean" || type === "bool") return "boolean";
  return "text";
}

/**
 * Los campos por los que la barra puede preguntar, sacados del modelo.
 *
 * Un relacional entra por la columna que lo IDENTIFICA y con el rótulo de la
 * relación: preguntar «el cliente se llama Ferretería» es una pregunta sobre el
 * cliente aunque por dentro compare su nombre. Un relacional sin `identifiedBy`
 * no entra: no hay nada contra qué comparar, y ofrecerlo sería ofrecer una
 * pregunta que no se puede contestar.
 */
export function queryFields(model: ModelDefinition, locale: string): QueryField[] {
  /* Las columnas que ya nombran a una relación no se ofrecen por su cuenta: son
     la misma pregunta con dos rótulos —«proyecto» y «nombre del proyecto»— y la
     que se entiende es la de la relación. */
  const naming = new Set(
    Object.values(model.fields)
      .filter((one) => one.kind === "relation")
      .map((one) => one.identifiedBy)
      .filter((one): one is string => one !== null && one !== undefined),
  );

  const out: QueryField[] = [];
  for (const [name, definition] of Object.entries(model.fields)) {
    const kind = kindOf(definition);

    if (kind === "relation") {
      const through = definition.identifiedBy;
      if (through === null || through === undefined) continue;
      const identifying = model.fields[through];
      if (identifying === undefined || !isFilterable(identifying)) continue;
      out.push({
        field: through,
        label: fieldLabel(model, name, locale),
        kind: "relation",
        ops: identifying.ops,
        through: definition.relation ?? name,
      });
      continue;
    }

    if (!isFilterable(definition) || naming.has(name)) continue;
    out.push({
      field: name,
      label: fieldLabel(model, name, locale),
      kind,
      ops: definition.ops,
      ...(definition.choices === undefined
        ? {}
        : { choices: definition.choices.map((one) => String(one)) }),
    });
  }
  return out;
}

/**
 * Si un campo puede contestar lo que se escribió.
 *
 * Manda el OPERADOR cuando se escribió uno, porque es lo que dice qué clase de
 * pregunta es:
 *
 *     = / !=        todo. Cualquier cosa se compara contra sí misma, así que
 *                   escribir `=` abre la lista entera en vez de adivinar de qué
 *                   clase es un valor que todavía no se escribió.
 *     > >= < <=     sólo lo ORDENADO —un número, una fecha—. «Mayor que» sobre
 *                   un texto es una comparación alfabética que nadie pidió.
 *
 * Sin operador escrito manda la FORMA del valor: `*.csv` es un molde y sólo lo
 * contesta algo con letras; `100` sólo algo con números. Ofrecer «filas» para
 * `*.csv` es ofrecer una pregunta que da cero.
 */
export function answers(field: QueryField, typed: TypedValue): boolean {
  /* El operador se mira ANTES que el valor, y no después: escribir `>` ya
     descarta los textos aunque todavía no se haya escrito contra qué. Al revés,
     la barra ofrecía las cinco columnas hasta que se tipeaba el primer dígito. */
  if (typed.op !== undefined) {
    if (!field.ops.includes(typed.op)) return false;
    if (EQUALITY.has(typed.op)) return true;
    if (ORDERING.has(typed.op) && !ORDERED.has(field.kind)) return false;
  }
  if (typed.shape === "empty") return true;
  switch (typed.shape) {
    case "number":
      return field.kind === "number" || field.kind === "choice";
    case "date":
      return field.kind === "date";
    case "glob":
      return field.kind === "text" || field.kind === "relation";
    default:
      /* Un texto lo contesta lo que tiene letras adentro, y también un enum: sus
         valores son palabras. Un número no —«test» no es un número— y una fecha
         tampoco. */
      return field.kind === "text" || field.kind === "relation" || field.kind === "choice";
  }
}

/**
 * Con qué operador se pregunta, cuando nadie lo eligió.
 *
 * El que se escribió gana. Si no, el que la forma pide: un molde se pregunta con
 * `like`, un texto con `like` si el campo lo acepta —«contiene» es lo que quiere
 * quien escribe media palabra— y todo lo demás con `=`.
 */
export function defaultOp(field: QueryField, typed: TypedValue): string {
  if (typed.op !== undefined && field.ops.includes(typed.op)) return typed.op;
  if (typed.shape === "glob" && field.ops.includes("like")) return "like";
  if (typed.shape === "text" && field.ops.includes("like")) return "like";
  return field.ops.includes("=") ? "=" : (field.ops[0] ?? "=");
}

/** El valor tal como viaja: un molde se traduce al comodín del motor, y lo demás
 *  va como se escribió. */
export function valueFor(op: string, typed: TypedValue): string {
  return op === "like" && typed.shape === "glob" ? globToLike(typed.value) : typed.value;
}

/* ---------------------------------------------------------------- *
 *  Lo que se ofrece, paso por paso
 * ---------------------------------------------------------------- */

/** Una pregunta a medio escribir: lo que ya se eligió y lo que se está
 *  tipeando. */
export type QueryDraft = {
  field?: QueryField;
  op?: string;
  text: string;
};

export type QuerySuggestion =
  /** Seguir por este campo. Todavía falta el operador y el valor. */
  | { kind: "field"; id: string; label: string; hint?: string; field: QueryField }
  /** Preguntar con este operador. */
  | { kind: "op"; id: string; label: string; op: string }
  /** Abrir un GRUPO: lo que se escriba después entra adentro. */
  | { kind: "group"; id: string; label: string; join: "all" | "any" | "not" }
  /** La pregunta entera, lista para entrar como ficha. */
  | {
      kind: "condition";
      id: string;
      label: string;
      hint: string;
      field: QueryField;
      op: string;
      value: string;
    };

/** Cómo se llama un operador para quien lo lee. Sale de la copia, así que un
 *  operador que el servidor agregue aparece con su símbolo hasta que alguien le
 *  ponga palabra — y no desaparece. */
export function opLabel(op: string): string {
  return currentCopy().ops[op] ?? op;
}

/** Si el operador no lleva valor: preguntar si algo está vacío no necesita que
 *  se escriba nada. */
export function withoutValue(op: string): boolean {
  return op === "is null" || op === "is not null";
}

/**
 * Si el operador compara contra DOS valores.
 *
 * La barra escribe UNO —es una línea, no un formulario— así que éstos no se
 * ofrecen acá: elegir «está entre» y escribir un número arma medio rango, que
 * no es una pregunta más laxa sino una que el motor no puede contestar. Se
 * preguntan en el constructor, que tiene los dos campos.
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

/**
 * Qué se ofrece ahora mismo.
 *
 * Es una sola lista y no tres pantallas: en el primer paso conviven los campos
 * que se llaman como lo tipeado —«nombr» → «nombre»— con las preguntas enteras
 * que lo tipeado ya permite armar —«test» en el nombre—. Quien escribe el nombre
 * de un campo quiere seguir por ahí; quien escribe un valor quiere preguntarlo
 * ya. Las dos intenciones se escriben igual, así que se ofrecen las dos, con los
 * campos primero: es el paso que todavía no decidió nada.
 */
export function suggest(draft: QueryDraft, fields: readonly QueryField[]): QuerySuggestion[] {
  const typed = readTyped(draft.text);

  /* Paso 3 — el campo y el operador ya están: falta el valor. */
  if (draft.field !== undefined && draft.op !== undefined) {
    const field = draft.field;
    /* Escribir un molde CAMBIA la comparación: «igual a ventas_*» busca un
       nombre que termine en asterisco, que no existe y que nadie quiso pedir.
       Sólo pisa la igualdad —quien eligió «mayor que» y escribió un `*` está
       escribiendo cualquier otra cosa— y sólo si el campo publica `like`. */
    const op =
      typed.shape === "glob" && EQUALITY.has(draft.op) && field.ops.includes("like")
        ? "like"
        : draft.op;
    const values =
      field.choices === undefined
        ? []
        : field.choices.filter((one) =>
            one.toLowerCase().includes(typed.value.toLowerCase()),
          );
    const ready: QuerySuggestion[] = values.map((one) => ({
      kind: "condition",
      id: `v:${one}`,
      label: one,
      hint: `${field.label} ${opLabel(op)}`,
      field,
      op,
      value: one,
    }));
    if (typed.shape !== "empty" && !values.includes(typed.value)) {
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

  /* Paso 2 — el campo ya está: se ofrecen SUS operadores. El que la forma de lo
     tipeado pide va primero, porque escribir «100» después de elegir «filas» es
     casi siempre «igual a 100». */
  if (draft.field !== undefined) {
    const field = draft.field;
    const first = defaultOp(field, typed);
    const ops = [first, ...field.ops.filter((one) => one !== first)].filter(
      (op) => !withTwoValues(op),
    );
    return ops.map((op) =>
      /* El que NO lleva valor es una pregunta entera apenas se elige: mandarlo
         al paso del valor dejaba al que eligió «está vacío» tipeando algo que no
         significa nada, con una lista vacía abajo y Enter sin hacer nada. */
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

  /* `#and`, `#or`, `#not`: lo que se pidió es abrir un grupo, no elegir un
     campo. Se ofrece ESO solo — quien lo escribió ya sabe lo que quiere. */
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

  /* Con `#` a secas se está eligiendo el ATRIBUTO, así que se ofrecen los campos
     —y los tres abridores de grupo, porque también se piden con el numeral y
     esconderlos sería tener una notación que nadie descubre. */
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
          id: `f:${field.field}`,
          label: field.label,
          ...(field.through === undefined ? {} : { hint: field.through }),
          field,
        })),
    ];
  }

  /* Paso 1 — todavía no se eligió nada. */
  const byName: QuerySuggestion[] =
    typed.shape === "empty"
      ? []
      : fields
          .filter((field) => matches(field, draft.text))
          .map((field) => ({
            kind: "field",
            id: `f:${field.field}`,
            label: field.label,
            ...(field.through === undefined ? {} : { hint: field.through }),
            field,
          }));

  const ready: QuerySuggestion[] = fields
    .filter((field) => answers(field, typed))
    .map((field) => {
      const op = defaultOp(field, typed);
      return {
        kind: "condition" as const,
        id: `c:${field.field}`,
        label: field.label,
        hint: `${opLabel(op)} ${valueFor(op, typed)}`,
        field,
        op,
        value: valueFor(op, typed),
      };
    });

  /* Sin VALOR todavía no hay ninguna pregunta que armar —una pregunta sin valor
     no es una pregunta— así que se ofrecen campos. Pero si ya se escribió el
     operador, eso solo recorta: `>` deja los que tienen orden y saca los textos
     antes de que se escriba el primer dígito. */
  if (typed.shape === "empty") {
    return fields
      .filter((field) => answers(field, typed))
      .map((field) => ({
        kind: "field",
        id: `f:${field.field}`,
        label: field.label,
        ...(field.through === undefined ? {} : { hint: field.through }),
        field,
      }));
  }

  /* Un campo que se llama como lo tipeado no se ofrece dos veces: si «nombre»
     aparece arriba para seguir por él, abajo ya no hace falta como pregunta
     hecha — salvo que lo tipeado sea también un valor razonable, que es
     justamente el caso de «test». */
  const named = new Set(byName.map((one) => (one.kind === "field" ? one.field.field : "")));
  return [
    ...byName,
    ...ready.filter((one) => one.kind !== "condition" || !named.has(one.field.field)),
  ];
}

/**
 * CÓMO SE LEE UNA CONDICIÓN, en un solo lugar.
 *
 * La usan la barra —para la ficha de lo que alguien acaba de preguntar— y el
 * constructor —para la ficha y para el árbol de lo que ya está armado—. Una
 * sola, porque la misma condición escrita de dos maneras se lee distinta en dos
 * pantallas y nadie sabe cuál de las dos es la que filtra.
 *
 * Toma el RÓTULO ya resuelto y no el campo: quién sabe cómo se llama
 * `row_count` es el modelo, y esto sólo sabe armar la frase.
 */
export function sayCondition(label: string, op: string, value: string): string {
  return withoutValue(op)
    ? `${label} ${opLabel(op)}`
    : fillCopy(currentCopy().search.condition, { field: label, op: opLabel(op), value });
}

/** Cómo se lee una pregunta ya hecha, para la ficha: «el nombre contiene test». */
export function describeCondition(field: QueryField, op: string, value: string): string {
  return sayCondition(field.label, op, value);
}
