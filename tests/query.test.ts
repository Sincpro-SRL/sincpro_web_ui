import assert from "node:assert/strict";

import type { ModelDefinition } from "@sincpro/web-ui/components/search/model";
import {
  answers,
  defaultOp,
  describeCondition,
  type QueryField,
  queryFields,
  readTyped,
  suggest,
  valueFor,
} from "@sincpro/web-ui/components/search/query";
import { installCopy } from "@sincpro/web-ui/foundations/copy";
import { test } from "vitest";

/**
 * LO QUE LA BARRA PUEDE PREGUNTAR, y por qué no ofrece lo que no.
 *
 * Todo sale del modelo: el tipo de un campo decide qué se le puede escribir, sus
 * `ops` deciden con qué se compara, y un relacional se busca por la columna que
 * lo identifica. Nada de eso está escrito acá adentro — por eso agregar una
 * columna al modelo la hace aparecer en la barra sin tocar una línea.
 */

const MODEL: ModelDefinition = {
  aggregate: "dataset",
  identity: "id",
  fields: {
    name: { type: "string", nullable: false, sortable: true, ops: ["=", "!=", "like"] },
    row_count: {
      type: "integer",
      nullable: false,
      sortable: true,
      ops: ["=", "!=", ">", ">=", "<", "<="],
    },
    registered_at: {
      type: "datetime",
      nullable: false,
      sortable: true,
      ops: ["=", ">", "<", ">=", "<="],
    },
    origin: {
      type: "string",
      nullable: false,
      sortable: true,
      ops: ["=", "!="],
      choices: ["uploaded", "computed", "synthetic"],
    },
    /* El relacional no se compara: se compara la columna que lo nombra. */
    project_id: {
      type: "many2one",
      nullable: true,
      sortable: false,
      ops: [],
      kind: "relation",
      relation: "project",
      identifiedBy: "project_name",
    },
    project_name: {
      type: "string",
      nullable: true,
      /* El modelo publica los dos que la barra no puede terminar sola: uno sin
         valor y uno con dos. */
      ops: ["=", "like", "is null", "between"],
      sortable: true,
    },
    /* Un valor-objeto no se filtra: `ops` vacío es la señal. */
    profile: { type: "json", nullable: true, sortable: false, ops: [], kind: "embedded" },
  },
  translations: {
    name: { default: "Dataset" },
    labels: {
      name: { default: "nombre" },
      row_count: { default: "filas" },
      registered_at: { default: "registrado" },
      origin: { default: "procedencia" },
      project_id: { default: "proyecto" },
      project_name: { default: "nombre del proyecto" },
    },
  },
};

const CAMPOS = queryFields(MODEL, "default");
const de = (field: string): QueryField => CAMPOS.find((one) => one.field === field)!;

installCopy({
  locale: "es-BO",
  ops: {
    "=": "es",
    like: "contiene",
    "<=": "menor o igual que",
    ">": "mayor que",
    "is null": "está vacío",
  },
});

/* ---------------------------------------------------------------- *
 *  Qué se puede preguntar
 * ---------------------------------------------------------------- */

test("los campos salen del modelo, con su tipo y sus operadores", () => {
  assert.deepEqual(
    CAMPOS.map((one) => `${one.field}:${one.kind}`),
    [
      "name:text",
      "row_count:number",
      "registered_at:date",
      "origin:choice",
      "project_name:relation",
    ],
  );
});

/* Un valor-objeto no ofrece comparación —`ops` vacío— así que no se ofrece. */
test("lo que no se puede filtrar no se ofrece", () => {
  assert.equal(
    CAMPOS.some((one) => one.field === "profile"),
    false,
  );
});

/* Preguntar «el proyecto se llama X» es una pregunta sobre el proyecto, aunque
   por dentro compare la columna que lo nombra. */
/* Y la columna que lo nombra no se ofrece dos veces: «proyecto» y «nombre del
   proyecto» son la misma pregunta, y la que se entiende es la primera. */
test("un relacional entra por la columna que lo identifica, con el rótulo de la relación", () => {
  const relacional = CAMPOS.find((one) => one.kind === "relation")!;
  assert.equal(relacional.label, "proyecto");
  assert.equal(relacional.field, "project_name");
  assert.equal(relacional.through, "project");
});

/* ---------------------------------------------------------------- *
 *  Lo que se escribe, leído
 * ---------------------------------------------------------------- */

test("el operador que se escribe adelante se lee", () => {
  assert.deepEqual(readTyped("<= 100"), { op: "<=", value: "100", shape: "number" });
  assert.deepEqual(readTyped(">2026-09"), { op: ">", value: "2026-09", shape: "date" });
  assert.deepEqual(readTyped("test"), { value: "test", shape: "text" });
});

/* `<` antes que `<=` leería «<=100» como «< =100»: el orden de la tabla no es
   decorativo. */
test("el operador más largo gana", () => {
  assert.equal(readTyped("<=5").op, "<=");
  assert.equal(readTyped("<5").op, "<");
  assert.equal(readTyped("!=5").op, "!=");
});

/* Un molde es otra pregunta que un texto: «*.csv» pide lo que TERMINA así, y
   «csv» pide lo que lo contenga en cualquier parte. */
test("un molde no es un texto", () => {
  assert.equal(readTyped("*.csv").shape, "glob");
  assert.equal(readTyped("ventas_*").shape, "glob");
  assert.equal(readTyped("ventas").shape, "text");
  assert.equal(valueFor("like", readTyped("*.csv")), "%.csv");
  assert.equal(valueFor("like", readTyped("ventas")), "ventas");
});

/* Entre comillas, un número es un texto: quien las escribe está diciendo
   exactamente eso. */
test("lo entrecomillado es texto, aunque parezca otra cosa", () => {
  assert.deepEqual(readTyped('"100"'), { value: "100", shape: "text" });
});

/* ---------------------------------------------------------------- *
 *  Qué campo puede contestar qué
 * ---------------------------------------------------------------- */

test("un número sólo lo contestan los campos que tienen números", () => {
  const typed = readTyped("<= 100");
  assert.equal(answers(de("row_count"), typed), true);
  assert.equal(answers(de("name"), typed), false);
  assert.equal(answers(de("registered_at"), typed), false);
});

test("un molde sólo lo contestan los que tienen letras", () => {
  const typed = readTyped("*.csv");
  assert.equal(answers(de("name"), typed), true);
  assert.equal(answers(de("row_count"), typed), false);
});

/* Un operador que el campo no publica no se puede usar contra él, por más que la
   forma coincida: `name` no acepta `<=`. */
test("un operador que el campo no acepta lo descarta", () => {
  assert.equal(answers(de("name"), readTyped("<= ventas")), false);
});

test("el operador por default sale de la forma y de lo que el campo acepta", () => {
  assert.equal(defaultOp(de("name"), readTyped("test")), "like");
  assert.equal(defaultOp(de("name"), readTyped("*.csv")), "like");
  assert.equal(defaultOp(de("row_count"), readTyped("100")), "=");
  assert.equal(defaultOp(de("row_count"), readTyped("<= 100")), "<=");
  /* `origin` no publica `like`, así que un texto se pregunta con `=`. */
  assert.equal(defaultOp(de("origin"), readTyped("synthetic")), "=");
});

/* ---------------------------------------------------------------- *
 *  Los tres pasos
 * ---------------------------------------------------------------- */

/* Paso 1 con un número: los campos de texto no aparecen, porque preguntarles
   «menor o igual que 100» da cero. */
test("con «<= 100» sólo se ofrecen los campos que pueden contestarlo", () => {
  const ofrecido = suggest({ text: "<= 100" }, CAMPOS);
  assert.deepEqual(
    ofrecido.map((one) => one.label),
    ["filas"],
  );
  const primera = ofrecido[0]!;
  assert.equal(primera.kind, "condition");
  if (primera.kind === "condition") {
    assert.equal(primera.op, "<=");
    assert.equal(primera.value, "100");
  }
});

/* Escribir el nombre de un campo ofrece SEGUIR por ese campo —el paso 2— y
   además preguntarlo como valor: las dos intenciones se escriben igual. */
test("escribir «nombr» ofrece el campo antes que la pregunta hecha", () => {
  const ofrecido = suggest({ text: "nombr" }, CAMPOS);
  assert.equal(ofrecido[0]?.kind, "field");
  assert.equal(ofrecido[0]?.label, "nombre");
  assert.ok(ofrecido.some((one) => one.kind === "condition"));
});

/* Paso 2: elegido el campo, se ofrecen SUS operadores y ninguno más. */
test("elegido el campo, se ofrecen sus operadores", () => {
  const ofrecido = suggest({ field: de("row_count"), text: "" }, CAMPOS);
  assert.deepEqual(
    ofrecido.map((one) => (one.kind === "op" ? one.op : "")),
    ["=", "!=", ">", ">=", "<", "<="],
  );
  assert.equal(
    ofrecido.every((one) => one.kind === "op"),
    true,
  );
});

/* Y el que la forma de lo tipeado pide va primero. */
test("el operador que lo escrito pide encabeza la lista", () => {
  const ofrecido = suggest({ field: de("row_count"), text: "<= 5" }, CAMPOS);
  assert.equal(ofrecido[0]?.kind === "op" && ofrecido[0].op, "<=");
});

/* Paso 3: con campo y operador, lo que falta es el valor — y un enum ofrece los
   suyos en vez de pedir que se adivinen. */
test("un enum ofrece sus valores", () => {
  /* Sin nada escrito, los tres. Con «s», sólo los que la tienen: los valores se
     filtran como se filtra cualquier lista, y lo tipeado sigue estando arriba
     porque un enum puede recibir algo que todavía no es ninguno. */
  assert.deepEqual(
    suggest({ field: de("origin"), op: "=", text: "" }, CAMPOS).map((one) => one.label),
    ["uploaded", "computed", "synthetic"],
  );
  assert.deepEqual(
    suggest({ field: de("origin"), op: "=", text: "s" }, CAMPOS).map((one) => one.label),
    ["s", "synthetic"],
  );
});

test("sin nada escrito se ofrecen los campos, que es lo único que se puede elegir", () => {
  const ofrecido = suggest({ text: "" }, CAMPOS);
  assert.equal(ofrecido.length, CAMPOS.length);
  assert.equal(
    ofrecido.every((one) => one.kind === "field"),
    true,
  );
});

test("una pregunta hecha se lee como una frase", () => {
  assert.equal(describeCondition(de("name"), "like", "test"), "nombre contiene test");
  assert.equal(
    describeCondition(de("row_count"), "<=", "100"),
    "filas menor o igual que 100",
  );
});

/* ---------------------------------------------------------------- *
 *  El numeral: elegir el ATRIBUTO sin que nadie adivine
 * ---------------------------------------------------------------- */

/* «nombre» puede ser el campo o el texto que se busca, y se escriben con las
   mismas letras. Con `#` no hay nada que adivinar. */
test("«#» dice que lo que sigue es el atributo, no un valor", () => {
  const typed = readTyped("#fil");
  assert.equal(typed.attribute, true);
  assert.equal(typed.value, "fil");

  const ofrecido = suggest({ text: "#fil" }, CAMPOS);
  assert.deepEqual(
    ofrecido.map((one) => `${one.kind}:${one.label}`),
    ["field:filas"],
  );
});

test("«#» solo ofrece todos los atributos", () => {
  const ofrecido = suggest({ text: "#" }, CAMPOS);
  const campos = ofrecido.filter((one) => one.kind === "field");
  assert.equal(campos.length, CAMPOS.length);
});

/* ---------------------------------------------------------------- *
 *  El operador escrito decide de qué clase es la pregunta
 * ---------------------------------------------------------------- */

/* Cualquier cosa se compara contra sí misma, así que `=` no discrimina por tipo:
   abre la lista entera en vez de adivinar de qué clase es un valor que todavía
   no se escribió. */
test("«=» ofrece todos los campos que lo publican", () => {
  const ofrecido = suggest({ text: "=" }, CAMPOS);
  assert.deepEqual(
    ofrecido.map((one) => one.label),
    ["nombre", "filas", "registrado", "procedencia", "proyecto"],
  );
});

test("«= 100» sigue ofreciendo los de texto: comparar un texto contra «100» es válido", () => {
  assert.equal(answers(de("name"), readTyped("= 100")), true);
  assert.equal(answers(de("row_count"), readTyped("= 100")), true);
});

/* «Mayor que» sobre un texto es una comparación alfabética que nadie pidió. */
test("los operadores de orden sólo van a lo que tiene orden", () => {
  assert.equal(answers(de("row_count"), readTyped("> 100")), true);
  assert.equal(answers(de("registered_at"), readTyped("> 2026-09")), true);
  assert.equal(answers(de("name"), readTyped("> ventas")), false);
  assert.equal(answers(de("origin"), readTyped("> a")), false);
});

test("«>» sin valor ya recorta a lo ordenable", () => {
  assert.deepEqual(
    suggest({ text: ">" }, CAMPOS).map((one) => one.label),
    ["filas", "registrado"],
  );
});

/* ---------------------------------------------------------------- *
 *  Un molde escrito en el valor cambia la comparación
 * ---------------------------------------------------------------- */

/* «igual a ventas_*» busca un nombre que TERMINE en asterisco: no existe, y
   nadie lo quiso pedir. */
test("un molde en el paso del valor convierte la igualdad en «contiene»", () => {
  const ofrecido = suggest({ field: de("name"), op: "=", text: "ventas_*" }, CAMPOS);
  const primera = ofrecido[0]!;
  assert.equal(primera.kind, "condition");
  if (primera.kind === "condition") {
    assert.equal(primera.op, "like");
    assert.equal(primera.value, "ventas_%");
  }
});

/* Pero sólo pisa la igualdad: quien eligió «mayor que» y escribió un `*` está
   escribiendo otra cosa, y adivinarle la comparación sería peor que dejarlo. */
test("un molde NO pisa un operador de orden", () => {
  const ofrecido = suggest({ field: de("row_count"), op: ">", text: "1*" }, CAMPOS);
  const primera = ofrecido[0]!;
  if (primera.kind === "condition") assert.equal(primera.op, ">");
});

/* Y tampoco si el campo no publica `like`: ofrecer una comparación que el modelo
   no acepta es armar una pregunta que el motor rechaza. */
test("un molde no inventa un «contiene» que el campo no acepta", () => {
  const ofrecido = suggest({ field: de("origin"), op: "=", text: "sint*" }, CAMPOS);
  const primera = ofrecido[0]!;
  if (primera.kind === "condition") assert.equal(primera.op, "=");
});

/* ---------------------------------------------------------------- *
 *  El numeral también ABRE GRUPOS
 * ---------------------------------------------------------------- */

/* `#and` no es un atributo que se llame «and»: es la orden de abrir un grupo.
   Gana sobre el campo porque nadie tipea el numeral para buscar la palabra. */
test("«#and», «#or» y «#not» abren un grupo", () => {
  assert.equal(readTyped("#and").opens, "all");
  assert.equal(readTyped("#or").opens, "any");
  assert.equal(readTyped("#not").opens, "not");
});

/* Se escriben como se piensan y también como se leen en la barra: son la misma
   cosa dicha de dos maneras, y obligar a una es obligar a aprenderla. */
test("se escriben en los dos idiomas", () => {
  assert.equal(readTyped("#todas").opens, "all");
  assert.equal(readTyped("#CUALQUIERA").opens, "any");
  assert.equal(readTyped("#ninguna").opens, "not");
});

test("un atributo cualquiera sigue siendo un atributo", () => {
  assert.equal(readTyped("#nombre").opens, undefined);
  assert.equal(readTyped("#nombre").attribute, true);
});

test("escrito el abridor, se ofrece ESO y nada más", () => {
  const ofrecido = suggest({ text: "#or" }, CAMPOS);
  assert.equal(ofrecido.length, 1);
  assert.equal(ofrecido[0]?.kind, "group");
});

/* Con el numeral a secas van los tres arriba: una notación que no se ve es una
   notación que nadie descubre. */
test("«#» a secas ofrece los tres abridores antes que los campos", () => {
  const ofrecido = suggest({ text: "#" }, CAMPOS);
  assert.deepEqual(
    ofrecido.slice(0, 3).map((one) => one.kind),
    ["group", "group", "group"],
  );
  assert.equal(ofrecido.length, CAMPOS.length + 3);
});

/* Pero al escribir el nombre de un campo desaparecen: `#fil` es «filas», no una
   lista de tres cosas que no se parecen a lo tipeado. */
test("al escribir un nombre, los abridores se van", () => {
  const ofrecido = suggest({ text: "#fil" }, CAMPOS);
  assert.deepEqual(
    ofrecido.map((one) => one.kind),
    ["field"],
  );
});

/* ---------------------------------------------------------------- *
 *  Los operadores que la barra puede TERMINAR
 * ---------------------------------------------------------------- */

/* La barra ofrecía los del modelo tal cual, y dos de ellos no se pueden
   contestar en una línea. */
test("el que compara contra dos valores no se ofrece en la barra", () => {
  const ops = suggest({ field: de("project_name"), text: "" }, CAMPOS).map((one) =>
    one.kind === "op" || one.kind === "condition" ? one.op : one.kind,
  );
  /* «Está entre» se pregunta en el constructor, que tiene los dos campos:
     elegirlo acá y escribir un número arma medio rango. */
  assert.ok(!ops.includes("between"));
  assert.ok(ops.includes("="));
  assert.ok(ops.includes("like"));
});

/* El que NO lleva valor es una pregunta ENTERA apenas se elige. Mandándolo al
   paso del valor, quien elegía «está vacío» quedaba tipeando algo que no
   significa nada, con la lista vacía abajo y Enter sin hacer nada. */
test("el que no lleva valor se elige y ya es la pregunta", () => {
  const vacio = suggest({ field: de("project_name"), text: "" }, CAMPOS).find(
    (one) => (one.kind === "op" || one.kind === "condition") && one.op === "is null",
  );
  assert.equal(vacio?.kind, "condition");
  assert.equal(vacio?.kind === "condition" ? vacio.value : "x", "");
});

/* Y se lee SIN valor: «proyecto está vacío», no «proyecto está vacío ». El
   rótulo es el del relacional porque por ahí entró la columna — ver arriba. */
test("la pregunta sin valor se lee sin valor", () => {
  assert.equal(describeCondition(de("project_name"), "is null", ""), "proyecto está vacío");
});

/* ---------------------------------------------------------------- *
 *  Los bordes de lo que se escribe
 * ---------------------------------------------------------------- */

/* Un molde no es sólo un prefijo o un sufijo: «ventas*.csv» es un nombre que
   empieza y termina en algo con cualquier cosa en el medio, y así es como la
   gente busca un archivo. */
test("un molde vale con el asterisco en cualquier lado", () => {
  assert.equal(readTyped("ventas*.csv").shape, "glob");
  assert.equal(valueFor("like", readTyped("ventas*.csv")), "ventas%.csv");
  assert.equal(valueFor("like", readTyped("*ventas*")), "%ventas%");
});

/* El operador se reconoce pegado al valor: nadie escribe un espacio después de
   «>=» si no hace falta, y pedir uno sería una regla que sólo conoce quien
   escribió el parser. */
test("el operador se lee aunque esté pegado al valor", () => {
  assert.deepEqual(readTyped(">=100"), { op: ">=", value: "100", shape: "number" });
  assert.deepEqual(readTyped(">= 100"), { op: ">=", value: "100", shape: "number" });
});

/* Entre comillas, lo escrito es TEXTO aunque parezca un número: es la salida
   para buscar el nombre «2026» sin que se lo tome por un año. */
test("lo entrecomillado es texto, aunque parezca otra cosa", () => {
  assert.deepEqual(readTyped('"100"'), { value: "100", shape: "text" });
  /* Y entonces no contesta una comparación de orden: «mayor que "100"» no es
     una pregunta sobre números. */
  assert.ok(!answers(de("row_count"), readTyped('> "100"')));
});

/* `#` a secas es «elegí el atributo» sin haber empezado a nombrarlo: se ofrecen
   TODOS los campos, más los tres abridores de grupo —que también se piden con el
   numeral, y esconderlos sería tener una notación que nadie descubre. */
test("el numeral solo ofrece los campos y los tres grupos", () => {
  const typed = readTyped("#");
  assert.equal(typed.attribute, true);
  assert.equal(typed.shape, "empty");

  const ofrecido = suggest({ text: "#" }, CAMPOS);
  assert.deepEqual(
    ofrecido.filter((one) => one.kind === "group").map((one) => one.id),
    ["g:all", "g:any", "g:not"],
  );
  assert.equal(
    ofrecido.filter((one) => one.kind === "field").length,
    CAMPOS.length,
    "con el numeral solo no se recorta ningún campo",
  );
});

/* Y apenas se empieza a nombrarlo, los grupos se van: quien escribió «#nom» está
   buscando un campo, no abriendo un grupo. */
test("apenas se nombra el atributo, los grupos se van", () => {
  const ofrecido = suggest({ text: "#nom" }, CAMPOS);
  assert.ok(!ofrecido.some((one) => one.kind === "group"));
  assert.ok(ofrecido.every((one) => one.kind === "field"));
});
