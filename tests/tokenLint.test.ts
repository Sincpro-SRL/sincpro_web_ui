import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/**
 * Context: un sistema de diseño no se rompe de golpe, se rompe por un `h-[26px]` apurado un
 * martes. Cuatro reglas: nada de valores arbitrarios, nada de hex a mano, nada de px crudos y
 * nada de la paleta cruda de Tailwind. Cada excepción se escribe en PERMITIDO con su motivo.
 *
 * Vive como prueba y no como script aparte: corre con `make test`, en local y en CI, sin un
 * paso más que alguien se pueda olvidar.
 */

const SRC = join(import.meta.dirname, "..", "src");

/** TODO lo que hay bajo `src/`, a cualquier profundidad: lo que se publica es esto y nada más.
 *
 *  **Baja recursivamente, y eso NO es un detalle.** Caminaba un solo nivel, que alcanzaba
 *  cuando `src/` era una carpeta por familia. El día que las familias se agruparon en
 *  `primitives/` y `contexts/`, el recorrido encontró sólo directorios en el primer nivel y
 *  dejó de mirar 50 archivos — sin fallar, sin avisar, en verde. Un guardia que se angosta en
 *  silencio es peor que no tener ninguno, porque sigue contestando que la regla se cumple.
 *
 *  Las historias no están acá —viven en `stories/`— y por eso esto no necesita excepciones:
 *  una página que compara radios necesita dibujar cajas de 210 px, y no comparte carpeta con
 *  el código. */
function archivosDe(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const ruta = join(dir, entry.name);
    if (entry.isDirectory()) return archivosDe(ruta);
    const suelto = entry.name;
    const mirable =
      (suelto.endsWith(".tsx") || suelto.endsWith(".ts")) &&
      !suelto.endsWith(".stories.tsx") &&
      suelto !== "index.ts";
    return mirable ? [ruta] : [];
  });
}

/** Lo que sí puede ir entre corchetes, y por qué. */
const PERMITIDO: readonly { patron: RegExp; motivo: string }[] = [
  {
    patron:
      /-\[(?:GrayText|Highlight|HighlightText|ButtonText|ButtonBorder|ButtonFace|Canvas|CanvasText|Mark|MarkText|Field|FieldText|LinkText)\]$/,
    motivo:
      "los colores del SISTEMA en modo de alto contraste (`forced-colors:`): no son una decisión de diseño sino la paleta que eligió quien no ve bien el contraste. Sacarlos rompe la accesibilidad de los componentes de React Aria",
  },
  {
    patron: /^(?:group-|peer-)?(?:data|aria|supports|has|not)-\[/,
    motivo:
      "un SELECTOR, no un valor: `data-[indicator=ancestor]:` elige a qué elemento aplicar las clases que siguen, que sí salen de tokens",
  },
  {
    patron: /-\[inherit\]$/,
    motivo: "heredar no es una medida: el popover toma el alto que React Aria le calculó",
  },
  {
    patron: /brightness-\[1\.04\]/,
    motivo:
      "el hover del CTA es un filtro sobre un degradado, no un color: no hay token que pueda expresarlo",
  },
  {
    patron: /transition-\[[a-z,-]+\]/,
    motivo:
      "enumera QUÉ propiedades animar, no un valor de diseño. `transition-all` animaría también el layout y produce saltos al cambiar de estado",
  },
  {
    patron: /tracking-\[0\.1[0-9]*em\]/,
    motivo:
      "el tracking de la voz de marca en versalitas; va con su tamaño, no es una escala propia",
  },
  {
    patron: /^0px$/,
    motivo:
      "el cero no es una medida: es el mismo en toda escala, así que no hay token del que pudiera salir. Lo usa el origen de la pila de cosas pegadas — el borde de una caja con scroll no está a una distancia, está a ninguna",
  },
];

const REGLAS: readonly { id: string; patron: RegExp; mensaje: string; ayuda: string }[] = [
  {
    id: "valor-arbitrario",
    // Un corchete de Tailwind: `h-[26px]`, `text-[0.72rem]`, `w-[196px]`.
    patron: /\b[a-z-]+-\[[^\]]+\]/g,
    mensaje: "valor arbitrario — tiene que salir de un token",
    ayuda:
      "usá la escala: h-(--size-control-sm), size-(--size-icon-md), rounded-box, text-meta…",
  },
  {
    id: "hex",
    patron: /#[0-9a-fA-F]{3,8}\b/g,
    mensaje: "color escrito a mano",
    ayuda:
      "todo color sale de `--color-*`; si falta uno, se agrega al token y se mide su contraste",
  },
  {
    id: "paleta-cruda",
    /* `text-red-500`, `bg-gray-200`: un color de la paleta de Tailwind donde el sistema tiene
       el suyo. No lo agarraba ninguna de las otras tres —no es un corchete, ni un hex, ni un
       px— y por eso se coló uno en el editor de JSON: pintaba su error de rojo mientras todo
       lo demás usaba `danger`.

       Y no es cosmético: el token cambia con el tema y con la superficie, y el de la paleta
       no. Un error rojo sobre el chrome oscuro es el mismo rojo que sobre el fondo claro, y en
       uno de los dos no se lee. */
    patron:
      /\b(?:text|bg|border|ring|fill|stroke|from|via|to|decoration|outline|divide|accent|caret|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g,
    mensaje: "color de la paleta de Tailwind — tiene que salir de un token",
    ayuda:
      "usá el semántico: text-danger, bg-warn/12, border-line-strong, text-primary… cambian con el tema y con la superficie",
  },
  {
    id: "px-crudo",
    // Un px dentro de un `style` o de una clase, fuera de un token.
    patron: /(?<!--[a-z-]{0,40}:\s?)\b\d+px\b/g,
    mensaje: "medida en px escrita a mano",
    ayuda: "usá la escala de espacio, de control o de ícono",
  },
];

/** Los comentarios explican las reglas y por eso las nombran: si el lint mirara adentro de
 *  ellos, cada archivo bien documentado fallaría por documentarse. */
function sinComentarios(linea: string): string {
  return linea
    .replace(/\/\*.*?\*\//g, "")
    .replace(/^\s*\*.*$/, "")
    .replace(/\/\/.*$/, "");
}

const archivos = archivosDe(SRC);

/* El guardia del guardia: si el recorrido deja de encontrar archivos, falla acá y no en
   silencio. El número es un piso holgado, no un inventario — no hay que actualizarlo al
   agregar o quitar un componente. */
test("el recorrido mira src/ entero", () => {
  assert.ok(
    archivos.length >= 40,
    `el recorrido encontró sólo ${archivos.length} archivos en src/. Eso no es que el DS haya encogido: es que dejó de mirar donde tiene que mirar.`,
  );
});

test("src/ no tiene valores fuera del sistema", () => {
  const hallazgos: string[] = [];

  for (const archivo of archivos) {
    const lineas = readFileSync(archivo, "utf8").split("\n");
    let enBloque = false;

    lineas.forEach((cruda, i) => {
      // Un bloque `/* … */` de varias líneas: se entra y se sale, y adentro no se mira nada.
      if (/\/\*/.test(cruda) && !/\*\//.test(cruda)) enBloque = true;
      const dentro = enBloque;
      if (/\*\//.test(cruda)) enBloque = false;
      if (dentro) return;

      const linea = sinComentarios(cruda);
      if (linea.trim() === "") return;

      for (const regla of REGLAS) {
        for (const m of linea.matchAll(regla.patron)) {
          const texto = m[0];
          if (PERMITIDO.some((p) => p.patron.test(texto))) continue;
          hallazgos.push(
            `${archivo}:${i + 1}\n    ${texto}  →  ${regla.mensaje}\n    ${regla.ayuda}`,
          );
        }
      }
    });
  }

  assert.deepEqual(
    hallazgos,
    [],
    `${hallazgos.length} valor(es) fuera del sistema. Cada excepción real se agrega a PERMITIDO en tests/tokenLint.test.ts, con su motivo.`,
  );
});
