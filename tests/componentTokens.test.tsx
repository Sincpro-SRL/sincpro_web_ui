import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  AppFrame,
  Block,
  BoardTile,
  Button,
  type DataColumn,
  DataTable,
  Field,
  IconButton,
  Menu,
  Metric,
  NavigationTree,
  RecordCard,
  SearchBar,
  Sidebar,
  Tag,
  Tags,
  TextInput,
  TopBar,
} from "@sincpro/web-ui";
import { Trash2 } from "lucide-react";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: an application changes ONE component's look without forking it — through the
 * `--ui-*` tokens (`tokens.css`, `@theme inline`) and the `data-ui` parts. Both are a public
 * contract: a token nobody reads, or a part that silently loses its name in a refactor, breaks
 * an application's CSS without a type error. This holds them.
 */

const ROOT = join(import.meta.dirname, "..");
const TOKENS = readFileSync(join(ROOT, "src", "tokens.css"), "utf8");
const README = readFileSync(join(ROOT, "README.md"), "utf8");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return entry.name.endsWith(".tsx") || entry.name.endsWith(".ts") ? [path] : [];
  });
}
const SRC = sources(join(ROOT, "src"))
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

/** `--radius-ui-button: var(--ui-button-radius, …)` → [theme name, utility suffix, knob]. */
const INLINE = /@theme inline \{([\s\S]*?)\n\}/.exec(TOKENS)?.[1] ?? "";
const DECLARED = [
  ...INLINE.matchAll(/--(radius|color|shadow)-(ui-[a-z-]+):\s*var\(\s*(--ui-[a-z-]+),/g),
].map(([, namespace, suffix, knob]) => ({
  namespace: namespace!,
  suffix: suffix!,
  knob: knob!,
}));

test("the component tokens are declared, and there are as many as the README lists", () => {
  assert.ok(DECLARED.length >= 20, `found ${DECLARED.length} component tokens`);
});

test("every component token is read by some component — none is a dead knob", () => {
  const prefix = {
    radius: "rounded",
    color: "(?:bg|border|text)",
    shadow: "shadow",
  } as const;
  const unused = DECLARED.filter(
    ({ namespace, suffix }) =>
      !new RegExp(
        `(?:^|[\\s"\`:])${prefix[namespace as keyof typeof prefix]}-${suffix}(?![a-z-])`,
      ).test(SRC),
  );
  assert.deepEqual(unused, []);
});

test("every knob an application sets is documented in the README", () => {
  const missing = DECLARED.filter(({ knob }) => !README.includes(`\`${knob}\``)).map(
    ({ knob }) => knob,
  );
  assert.deepEqual(missing, []);
});

test("a knob falls back to the system's token, so setting nothing changes nothing", () => {
  for (const line of INLINE.split("\n").filter((one) => one.includes("var(--ui-"))) {
    assert.match(line, /var\(\s*--ui-[a-z-]+,\s*(?:var\(--|color-mix\(|$)/, line);
  }
});

const draw = (node: ReactElement) => renderToStaticMarkup(node);
const part = (html: string, name: string) =>
  assert.match(html, new RegExp(`data-ui="${name.replace(".", "\\.")}"`), name);

type Row = { id: string; name: string };
const COLUMNS: DataColumn<Row>[] = [{ id: "name", header: "Nombre", value: (r) => r.name }];

test("each customizable component names its root and its parts", () => {
  const button = draw(<Button role="primary">Cobrar</Button>);
  part(button, "button");
  assert.match(button, /data-emphasis="primary"/);
  assert.match(button, /data-size="md"/);
  part(draw(<IconButton icon={Trash2} label="Borrar" />), "icon-button");

  part(
    draw(
      <Field label="Cliente">
        <TextInput value="" onChange={() => {}} />
      </Field>,
    ),
    "control",
  );
  part(
    draw(<Menu label="Acciones" groups={[{ options: [{ id: "a", label: "A" }] }]} />),
    "menu.trigger",
  );
  part(draw(<Tag>Pagada</Tag>), "tag");
  part(draw(<Tags items={[{ id: "a", label: "uno" }]} />), "tags.item");
  part(draw(<Block title="Totales">x</Block>), "block");
  part(draw(<RecordCard title="Factura" />), "record-card");
  part(draw(<BoardTile title="Por canal">x</BoardTile>), "board.tile");
  part(draw(<Metric value={4} label="vencidas" />), "metric");
  part(draw(<Metric value={6} label="por revisar" detail="Bs 1.000,00" />), "metric.detail");
  part(
    draw(
      <DataTable
        data={[{ id: "1", name: "Uno" }]}
        columns={COLUMNS}
        getRowId={(r) => r.id}
      />,
    ),
    "table.head",
  );

  const search = draw(<SearchBar facets={[]} criteria={[]} onCriteriaChange={() => {}} />);
  part(search, "search");
  part(search, "search.field");

  const bar = draw(<TopBar app={{ label: "ERP" }} menus={[]} user={{ name: "Ana" }} />);
  for (const name of ["topbar", "topbar.brand", "topbar.actions", "topbar.user"])
    part(bar, name);

  const frame = draw(
    <AppFrame
      sidebar={
        <Sidebar
          brand={{ label: "Colegio" }}
          user={{ name: "Ana" }}
          search={{ onSearch: () => {} }}
          actions={[{ id: "s", label: "Salir" }]}
        >
          <NavigationTree items={[{ id: "a", label: "Padrón" }]} current="a" />
        </Sidebar>
      }
    >
      <p>vista</p>
    </AppFrame>,
  );
  for (const name of [
    "frame",
    "frame.bar",
    "frame.sidebar",
    "frame.main",
    "sidebar",
    "sidebar.brand",
    "sidebar.user",
    "sidebar.search",
    "search-entry",
    "sidebar.nav",
    "sidebar.account",
    "navigation",
    "navigation.item",
  ])
    part(frame, name);
});

test("every part a component names is documented — a part nobody lists is not a contract", () => {
  const named = new Set([...SRC.matchAll(/data-ui="([a-z.-]+)"/g)].map(([, name]) => name!));
  const missing = [...named].filter((name) => !README.includes(`\`${name}\``));
  assert.deepEqual(missing, []);
});

test("the look reads the tokens: the system's classes are gone from what an app can turn", () => {
  assert.match(draw(<Button>Duplicar</Button>), /rounded-ui-button/);
  assert.match(
    draw(
      <Field label="Cliente">
        <TextInput value="" onChange={() => {}} />
      </Field>,
    ),
    /rounded-ui-control[^"]*bg-ui-control[^"]*border-ui-control-border/,
  );
  assert.match(draw(<Tag>Pagada</Tag>), /rounded-ui-tag/);
  assert.match(
    draw(<Block>x</Block>),
    /rounded-ui-card border border-ui-card-border bg-ui-card/,
  );
});
