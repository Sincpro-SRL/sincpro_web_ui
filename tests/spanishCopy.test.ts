import assert from "node:assert/strict";
import { test } from "node:test";

import { ENGLISH_COPY, mergeCopy } from "@sincpro/web-ui/foundations/copy";
import { SPANISH_COPY } from "@sincpro/web-ui/foundations/copy.es";

/**
 * EL CASTELLANO DEL SISTEMA, entero.
 *
 * Lo instalan la vitrina y la aplicación, así que si se queda corto la pantalla
 * muestra «Enviar mensaje» —lo que escribió el producto— al lado de «Log a
 * note» —la palabra del componente—, y nadie lo nota hasta que alguien lo mira
 * de cerca.
 *
 * Por eso esto no prueba una palabra: prueba que no falte ninguna.
 */

/** Las hojas de un objeto, por su ruta: `search.joins.all`. */
function leaves(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, one]) =>
    leaves(one, prefix === "" ? key : `${prefix}.${key}`),
  );
}

/** Lo mismo, con el valor al lado. */
function entries(value: unknown, prefix = ""): [string, unknown][] {
  if (typeof value !== "object" || value === null) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, one]) =>
    entries(one, prefix === "" ? key : `${prefix}.${key}`),
  );
}

/** Los huecos que una frase deja para que los llene quien la usa. */
function holes(text: unknown): string {
  return [...String(text).matchAll(/\{(\w+)\}/g)]
    .map((one) => one[1])
    .sort()
    .join(",");
}

test("el castellano nombra TODO lo que el sistema sabe decir", () => {
  const delSistema = new Set(leaves(mergeCopy()));
  const enCastellano = new Set(leaves(SPANISH_COPY));
  const faltan = [...delSistema].filter((one) => !enCastellano.has(one));
  assert.deepEqual(faltan, [], `sin traducir: ${faltan.join(", ")}`);
});

/* Y no inventa: una clave que el sistema no conoce es una palabra escrita para
   nadie, y además tapa que la de verdad falta. */
test("el castellano no inventa claves", () => {
  const delSistema = new Set(leaves(mergeCopy()));
  const sobran = leaves(SPANISH_COPY).filter((one) => !delSistema.has(one));
  assert.deepEqual(sobran, [], `no existen en el sistema: ${sobran.join(", ")}`);
});

/* Y llega de verdad a lo que se dibuja. */
test("lo que dice es lo que el sistema usa", () => {
  const puesta = mergeCopy(SPANISH_COPY);
  assert.equal(puesta.ops["like"], "contiene");
  assert.equal(puesta.builder.apply, "Aplicar");
});

/* ---------------------------------------------------------------- *
 *  Los huecos son parte de la frase
 * ---------------------------------------------------------------- */

/**
 * Una traducción tiene que dejar los MISMOS huecos que el original.
 *
 * Sacar uno pierde el dato —«cuántas por página» se come el número— y agregar
 * uno lo imprime literal: el componente que dibuja la selección ya escribe el
 * número al lado, así que un «{count} elegidos» se lee «12 {count} elegidos».
 * Las dos cosas pasaron, y ninguna la agarraba el typecheck: son cadenas.
 */
test("el castellano deja los mismos huecos que el inglés", () => {
  const en = Object.fromEntries(entries(ENGLISH_COPY));
  const distintas = entries(SPANISH_COPY)
    .filter(([key, value]) => en[key] !== undefined && holes(en[key]) !== holes(value))
    .map(([key]) => key);
  assert.deepEqual(distintas, [], `huecos distintos: ${distintas.join(", ")}`);
});
