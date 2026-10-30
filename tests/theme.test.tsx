import assert from "node:assert/strict";
import { test } from "node:test";

import { installCopy } from "@sincpro/web-ui/foundations/copy";
import { SPANISH_COPY } from "@sincpro/web-ui/foundations/copy.es";
import {
  applyTheme,
  isTheme,
  resolveTheme,
  THEME_ATTRIBUTE,
  ThemeProvider,
  THEMES,
  useTheme,
} from "@sincpro/web-ui/foundations/theme";
import { ThemeSwitcher } from "@sincpro/web-ui/primitives/choice/ThemeSwitcher";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: the palettes are CSS, so what can break in TypeScript is small and specific: the
 * choice → palette mapping, what gets written on the element (and that `system` writes
 * NOTHING, because a stylesheet reads no such value), and that the control offers all three
 * ways — "system" being the only road back from a forced choice.
 */

/** The only surface of an element `applyTheme` touches. */
function fakeElement() {
  const attributes = new Map<string, string>();
  return {
    attributes,
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    removeAttribute: (name: string) => void attributes.delete(name),
  } as unknown as Element & { attributes: Map<string, string> };
}

test("`system` sigue al sistema operativo; claro y oscuro son lo que dicen", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("`applyTheme` escribe data-theme, y `system` lo QUITA en vez de escribir «system»", () => {
  const el = fakeElement();
  applyTheme("dark", el);
  assert.equal(el.attributes.get(THEME_ATTRIBUTE), "dark");
  applyTheme("light", el);
  assert.equal(el.attributes.get(THEME_ATTRIBUTE), "light");
  applyTheme("system", el);
  assert.equal(el.attributes.has(THEME_ATTRIBUTE), false);
});

test("`isTheme` es el camino de vuelta desde un string (storage, URL)", () => {
  for (const value of THEMES) assert.equal(isTheme(value), true);
  for (const value of ["", "Dark", "auto", null, undefined, 1]) {
    assert.equal(isTheme(value), false);
  }
});

test("el provider entrega la elección y su paleta resuelta (en el servidor: claro)", () => {
  function Probe() {
    const { theme, resolved } = useTheme();
    return <p data-theme-probe={`${theme}/${resolved}`} />;
  }
  const forced = renderToStaticMarkup(
    <ThemeProvider value="dark">
      <Probe />
    </ThemeProvider>,
  );
  assert.match(forced, /dark\/dark/);
  const system = renderToStaticMarkup(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  /* No `window` on the server, so the system preference is "not dark". */
  assert.match(system, /system\/light/);
});

test("el selector ofrece los tres modos, con el elegido marcado, en el idioma de la copia", () => {
  installCopy(SPANISH_COPY);
  try {
    const html = renderToStaticMarkup(
      <ThemeProvider value="dark">
        <ThemeSwitcher />
      </ThemeProvider>,
    );
    for (const word of ["Sistema", "Claro", "Oscuro"]) assert.match(html, new RegExp(word));
    assert.match(html, /aria-label="Tema"/);
    /* Exactly one segment is checked, and it is the dark one. */
    assert.equal(html.match(/aria-checked="true"/g)?.length, 1);
    assert.match(html, /aria-checked="true"(?:(?!<\/button>)[\s\S])*Oscuro/);
  } finally {
    installCopy();
  }
});
