import assert from "node:assert/strict";

import {
  SPANISH_COPY,
  Totals,
  type TotalsDeduction,
  type TotalsRow,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the money summary of a document once it starts being settled. What is ours: a
 * block with only `rows` still draws the breakdown with the total leading; a deduction is
 * heard as ONE phrase («Pagado el 12/10/2026, menos Bs. 1.000,00») with the visible minus
 * hidden; its detail opens from a named `i` only when there is something to show; the
 * figure that leads moves with the state; the credits are a named list whose «Aplicar» says
 * which; and none of it is a primary action. The opening of the popover is React Aria's.
 */

const es = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const ROWS: readonly TotalsRow[] = [
  { label: "Base imponible", value: "Bs. 3.000,00" },
  { label: "IVA 13 %", value: "Bs. 390,00" },
  { label: "IT 3 %", value: "Bs. 90,00" },
  { label: "Total", value: "Bs. 3.480,00", total: true },
];

const PAYMENT: TotalsDeduction = {
  label: "Pagado el 12/10/2026",
  value: "Bs. 1.000,00",
  facts: [{ label: "Diario", value: "Banco BNB" }],
  onRemove: () => {},
};

/** The text of the row that leads: the one at the title size. */
function leading(html: string): string {
  const match = /<div data-lead=""[^>]*>(.*?)<\/dd><\/div>/.exec(html);
  assert.ok(match, "one figure leads");
  return match[1]!.replace(/<[^>]+>/g, " ");
}

test("with only rows it draws the breakdown and the total leads", () => {
  const html = es(<Totals rows={ROWS} />);
  assert.match(html, /<dt[^>]*>Base imponible<\/dt><dd[^>]*>Bs\. 3\.000,00<\/dd>/);
  assert.match(leading(html), /Total.*Bs\. 3\.480,00/);
  assert.equal(html.match(/data-lead/g)?.length, 1);
  assert.doesNotMatch(html, /<button/);
});

test("a deduction is read as one phrase: label, «menos», amount", () => {
  const html = es(<Totals rows={ROWS} deductions={[PAYMENT]} />);
  assert.match(
    html,
    /Pagado el 12\/10\/2026<\/span><\/dt><dd[^>]*><span aria-hidden="true">− <\/span><span class="sr-only">menos <\/span>Bs\. 1\.000,00<\/dd>/,
  );
});

test("its detail opens from a named `i`, and only when there is something to show", () => {
  const html = es(<Totals rows={ROWS} deductions={[PAYMENT]} />);
  assert.match(
    html,
    /<button[^>]*aria-haspopup="dialog"[^>]*aria-label="Detalle: Pagado el 12\/10\/2026"/,
  );
  assert.doesNotMatch(html, /Banco BNB/, "the detail floats only when asked for");

  const bare = es(
    <Totals
      rows={ROWS}
      deductions={[{ label: "Pagado el 12/10/2026", value: "Bs. 1,00" }]}
    />,
  );
  assert.doesNotMatch(bare, /<button/);
});

test("partly paid: the balance leads and the total steps down", () => {
  const html = es(
    <Totals
      rows={ROWS}
      deductions={[PAYMENT]}
      balance={{ label: "Importe adeudado", value: "Bs. 2.480,00" }}
    />,
  );
  assert.match(leading(html), /Importe adeudado.*Bs\. 2\.480,00/);
  assert.equal(html.match(/data-lead/g)?.length, 1);
});

test("posted and unpaid: the balance is there, the total still leads", () => {
  const html = es(
    <Totals rows={ROWS} balance={{ label: "Importe adeudado", value: "Bs. 3.480,00" }} />,
  );
  assert.match(leading(html), /Total.*Bs\. 3\.480,00/);
});

test("settled: the total leads again, with the mark written", () => {
  const html = es(
    <Totals
      rows={ROWS}
      deductions={[PAYMENT]}
      balance={{ label: "Importe adeudado", value: "Bs. 0,00" }}
      settled="Pagada"
    />,
  );
  assert.match(leading(html), /Total.*Pagada.*Bs\. 3\.480,00/);
});

test("`lead` overrides the default", () => {
  const html = es(
    <Totals
      rows={ROWS}
      lead="balance"
      balance={{ label: "Importe adeudado", value: "Bs. 3.480,00" }}
    />,
  );
  assert.match(leading(html), /Importe adeudado/);
});

test("credits are a named list, each «Aplicar» says which, none is primary", () => {
  const html = es(
    <Totals
      rows={ROWS}
      deductions={[PAYMENT]}
      balance={{ label: "Importe adeudado", value: "Bs. 2.480,00" }}
      credits={[{ label: "NC/2026/0012", value: "Bs. 350,00", onApply: () => {} }]}
    />,
  );
  const list =
    /<p id="([^"]+)"[^>]*>Créditos pendientes<\/p><ul aria-labelledby="([^"]+)"/.exec(html);
  assert.ok(list, "the credits are titled and the list is named by the title");
  assert.equal(list[1], list[2]);
  assert.match(
    html,
    /<button[^>]*aria-label="Aplicar NC\/2026\/0012"[^>]*>.*?Aplicar<\/button>/,
  );
  assert.doesNotMatch(html, /data-emphasis="primary"/);
});
