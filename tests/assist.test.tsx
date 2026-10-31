import assert from "node:assert/strict";

import {
  AssistedValue,
  assistEvent,
  AssistLabel,
  AssistMark,
  AssistPending,
  AssistSuggestion,
  ChangeReview,
  Field,
  installCopy,
  NumberInput,
  SPANISH_COPY,
  type ToastSpec,
  UiCopyProvider,
} from "@sincpro/web-ui";
import {
  acceptedMessage,
  appliedMessage,
  applyLabel,
  applyWithUndo,
  ASSIST_ICON,
  changeKind,
  chosenState,
  initiallyChosen,
  toggleChosen,
} from "@sincpro/web-ui/components/assist/assist";
import { mergeCopy } from "@sincpro/web-ui/foundations/copy";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the assistant's patterns are trusted for three answers — where it came from, what
 * exactly changes, how to take it back. The presses (focus return, the toast's «Deshacer»,
 * the dialog) were driven in a browser; what is ours is the contract: the mark is a word and
 * an icon (never a color alone), a suggestion is a named group with its source and two
 * buttons, the review lists each change with its kind WRITTEN and its check, «Aplicar»
 * counts and refuses zero with a reason, and applying returns the undo the notice offers.
 */

const es = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const COPY = mergeCopy(SPANISH_COPY);
const noop = () => {};

/** A toast stack that only remembers what it was asked to show. */
function fakeToasts() {
  const shown: ToastSpec[] = [];
  return {
    shown,
    api: {
      show: (spec: ToastSpec) => {
        shown.push(spec);
        return shown.length;
      },
    },
  };
}

/* ---------------------------------------------------------------- *
 *  The mark: never color alone
 * ---------------------------------------------------------------- */

test("the assistant's label is an icon AND a word", () => {
  const html = es(<AssistLabel />);
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
  assert.match(html, />Asistente<\/span>$/);
});

test("the mark on a value is a named button that opens a dialog", () => {
  const html = es(
    <AssistedValue
      origin={{
        source: { label: "orden de compra PO/2026/0042" },
        acceptedBy: "Carla Rojas",
      }}
    >
      30 días
    </AssistedValue>,
  );
  assert.match(html, /30 días/);
  assert.match(html, /<button[^>]*aria-label="Lo completó el asistente"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(es(<AssistMark />), /data-assist="mark"/);
});

test("the history entry carries the mark, the assistant, who accepted and the source", () => {
  installCopy(SPANISH_COPY);
  const event = assistEvent({
    id: "a1",
    label: "completó 4 líneas",
    at: "2026-10-30T10:00:00Z",
    source: { label: "orden de compra PO/2026/0042", href: "/compras/42" },
    acceptedBy: "Andrés Gutiérrez",
  });
  installCopy();
  assert.equal(event.icon, ASSIST_ICON);
  assert.equal(event.by, "Asistente · Lo aceptó Andrés Gutiérrez");
  const detail = es(<>{event.detail}</>);
  assert.match(detail, /Fuente:/);
  assert.match(
    detail,
    /<a[^>]*href="\/compras\/42"[^>]*>orden de compra PO\/2026\/0042<\/a>/,
  );
});

/* ---------------------------------------------------------------- *
 *  A suggestion on a field
 * ---------------------------------------------------------------- */

test("a suggestion inside a field is a group named by the suggestion AND the field", () => {
  const html = es(
    <Field label="Plazo de pago">
      <NumberInput value={15} onChange={noop} />
      <AssistSuggestion
        value="30 días"
        source={{ label: "las últimas 5 facturas del cliente", onOpen: noop }}
        onAccept={noop}
        onDismiss={noop}
      />
    </Field>,
  );
  const group = /<div role="group" aria-labelledby="([^"]+) ([^"]+)"/.exec(html);
  assert.ok(group, "a named group");
  assert.match(html, new RegExp(`id="${group[1]}" hidden="">Sugerencia del asistente<`));
  assert.match(html, new RegExp(`<label id="${group[2]}"[^>]*>Plazo de pago`));
  assert.match(html, /Asistente sugiere/);
  assert.match(html, />30 días</);
  assert.match(html, /Fuente:/);
  assert.match(html, /role="link"[^>]*>las últimas 5 facturas del cliente</);
  assert.match(html, /<button[^>]*>.*Aceptar<\/button>/);
  assert.match(html, /aria-label="Descartar la sugerencia"/);
  /* Never the gold: the suggestion is not the screen's main action. */
  assert.doesNotMatch(html, /data-emphasis="primary"/);
});

test("accepting applies, and its undo becomes the notice's «Deshacer»", () => {
  const toasts = fakeToasts();
  let value = 15;
  applyWithUndo(
    () => {
      const before = value;
      value = 30;
      return () => {
        value = before;
      };
    },
    toasts.api,
    acceptedMessage(COPY, "Plazo de pago"),
    COPY.assist.undo,
  );
  assert.equal(value, 30);
  assert.equal(toasts.shown.length, 1);
  const [notice] = toasts.shown;
  assert.equal(notice!.message, "Se aplicó la sugerencia del asistente en «Plazo de pago».");
  assert.equal(notice!.tone, "good");
  assert.equal(notice!.action!.label, "Deshacer");
  notice!.action!.onSelect!();
  assert.equal(value, 15, "undo restores");
});

test("no undo returned, or no notice stack: it applies and offers nothing", () => {
  const toasts = fakeToasts();
  let applied = 0;
  applyWithUndo(() => void (applied += 1), toasts.api, "x", "Deshacer");
  applyWithUndo(() => () => {}, null, "x", "Deshacer");
  assert.equal(applied, 1);
  assert.equal(toasts.shown.length, 0);
});

/* ---------------------------------------------------------------- *
 *  The pending state
 * ---------------------------------------------------------------- */

test("working: a polite status with its sentence, cancellable, the bars silent", () => {
  const html = es(
    <AssistPending label="Leyendo la orden de compra…" onCancel={noop} rows={3} />,
  );
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"[^>]*>Leyendo la orden de compra…</);
  assert.match(html, /<button[^>]*>Cancelar<\/button>/);
  assert.equal((html.match(/animate-pulse/g) ?? []).length, 3);
  assert.match(es(<AssistPending />), />El asistente está trabajando…</);
  assert.doesNotMatch(es(<AssistPending />), /Cancelar/);
});

/* ---------------------------------------------------------------- *
 *  The review of proposed changes
 * ---------------------------------------------------------------- */

function review(extra: { chosen?: readonly string[] } = {}) {
  return es(
    <ChangeReview
      title="Completar la factura desde la orden de compra"
      source={{ label: "orden de compra PO/2026/0042", href: "/compras/42" }}
      onApply={noop}
      onDiscard={noop}
      {...extra}
    >
      <ChangeReview.Group title="Campos">
        <ChangeReview.Change
          id="term"
          label="Plazo de pago"
          before="15 días"
          after="30 días"
        />
        <ChangeReview.Change id="ref" label="Referencia" before={null} after="PO/2026/0042" />
      </ChangeReview.Group>
      <ChangeReview.Group title="Líneas">
        <ChangeReview.Change id="L1" label="Cemento IP-30" after="Bs. 2.320,00" />
        <ChangeReview.Change id="L2" label="Flete" before="Bs. 150,00" unchosen />
      </ChangeReview.Group>
    </ChangeReview>,
  );
}

test("the review is a section named by its title, with the assistant and the source", () => {
  const html = review();
  const named = /<section aria-labelledby="([^"]+)"/.exec(html);
  assert.ok(named);
  assert.match(
    html,
    new RegExp(`<h3 id="${named[1]}"[^>]*>Completar la factura desde la orden de compra<`),
  );
  assert.match(html, />Asistente</);
  assert.match(html, /href="\/compras\/42"/);
});

test("each change has a check named by its label and its kind written, not colored", () => {
  const html = review();
  for (const label of ["Plazo de pago", "Referencia", "Cemento IP-30", "Flete"]) {
    assert.match(html, new RegExp(`<input[^>]*type="checkbox"[^>]*>.*?${label}`, "s"));
  }
  assert.match(html, /data-change="change"[\s\S]*?>cambia</);
  assert.match(html, /data-change="add"[\s\S]*?>nuevo</);
  assert.match(html, /data-change="remove"[\s\S]*?>se quita</);
  /* Before → after is read as a sentence; an empty before is said. */
  assert.match(
    html,
    /<span class="sr-only">de <\/span>.*15 días.*<span class="sr-only">a <\/span>.*30 días/s,
  );
  assert.match(html, />vacío</);
  assert.match(html, /line-through[^"]*">Bs\. 150,00</);
});

test("it opens with all but the unchosen changes, and «Aplicar» counts them", () => {
  const html = review();
  assert.match(html, />3 de 4 elegidos</);
  assert.match(html, />Aplicar 3 cambios</);
  assert.equal((html.match(/data-emphasis="primary"/g) ?? []).length, 1);
});

test("with nothing chosen «Aplicar» is off and the reason is said", () => {
  const html = review({ chosen: [] });
  assert.match(html, /Elegí al menos un cambio\./);
  assert.match(
    html,
    /<button[^>]*disabled=""[^>]*data-emphasis="primary"[^>]*>Aplicar 0 cambios/,
  );
});

test("inline under a rail that has the primary, «Aplicar» steps down", () => {
  const html = es(
    <ChangeReview emphasis="secondary" onApply={noop} onDiscard={noop}>
      <ChangeReview.Change id="a" label="Vence" before="15/11" after="30/11" />
    </ChangeReview>,
  );
  assert.doesNotMatch(html, /data-emphasis="primary"/);
  assert.match(html, />Aplicar 1 cambio</);
  assert.match(html, />Cambios propuestos</, "the copy's title when none is given");
});

test("the selection logic: kinds, initial choice, toggling in listed order, all/some/none", () => {
  assert.equal(changeKind({ after: 1 }), "add");
  assert.equal(changeKind({ before: 1 }), "remove");
  assert.equal(changeKind({ before: null, after: 1 }), "change");
  assert.equal(changeKind({ after: 1, kind: "change" }), "change");

  const order = ["term", "ref", "L1", "L2"];
  assert.deepEqual(
    initiallyChosen([
      { id: "term", label: "" },
      { id: "L2", label: "", unchosen: true },
    ]),
    ["term"],
  );
  /* Clicked last, listed second: the payload reads like the screen. */
  assert.deepEqual(toggleChosen(order, ["L1"], "ref", true), ["ref", "L1"]);
  assert.deepEqual(toggleChosen(order, ["ref", "L1"], "ref", false), ["L1"]);
  assert.equal(chosenState(order, []), "none");
  assert.equal(chosenState(order, ["L1"]), "some");
  assert.equal(chosenState(order, order), "all");
});

test("applying hands the chosen ids to the screen, and its undo to the notice", () => {
  const toasts = fakeToasts();
  let lines = ["A"];
  const chosen = toggleChosen(["L1", "L2", "L3"], ["L1", "L3"], "L2", false);
  applyWithUndo(
    () => {
      const before = lines;
      lines = [...lines, ...chosen];
      return () => {
        lines = before;
      };
    },
    toasts.api,
    appliedMessage(COPY, chosen.length),
    COPY.assist.undo,
  );
  assert.deepEqual(lines, ["A", "L1", "L3"]);
  assert.equal(toasts.shown[0]!.message, "Se aplicaron 2 cambios del asistente.");
  toasts.shown[0]!.action!.onSelect!();
  assert.deepEqual(lines, ["A"]);
  assert.equal(applyLabel(COPY, 1), "Aplicar 1 cambio");
  assert.equal(appliedMessage(COPY, 1), "Se aplicó 1 cambio del asistente.");
});
