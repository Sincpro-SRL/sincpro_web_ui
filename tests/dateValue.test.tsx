import assert from "node:assert/strict";
import { test } from "node:test";

import { DateValue, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: a date field stores a day as `YYYY-MM-DD`. `new Date("2026-11-15")` is midnight in
 * UTC — in La Paz (UTC−4) the evening of the 14th — so a due date drawn with `DateValue`
 * showed the day before. A day is a day where it is read.
 */
test("a YYYY-MM-DD day is drawn as that same day, west of Greenwich too", () => {
  const was = process.env.TZ;
  process.env.TZ = "America/La_Paz";
  try {
    const html = renderToStaticMarkup(
      <UiCopyProvider copy={SPANISH_COPY}>
        <DateValue when="2026-11-15" format="date" />
      </UiCopyProvider>,
    );
    assert.match(html, />15\/11\/2026</, html);
  } finally {
    if (was === undefined) delete process.env.TZ;
    else process.env.TZ = was;
  }
});
