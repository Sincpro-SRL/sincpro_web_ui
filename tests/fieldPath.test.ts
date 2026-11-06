import assert from "node:assert/strict";

import {
  createModelCache,
  describeFilter,
  type ModelDefinition,
  pathLabel,
  resolvePath,
  type TreeCondition,
  treeFromFilter,
  treeToFilter,
} from "@sincpro/web-ui";
import { ExpressionView } from "@sincpro/web-ui/components/search/FilterBuilder";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

import { INVOICE_MODEL, loadInvoiceModel } from "../stories/support/erp-paths";

/**
 * Context: a path is resolved against models that arrive one by one, and a filter through
 * relations travels as nested `through` nodes — @sincpro/criteria 2.0's `{through, selection}`,
 * with «none» and «all» as a `negate` around it. These are the rules that decide what the
 * server receives, so they are checked without a browser.
 */

const AMOUNT_OVER_10 = {
  through: "lines",
  selection: {
    through: "taxes",
    selection: { field: "amount", operator: ">", value: "10" },
  },
} as const;

const PRICE_OVER_1 = { field: "price", operator: ">", value: "1" } as const;
const NO_LINE_OVER_1 = { negate: { through: "lines", selection: PRICE_OVER_1 } } as const;
const EVERY_LINE_OVER_1 = {
  negate: { through: "lines", selection: { negate: PRICE_OVER_1 } },
} as const;

test("a model along a path is asked once, even by two rows at the same moment", async () => {
  let asked = 0;
  const models = createModelCache(INVOICE_MODEL, (path) => {
    asked++;
    return loadInvoiceModel(path);
  });
  const [a, b] = await Promise.all([models.get(["lines"]), models.get(["lines"])]);
  assert.equal(a, b);
  assert.equal(asked, 1);
  assert.equal(models.peek(["lines"]), a);
});

test("a failed model is forgotten, so the next attempt asks again", async () => {
  let asked = 0;
  const models = createModelCache(INVOICE_MODEL, async (path) => {
    asked++;
    if (asked === 1) throw new Error("HTTP 503");
    return loadInvoiceModel(path);
  });
  await assert.rejects(models.get(["partner_id"]), /503/);
  await models.get(["partner_id"]);
  assert.equal(asked, 2);
});

test("a path resolves to its steps with labels, and reads «A > B > C»", async () => {
  const models = createModelCache(INVOICE_MODEL, loadInvoiceModel);
  const steps = await resolvePath(models, ["partner_id", "country", "name"], "es-BO");
  assert.ok(steps !== null);
  assert.equal(pathLabel(steps.map((s) => s.label)), "Cliente > País > Nombre");
});

test("a name the model does not have is not half a path: it resolves to null", async () => {
  const models = createModelCache(INVOICE_MODEL, loadInvoiceModel);
  assert.equal(await resolvePath(models, ["partner_id", "nope"], "es-BO"), null);
});

test("a row with a path travels as nested through nodes, and comes back the same", () => {
  const row = treeFromFilter(AMOUNT_OVER_10) as TreeCondition;
  assert.deepEqual(row.through, [
    { field: "lines", match: "any" },
    { field: "taxes", match: "any" },
  ]);
  assert.equal(row.field, "amount");
  assert.deepEqual(treeToFilter(row), AMOUNT_OVER_10);
});

test("a to-one relation crosses the same way, and is said as a path", async () => {
  const filter = {
    through: "partner_id",
    selection: {
      through: "country",
      selection: { field: "code", operator: "=", value: "BO" },
    },
  };
  const row = treeFromFilter(filter) as TreeCondition;
  assert.deepEqual(
    row.through?.map((hop) => hop.match),
    ["any", "any"],
  );
  assert.deepEqual(treeToFilter(row), filter);

  /* The shape does not say to-one; the model does — and then «some of» would be noise. */
  const models = createModelCache(INVOICE_MODEL, loadInvoiceModel);
  await models.get(["partner_id"]);
  await models.get(["partner_id", "country"]);
  assert.match(
    describeFilter(filter, INVOICE_MODEL, models.peek),
    /^Cliente > País > Código/,
  );
});

/* sincpro_framework's `Through` takes `through` and `selection` and refuses any other key: the
   quantifier cannot travel as a `match`. «None» and «all» are sentences of the grammar. */
test("«none» and «all» travel as a negate around the through, and come back the same", () => {
  for (const [filter, match] of [
    [NO_LINE_OVER_1, "none"],
    [EVERY_LINE_OVER_1, "all"],
  ] as const) {
    const row = treeFromFilter(filter) as TreeCondition;
    assert.deepEqual(row.through, [{ field: "lines", match }]);
    assert.equal(row.field, "price");
    assert.deepEqual(treeToFilter(row), filter);
  }
  assert.equal(
    describeFilter(NO_LINE_OVER_1, INVOICE_MODEL),
    "none of Líneas with price greater than 1",
  );
  assert.equal(
    describeFilter(EVERY_LINE_OVER_1, INVOICE_MODEL),
    "all of Líneas with price greater than 1",
  );
});

/* Two trees write the same filter — «no line with no tax > 10» IS «every line with some tax
   > 10» — and it reads back as the shorter sentence. */
test("«none of none» comes back as «all of some», which filters the same", () => {
  const row: TreeCondition = {
    kind: "condition",
    through: [
      { field: "lines", match: "none" },
      { field: "taxes", match: "none" },
    ],
    field: "amount",
    operator: ">",
    value: "10",
  };
  const filter = treeToFilter(row);
  assert.deepEqual(filter, {
    negate: {
      through: "lines",
      selection: {
        negate: {
          through: "taxes",
          selection: { field: "amount", operator: ">", value: "10" },
        },
      },
    },
  });
  assert.deepEqual((treeFromFilter(filter) as TreeCondition).through, [
    { field: "lines", match: "all" },
    { field: "taxes", match: "any" },
  ]);
});

test("a through that ends in a group is not a row: the tree shows it read-only", () => {
  assert.equal(
    treeFromFilter({
      through: "lines",
      selection: {
        all: [
          { field: "price", operator: ">", value: 1 },
          { field: "quantity", operator: ">", value: 2 },
        ],
      },
    }),
    null,
  );
});

test("the old relational shape — `where`, `match` — is not a filter the tree reads", () => {
  assert.equal(
    treeFromFilter({
      through: "lines",
      match: "any",
      where: { field: "price", operator: ">", value: 1 },
    }),
    null,
  );
});

test("the filter is said with the labels of every model along the path", async () => {
  const models = createModelCache(INVOICE_MODEL, loadInvoiceModel);
  await models.get(["lines"]);
  await models.get(["lines", "taxes"]);
  /* The default copy is English; the application installs Spanish. */
  assert.equal(
    describeFilter(AMOUNT_OVER_10, INVOICE_MODEL, models.peek),
    "some of Líneas with some of Impuestos with Monto greater than 10",
  );
});

test("without the models along the way, the raw names are what there is to say", () => {
  const root: ModelDefinition = INVOICE_MODEL;
  assert.match(
    describeFilter(AMOUNT_OVER_10, root),
    /some of Líneas with some of taxes with amount/,
  );
});

/* A `through` inside a group — `all`, `any`, `negate` — is drawn with the model at the end of
   its path, the same as one at the root. The read-only view dropped `modelAt` at the first
   group, and a filter the builder could not open showed «price» where it meant «Precio
   unitario». */
test("a through inside a group is drawn with the labels of the model along its path", async () => {
  const models = createModelCache(INVOICE_MODEL, loadInvoiceModel);
  await models.get(["lines"]);
  const out = renderToStaticMarkup(
    createElement(ExpressionView, {
      node: {
        all: [
          { through: "lines", selection: PRICE_OVER_1 },
          {
            negate: {
              any: [
                {
                  through: "lines",
                  selection: { field: "quantity", operator: ">", value: "2" },
                },
                { field: "state", operator: "=", value: "draft" },
              ],
            },
          },
        ],
      },
      model: INVOICE_MODEL,
      modelAt: models.peek,
    }),
  );
  assert.ok(out.includes("Precio unitario"), "a through inside `all`");
  assert.ok(out.includes("Cantidad"), "a through inside `negate` and `any`");
  assert.doesNotMatch(out, /\bprice\b|\bquantity\b/);
});
