import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import react from "@vitejs/plugin-react";
import { build, type Plugin } from "vite";
import { test } from "vitest";

import viteConfig from "../vite.config";

/**
 * Context: an application ships what it USES of this package, not the package. Four things
 * make that true, and one careless import undoes any of them:
 *
 *   - `tsc` keeps one file per module, ESM, and `sideEffects` says only the CSS has effects:
 *     the application's bundler drops every module it does not reach.
 *   - The heavy libraries (calendar, Gantt, editors, charts, PDF) are reached through
 *     `lazy(import())` — their own chunk, fetched when drawn (`heavyChunks.test.ts`).
 *   - A library's stylesheet is imported by the component that draws it, so it travels in
 *     that chunk; `tokens.css` carries only what every screen uses. The SVAR Gantt's CSS alone
 *     is ~160 KB: in `tokens.css` it reached an app that only had a `Button`.
 *   - The views are what they cost: a budget per entry, so growing one is a decision.
 *
 * So this builds four applications the way a consumer's Vite does — from the public entry,
 * React left out — and reads what each loads FIRST (its chunk and what it imports
 * statically). Measured 2026-11-18: Button 2.5, Field + TextInput 74, Record 130, List 283 KB
 * gzip; the budgets leave room to work, not to double. A budget that fails is a question —
 * «does every screen need this?» —; raise it only with the answer.
 */

const SRC = join(import.meta.dirname, "..", "src");

/** What each application imports, and the most its first load may weigh (KB, gzip). */
const APPS = {
  button: { code: `export { Button } from "@sincpro/web-ui";`, budget: 8 },
  form: { code: `export { Field, TextInput } from "@sincpro/web-ui";`, budget: 90 },
  record: { code: `export { Record } from "@sincpro/web-ui";`, budget: 150 },
  list: { code: `export { List } from "@sincpro/web-ui";`, budget: 330 },
} as const;
type App = keyof typeof APPS;

/** Never in a first load: each is hundreds of KB that most screens never show. */
const HEAVY = [
  "@svar-ui/",
  "@fullcalendar/",
  "@tiptap/",
  "prosemirror-",
  "@codemirror/",
  "@uiw/",
  "@xyflow/",
  "react-pdf",
  "pdfjs-dist",
  "recharts",
  "streamdown",
  "dompurify",
];

type Chunk = {
  type: "chunk";
  fileName: string;
  name: string;
  isEntry: boolean;
  imports: string[];
  code: string;
  modules: Record<string, { renderedLength: number }>;
  viteMetadata?: { importedCss: Set<string> };
};
type Asset = { type: "asset"; fileName: string; source: string | Uint8Array };

/** The application's code, as a virtual module: nothing on disk for Tailwind to scan. */
const entry = (app: App): Plugin => ({
  name: "bundle-test-entry",
  resolveId: (id) => (id === "app" ? "\0app" : null),
  load: (id) => (id === "\0app" ? APPS[app].code : null),
});

/** The package a module came from, by its last `node_modules/` segment; ours by its path. */
function packageOf(id: string): string {
  const at = id.lastIndexOf("node_modules/");
  if (at < 0) return "@sincpro/web-ui";
  const [scope = "", name = ""] = id.slice(at + "node_modules/".length).split("/");
  return scope.startsWith("@") ? `${scope}/${name}` : scope;
}

/* One build per application — built together they would share chunks, and the smallest
   would be measured with the others' code. */
async function buildApp(app: App) {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    resolve: viteConfig.resolve,
    plugins: [react(), entry(app)],
    build: {
      write: false,
      minify: true,
      rollupOptions: {
        input: { [app]: "app" },
        preserveEntrySignatures: "exports-only",
        external: (id) => /^react(-dom)?($|\/)/.test(id),
      },
    },
  });
  const output = (Array.isArray(result) ? result : [result]).flatMap(
    (each) => (each as unknown as { output: (Chunk | Asset)[] }).output,
  );
  const chunks = output.filter((o): o is Chunk => o.type === "chunk");
  const assets = new Map(
    output.filter((o): o is Asset => o.type === "asset").map((a) => [a.fileName, a]),
  );
  /* The first load: the entry chunk and every chunk it imports statically, transitively. */
  const byName = new Map(chunks.map((c) => [c.fileName, c]));
  const first = new Set<string>();
  const visit = (name: string) => {
    const chunk = byName.get(name);
    if (chunk === undefined || first.has(name)) return;
    first.add(name);
    chunk.imports.forEach(visit);
  };
  chunks.filter((c) => c.isEntry).forEach((c) => visit(c.fileName));
  return {
    firstLoad: [...first].map((name) => byName.get(name)!),
    lazy: chunks.filter((c) => !first.has(c.fileName)),
    cssOf: (chunk: Chunk) =>
      [...(chunk.viteMetadata?.importedCss ?? [])].map((name) => {
        const source = assets.get(name)?.source ?? "";
        return typeof source === "string" ? source : new TextDecoder().decode(source);
      }),
  };
}

const built = (async () => {
  const apps = {} as Record<App, Awaited<ReturnType<typeof buildApp>>>;
  for (const app of Object.keys(APPS) as App[]) apps[app] = await buildApp(app);
  return apps;
})();

/* Four real builds: ~2 s on an idle machine, several times that while `make test` runs every
   story in Chrome beside it. The default 5 s timed out there. */
const BUILDS = 60_000;

test(
  "una aplicación carga primero sólo lo que usa: nada pesado, y cada una dentro de su presupuesto",
  async () => {
    const apps = await built;
    const report: string[] = [];
    for (const app of Object.keys(APPS) as App[]) {
      const load = apps[app].firstLoad;
      const gzip = load.reduce((sum, c) => sum + gzipSync(c.code).length, 0) / 1024;
      const heavy = [
        ...new Set(
          load.flatMap((c) =>
            Object.entries(c.modules)
              .filter(([, m]) => m.renderedLength > 0)
              .map(([id]) => packageOf(id)),
          ),
        ),
      ].filter((pkg) => HEAVY.some((h) => pkg.startsWith(h)));
      if (heavy.length > 0) report.push(`${app}: carga de entrada ${heavy.join(", ")}`);
      if (gzip > APPS[app].budget)
        report.push(`${app}: ${gzip.toFixed(1)} KB gzip, presupuesto ${APPS[app].budget} KB`);
    }
    assert.deepEqual(report, []);
  },
  BUILDS,
);

test(
  "la hoja de estilos de una librería viaja con el componente que la dibuja, no en la primera carga",
  async () => {
    const apps = await built;
    const VENDOR = /\.(wx-gantt|fc-[a-z-]+|react-flow)\b/;
    for (const app of Object.keys(APPS) as App[]) {
      const first = apps[app].firstLoad.flatMap(apps[app].cssOf);
      assert.ok(
        first.every((css) => !VENDOR.test(css)),
        `${app}: la primera carga trae CSS de una librería`,
      );
    }
    /* And it is still there — with the component, in the list's lazy chunks. */
    const lazy = apps.list.lazy.flatMap(apps.list.cssOf).join("\n");
    assert.match(lazy, /\.wx-gantt\b/, "el CSS del Gantt no viaja con RecordGantt");
    assert.match(lazy, /\.fc-[a-z-]+/, "el CSS del calendario no viaja con RecordCalendar");
  },
  BUILDS,
);

test("tokens.css importa sólo las fuentes y Tailwind: el CSS de una librería lo importa su componente", () => {
  const tokens = readFileSync(join(SRC, "tokens.css"), "utf8");
  const imports = [...tokens.matchAll(/^@import\s+"([^"]+)"/gm)].map((m) => m[1] ?? "");
  assert.deepEqual(
    imports.filter((path) => !path.startsWith("@fontsource/") && path !== "tailwindcss"),
    [],
  );
});
