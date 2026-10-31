import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

/**
 * Context: ONE runner for everything, the same as the composer and web-framework:
 *
 *   model            the logic and the static markup, in Node — `tests/`
 *   storybook        every story rendered in a real Chrome: its `play`, its a11y check, and the
 *                    screen rules of `.storybook/preview.ts` (drew something, one primary).
 *                    The story IS the test; Storybook's «Run tests» runs these same ones.
 *   storybook-dark   the screens a person works on (`screen`) and the theme page, again in
 *                    dark: a token that does not flip shows up as an error or an a11y failure.
 *
 * `channel: "chrome"` uses the Chrome already installed (and on the CI runner) instead of
 * downloading one per project.
 */
/* One per project: vitest names the instance after its project, so they cannot be shared. */
const browser = (name: string) => ({
  enabled: true,
  headless: true,
  /* A desk, as the old smoke had: at the default (narrow) size every wide list folds into rows,
     and a 40 000-row sheet drawn as 40 000 real rows took the page down. Phones are their own
     stories, pinned with the `telefono` viewport. */
  viewport: { width: 1280, height: 900 },
  provider: playwright({ launchOptions: { channel: "chrome" } }),
  instances: [{ browser: "chromium" as const, name }],
});

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      /* Half the cores: several repos test on the same machine, each with its own Chrome. */
      maxWorkers: "50%",
      projects: [
        {
          extends: true,
          test: { name: "model", environment: "node", include: ["tests/**/*.test.{ts,tsx}"] },
        },
        {
          extends: true,
          plugins: [storybookTest({ configDir: ".storybook" })],
          test: {
            name: "storybook",
            browser: browser("storybook"),
            setupFiles: [".storybook/vitest.setup.ts"],
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: ".storybook",
              tags: { include: ["screen", "theme"] },
            }),
          ],
          define: { "import.meta.env.STORYBOOK_THEME": JSON.stringify("dark") },
          test: {
            name: "storybook-dark",
            browser: browser("storybook-dark"),
            setupFiles: [".storybook/vitest.setup.ts"],
          },
        },
      ],
    },
  }),
);
