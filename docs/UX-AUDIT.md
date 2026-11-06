# UX/UI audit — 2026-11-04

Review of the experience in Storybook (Playwright, desktop 1360 px) against
`PRINCIPLES.md`, plus the inventory of what is missing. Each finding carries the evidence
(screenshot or measurement) and, when there is one, the change applied.

## 1. Findings and status

| #   | Finding                                                                                                                                                        | Evidence                                                                      | Principle                    | Status                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | An error cannot be copied: `Failed` and `Missing` show the text and nothing else. Neither does the field-error dialog.                                         | `stories/primitives/Notice.stories.tsx` («Fallo»), «Aplicar descuento» dialog | 7 (error tolerance)          | **Done** in `Failed`, `Missing`, `Callout` (`bad` tone), `Toast` (`bad` tone) and `Field`'s error: a «Copiar el error» button with the report (what happened, technical detail, date and page). |
| 2   | Thin padding: the rail and the list bar used a 14 px margin.                                                                                                   | Measured in CRM › Actividades: `Pipeline` 12–14 px from the edge              | 1 (hierarchy) and legibility | **Done** in `ListingBar` (comfortable: `px-5 py-3`, 20 px). The gutter of `AppFrame` and of the record is still to be reviewed.                                                                 |
| 3   | The header repeats the name: a small «Pipeline» label top left and the big «Pipeline» title below, separated by the search bar.                                | CRM › Actividades, viewport screenshot                                        | 1 (hierarchy: where am I)    | Pending. Proposal: the small label goes (it is a redundant breadcrumb) or the search bar moves below the title.                                                                                 |
| 4   | Calendar events are cut off at 2–3 words («Llamar para confirm…») and the color dots (green, red, gray) have no legend.                                        | CRM › Actividades, November month                                             | 3 (color is never alone)     | Pending. Proposal: a legend with text and, in the cell, an icon or status word besides the dot.                                                                                                 |
| 5   | Stories with a dialog and an error state take a while to paint the first screenshot (Storybook's spinner appears even though the DOM already has the content). | Repeated screenshots of «Con error» and «Fallo»                               | — (audit tooling)            | Observed. Solved by reading the DOM before capturing; it is not a UI defect.                                                                                                                    |
| 6   | There are no chat components (only the composer and the timeline of `Activity`), nor file ones, nor image/PDF preview, nor markdown, nor canvas.               | Inventory of `src/components`                                                 | Missing                      | Plan below.                                                                                                                                                                                     |

No UI console findings: the only error is Storybook's `favicon.ico` 404.

## 2. What is missing and with what (research)

Criterion: that it be **modern and mature**, that it fit React 19 and Tailwind v4, and that the
design still be set by the system (tokens, React Aria, copy in the table). Versions and
dates come from the npm registry (`npm view`), not from vendor pages.

| Need                              | Candidate                                                   | Version · last published                    | Verdict                                                                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat (thread, bubbles, composer)  | **Our own** on React Aria and tokens                        | —                                           | Recommended. A kit with styles imposes its look and breaks the tokens rule.                                                                                                |
| Chat, headless alternative for AI | `@assistant-ui/react` (MIT)                                 | 0.15.32 · 2026-10-28 · peer React ^18 ‖ ^19 | Only if streaming from a model is added; its primitives are unstyled.                                                                                                      |
| Chat, hosted                      | `stream-chat-react`                                         | 14.16.0 · 2026-11-04                        | Rejected: the backend is a service of its own and the service's license is proprietary.                                                                                    |
| Chat, kit with styles             | `@chatscope/chat-ui-kit-react`                              | 2.1.1 · 2025-05-15                          | Rejected: no release for over a year.                                                                                                                                      |
| Markdown (messages, previews)     | **`streamdown`**                                            | 2.7.1 · 2026-10-19 · peer React ^18 ‖ ^19   | Recommended: API compatible with `react-markdown`, designed for content that arrives streaming.                                                                            |
| Markdown, stable base             | `react-markdown`                                            | 10.1.0 · 2025-03-07                         | Valid as a base; no release for over a year.                                                                                                                               |
| Highlighted code                  | `shiki`                                                     | 4.6.0 · 2026-11-02                          | Recommended for code blocks.                                                                                                                                               |
| PDF                               | **`react-pdf`** (wojtekmaj)                                 | 11.0.0 · 2026-09-10 · peer React ^19        | Recommended. Runs on pdf.js. A search indicates Node 22.13 or higher; verify in its README.                                                                                |
| PDF, viewer with a ready-made UI  | `@react-pdf-viewer/core`                                    | 3.12.0 · 2023-03-21                         | Rejected: no release since 2023, and one source indicates the repo was archived in 2026.                                                                                   |
| Image with zoom and pan           | Native + `react-zoom-pan-pinch`                             | not verified in this session                | To be verified on npm before adopting.                                                                                                                                     |
| Files: list, download, type       | Our own (`FileCard`, `FileList`) on the existing `DropZone` | —                                           | Recommended. Some «every kind of file» libraries render Office by sending the document to a third party (Microsoft Office Online); that is no good for internal documents. |
| Node canvas (diagrams, flows)     | **`@xyflow/react`** (React Flow)                            | 12.12.1 · 2026-11-04 · peer React >=17      | Recommended for a canvas of nodes and connections.                                                                                                                         |
| Free-form whiteboard              | `tldraw`                                                    | 5.6.0 · 2026-11-04                          | Valid for a whiteboard; **license to be verified** before using it in production.                                                                                          |
| Hand-drawn style whiteboard       | `@excalidraw/excalidraw`                                    | 0.18.1 · 2026-10-27 · peer React ^19        | Alternative; **license to be verified**.                                                                                                                                   |

Sources of the search (vendor pages are indicative; maturity was measured on npm):

- [React PDF viewers 2026 (Syncfusion)](https://www.syncfusion.com/blogs/post/best-react-pdf-viewers.md)
- [react-pdf-viewer (phuocng)](https://github.com/react-pdf-dev/react-pdf-viewer)
- [Streamdown vs markstream-react](https://markstream-vue-docs.simonhe.me/compare/streamdown.html)
- [assistant-ui: alternatives 2026](https://designrevision.com/alternatives/assistant-ui)
- [Excalidraw vs tldraw vs Miro SDK 2026](https://www.pkgpulse.com/guides/excalidraw-vs-tldraw-vs-miro-sdk-collaborative-2026)
- [tldraw on GitHub](https://github.com/tldraw/tldraw)
- [file-preview (wh131462)](https://github.com/wh131462/file-preview)

## 3. Proposed plan (in order)

1. **Errors** (done): copyable report in `Callout` `bad`, in `Toast` `bad` and in `Field`'s error.
2. **CRM padding and hierarchy**: remove the duplicated label from the header; review the
   gutter of `AppFrame` and `Record` with the same measurement (target 20 px in comfortable).
3. **Calendar**: status legend with text; events with an icon or word besides the dot.
4. **Files**: `FileCard` (icon by type, name, size, download, delete), `FileList`,
   and a `FilePreview` that dispatches by type: image (native + zoom), PDF (`react-pdf`), text and
   markdown (`streamdown`), and for the rest only icon + download.
5. **Chat**: `ChatThread` (bubbles, grouped by day, load earlier on top, jump to the end),
   `ChatComposer` (send with Enter, attachments), `ConversationList` (unread, search). It reuses
   `Activity`'s composer, it does not duplicate it.
6. **Markdown** (`streamdown`) as a read-only rich-text primitive, used by
   the chat and the previews.
7. **Canvas**: `CanvasPanel` on `@xyflow/react` for diagrams and flows; free-form whiteboard
   only if `tldraw`'s license is confirmed.

Each new piece follows `AGENTS.md`: level and family defined, tokens only, texts in the
copy table (English and Spanish), a story in its folder and a test that fails without the change.

## 4. What is left to decide

- **New dependencies**: `react-pdf`, `streamdown` and `@xyflow/react` add weight to the published
  package. They are proposed without installing yet; confirm before adding them.
- **Licenses**: `tldraw` and `excalidraw` were not verified in this session.
- **Pending verification**: `make smoke` (all stories in Chrome, light and dark)
  before delivering the errors and padding changes.

## 5. Layout sweep — 332 stories, desktop (1360 px) and phone (390 px)

Measured with Playwright over the real DOM: the page's horizontal scroll, text cut off without
ellipsis, overlaps between texts and controls in the normal flow, and the real distance from the
text to the edge of its box (padding). The foundations demos (`figcaption` legends placed
on top on purpose) and the external libraries (FullCalendar, Gantt, React Flow) are left out.

**Padding**: healthy on desktop after taking `ListingBar` to 20 px; what the sweep flags
(6 cases) are containers without a box of their own or the `@persona` mention, narrow on purpose.

**Fixed**

| Where                              | What was happening                                                                                          | Fix                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `SearchBar` (desktop)              | In a `flex` row with no width, the bar collapsed and the input ended up under the filters button («bu⊞car») | The bar does not go below `min-w-48` and the input `min-w-24` |
| `TopBar` (phone)                   | The menus were clipped: «Cl» stuck to the icons and the rest unreachable                                    | The menu strip scrolls (`scroll-quiet`)                       |
| `SmartButtons` in the rail (phone) | Each counter overflowed its cell, covered the next one and the last was clipped                             | The cells do not shrink and the group scrolls                 |
| `ChatComposer` (narrow)            | The box collapsed and «Enviar» sat on top of it                                                             | «Enviar» becomes icon-only below 20 rem (container query)     |
| «Tablero» story                    | The long title of the custom card spilled out of its card                                                   | `min-w-0` + `max-w-full` in the story                         |

**Pending (phone, 390 px)** — not fixed in this round:

- Forms with wide controls that overflow the page: «Controles · Números» (61 px),
  «Mirar y editar» (107 px), «Unidad y redondeo» (147 px), «Elecciones · en un formulario»
  (26 px).
- `SearchBar` with many chips («Probar», «Búsqueda literal») overflows ~110 px.
- Editable table in the list («Facturas editables», 187 px): the table is not in a container
  with its own scroll.
- Relational in a table: the link and the NIT overlap in narrow cells.
- The record's status bar: the action button sits on top of the stages.
- `SheetTable`: the «TRASPASO CTA PROPIA BNB» header is cut 22 px without ellipsis.
- `Peek`: «Abrir como panel» is clipped 16 px against the drawer's edge.
