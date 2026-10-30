import assert from "node:assert/strict";
import { test } from "node:test";

import { Field, FormModeProvider, type TagOption, TagsField } from "@sincpro/web-ui";
import { tagChoices, withoutTag, withTag } from "@sincpro/web-ui/primitives/tag/choices";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: the keys of the field (typing, Enter, Backspace, the ×) are React Aria's plus two
 * of ours, and they are driven in a browser. What is tested here is the contract around them:
 * what the input OFFERS for a given text — the chosen ones never, «create» only when the text
 * names no tag — the `string[]` that adding and removing produce, and how it is wired inside
 * `Field` and drawn in read mode.
 */

const CATEGORIES: TagOption[] = [
  { value: "may", label: "mayorista" },
  { value: "exp", label: "exportación" },
  { value: "c30", label: "crédito 30 días" },
  { value: "sus", label: "crédito suspendido", tone: "bad" },
];

const collator = new Intl.Collator("es-BO", { sensitivity: "base", usage: "search" });
const match = {
  contains: (label: string, query: string) =>
    label
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .includes(query.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()),
  same: (a: string, b: string) => collator.compare(a, b) === 0,
};

test("the chosen tags are never offered again", () => {
  const { available } = tagChoices(CATEGORIES, ["may", "c30"], "", match, true);
  assert.deepEqual(
    available.map((o) => o.value),
    ["exp", "sus"],
  );
});

test("typing filters, ignoring case and accents", () => {
  const { available } = tagChoices(CATEGORIES, [], "CREDITO", match, false);
  assert.deepEqual(
    available.map((o) => o.value),
    ["c30", "sus"],
  );
});

test("«create» is offered for a text that names no tag, and only when creating is allowed", () => {
  assert.equal(
    tagChoices(CATEGORIES, [], "  distribuidor ", match, true).create,
    "distribuidor",
  );
  assert.equal(tagChoices(CATEGORIES, [], "distribuidor", match, false).create, null);
  assert.equal(tagChoices(CATEGORIES, [], "", match, true).create, null);
});

test("«create» is not offered for an existing tag, even a chosen one or in other case", () => {
  assert.equal(tagChoices(CATEGORIES, [], "Exportacion", match, true).create, null);
  const chosen = tagChoices(CATEGORIES, ["may"], "MAYORISTA", match, true);
  assert.equal(chosen.create, null);
  assert.deepEqual(chosen.available, []);
});

test("adding and removing produce the ids in the order they were added", () => {
  assert.deepEqual(withTag(["may"], "exp"), ["may", "exp"]);
  assert.deepEqual(withTag(["may", "exp"], "may"), ["may", "exp"], "no duplicates");
  assert.deepEqual(withoutTag(["may", "exp", "c30"], "exp"), ["may", "c30"]);
});

test("inside Field: the input is the field's control and the chips are named by its label", () => {
  const html = renderToStaticMarkup(
    <Field label="Categorías" hint="Deciden la lista de precios.">
      <TagsField value={["may", "sus"]} options={CATEGORIES} onChange={() => {}} />
    </Field>,
  );
  const input = /<input[^>]*role="combobox"[^>]*>/.exec(html)?.[0] ?? "";
  const labelId = /<label id="([^"]+)"/.exec(html)?.[1];
  const forId = /<label[^>]*for="([^"]+)"/.exec(html)?.[1];
  assert.ok(input !== "", "an inline combobox to add one more");
  assert.match(input, new RegExp(`id="${forId}"`), "the label points at the input");
  assert.match(input, new RegExp(`aria-labelledby="${labelId}"`));
  assert.match(input, /aria-describedby="[^"]*hint/);
  assert.match(
    html,
    new RegExp(`aria-labelledby="${labelId}"[^>]*role="grid"`),
    "the strip of chips is named by the field's label",
  );
  assert.equal((html.match(/role="row"/g) ?? []).length, 2, "one chip per chosen tag");
  assert.equal((html.match(/slot="remove"/g) ?? []).length, 2, "each chip removable");
  assert.match(html, /text-bad/, "a chip keeps the tone of what it means");
});

test("disabled: chips are read, not removed", () => {
  const html = renderToStaticMarkup(
    <TagsField value={["may"]} options={CATEGORIES} disabled />,
  );
  assert.doesNotMatch(html, /slot="remove"/);
  assert.match(html, /<input[^>]*disabled/);
});

test("read mode draws the chosen tags as Tags, in order, and «unset» when there are none", () => {
  const html = renderToStaticMarkup(
    <FormModeProvider value="read">
      <TagsField value={["exp", "may"]} options={CATEGORIES} />
    </FormModeProvider>,
  );
  assert.doesNotMatch(html, /<input/);
  assert.ok(html.indexOf("exportación") < html.indexOf("mayorista"));
  const empty = renderToStaticMarkup(
    <FormModeProvider value="read">
      <TagsField value={[]} options={CATEGORIES} />
    </FormModeProvider>,
  );
  assert.doesNotMatch(empty, /<input/);
  assert.match(empty, /italic/, "the unset value, said");
});
