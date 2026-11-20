import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import * as web from "@sincpro/web-ui";
import * as activityMessages from "@sincpro/web-ui/components/activity/Messages";
import * as guideTarget from "@sincpro/web-ui/components/guide/target";
import * as listingAxis from "@sincpro/web-ui/components/listing/AxisLevels";
import * as listingColumns from "@sincpro/web-ui/components/listing/columns";
import * as listingColumnsMenu from "@sincpro/web-ui/components/listing/ColumnsMenu";
import * as listingPages from "@sincpro/web-ui/components/listing/pages";
import * as listingTree from "@sincpro/web-ui/components/listing/tree";
import * as previewFile from "@sincpro/web-ui/components/preview/FilePreview";
import * as searchFilter from "@sincpro/web-ui/components/search/FilterBuilder";
import * as searchJson from "@sincpro/web-ui/components/search/JsonEditor";
import * as searchRule from "@sincpro/web-ui/components/search/RuleValue";
import * as catalog from "@sincpro/web-ui/foundations/catalog";
import * as copy from "@sincpro/web-ui/foundations/copy";
import * as density from "@sincpro/web-ui/foundations/density";
import * as form from "@sincpro/web-ui/foundations/form";
import * as shortcut from "@sincpro/web-ui/foundations/shortcut";
import * as sticky from "@sincpro/web-ui/foundations/sticky";
import * as surface from "@sincpro/web-ui/foundations/surface";
import * as theme from "@sincpro/web-ui/foundations/theme";
import * as xlsx from "@sincpro/web-ui/foundations/xlsx";
import * as button from "@sincpro/web-ui/primitives/button/Button";
import * as field from "@sincpro/web-ui/primitives/field/Field";
import * as menu from "@sincpro/web-ui/primitives/menu/Menu";
import * as editableTable from "@sincpro/web-ui/primitives/table/EditableTable";
import * as table from "@sincpro/web-ui/primitives/table/Table";
import * as count from "@sincpro/web-ui/primitives/tag/Count";
import * as dateValue from "@sincpro/web-ui/primitives/value/DateValue";
import * as meter from "@sincpro/web-ui/primitives/value/Meter";
import * as richText from "@sincpro/web-ui/primitives/value/RichText";
import * as value from "@sincpro/web-ui/primitives/value/Value";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { test } from "vitest";

/**
 * Context: the other half of `clientBoundary.test.ts`. In a React Server Components app
 * (Next.js App Router) the bundler turns EVERY export of a `"use client"` module into a client
 * reference — the pure ones too. `buttonClasses("primary", "md")` called from a server
 * component returned a reference instead of a class string, and an application wrapped a
 * client component around it to get a class name. So:
 *
 *   1. Every public value that is not a component, a hook or a context resolves — through the
 *      barrels, the way a bundler follows them — to a module WITHOUT the directive. What only
 *      a browser can run is named below, with its reason.
 *   2. Nothing the server runs reaches into a client module for a function: a module without
 *      the directive imports from one only components (rendered as client references) and the
 *      browser-only names. `dateLabel()` read the month's name through `currentCopy()`, a
 *      client module's — on the server it threw.
 *
 * The modules are read with TypeScript's parser, not run: what is checked is the graph a
 * bundler sees.
 */

const SRC = join(import.meta.dirname, "..", "src");
const PACKAGE = "@sincpro/web-ui";

/** Public values that stay in a client module on purpose. Each needs a browser or React. */
const CLIENT_ONLY: Readonly<Record<string, string>> = {
  applyTheme: "writes an attribute on the document",
  assistEvent: "builds the assistant's link (an element), called in a handler",
  boxOf: "measures an element on screen",
  createCopy: "makes a React context and its Provider",
  downloadFile: "a Blob and a link's click",
  downloadXlsx: "a Blob and a link's click",
  findTarget: "queries the document",
  ICONO_ROTO: "an icon — a component under a constant's name",
  sanitizeRichText: "DOMPurify needs a DOM; on the server `RichTextValue` writes plain text",
  shownText: "walks the DOM of a value area",
};

/** `Button`, `THead`, `DockHostContext`: a component or a context — a client reference renders. */
const isComponent = (name: string) => /^[A-Z]/.test(name) && !/^[A-Z0-9_]+$/.test(name);
const isHook = (name: string) => /^use[A-Z]/.test(name);

type Module = { id: string; client: boolean; ast: ts.SourceFile };

const modules = new Map<string, Module | null>();

/** `@sincpro/web-ui/primitives/button/Button` → the module; anything outside the package → null. */
function load(specifier: string): Module | null {
  const cached = modules.get(specifier);
  if (cached !== undefined) return cached;
  let module: Module | null = null;
  if (specifier === PACKAGE || specifier.startsWith(`${PACKAGE}/`)) {
    const base = specifier === PACKAGE ? "index" : specifier.slice(PACKAGE.length + 1);
    const file = [".ts", ".tsx"].map((ext) => join(SRC, base + ext)).find(existsSync);
    if (file !== undefined) {
      const text = readFileSync(file, "utf8");
      module = {
        id: relative(SRC, file).replace(/\.tsx?$/, ""),
        client: text.startsWith('"use client";'),
        ast: ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false),
      };
    }
  }
  modules.set(specifier, module);
  return module;
}

const exported = (node: ts.Node) =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** The value names a module declares itself, exported or not. */
function locals(module: Module): Map<string, boolean> {
  const out = new Map<string, boolean>();
  for (const node of module.ast.statements) {
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
      if (node.name !== undefined) out.set(node.name.text, exported(node));
    } else if (ts.isVariableStatement(node)) {
      for (const one of node.declarationList.declarations) {
        if (ts.isIdentifier(one.name)) out.set(one.name.text, exported(node));
      }
    } else if (ts.isEnumDeclaration(node)) {
      out.set(node.name.text, exported(node));
    }
  }
  return out;
}

/** The value names a module imports: local name → where from and under which name. */
function imports(module: Module): Map<string, { from: string; name: string }> {
  const out = new Map<string, { from: string; name: string }>();
  for (const node of module.ast.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
    const clause = node.importClause;
    if (clause === undefined || clause.isTypeOnly) continue;
    const from = node.moduleSpecifier.text;
    if (clause.name !== undefined) out.set(clause.name.text, { from, name: "default" });
    const bindings = clause.namedBindings;
    if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
      out.set(bindings.name.text, { from, name: "*" });
    } else if (bindings !== undefined) {
      for (const one of bindings.elements) {
        if (one.isTypeOnly) continue;
        out.set(one.name.text, { from, name: (one.propertyName ?? one.name).text });
      }
    }
  }
  return out;
}

/** What a module exports by name, and where each comes from (`undefined`: declared here). */
type Export = { from?: string; name: string };

function exportsOf(module: Module): Map<string, Export> {
  const out = new Map<string, Export>();
  const own = locals(module);
  const imported = imports(module);
  for (const [name, isExported] of own) if (isExported) out.set(name, { name });
  for (const node of module.ast.statements) {
    if (!ts.isExportDeclaration(node) || node.isTypeOnly) continue;
    const from =
      node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)
        ? node.moduleSpecifier.text
        : undefined;
    const clause = node.exportClause;
    if (clause === undefined) {
      const target = from === undefined ? null : load(from);
      if (target === null) continue;
      for (const name of exportsOf(target).keys()) out.set(name, { from: from!, name });
      continue;
    }
    if (!ts.isNamedExports(clause)) continue;
    for (const one of clause.elements) {
      if (one.isTypeOnly) continue;
      const inner = (one.propertyName ?? one.name).text;
      if (from !== undefined) out.set(one.name.text, { from, name: inner });
      else if (own.has(inner)) out.set(one.name.text, { name: inner });
      else if (imported.has(inner)) out.set(one.name.text, imported.get(inner)!);
    }
  }
  return out;
}

/** The module a bundler takes `name` from: the first `"use client"` one on the way cuts it
 *  — past it every export is a client reference, re-exported or not. */
function origin(module: Module, name: string): Module {
  if (module.client) return module;
  const found = exportsOf(module).get(name);
  if (found === undefined || found.from === undefined) return module;
  const next = load(found.from);
  return next === null ? module : origin(next, found.name);
}

const root = load(PACKAGE)!;
const PUBLIC = [...exportsOf(root).keys()].sort();

test("every public helper comes from a module without the directive", () => {
  const helpers = PUBLIC.filter((name) => !isComponent(name) && !isHook(name));
  const client = helpers
    .filter((name) => CLIENT_ONLY[name] === undefined)
    .map((name) => ({ name, module: origin(root, name) }))
    .filter(({ module }) => module.client)
    .map(({ name, module }) => `${name} ← ${module.id}`);
  assert.deepEqual(
    client,
    [],
    'move these to a module without `"use client"` (and point the family\'s barrel at it) — or, if only a browser can run one, name it in CLIENT_ONLY with its reason',
  );
});

test("CLIENT_ONLY names public values that are still client", () => {
  const stale = Object.keys(CLIENT_ONLY).filter(
    (name) => !PUBLIC.includes(name) || !origin(root, name).client,
  );
  assert.deepEqual(stale, [], "these are no longer public, or no longer client: drop them");
});

test("nothing the server runs calls into a client module", () => {
  /* From every module without the directive that the public API reaches, through the ones
     without the directive that it imports. */
  const start = PUBLIC.map((name) => origin(root, name)).filter((module) => !module.client);
  const seen = new Set<string>();
  const queue = [...start];
  const reaching: string[] = [];
  while (queue.length > 0) {
    const module = queue.pop()!;
    if (seen.has(module.id)) continue;
    seen.add(module.id);
    const used = [
      ...imports(module).values(),
      ...[...exportsOf(module).values()].filter((one) => one.from !== undefined),
    ] as { from: string; name: string }[];
    for (const { from, name } of used) {
      const target = load(from);
      if (target === null) continue;
      if (!target.client) {
        queue.push(target);
        continue;
      }
      if (isComponent(name) || CLIENT_ONLY[name] !== undefined) continue;
      reaching.push(`${module.id} → ${name} (${target.id})`);
    }
  }
  assert.deepEqual(
    [...new Set(reaching)].sort(),
    [],
    'a module without `"use client"` runs on the server: import these from a module without the directive',
  );
});

/** Where each helper was exported from before it moved: the old module still exports it. */
const MOVED: readonly (readonly [Record<string, unknown>, readonly string[]])[] = [
  [catalog, ["fillCopy", "mergeCopyOver"]],
  [
    copy,
    [
      "currentCopy",
      "currentCopyLocale",
      "ENGLISH_COPY",
      "fillCopy",
      "installCopy",
      "mergeCopy",
    ],
  ],
  [density, ["byDensity"]],
  [surface, ["bySurface"]],
  [form, ["controlName"]],
  [shortcut, ["modShortcut"]],
  [sticky, ["STICKY_TOP", "stickyReset", "stickyTop"]],
  [theme, ["isTheme", "resolveTheme", "THEME_ATTRIBUTE", "THEMES"]],
  [xlsx, ["columnName", "downloadXlsx", "writeXlsx"]],
  [button, ["buttonClasses"]],
  [field, ["controlClasses"]],
  [menu, ["menuTriggerClasses"]],
  [count, ["countText"]],
  [table, ["CELL_TONE"]],
  [editableTable, ["sectionLines", "stackPlaces", "tabTarget"]],
  [value, ["formatCount", "formatDistance", "formatNumber", "formatWith"]],
  [dateValue, ["formatDateTime", "formatRelative"]],
  [meter, ["meterLevel"]],
  [richText, ["isRichTextEmpty", "richTextPlain"]],
  [activityMessages, ["writeANote"]],
  [guideTarget, ["selectorOf"]],
  [
    listingColumns,
    ["defaultVisibleIds", "reconcileVisible", "toggleColumn", "visibleColumns"],
  ],
  [listingColumnsMenu, ["specsFromColumns"]],
  [listingPages, ["DEFAULT_PAGE_SIZE", "PAGE_SIZES"]],
  [listingTree, ["toggleCollapsed"]],
  [listingAxis, ["levelId", "levelLabeler"]],
  [previewFile, ["previewKind"]],
  [
    searchFilter,
    [
      "blankGroup",
      "describeFilter",
      "liftRecords",
      "namesOf",
      "recordOps",
      "treeFromFilter",
      "treeToFilter",
    ],
  ],
  [searchJson, ["formatJson"]],
  [searchRule, ["takesMany"]],
];

test("a moved helper is the same value by its old path and by the package", () => {
  const api = web as Record<string, unknown>;
  const differ = MOVED.flatMap(([module, names]) =>
    names.filter((name) => module[name] === undefined || module[name] !== api[name]),
  );
  assert.deepEqual(differ, [], "the old module re-exports the helper from its new home");
});

test("the helpers answer through the package as the components draw", () => {
  /* The look a server component asks for is the one the component draws. */
  const drawn = renderToStaticMarkup(
    createElement(web.Button, { role: "primary", children: "Pagar" }),
  );
  assert.ok(drawn.includes(`class="${web.buttonClasses("primary", "md", "canvas")}"`));
  assert.equal(web.countText(120, String, 99), "99+");
  assert.equal(web.meterLevel(95), "danger");
  assert.equal(web.richTextPlain("<p>Hola&nbsp;<b>mundo</b></p>"), "Hola mundo");

  /* ONE store: what `installCopy` sets — from the module without the directive — is what a
     component reads through `useUiCopy`, and what a formatter reads on the server. */
  const when = new Date(2026, 8, 14, 15, 13);
  web.installCopy(web.SPANISH_COPY);
  try {
    assert.equal(web.currentCopyLocale(), "es-BO");
    assert.match(web.formatDateTime(when), /^14\/09\/2026 15:13$/);
    const exact = renderToStaticMarkup(
      createElement(web.DateValue, { when, format: "exact" }),
    );
    assert.ok(exact.includes(`>${web.formatDateTime(when)}<`));
    assert.equal(web.formatCount(12345.4), "12.345");
  } finally {
    web.installCopy();
  }
  assert.equal(web.formatCount(12345.4), "12,345");
});
