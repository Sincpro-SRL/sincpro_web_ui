import assert from "node:assert/strict";

import { Button, Field, Skeleton, TextInput } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: what a person sees of «what is going on» while working, now drawn by the pieces
 * themselves. The browser story (`4 · Vistas/Registro › Editar sin acciones`) drives it end to
 * end — the focus kept on a busy Save, «Guardado» after it —; the markup pins the contracts.
 */

const draw = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

test("a busy button stays enabled — it keeps the focus — and says it is busy", () => {
  const out = draw(
    <Button role="primary" busy onClick={() => {}}>
      Guardar
    </Button>,
  );
  assert.match(out, /aria-busy="true"/);
  assert.match(out, /aria-disabled="true"/);
  assert.doesNotMatch(out, /disabled=""/);
  /* Its icon becomes the turning mark, only with motion allowed; the label stays. */
  assert.match(out, /motion-safe:animate-spin/);
  assert.match(out, />Guardar</);
});

test("a field that changed is marked by its label and described to a screen reader", () => {
  const out = draw(
    <Field label="Razón social" changed>
      <TextInput value="Andina" onChange={() => {}} />
    </Field>,
  );
  const changedId = /<span id="([^"]+)" class="sr-only">changed<\/span>/.exec(out)?.[1];
  assert.ok(changedId, "the word is there for a screen reader");
  assert.match(out, new RegExp(`aria-describedby="[^"]*${changedId}`));
});

test("a field that did not change carries no mark", () => {
  const out = draw(
    <Field label="Razón social">
      <TextInput value="Andina" onChange={() => {}} />
    </Field>,
  );
  assert.doesNotMatch(out, /changed/);
});

test("a skeleton appears late: a fast read never flashes it", () => {
  assert.match(draw(<Skeleton label="Loading" />), /animate-reveal-late/);
});
