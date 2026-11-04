import assert from "node:assert/strict";

import { ENGLISH_COPY, SPANISH_COPY, StepFlow, UiCopyProvider } from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: `StepFlow` — one operation in several steps, done in one sitting. Moving, the focus
 * and the keyboard are driven in a browser by its story («3 · Componentes/Pasos de una
 * sentada») and the «Importar» template; what is checked here is what each state DRAWS: which
 * step is on, what is left, the one primary and what it says, and a blocked step that says why.
 */

const noop = () => {};

function spanish(children: ReactNode): string {
  return renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>{children}</UiCopyProvider>,
  );
}

type Opts = {
  current?: string;
  busy?: boolean;
  blocked?: string;
  lastLabel?: string;
};

function flow({ current, busy, blocked, lastLabel }: Opts = {}) {
  return (
    <StepFlow
      {...(current === undefined ? {} : { current })}
      onFinish={noop}
      onCancel={noop}
      busy={busy ?? false}
    >
      <StepFlow.Step
        id="file"
        title="Subir el archivo"
        description="Una planilla con un contacto por fila."
        {...(blocked === undefined ? {} : { blocked })}
      >
        <p>contenido-archivo</p>
      </StepFlow.Step>
      <StepFlow.Step id="map" title="Mapear columnas">
        <p>contenido-mapeo</p>
      </StepFlow.Step>
      <StepFlow.Step
        id="review"
        title="Revisar"
        {...(lastLabel === undefined ? {} : { nextLabel: lastLabel })}
      >
        <p>contenido-revisar</p>
      </StepFlow.Step>
    </StepFlow>
  );
}

/** The primary button's markup. */
const primary = (html: string) =>
  html.match(/<button[^>]*data-emphasis="primary"[^>]*>.*?<\/button>/)?.[0] ?? "";

test("only the current step is drawn, with where it stands in words", () => {
  const html = spanish(flow());
  assert.ok(html.includes("contenido-archivo"));
  assert.ok(!html.includes("contenido-mapeo"), "a step not in sight is not drawn");
  assert.ok(html.includes("Paso 1 de 3"));
  assert.match(html, /<h2[^>]*tabindex="-1"[^>]*>Subir el archivo<\/h2>/);
  assert.ok(html.includes("Una planilla con un contacto por fila."));
  /* The live region is there from the start, so a move is read when its words change. */
  assert.match(html, /role="status"[^>]*>Paso 1 de 3: Subir el archivo</);
});

test("the strip says which step is on and which are left, never only by colour", () => {
  const html = spanish(flow({ current: "map" }));
  assert.match(html, /<ol aria-label="Pasos"/);
  assert.match(html, /aria-current="step"[^>]*>.*?Mapear columnas/);
  /* Done: a button, to go back and review, with its state in words. */
  assert.match(
    html,
    /<button[^>]*>(?:(?!<\/button>).)*Subir el archivo(?:(?!<\/button>).)*\(hecho\)/,
  );
  /* Pending: not a button — the next step does not know yet what to ask. */
  assert.match(html, /Revisar<\/span><span class="sr-only"> \(pendiente\)<\/span>/);
  assert.doesNotMatch(html, /<button[^>]*>(?:(?!<\/button>).)*Revisar/);
});

test("one primary: «Siguiente» while there is a next step, and «Atrás» only after the first", () => {
  const first = spanish(flow());
  assert.equal((first.match(/data-emphasis="primary"/g) ?? []).length, 1);
  assert.ok(primary(first).includes("Siguiente"));
  assert.ok(!first.includes(">Atrás<"), "no way back from the first step");
  assert.ok(first.includes(">Cancelar<"));

  const second = spanish(flow({ current: "map" }));
  assert.ok(second.includes(">Atrás<"));
  assert.equal((second.match(/data-emphasis="primary"/g) ?? []).length, 1);
});

test("on the last step the primary names what happens, or says «Terminar»", () => {
  assert.ok(primary(spanish(flow({ current: "review" }))).includes("Terminar"));
  const named = primary(
    spanish(flow({ current: "review", lastLabel: "Importar 6 contactos" })),
  );
  assert.ok(named.includes("Importar 6 contactos"));
  assert.ok(!named.includes("Siguiente"));
});

test("a blocked step turns the primary off AND says why, naming the button", () => {
  const html = spanish(flow({ blocked: "Elegí un archivo para seguir." }));
  const button = primary(html);
  assert.match(button, /disabled=""/);
  const described = button.match(/aria-describedby="([^"]+)"/)?.[1];
  assert.ok(described !== undefined, "the reason describes the button");
  assert.match(html, new RegExp(`id="${described}"[^>]*>.*?Elegí un archivo para seguir\\.`));
});

test("an answered step leaves the primary on, with no reason", () => {
  const button = primary(spanish(flow()));
  assert.doesNotMatch(button, /disabled=""/);
  assert.doesNotMatch(button, /aria-describedby/);
});

test("busy: the primary keeps its place and says so; the way back is off", () => {
  const html = spanish(
    flow({ current: "review", busy: true, lastLabel: "Importar 6 contactos" }),
  );
  const button = primary(html);
  assert.match(button, /aria-busy="true"/);
  assert.ok(button.includes("Importar 6 contactos"), "it keeps its label and its width");
  assert.match(html, /<button[^>]*disabled=""[^>]*>Atrás<\/button>/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Cancelar<\/button>/);
  assert.doesNotMatch(
    html,
    /<button[^>]*>(?:(?!<\/button>).)*Subir el archivo/,
    "a done step is not a button while it runs",
  );
  assert.match(html, /role="status"[^>]*>Procesando…</);
});

test("a current id that is not a step falls back to the first, not to a blank flow", () => {
  const html = spanish(flow({ current: "renamed" }));
  assert.ok(html.includes("contenido-archivo"));
});

test("steps inside a fragment count; what is not a step is not drawn", () => {
  const html = spanish(
    <StepFlow onFinish={noop}>
      <p>suelto</p>
      <>
        <StepFlow.Step id="a" title="Uno">
          <p>uno</p>
        </StepFlow.Step>
        <StepFlow.Step id="b" title="Dos">
          <p>dos</p>
        </StepFlow.Step>
      </>
    </StepFlow>,
  );
  assert.ok(html.includes("Paso 1 de 2"));
  assert.ok(!html.includes("suelto"));
  assert.ok(!html.includes(">Cancelar<"), "no «Cancelar» without onCancel");
});

test("no steps, nothing drawn", () => {
  assert.equal(spanish(<StepFlow onFinish={noop} />), "");
});

test("its words come from the copy table", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={ENGLISH_COPY}>{flow({ current: "map" })}</UiCopyProvider>,
  );
  assert.ok(html.includes("Step 2 of 3"));
  assert.ok(html.includes("(done)"));
  assert.ok(html.includes("(to do)"));
  assert.ok(html.includes(">Back<"));
  assert.ok(primary(html).includes("Next"));
});
