# Production review — new libraries and the file, chat, markdown and canvas pieces

Date: 2026-11-04. Scope: `react-pdf`, `streamdown` and `@xyflow/react` added to the package,
plus the pieces that use them. Everything below was measured; what was not measured is said so.

## 1. Verdict

**Yes, they are fit for production**, with three conditions that are already applied in the code:

1. No heavy piece enters the main bundle: pdf.js is loaded only when a PDF is opened,
   streamdown only when markdown is opened or `Markdown` is used, and `Canvas` only if the app imports it.
2. streamdown's styles live in `tokens.css`, so the app still imports a single
   file (the package's contract holds).
3. The package requires Node 26 to install; that was already declared before this change (see §5).

## 2. Maturity and licenses

| Package         | Version | Last published | License    | React peer | Verdict                                  |
| --------------- | ------- | -------------- | ---------- | ---------- | ---------------------------------------- |
| `react-pdf`     | 11.0.0  | 2026-09-10     | MIT        | ^19        | Fit. On `pdfjs-dist` 6.3.x (Apache-2.0). |
| `streamdown`    | 2.7.1   | 2026-10-19     | Apache-2.0 | ^18 ‖ ^19  | Fit. Maintained by Vercel.               |
| `@xyflow/react` | 12.12.1 | 2026-11-04     | MIT        | >=17       | Fit.                                     |

- **Dependency audit** (`yarn audit`, production dependencies): **0 vulnerabilities**
  in 296 packages.
- **New tree**: 150 packages added to the lockfile, none removed. **All** have a
  permissive license (126 MIT, 9 ISC, 3 Apache-2.0, 1 BSD-3, 1 BSD-2).
- **Native binaries**: `@napi-rs/canvas` arrives as an _optional_ dependency of pdf.js, meant
  for Node. Only the binary for the developer's platform is installed; it does not enter the
  browser bundle (verified with the build).

## 3. Measured size (consumer bundles, minified, gzip)

Each measurement is an independent bundle that imports **only** the indicated piece, with the
package's modules compiled (`make build`):

| Consumer entry                                          | Gzip              |
| ------------------------------------------------------- | ----------------- |
| `Button` alone (the system's reference)                 | **6 KB**          |
| `ChatThread` alone (full chat)                          | **13 KB**         |
| `Canvas` alone (React Flow)                             | **72 KB**         |
| `Markdown` alone (streamdown)                           | **170 KB**        |
| Image preview (initial chunk)                           | **~59 KB** shared |
| PDF preview (pdf.js chunk, when opening a PDF)          | **+193 KB**       |
| Markdown preview (streamdown chunk, when opening a .md) | **+161 KB**       |

Reading: whoever does not use these pieces pays nothing (the package declares `sideEffects` only for CSS,
so the bundler discards what is not imported). Whoever uses them pays the cost in the table.

**Recommendation for the app**: load `Canvas` and `Markdown` with `lazy()` if they appear on
a screen that is not the main one. `FilePreview` already does it for both internally.

## 4. Implementation decisions

- **PDF** (`components/preview/PdfPreview`): `react-pdf` with `renderTextLayer` and
  `renderAnnotationLayer` turned off. That way its stylesheet is not needed and there are no layers that
  misalign with zoom. The pdf.js worker is resolved from the dependency; an app with a strict CSP
  or that serves the worker from its CDN passes `pdfWorkerUrl`.
- **Markdown** (`primitives/value/Markdown`): streamdown with `mode` `static`/`streaming`. For
  text that is still arriving, it holds back what cannot be read yet. Verified on the server:
  a `<script>` in the markdown does not reach the HTML (test `markdown.test.tsx`), and in the browser the
  «Hostil» story checks that there is no script or `onerror` in the DOM.
- **Styles**: `tokens.css` carries two `@source` entries for streamdown (the repo's path and the
  consumer's hoisted install path; the one that does not exist does nothing) and its animation CSS.
  An app adds nothing else.
- **Canvas** (`components/canvas/Canvas`): controlled (the app stores nodes and connections),
  `readOnly` for reference diagrams, and React Flow's variables mapped to tokens in
  `canvas.css`.
- **Chat**: a thread that opens on the last message and follows the end only if the person is already there;
  composer with Enter to send and Shift+Enter for a new line (ignores IME
  composition); a conversation list on React Aria's `ListBox` with unread counts as numbers.
- **Files**: `Attachments` already listed and downloaded; it was not duplicated. `FilePreview` was added,
  which dispatches by type and keeps the download always visible.

## 5. Node 26 requirement (pre-existing, not introduced here)

`package.json` declares `"engines": { "node": ">=26" }` from before this change. Yarn refuses
to install with Node 22 (`The engine "node" is incompatible`). To work in the repo you have to
use Node 26 (`nvm use 26`). The most demanding new dependency, `pdfjs-dist`, asks for Node
22.13 or higher: it is not the reason for the requirement.

## 6. Tests

- **Node** (`vitest --project model`): **832/832**.
- **Chrome** (`storybook` and `storybook-dark`, all stories, including the `play`s and the
  accessibility check with axe): **393/394** in the previous full run; the last one (with the copyable notices) gave **392/394**, with the same pre-existing failure. After that
  run I changed the download button to `ButtonLink`; its story (`Preview`) passes 5/5, but I did not
  repeat the full suite. The only failure is
  `CRM › Oportunidad` in dark mode (see §7).
- `tsc`, `lint` and `make doctor` (level rules): no errors.
- I did not run the `make smoke` target as such; I ran the same Storybook projects it uses
  (`storybook` and `storybook-dark`), which include each story's `play`s and axe.

## 7. Open risks

1. **`CRM › Oportunidad` (dark mode) fails in the full suite.** Verified: the original commit
   (`d1d095b`, without my changes) fails the same way in the same run, in light and dark.
   It is pre-existing, and I did not fix it here. The error is an `act(...)` that appears during the click
   on «Ganado». It runs fine in isolation; it fails under the suite's load.
2. **The slow-loading stories** (PDF, file markdown) now wait for their content with
   10 s timeouts. The first load of pdf.js and streamdown after installing takes more than 1 s on
   the dev server.
3. **pdf.js worker under CSP**: if the app blocks `blob:` or the worker's origin, the PDF
   preview fails with the error piece (which carries the copy-the-error button). Solution:
   `pdfWorkerUrl`.
4. **Streamdown and its `linkSafety`** were left at their default value; I did not verify in
   documentation what it is, only that the option exists. Review before showing third-party markdown
   in production.
5. **Canvas and licenses**: `tldraw` and `excalidraw` were not added; their license is not verified
   and they are not needed for what was asked (React Flow covers diagrams and flows).

## 8. What was left out on purpose

- An Office viewer (Word, Excel): the viewers that do it send the document to a third party.
  The preview says there is no preview and leaves the download.
- Free-form whiteboard (`tldraw`): pending a verified license.
