# What is missing — inventory of @sincpro/web-ui

Measured against what an Odoo screen (and a modern ERP) needs, grouped by the
question it answers. Each row says whether it already exists, in which piece, and whose it is: **web-ui**
(how it looks), **composer** (where it opens and how it moves), **web-framework** (where the
data comes from). What is marked ✅ with a date was done in the round of 2026-10-31.

## 1. One record

| Need                                                                      | Status   | Piece / owner                                                                      |
| ------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| Identity, rail, breadcrumbs, pager, actions, stages                       | ✅       | `Record`, `Record.Rail`, `StatusBar`                                               |
| Bar and sheet in a single column; full width                              | ✅ 10-31 | `Record.Paper width`                                                               |
| Hierarchy: title › group › label › value                                  | ✅ 10-31 | `SheetGroup` (title with a rule), `HEADER_TEXT`                                    |
| What the record IS (paid, archived, cancelled)                            | ✅ 10-31 | `Record.Ribbon`                                                                    |
| Editing without `Record.Actions` does not lose focus                      | ✅ 11-03 | `RecordHeader`: `dirty` no longer decides the role                                 |
| What changed, while editing: a mark per field and «2 cambios sin guardar» | ✅ 11-03 | `Field changed`, `DirtyState.changes`                                              |
| Save without losing focus or saving twice                                 | ✅ 11-03 | `Button busy` (in `DirtyActions`); when done, focus returns to the name            |
| Knowing it was saved, without the app writing it                          | ✅ 11-03 | «✓ Guardado» in the rail (`useJustSaved`, `status` region)                         |
| Why it cannot be saved, in view and not in a `title`                      | ✅ 11-03 | `DirtyState.blocked` in place of «sin guardar», and it describes the button        |
| Focus is seen arriving and the label goes with it                         | ✅ 11-03 | `focus-in` (only with motion allowed), `Field` with `focus-within`                 |
| A fast load does not flash a skeleton                                     | ✅ 11-03 | `animate-reveal-late` (appears at 200 ms) in `Skeleton` and `RecordSkeleton`       |
| A long fact (an email) does not overlap the one beside it                 | ✅ 11-03 | `Sheet` (`wrap-anywhere`); density is given by `DensityProvider`                   |
| Who created it and who touched it last                                    | ✅ 10-31 | `Record.Audit`                                                                     |
| The authorship footer speaks like the form: person chip, DD/MM/YYYY       | ✅ 11-04 | `Record.Audit` (`by` optional or the chip's props; `at` as `Date`/ISO)             |
| Notices, field notes, activity, history                                   | ✅       | `Record.Notice`, `note`, `Record.Activity`                                         |
| Open a record from another (sub-context)                                  | ✅       | composer (modal, preview, on the side, page)                                       |
| Priority (stars)                                                          | ✅ 10-31 | `Priority`                                                                         |
| Editable kanban state (traffic light)                                     | ✅ 10-31 | `KanbanState`                                                                      |
| Next activity on the card (clock by urgency)                              | ✅ 10-31 | `ActivityBadge`                                                                    |
| Rich text field (html)                                                    | ✅ 11-04 | `RichTextInput` (Tiptap v3, loaded on edit), `RichTextValue` (DOMPurify)           |
| Record attachments (list, preview, download)                              | ✅ 11-04 | `Attachments` (`components/attachments`): upload, open, download, remove with undo |
| Editable image / avatar                                                   | ✅ 11-04 | `ImageInput` (choose/drop/paste, keyboard crop)                                    |
| Signature                                                                 | ✅ 11-04 | `SignatureInput` (draw, or type the name)                                          |

## 2. A collection of records

| Need                                                                                  | Status   | Piece / owner                                                               |
| ------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| Rows, table, board, sheet, report, pivot                                              | ✅       | `List.*`                                                                    |
| Read-only vs. openable; 👁 preview and ↗ open                                          | ✅ 10-31 | `List readOnly`, `onPeek`, `onOpen`                                         |
| Rows header aligned to the pixel                                                      | ✅ 10-31 | `List.Rows header`                                                          |
| Embedded list with a title when it stands alone                                       | ✅ 10-31 | `List.Identity` in `embedded`                                               |
| Board BY STAGES with drag between columns                                             | ✅ 10-31 | `List.Board stages` (`BoardColumns`), Alt + ← / →                           |
| Reorder rows by dragging (sequence)                                                   | ✅ 10-31 | `EditableTable` / `LineItems` `onReorder`                                   |
| State per cell and per line (readonly, required, hidden), as the server sends it      | ✅ 11-03 | `EditableTable` / `LineItems` `cellState`, `rowState`                       |
| Error per cell: below the value, `aria-invalid` and `aria-describedby` on its control | ✅ 11-03 | `EditCellState.error` + `ControlStateContext` (`foundations/form` contract) |
| Notice on ONE value of the line, in its cell                                          | ✅ 11-03 | `EditCellState.flag` (the line's is still `flag`)                           |
| 2,000 lines being typed without freezing (36 ms per key; before 273)                  | ✅ 11-03 | `EditableTable` with `rowWindow` from 200 rows; `reveal` for `Home`/`End`   |
| Choose «the 187 that match», not just the page                                        | ✅ 10-31 | `selection.matching`                                                        |
| Calendar view of records                                                              | ✅ 10-31 | `List.Calendar` (`RecordCalendar`, FullCalendar v7)                         |
| Project Gantt (tasks, dependencies, progress)                                         | ✅ 10-31 | `List.Gantt` (`RecordGantt`, SVAR)                                          |
| Grouped planning (Odoo's «Gantt»)                                                     | ✅ 10-31 | `List.Timeline` (`RecordTimeline`), `TimelineToolbar`                       |
| Kanban: quick create, total, activity bar, collapse, add stage                        | ✅ 10-31 | `List.Board stages`                                                         |
| Per-resource calendar, automatic scheduling, critical path                            | 💲       | license: FullCalendar scheduler / SVAR PRO                                  |
| Export what is seen (xlsx)                                                            | ✅       | `foundations/xlsx`                                                          |
| A presentation of your own (map, gallery, floor plan) with the same set               | ✅ 11-03 | `List.Present` (`ListSet`: order, piles, selection)                         |
| An operation over N chosen records (Odoo's «wizard»)                                  | ✅ 11-03 | `5 · Plantillas/Operación`: `Record` in a modal + `api.pick`                |
| An operation in SEVERAL steps in one sitting (import: upload › map › review)          | ✅ 11-04 | `StepFlow` (`components/flow`); `5 · Plantillas/Importar`                   |
| Thousands of rows in the table: draws only the ones in view (from 200)                | ✅ 11-03 | `DataTable` (`primitives/table/rowWindow`)                                  |
| The table draws the piles the server counted, with «Ver N más»                        | ✅ 11-03 | `DataTable piles`, `Grouping.onMore` (rows, board, table, `ListSet.more`)   |
| A pile's «Ver más» says what it brings («Ver 50 más de 49.950») and stops at the cap  | ✅ 11-03 | `Pile.more`, `pileFoot`, `PileFootLine` (rows, board, table, custom)        |
| A card of your own on the board opens like the system's                               | ✅ 11-03 | `List.Board card(item, ways)` (`CardWays`, like `ListSet`)                  |
| Ask again without the rows disappearing                                               | ✅ 11-03 | `List state.refreshing`: the rows stay, a discreet bar and `aria-busy`      |
| A person's card draws their face                                                      | ✅ 11-03 | `RecordCard media.person`, like `RelationCard`                              |
| Several sets at once (reconciliation), each with its own search                       | ✅ 11-03 | `Panes` / `Pane`; `5 · Plantillas/Conciliación`                             |

## 2b. Formatted values — show and edit (round of 2026-11-04)

Each control writes and reads the same way: when editing it asks for the value the way people write it, when
reading (`mode="read"`) it draws it as a datum, in the copy's language.

| Need                                                                                         | Status   | Piece                                                                    |
| -------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| Amount with currency, percentage, number with unit, fixed decimals (edit and read)           | ✅       | `NumberInput format/unit/step`                                           |
| The same format outside the form (cell, figure), in the `UiCopyProvider`'s language          | ✅ 11-04 | `Numeric format={Intl.NumberFormatOptions}`, `formatWith`                |
| A model's `monetary`/`float`/`decimal` field is a numeric column, aligned and formatted      | ✅ 11-04 | `columnsFromModel`, `isNumericType`                                      |
| Password: eye to show, Caps Lock warning, never visible when reading                         | ✅ 11-04 | `PasswordInput`                                                          |
| «Today» is the business's day, not the browser's: marked and opened on in the calendar       | ✅ 11-06 | `Calendar today`, `DatePicker today` (an ISO day)                        |
| Card number: groups by brand, brand, Luhn, stable cursor, `•••• 4242` when reading           | ✅ 11-04 | `CardNumberInput`, `card.ts` (`isValidCardNumber`, `cardBrand`…)         |
| Sort by several fields: Shift+click on headers and a panel in the bar (drag)                 | ✅ 11-04 | `sort: SortState[]`, `Th`, `SortMenu` (`GridList` + `useDragAndDrop`)    |
| Email, phone, web: correct keyboard and autofill; when reading, a link                       | ✅ 11-04 | `EmailInput`, `PhoneInput`, `UrlInput` (+ `isEmail`, `isUrl`, `urlHref`) |
| Full card: MM/YY expiry (not expired) and security code (3/4 by brand)                       | ✅ 11-04 | `CardExpiryInput`, `CardCodeInput` (+ `isExpiryValid`, `cardCodeLength`) |
| Duration in hours («8:30» ↔ 8.5 h), like Odoo's `float_time`                                 | ✅ 11-04 | `DurationInput`, `formatDuration`, `parseDuration`                       |
| Choose the unit or currency in the same box as the number (kg / t, Bs / USD)                 | ✅ 11-04 | `NumberInput units` (named by its field)                                 |
| Explicit rounding: to the multiple (0.05 of a box, the unit's precision), and how            | ✅ 11-04 | `roundTo(value, increment, method)`; `NumberInput`/`Numeric` `rounding`  |
| A masked identifier (NIT, CI, bank account, IBAN) with a stable cursor                       | ✅ 11-04 | `PatternInput`, `isPatternComplete` (shared cursor: `mask.ts`)           |
| N-digit verification code (OTP), pasted whole                                                | ✅ 11-04 | `CodeInput` (a single field, `one-time-code`)                            |
| A signed amount that reads well: negatives in red with their sign, accounting in parentheses | ✅ 11-04 | `Numeric signed`                                                         |
| Color: label palette (Odoo's color index) and hex                                            | ✅ 11-04 | `ColorInput` (React Aria `ColorField` + `ColorSwatchPicker`)             |
| A model's listing draws each type: email, web and phone as a link, duration, yes/no, date    | ✅ 11-04 | `columnsFromModel` (`modelCellKind`)                                     |
| A real sheet with all these controls, in reading and editing                                 | ✅ 11-04 | `5 · Plantillas/Ficha de contacto`                                       |

## 3. Choose and search

| Need                                                                                                | Status   | Piece / owner                                                                       |
| --------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| Bar with facets, filters, grouping, favorites                                                       | ✅       | `SearchBar`                                                                         |
| Many cuts without breaking the bar                                                                  | ✅ 10-31 | grouping chain, «+N», cap per chip                                                  |
| Criteria builder with JSON                                                                          | ✅       | `CriteriaBuilder`                                                                   |
| many2one with columns to tell them apart                                                            | ✅       | `Picker`                                                                            |
| «Buscar más…» (one and many/add), with the list's search, order and pages                           | ✅ 10-31 | `api.pick` + `List onChoose` (many: `selection.actions`)                            |
| many2many as chips, with «Buscar más…»                                                              | ✅ 10-31 | `TagsField onBrowseAll`                                                             |
| many2many: the datum that tells two options apart (the NIT), searchable and off the chip            | ✅ 11-03 | `TagOption.meta`                                                                    |
| An option that does not fit «name + datum + aside»                                                  | ✅ 11-03 | `renderOption` in `Picker` and `TagsField`; `MatchedText`                           |
| Command palette                                                                                     | ✅       | composer (⌘K)                                                                       |
| Literal search highlighted (accent-insensitive), and «coincide NIT…» when it matches what is hidden | ✅ 10-31 | `Picker`, `TagsField` (`foundations/match`)                                         |
| Create from the field: «Crear «…»» and «Crear y editar…»                                            | ✅ 10-31 | `Picker onCreate`, `onCreateAndEdit`                                                |
| Chooser rows with widgets (face, state, balance on the right)                                       | ✅ 10-31 | `PickerItem.avatar`, `tags`, `aside`                                                |
| «Buscar más…» with several presentations (table, rows, sheet, calendar)                             | 🟡       | the chooser is a `List`: table and rows ✅; sheet and calendar, still to show       |
| Search against the server with the model's facets                                                   | 🟡       | web-ui gives the bar; web-framework brings the model                                |
| A selector that searches on the SERVER: it does not filter or cut what it is given                  | ✅ 10-31 | `Picker onSearch`; the chosen one's name outside the page, `valueLabel`             |
| A many2many that searches on the SERVER (chips over thousands)                                      | ✅ 10-31 | `TagsField onSearch`: it does not filter what it is given; the chosen do not return |
| A group says how much it sums, not just how many there are                                          | ✅ 10-31 | `Pile.detail` → `GroupHeader detail` (summed by whoever holds the data)             |
| Literal search in the bar («Buscar «X»» over the whole set, with Enter)                             | ✅ 10-31 | `SearchBar literal`: first, unless the model reads what is typed as a question      |
| An amount (`decimal`, `monetary`) is asked as a number                                              | ✅ 10-31 | `kindOf` read it as text: «total <= 1000» could not be asked                        |
| The bar with chips placed: the field and the panel button keep their name                           | ✅ 11-03 | `SearchBar`: «Buscar» and «Filtrar, agrupar y favoritos, N puestos»                 |
| The bar's suggestions are options (ARIA combobox)                                                   | ✅ 11-03 | `SearchBar`: `listbox` / `option`, `aria-activedescendant`                          |
| The application's words with the same mechanism as the package's                                    | ✅ 11-03 | `createCopy`; a `Provider` changes its branch and never the installed copy          |

## 4. Where it opens (workspace)

| Need                                                   | Status   | Owner                                                           |
| ------------------------------------------------------ | -------- | --------------------------------------------------------------- |
| Preview, panel, window, page with breadcrumbs, ⌘K      | ✅       | composer                                                        |
| The surfaces composer dresses (Peek, Dialog, Missing)  | ✅       | web-ui (`Peek onPromote`, `Dialog onExpand`)                    |
| Modals INSIDE the panels                               | 🟡       | composer — being refactored (2026-10-31)                        |
| Phone: everything is a page, preview as a bottom sheet | ❌       | composer                                                        |
| Templates that show web-ui + composer together         | ✅ 10-31 | `5 · Plantillas/Espacio de trabajo`                             |
| The `api.pick` window with a requested size            | ❌       | composer (today it opens 480×360)                               |
| Open a relational: modal by default + «Abrir en…»      | ✅ 10-31 | `RelationValue onOpenIn`, `Picker onOpen(id, to)`, `OpenTarget` |
| A tag (many2many) opens its record in preview          | ✅ 10-31 | `TagsField onOpen`, `openTarget`                                |
| All templates over composer (modals, preview, ⌘K)      | ✅ 10-31 | `5 · Plantillas/*`                                              |
| Guide «Nuestro estilo · cómo abrimos las cosas»        | ✅ 10-31 | `stories/Estilo.mdx`                                            |
| A single «opener» that web-framework wires up once     | ❓       | to be decided: web-ui (context) or web-framework                |

## 5. Tests

| Need                                                 | Status   | Owner                                                       |
| ---------------------------------------------------- | -------- | ----------------------------------------------------------- |
| Logic and static HTML                                | ✅ 10-31 | `tests/`, vitest `model` project                            |
| Interaction inside the story (`play`), like composer | ✅ 10-31 | `storybook` and `storybook-dark` projects                   |
| Accessibility (axe) as an error in every story       | ✅ 11-03 | `a11y: "error"`; what is excluded says why, right beside it |
