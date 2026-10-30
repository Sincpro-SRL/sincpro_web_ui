import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const src = fileURLToPath(new URL("./src", import.meta.url));

/**
 * Context: the design system is not built as an application — `make build` compiles `src/`
 * with tsc and whoever consumes the package bundles it. This is only for Storybook.
 *
 * The alias exists because the package imports itself (`@sincpro/web-ui/...`): without it
 * Vite would resolve that name through `exports` to `dist/`, which Storybook must never need.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^@sincpro\/web-ui$/,
        replacement: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      },
      { find: /^@sincpro\/web-ui\//, replacement: `${src}/` },
    ],
  },
});
