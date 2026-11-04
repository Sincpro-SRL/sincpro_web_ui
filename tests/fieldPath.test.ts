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
import { test } from "vitest";

import { INVOICE_MODEL, loadInvoiceModel } from "../stories/support/erp-paths";

/**
 * Context: a path is resolved against models that arrive one by one, and a filter through
 * relations travels as nested `through` nodes. These are the rules that decide what the
 * server receives, so they are checked without a browser.
 */

const AMOUNT_OVER_10 = {
  through: "lines",
  match: "any",
  where: {
    through: "taxes",
    match: "any",
    where: { field: "amount", operator: ">", value: "10" },
  },
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
    { field: "lines", many: true, match: "any" },
    { field: "taxes", many: true, match: "any" },
  ]);
  assert.equal(row.field, "amount");
  assert.deepEqual(treeToFilter(row), AMOUNT_OVER_10);
});

test("a to-one relation crosses without a quantifier", () => {
  const filter = {
    through: "partner_id",
    where: { through: "country", where: { field: "code", operator: "=", value: "BO" } },
  };
  const row = treeFromFilter(filter) as TreeCondition;
  assert.deepEqual(
    row.through?.map((hop) => hop.many),
    [false, false],
  );
  assert.deepEqual(treeToFilter(row), filter);
});

test("a through that ends in a group is not a row: the tree shows it read-only", () => {
  assert.equal(
    treeFromFilter({
      through: "lines",
      match: "any",
      where: {
        all: [
          { field: "price", operator: ">", value: 1 },
          { field: "quantity", operator: ">", value: 2 },
        ],
      },
    }),
    null,
  );
});

test("an unknown quantifier is not a filter the tree reads", () => {
  assert.equal(
    treeFromFilter({
      through: "lines",
      match: "most",
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
