import "@sincpro/web-ui/tokens.css";

import { installCopy } from "@sincpro/web-ui/foundations/copy";
import { SPANISH_COPY } from "@sincpro/web-ui/foundations/copy.es";
import { isTheme, ThemeProvider } from "@sincpro/web-ui/foundations/theme";
import type { Preview } from "@storybook/react-vite";
import { createElement } from "react";
import { MINIMAL_VIEWPORTS } from "storybook/viewport";

/* Las historias se leen en castellano, como el resto de la documentación. El
   castellano es el del SISTEMA —`copy.es.ts`—, el mismo que instala la
   aplicación: dos tablas con las mismas palabras derivan, y la que deriva
   muestra inglés en medio de una pantalla en castellano.

   Se instala acá y no con un decorator porque la copia instalada la lee todo el
   mundo —los componentes y también lo que no es un componente, como el que arma
   la frase de una condición o el que nombra un mes—. Un decorator sólo
   envolvería lo que se dibuja. */
installCopy(SPANISH_COPY);

/* The theme is a toolbar global, and the decorator is the SYSTEM'S OWN `ThemeProvider`:
   switching it in Storybook exercises exactly what an app does, down to the `data-theme`
   attribute on <html> that portals (menus, dialogs) live under. A story can also be opened
   in dark from the URL: `iframe.html?id=…&globals=theme:dark`. */

/* Two backgrounds and no more, because the interface has TWO surfaces and a
 * piece is judged on its own: the gold on the canvas gives 2,43:1 and on the
 * chrome 7,39:1. A white background by default would make half the library
 * look good in a place where it is never going to live. */
const preview: Preview = {
  parameters: {
    layout: "padded",
    backgrounds: {
      options: {
        /* Tokens and not hex: a fixed colour here would stay light behind a dark story. */
        canvas: { name: "Lienzo · el espacio de trabajo", value: "var(--color-ground)" },
        surface: { name: "Superficie elevada", value: "var(--color-surface)" },
        chrome: { name: "Cromo · header, riel, pestañas", value: "var(--color-chrome)" },
      },
    },
    /* A phone of the size most people hold (390 × 844), first in the list: the mobile
       stories pin it with `globals: { viewport: { value: "telefono" } }`. A narrow WRAPPER
       is not the same test — the dialog and the peek turn into bottom sheets by the
       WINDOW's width, and only a narrow frame makes the window narrow. */
    viewport: {
      options: {
        telefono: {
          name: "Teléfono · 390 × 844",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
        ...MINIMAL_VIEWPORTS,
      },
    },
    a11y: { test: "error" },
    controls: { expanded: true },
  },
  globalTypes: {
    theme: {
      description: "Tema de color",
      toolbar: {
        title: "Tema",
        icon: "circlehollow",
        dynamicTitle: true,
        items: [
          { value: "light", title: "Claro" },
          { value: "dark", title: "Oscuro" },
          { value: "system", title: "Sistema" },
        ],
      },
    },
  },
  initialGlobals: { backgrounds: { value: "canvas" }, theme: "light" },
  decorators: [
    (Story, context) => {
      const chosen: unknown = context.globals["theme"];
      return createElement(
        ThemeProvider,
        { value: isTheme(chosen) ? chosen : "light" },
        createElement(Story),
      );
    },
  ],
};

export default preview;
