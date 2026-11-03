import assert from "node:assert/strict";

import { createCopy, mergeCopyOver } from "@sincpro/web-ui/foundations/catalog";
import {
  currentCopy,
  installCopy,
  UiCopyProvider,
  useUiCopy,
} from "@sincpro/web-ui/foundations/copy";
import { SPANISH_COPY } from "@sincpro/web-ui/foundations/copy.es";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the three rules of `catalog.tsx`, the mechanism web-ui's words and an
 * application's own words share. Each one closed a real failure: a provider that wrote the
 * global table (a corner in another language switched the whole screen, and a test passed
 * only because an earlier one had left Spanish behind), a provider that started over from
 * English (renaming one word in a Spanish app turned the rest of its branch English), and a
 * merge one level deep (renaming one join word emptied the other two).
 */

function Joins() {
  const { search } = useUiCopy();
  return (
    <span>{`${search.joins.all}|${search.joins.any}|${search.joins.none}|${search.and}`}</span>
  );
}

test("a provider changes its branch and never the installed words", () => {
  installCopy(SPANISH_COPY);
  const before = currentCopy();
  renderToStaticMarkup(
    <UiCopyProvider copy={{ search: { and: "and" } }}>
      <Joins />
    </UiCopyProvider>,
  );
  assert.equal(currentCopy(), before);
  assert.equal(currentCopy().search.and, "y");
});

test("a provider builds on what encloses it, not on English", () => {
  installCopy(SPANISH_COPY);
  const out = renderToStaticMarkup(
    <UiCopyProvider copy={{ search: { joins: { any: "alguna" } } }}>
      <Joins />
    </UiCopyProvider>,
  );
  assert.equal(out, "<span>todas|alguna|ninguna|y</span>");
});

test("providers nest: the inner one on top of the outer one", () => {
  installCopy();
  const out = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <UiCopyProvider copy={{ search: { and: "&" } }}>
        <Joins />
      </UiCopyProvider>
    </UiCopyProvider>,
  );
  assert.equal(out, "<span>todas|cualquiera|ninguna|&amp;</span>");
});

test("an override merges deep: one word changes, its siblings stay", () => {
  const base = { search: { joins: { all: "all", any: "any" }, and: "and" } };
  assert.deepEqual(mergeCopyOver(base, { search: { joins: { any: "o" } } }), {
    search: { joins: { all: "all", any: "o" }, and: "and" },
  });
});

test("an application's own catalog works the same way, apart from web-ui's", () => {
  const app = createCopy({ invoice: { post: "Post", cancel: "Cancel" } });
  function Post() {
    return <span>{app.useCopy().invoice.post}</span>;
  }
  assert.equal(renderToStaticMarkup(<Post />), "<span>Post</span>");
  app.install({ invoice: { post: "Publicar" } });
  assert.equal(renderToStaticMarkup(<Post />), "<span>Publicar</span>");
  assert.equal(app.current().invoice.cancel, "Cancel");
  assert.equal(
    renderToStaticMarkup(
      <app.Provider copy={{ invoice: { post: "Confirmar" } }}>
        <Post />
      </app.Provider>,
    ),
    "<span>Confirmar</span>",
  );
  assert.equal(app.current().invoice.post, "Publicar");
});
