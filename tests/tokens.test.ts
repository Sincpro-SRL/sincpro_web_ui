import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { test } from "vitest";

import { parseHex, ratio, ratioLabel, type RGB, verdict } from "../stories/support/contrast";

/**
 * Context: every color token carries its contrast written next to it. This test
 * exists so that number cannot lie: changing a hue and forgetting the comment
 * leaves a documented decision that is no longer true, and that is worse than
 * not documenting it at all.
 */

const FULL_CSS = readFileSync(join(import.meta.dirname, "..", "src", "tokens.css"), "utf8");

/* Two themes live in the same file. Every measurement below is made against ITS OWN theme's
   ground, surface and chrome, so the CSS is split first: the light `@theme` is everything above
   the DARK THEME banner, and the dark palette is the `[data-theme="dark"]` block. A light token
   measured against the dark ground (or the reverse) would pass or fail for the wrong reason. */
const DARK_BANNER = FULL_CSS.indexOf("*  DARK THEME");
assert.ok(DARK_BANNER > 0, "tokens.css has no DARK THEME section");
const LIGHT_CSS = FULL_CSS.slice(0, DARK_BANNER);
const DARK_ATTRIBUTE = /\n\[data-theme="dark"\] \{([^}]*)\}/.exec(FULL_CSS)?.[1];
const DARK_MEDIA = /:root:not\(\[data-theme="light"\]\) \{([^}]*)\}/.exec(FULL_CSS)?.[1];
assert.ok(DARK_ATTRIBUTE, 'no [data-theme="dark"] block');
assert.ok(DARK_MEDIA, "no prefers-color-scheme: dark block");

/**
 * `--color-x: #aabbcc; /* 7,48:1 · blanco encima 7,87:1 *\/`
 *
 * Context: the comment has to be on the SAME line. With `\s*` the pattern
 * crossed the newline and attributed to one token the contrast of the next
 * block — which is exactly the kind of lie this test exists to catch.
 */
const DECLARATION = /--color-([a-z-]+):[^\S\n]*(#[0-9a-fA-F]{3,8});[^\S\n]*\/\*([^*]*)\*\//g;
/* The ratio is written with a DOT now that the comments are in English:
   `7.48:1`. It used to be `7,48:1` and the pattern read a comma — the day the
   comments were translated this test stopped finding anything and passed on an
   empty list, which is the failure mode a contract test must not have. Hence
   the length assertion below. */
const MEASURE = /(\d+\.\d+):1/g;

const WHITE: RGB = [255, 255, 255];

type Theme = { name: "light" | "dark"; css: string };
const THEMES: readonly Theme[] = [
  { name: "light", css: LIGHT_CSS },
  { name: "dark", css: DARK_ATTRIBUTE },
];

function colorIn(css: string, name: string): RGB {
  const found = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(css);
  assert.ok(found?.[1], `falta --color-${name}`);
  const rgb = parseHex(found[1]);
  assert.ok(rgb, `--color-${name} no es un hex legible`);
  return rgb;
}

/** The palette of one theme, with the surfaces its tokens are measured against. */
function paletteOf({ css }: Theme) {
  const colorOf = (name: string) => colorIn(css, name);
  const canvas = colorOf("ground");
  const chrome = colorOf("chrome");
  return {
    colorOf,
    canvas,
    chrome,
    surface: colorOf("surface"),
    /** The background a token is measured against comes from its name: the
     *  `chrome-*` ones live on the chrome and all the rest on the canvas. */
    backgroundOf: (name: string) => (name.startsWith("chrome") ? chrome : canvas),
  };
}

/**
 * Context: what it was measured against is stated by the comment itself, and it
 * has to be read: `--color-accent-hover` notes 5,71:1 and that is NOT against
 * the background but against `ink` on top. Always assuming the background gave
 * a failure where the token was right and the test was wrong.
 */
function againstIn(theme: Theme, name: string, fragment: string): RGB {
  const p = paletteOf(theme);
  if (fragment.includes("white on top")) return WHITE;
  if (fragment.includes("surface on top")) return p.surface;
  if (fragment.includes("on-accent on top")) return p.colorOf("on-accent");
  if (fragment.includes("on the gold")) return p.colorOf("accent");
  if (fragment.includes("ink on top")) return p.colorOf("ink");
  return p.backgroundOf(name);
}

type Measure = { name: string; rgb: RGB; annotated: number; against: RGB; note: string };

function measures(theme: Theme): Measure[] {
  const output: Measure[] = [];

  for (const [, name, hex, note] of theme.css.matchAll(DECLARATION)) {
    const rgb = name === undefined || hex === undefined ? null : parseHex(hex);
    if (name === undefined || rgb === null || note === undefined) continue;

    // Each fragment separated by `·` brings its own number and its own against-what.
    for (const fragment of note.split("·")) {
      const found = MEASURE.exec(fragment);
      MEASURE.lastIndex = 0;
      if (found?.[1] === undefined) continue;

      output.push({
        name,
        rgb,
        annotated: Number(found[1]),
        against: againstIn(theme, name, fragment),
        note: note.trim(),
      });
    }
  }

  return output;
}

for (const theme of THEMES) {
  const { colorOf, canvas, chrome, surface, backgroundOf } = paletteOf(theme);
  const t = (what: string) => `[${theme.name}] ${what}`;

  test(t("hay tokens de color con su contraste anotado en las dos superficies"), () => {
    const annotated = measures(theme);
    assert.ok(annotated.length >= 20, `sólo ${annotated.length} contrastes anotados`);
    assert.ok(
      annotated.some((m) => m.name.startsWith("chrome")),
      "ninguno del cromo",
    );
  });

  test(t("el contraste anotado al lado de cada token es el real"), () => {
    for (const { name, rgb, annotated, against: reference, note } of measures(theme)) {
      const real = ratio(rgb, reference);
      assert.ok(
        Math.abs(real - annotated) < 0.02,
        `--color-${name} dice ${annotated.toFixed(2)}:1 y mide ${ratioLabel(real)}  (${note})`,
      );
    }
  });

  test(t("todo lo que el sistema llama texto se lee sobre su superficie"), () => {
    const text: readonly [string, string][] = [
      ["ink", "el texto"],
      ["muted", "el texto tenue"],
      ["primary", "la acción"],
      ["danger", "lo destructivo"],
      ["info", "lo informativo"],
      ["good", "lo que salió bien"],
      ["warn", "lo que avisa"],
      ["bad", "lo que falló"],
      ["chrome-ink", "el texto del cromo"],
      ["chrome-muted", "el tenue del cromo"],
      ["chrome-link", "el enlace del cromo"],
      ["chrome-good", "lo bueno sobre el cromo"],
      ["chrome-warn", "el aviso sobre el cromo"],
      ["chrome-bad", "lo malo sobre el cromo"],
    ];

    for (const [name, what] of text) {
      const value = ratio(colorOf(name), backgroundOf(name));
      assert.ok(
        value >= 4.5,
        `${what} (--color-${name}) da ${ratioLabel(value)} y no pasa AA`,
      );
      /* The raised surface is where most text actually sits (a card, a dialog, a menu). */
      if (!name.startsWith("chrome")) {
        const onSurface = ratio(colorOf(name), surface);
        assert.ok(
          onSurface >= 4.5,
          `${what} (--color-${name}) da ${ratioLabel(onSurface)} sobre la superficie elevada`,
        );
      }
    }
  });

  test(t("lo gráfico (datos, segundo trazo) pasa el 3:1 sobre las dos superficies"), () => {
    for (const name of ["data", "data-soft"]) {
      for (const [where, ground] of [
        ["el lienzo", canvas],
        ["la superficie", surface],
      ] as const) {
        const value = ratio(colorOf(name), ground);
        assert.ok(value >= 3, `--color-${name} sobre ${where} da ${ratioLabel(value)}`);
      }
    }
  });

  test(t("el texto sobre un relleno de acción se lee: dorado, azul de acción y rojo"), () => {
    assert.ok(ratio(colorOf("on-accent"), colorOf("accent")) >= 4.5, "sobre el dorado");
    assert.ok(ratio(colorOf("on-accent"), colorOf("accent-hover")) >= 4.5, "sobre su hover");
    const onSurfaceOrWhite = theme.name === "light" ? WHITE : surface;
    for (const name of ["primary", "primary-hover", "danger", "danger-hover"]) {
      const value = ratio(onSurfaceOrWhite, colorOf(name));
      assert.ok(value >= 4.5, `el texto sobre --color-${name} da ${ratioLabel(value)}`);
    }
  });

  test(t("las líneas separan sin gritar, y eso NO es un defecto"), () => {
    for (const name of ["line", "line-strong"]) {
      const value = ratio(colorOf(name), canvas);
      assert.ok(
        value < 3,
        `--color-${name} a ${ratioLabel(value)} ya es un borde que significa`,
      );
      assert.ok(value >= 1.2, `--color-${name} a ${ratioLabel(value)} ya no se ve`);
      assert.equal(
        verdict(value, "decorative"),
        "no aplica",
        "por eso se mide como decorativo",
      );
    }
  });

  test(t("cada hover se aleja del fondo, nunca se acerca"), () => {
    for (const base of ["primary", "danger"]) {
      const still = ratio(colorOf(base), canvas);
      const hovered = ratio(colorOf(`${base}-hover`), canvas);
      assert.ok(hovered > still, `--color-${base}-hover pierde contraste al pasar el mouse`);
    }
  });

  test(t("la superficie elevada se separa del lienzo, y el cromo de los dos"), () => {
    assert.notEqual(colorOf("surface").join(), canvas.join(), "la superficie es el lienzo");
    assert.notEqual(chrome.join(), canvas.join(), "el cromo es el lienzo");
    if (theme.name === "dark") {
      /* Both are near black: the luminance gap is tiny, so the bar carries a hairline. */
      const edge = ratio(colorOf("chrome-edge"), chrome);
      assert.ok(edge >= 1.3, `la línea del cromo da ${ratioLabel(edge)} y no se ve`);
    }
  });
}

test("el dorado es la regla que originó el sistema: fondo en el lienzo, texto en el cromo", () => {
  const { colorOf, canvas, chrome } = paletteOf(THEMES[0]!);
  const gold = colorOf("accent");
  assert.ok(ratio(gold, canvas) < 3, "sobre el lienzo no alcanza ni para un ícono");
  assert.equal(verdict(ratio(gold, canvas)), "no pasa");

  const ink = colorOf("ink");
  assert.ok(ratio(gold, ink) >= 4.5, "pero con `ink` encima es una acción principal legible");

  const goldChrome = colorOf("chrome-accent");
  assert.equal(
    verdict(ratio(goldChrome, chrome)),
    "AA",
    "y sobre el cromo sí puede ser texto",
  );
});

test("en el oscuro el dorado sigue siendo la acción principal, no el color del texto", () => {
  const { colorOf, canvas } = paletteOf(THEMES[1]!);
  /* It CAN be read on dark — but `primary` is the text/link colour and gold stays a fill. */
  assert.ok(ratio(colorOf("accent"), canvas) >= 4.5);
  assert.equal(
    colorOf("accent").join(),
    paletteOf(THEMES[0]!).colorOf("accent").join(),
    "la marca no cambia de dorado entre temas",
  );
});

/* ------------------------------------------------------------------ *
 *  THE TWO THEMES STAY IN STEP
 * ------------------------------------------------------------------ */

/** Tokens that are the same in both themes and so are NOT redefined in the dark block. Empty on
 *  purpose: even the ones that keep their hex (the gold) are restated, so that the dark block
 *  is a complete palette that can be read — and measured — by itself. Add a name here, with a
 *  reason, only to leave a token out of it. */
const THEME_INDEPENDENT: ReadonlySet<string> = new Set<string>();

const names = (css: string, pattern: RegExp) => [...css.matchAll(pattern)].map((m) => m[1]!);

test("todo token de color o sombra del claro se redefine en el oscuro", () => {
  const theme = /@theme \{([\s\S]*?)\n\}\n/.exec(LIGHT_CSS)?.[1];
  assert.ok(theme, "no se encontró el @theme");

  for (const [pattern, atLeast] of [
    [/--(color-[a-z-]+):/g, 10],
    [/--(shadow-[a-z-]+):/g, 3],
  ] as const) {
    const light = names(theme, pattern);
    assert.ok(light.length >= atLeast, `sólo ${light.length} tokens en el claro`);
    const dark: ReadonlySet<string> = new Set<string>(names(DARK_ATTRIBUTE, pattern));
    for (const token of light) {
      if (THEME_INDEPENDENT.has(token)) continue;
      assert.ok(dark.has(token), `--${token} está en el claro y no en el oscuro`);
    }
    /* …and the reverse: a dark token with no light twin is a typo, not a decision. */
    const lightSet = new Set(light);
    for (const token of dark) {
      assert.ok(lightSet.has(token), `--${token} está en el oscuro y no en el claro`);
    }
  }
});

test("la paleta oscura del media query es idéntica a la del atributo", () => {
  /* The formatter may wrap a long value onto two lines; only the words are compared. */
  const flat = (block: string) => block.replace(/\s+/g, " ").trim();
  assert.equal(
    flat(DARK_MEDIA),
    flat(DARK_ATTRIBUTE),
    "las dos copias del oscuro se desincronizaron",
  );
});

test("el claro forzado en un subárbol repite exactamente el @theme", () => {
  const forced = /\n\[data-theme="light"\] \{([^}]*)\}/.exec(FULL_CSS)?.[1];
  assert.ok(forced, 'no hay un bloque [data-theme="light"]');
  const theme = /@theme \{([\s\S]*?)\n\}\n/.exec(LIGHT_CSS)?.[1];
  assert.ok(theme);
  /* name → value, comments dropped and whitespace squeezed: only the decision is compared. */
  const decisions = (css: string) =>
    new Map(
      [
        ...css
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .matchAll(/--((?:color|shadow)-[a-z-]+):\s*([^;]+);/g),
      ].map((m) => [m[1]!, m[2]!.replace(/\s+/g, " ").trim()] as const),
    );
  assert.deepEqual(decisions(forced), decisions(theme));
});

test("fuera de tokens.css no hay un solo color escrito a mano", () => {
  /* The theme has to be able to change every colour; a hex in a component would not follow. */
  const root = join(import.meta.dirname, "..", "src");
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(tsx?|css)$/.test(entry.name) && entry.name !== "tokens.css") {
        /* A comment may quote a hex while explaining a decision; only code counts. */
        const text = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
        if (/#[0-9a-fA-F]{6}\b|rgba?\(/.test(text)) offenders.push(path.slice(root.length));
      }
    }
  };
  walk(root);
  assert.deepEqual(offenders, [], "colores escritos a mano fuera de tokens.css");
});
