# What is missing — inventory of @sincpro/web-ui

Measured against what an Odoo screen (and a modern ERP) needs, grouped by the
question it answers. Each row says whether it already exists, in which piece, and whose it is: **web-ui**
(how it looks), **composer** (where it opens and how it moves), **web-framework** (where the
data comes from). What is marked ✅ with a date was done in the round of 2026-10-31. What is marked
🧭 is the **modern direction** (`ViewStyleProvider value="modern"`): done, and the way new screens
are drawn — it keeps being applied to the rest of the system and refined.

## 1. One record

| Need                                                                                                                                                                                                                                   | Status   | Piece / owner                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| Identity, rail, breadcrumbs, pager, actions, stages                                                                                                                                                                                    | ✅       | `Record`, `Record.Rail`, `StatusBar`                                                             |
| Bar and sheet in a single column; full width                                                                                                                                                                                           | ✅ 10-31 | `Record.Paper width`                                                                             |
| Hierarchy: title › group › label › value                                                                                                                                                                                               | ✅ 10-31 | `SheetGroup` (title with a rule), `HEADER_TEXT`                                                  |
| What the record IS (paid, archived, cancelled)                                                                                                                                                                                         | ✅ 10-31 | `Record.Ribbon`                                                                                  |
| Editing without `Record.Actions` does not lose focus                                                                                                                                                                                   | ✅ 11-03 | `RecordHeader`: `dirty` no longer decides the role                                               |
| What changed, while editing: a mark per field and «2 cambios sin guardar»                                                                                                                                                              | ✅ 11-03 | `Field changed`, `DirtyState.changes`                                                            |
| Save without losing focus or saving twice                                                                                                                                                                                              | ✅ 11-03 | `Button busy` (in `DirtyActions`); when done, focus returns to the name                          |
| Knowing it was saved, without the app writing it                                                                                                                                                                                       | ✅ 11-03 | «✓ Guardado» in the rail (`useJustSaved`, `status` region)                                       |
| Why it cannot be saved, in view and not in a `title`                                                                                                                                                                                   | ✅ 11-03 | `DirtyState.blocked`, the rail's only mark (11-17), and it describes the button                  |
| Focus is seen arriving and the label goes with it                                                                                                                                                                                      | ✅ 11-03 | `focus-in` (only with motion allowed), `Field` with `focus-within`                               |
| A fast load does not flash a skeleton                                                                                                                                                                                                  | ✅ 11-03 | `animate-reveal-late` (appears at 200 ms) in `Skeleton` and `RecordSkeleton`                     |
| A long fact (an email) does not overlap the one beside it                                                                                                                                                                              | ✅ 11-03 | `Sheet` (`wrap-anywhere`); density is given by `DensityProvider`                                 |
| Who created it and who touched it last                                                                                                                                                                                                 | ✅ 10-31 | `Record.Audit`                                                                                   |
| The actions floating over the paper, «Más» with sub-actions, Save / Discard in the same pill                                                                                                                                           | 🧭 11-18 | `Record.Dock` (`ActionDock`, `dockPlan`) — the modern style; rests in the rail, floats on scroll |
| One API, two styles: traditional rail or modern (trail as heading, pager pill, counters as boxes on the trail's line, the state on the ground, pill at the bottom; a pill floating at the top and counters as links tried and dropped) | 🧭 11-18 | `ViewStyleProvider`, `Record look`, `Pager look`, `StatusBar look`, `Breadcrumb size="lg"`       |
| Keyboard shortcuts that RUN: actions, pager (Alt+P / Alt+N), Save (Mod+S); the last mounted answers                                                                                                                                    | ✅ 11-18 | `useShortcuts`, `useKeysHint`, `foundations/keys`, `DockAction.shortcut`, `Pager keys`           |
| The state: Odoo's track or the segmented pill; each stage with `icon`, `activeIcon`, `hint`, `count`; `display`, `renderStage`                                                                                                         | ✅ 11-18 | `Stage`, `StatusBar look` / `display` / `renderStage`, `Record.Status look`                      |
| A list's actions float like a record's (one pill at the bottom; the chosen rows' while some are)                                                                                                                                       | 🧭 11-18 | `List.Dock placement`, `ViewStyleProvider`                                                       |
| A dense record in sections: each group and notebook page a card, an index at the left, the dense grid inside                                                                                                                           | 🧭 11-19 | `FormStyleProvider value="sections"`, `FormIndex`                                                |
| The state on a phone says where it is: the current stage's name, the others' marks                                                                                                                                                     | 🧭 11-19 | `StatusBar display="auto"` (the default)                                                         |
| A table's title column keeps its width beside figures («Imp…» no more)                                                                                                                                                                 | ✅ 11-19 | `--size-cell-title` (`EditableTable`, `LineItems`)                                               |
| A grouped table says each group's aggregates under their columns; numbers with fixed decimals                                                                                                                                          | ✅ 11-18 | `Pile.totals`, `DataColumn.decimals`, `SheetColumn.decimals`                                     |
| The authorship footer speaks like the form: person chip, DD/MM/YYYY                                                                                                                                                                    | ✅ 11-04 | `Record.Audit` (`by` optional or the chip's props; `at` as `Date`/ISO)                           |
| Notices, field notes, activity, history                                                                                                                                                                                                | ✅       | `Record.Notice`, `note`, `Record.Activity`                                                       |
| Open a record from another (sub-context)                                                                                                                                                                                               | ✅       | composer (modal, preview, on the side, page)                                                     |
| Priority (stars)                                                                                                                                                                                                                       | ✅ 10-31 | `Priority`                                                                                       |
| Editable kanban state (traffic light)                                                                                                                                                                                                  | ✅ 10-31 | `KanbanState`                                                                                    |
| Next activity on the card (clock by urgency)                                                                                                                                                                                           | ✅ 10-31 | `ActivityBadge`                                                                                  |
| Rich text field (html)                                                                                                                                                                                                                 | ✅ 11-04 | `RichTextInput` (Tiptap v3, loaded on edit), `RichTextValue` (DOMPurify)                         |
| Record attachments (list, preview, download)                                                                                                                                                                                           | ✅ 11-04 | `Attachments` (`components/attachments`): upload, open, download, remove with undo               |
| Editable image / avatar                                                                                                                                                                                                                | ✅ 11-04 | `ImageInput` (choose/drop/paste, keyboard crop)                                                  |
| Signature                                                                                                                                                                                                                              | ✅ 11-04 | `SignatureInput` (draw, or type the name)                                                        |

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
| An operation over N chosen records (Odoo's «wizard»)                                  | ✅ 11-03 | `5 · Plantillas/Procesos/Operación`: `Record` in a modal + `api.pick`       |
| An operation in SEVERAL steps in one sitting (import: upload › map › review)          | ✅ 11-04 | `StepFlow` (`components/flow`); `5 · Plantillas/Procesos/Importar`          |
| Thousands of rows in the table: draws only the ones in view (from 200)                | ✅ 11-03 | `DataTable` (`primitives/table/rowWindow`)                                  |
| The table draws the piles the server counted, with «Ver N más»                        | ✅ 11-03 | `DataTable piles`, `Grouping.onMore` (rows, board, table, `ListSet.more`)   |
| A pile's «Ver más» says what it brings («Ver 50 más de 49.950») and stops at the cap  | ✅ 11-03 | `Pile.more`, `pileFoot`, `PileFootLine` (rows, board, table, custom)        |
| A card of your own on the board opens like the system's                               | ✅ 11-03 | `List.Board card(item, ways)` (`CardWays`, like `ListSet`)                  |
| Ask again without the rows disappearing                                               | ✅ 11-03 | `List state.refreshing`: the rows stay, a discreet bar and `aria-busy`      |
| A person's card draws their face                                                      | ✅ 11-03 | `RecordCard media.person`, like `RelationCard`                              |
| Several sets at once (reconciliation), each with its own search                       | ✅ 11-03 | `Panes` / `Pane`; `5 · Plantillas/Procesos/Conciliación`                    |

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
| A real sheet with all these controls, in reading and editing                                 | ✅ 11-04 | `5 · Plantillas/Registros/Ficha de contacto`                             |

## 3. Choose and search

| Need                                                                                                           | Status   | Piece / owner                                                                           |
| -------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| Bar with facets, filters, grouping, favorites                                                                  | ✅       | `SearchBar`                                                                             |
| Many cuts without breaking the bar                                                                             | ✅ 10-31 | grouping chain, «+N», cap per chip                                                      |
| Criteria builder with JSON                                                                                     | ✅       | `CriteriaBuilder`                                                                       |
| many2one with columns to tell them apart                                                                       | ✅       | `Picker`                                                                                |
| «Buscar más…» (one and many/add), with the list's search, order and pages                                      | ✅ 10-31 | `api.pick` + `List onChoose` (many: `selection.actions`)                                |
| many2many as chips, with «Buscar más…»                                                                         | ✅ 10-31 | `TagsField onBrowseAll`                                                                 |
| many2many: the datum that tells two options apart (the NIT), searchable and off the chip                       | ✅ 11-03 | `TagOption.meta`                                                                        |
| An option that does not fit «name + datum + aside»                                                             | ✅ 11-03 | `renderOption` in `Picker` and `TagsField`; `MatchedText`                               |
| Command palette                                                                                                | ✅       | composer (⌘K)                                                                           |
| Literal search highlighted (accent-insensitive), and «coincide NIT…» when it matches what is hidden            | ✅ 10-31 | `Picker`, `TagsField` (`foundations/match`)                                             |
| Create from the field: «Crear «…»» and «Crear y editar…»                                                       | ✅ 10-31 | `Picker onCreate`, `onCreateAndEdit`                                                    |
| Chooser rows with widgets (face, state, balance on the right)                                                  | ✅ 10-31 | `PickerItem.avatar`, `tags`, `aside`                                                    |
| «Buscar más…» with several presentations (table, rows, sheet, calendar)                                        | 🟡       | the chooser is a `List`: table and rows ✅; sheet and calendar, still to show           |
| Search against the server with the model's facets                                                              | 🟡       | web-ui gives the bar; web-framework brings the model                                    |
| A selector that searches on the SERVER: it does not filter or cut what it is given                             | ✅ 10-31 | `Picker onSearch`; the chosen one's name outside the page, `valueLabel`                 |
| A many2many that searches on the SERVER (chips over thousands)                                                 | ✅ 10-31 | `TagsField onSearch`: it does not filter what it is given; the chosen do not return     |
| A group says how much it sums, not just how many there are                                                     | ✅ 10-31 | `Pile.detail` → `GroupHeader detail` (summed by whoever holds the data)                 |
| Literal search in the bar («Buscar «X»» over the whole set, with Enter)                                        | ✅ 10-31 | `SearchBar literal`: first, unless the model reads what is typed as a question          |
| An amount (`decimal`, `monetary`) is asked as a number                                                         | ✅ 10-31 | `kindOf` read it as text: «total <= 1000» could not be asked                            |
| The bar with chips placed: the field and the panel button keep their name                                      | ✅ 11-03 | `SearchBar`: «Buscar» and «Filtrar, agrupar y favoritos, N puestos»                     |
| The bar's suggestions are options (ARIA combobox)                                                              | ✅ 11-03 | `SearchBar`: `listbox` / `option`, `aria-activedescendant`                              |
| A list's actions as a pill, and the chosen rows' actions floating at the bottom (search stays)                 | 🧭 11-18 | `List.Dock` (`ListDock`), `placement`                                                   |
| A relation's row unfolds into its records (Odoo's «Search Contact for: …»), chosen by name, sent by key        | ✅ 11-18 | `SearchBar searchRecords` (or `SearchProvider`), ▸ / →, `withValue` (one chip)          |
| An enum asked by its words, not its raw values («Pagada», sent as `paid`)                                      | ✅ 11-18 | `translations.choices`, `choiceLabel`; unfolds in the bar, select / tags in the builder |
| The builder picks records: es / no es (one), está en (tags), está vacío; reads keys back as names              | ✅ 11-18 | `FilterBuilder` / `CriteriaBuilder searchRecords`, `liftRecords`, `useRecordNames`      |
| A value control of the application's own in the builder                                                        | ✅ 11-18 | `valueEditor` (`ValueEditorProps`), prop or `SearchProvider`                            |
| By a path —Cliente › País— the related records themselves, not only their fields; read back by name            | ✅ 11-18 | `FieldPath` «(el registro)» at every level, `liftRecords(…, modelAt)`                   |
| «Buscar más…» in the bar and the builder: the relation's list, another context with its own bar                | ✅ 11-18 | `browseRecords` (`RecordBrowse`, prop or `SearchProvider`)                              |
| A list that opens filtered, built by code with the bar's own chips                                             | ✅ 11-18 | `queryField`, `valuesCriteria`, `conditionCriteria`                                     |
| The way into the advanced search, where people look                                                            | ✅ 11-18 | «Búsqueda avanzada…» under the suggestions and as the panel's action                    |
| «Empieza con» and other operators the model does not publish                                                   | 🟡       | the server publishes the operator; web-ui names it from the copy table (`ops`)          |
| The bar as a compound piece (`SearchBar.Suggestions`, `SearchBar.Panel` slots)                                 | 🟡       | proposed — a breaking change, its own round                                             |
| The bar from the keyboard: `/` focuses it, Alt+↓ the panel (arrows, columns, a letter), Mod+Enter the advanced | ✅ 11-21 | `SearchBar focusOnSlash`, panel walk, `KeysHint` keycaps                                |
| A chip marked with ← and removed with Delete, given back with «Deshacer» / Mod+Z (or the screen's toast)       | ✅ 11-21 | `facetPaths`, `restoreRemoval`, `useToastIfAny`                                         |
| A chip the bar wrote reads in parts — field, comparison, value — and each is changed in place                  | ✅ 11-21 | `chipParts`, `withParts`, `WordChoice`                                                  |
| The empty bar offers: recent searches and the fields; Tab completes a field's name                             | ✅ 11-21 | `SearchBar recentKey`, `search.completion`                                              |
| Live counts beside each cut and suggestion («vencidas · 12»)                                                   | 🟡       | next round — needs `countRecords` from web-framework                                    |
| The application's words with the same mechanism as the package's                                               | ✅ 11-03 | `createCopy`; a `Provider` changes its branch and never the installed copy              |

## 4. Where it opens (workspace)

| Need                                                   | Status   | Owner                                                           |
| ------------------------------------------------------ | -------- | --------------------------------------------------------------- |
| Preview, panel, window, page with breadcrumbs, ⌘K      | ✅       | composer                                                        |
| The surfaces composer dresses (Peek, Dialog, Missing)  | ✅       | web-ui (`Peek onPromote`, `Dialog onExpand`)                    |
| Modals INSIDE the panels                               | 🟡       | composer — being refactored (2026-10-31)                        |
| Phone: everything is a page, preview as a bottom sheet | ❌       | composer                                                        |
| Templates that show web-ui + composer together         | ✅ 10-31 | `5 · Plantillas/Abrir y elegir/Espacio de trabajo`              |
| The `api.pick` window with a requested size            | ❌       | composer (today it opens 480×360)                               |
| Open a relational: modal by default + «Abrir en…»      | ✅ 10-31 | `RelationValue onOpenIn`, `Picker onOpen(id, to)`, `OpenTarget` |
| A tag (many2many) opens its record in preview          | ✅ 10-31 | `TagsField onOpen`, `openTarget`                                |
| All templates over composer (modals, preview, ⌘K)      | ✅ 10-31 | `5 · Plantillas/*`                                              |
| Guide «Nuestro estilo · cómo abrimos las cosas»        | ✅ 10-31 | `stories/Estilo.mdx`                                            |
| A single «opener» that web-framework wires up once     | ❓       | to be decided: web-ui (context) or web-framework                |

## 4b. The frame, the counts and the brand (round of 2026-11-16, issue #28)

Found building **quipu**, a reference app on the whole stack: the back office of a professional
association (members, dues, courses, a shop, a gallery), themed with its own colours.

| Need                                                                                      | Status   | Piece / owner                                                            |
| ----------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| The cuts panel as wide as the SCREEN, not the field; usable inside a dialog               | ✅ 11-16 | `SearchBar` (portal `Overlay`, `--container-cuts`)                       |
| ONE counter for every host — zero not drawn, «99+», the locale, a dot, the host's colour  | ✅ 11-16 | `Count`; used by `NavigationTree`, `Tabs`, `SystrayButton`, `Menu`       |
| A menu of the application bar says what waits inside without opening it                   | ✅ 11-16 | `TopMenu.count`, `Menu count`; a number `badge` is a `Count`             |
| A metric being read keeps its size; one not counted says «—»                              | ✅ 11-16 | `Metric loading`, `value` optional                                       |
| Several files at once, with a cap that says what it left out                              | ✅ 11-16 | `DropZone multiple onFiles max`; `Attachments` takes batches by default  |
| A back office whose chrome is the sidebar: brand and user on top, the account at the foot | ✅ 11-16 | `Sidebar` in `AppFrame sidebar` with no `menu`                           |
| The sidebar on a phone: a drawer opened from the bar                                      | ✅ 11-16 | `AppFrame` (`narrowMenu`), `SidebarToggle`, `useSidebarDrawer`           |
| A row on a 390 px phone keeps its name: the tags drop below it                            | ✅ 11-16 | `Row` (the tags close the name's line)                                   |
| A brand set ONCE and followed by every palette                                            | ✅ 11-16 | `--brand-*` / `--brand-dark-*` in `tokens.css`; README «Your brand»      |
| A site's global heading rules do not restyle web-ui's                                     | ✅ 11-16 | README «Living beside a site's own CSS» (the site's rules go in a layer) |
| Phone stories run at 390 × 844 in the test runner, not on the desk                        | ✅ 11-16 | `vitest.config.ts` alias; `.storybook/preview.ts` `defaultViewport`      |
| A loading and failed state per board tile, and for the board's own numbers                | ✅ 11-16 | `BoardTile state`, `Board state` (`BoardState`); issue #27               |
| Public pages (hero, carousel, product grid, checkout) on the same tokens                  | ❓       | not web-ui — a sibling package that imports `tokens.css` (to be decided) |

## 4c. Saying what each thing is (round of 2026-11-17, issues #37 and #40)

quipu shown as a demo: what the screen already does, it has to SAY.

| Need                                                                     | Status   | Piece / owner                                                               |
| ------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------- |
| Editing shows Discard and Save only; a mark only when it cannot be saved | ✅ 11-17 | `DirtyActions` (`blocked` is the one mark; `changes` describes Save)        |
| The palette is seen: «Buscar… ⌘K» in the sidebar and the bar             | ✅ 11-17 | `SearchEntry`; `Sidebar search`, `TopBar search`; composer listens for ⌘K   |
| A shortcut drawn the way this keyboard writes it                         | ✅ 11-17 | `useKeyboardPlatform`, `modShortcut` (`foundations/shortcut`)               |
| Every row of a list has the same structure, at 390, 1280 and 2000 px     | ✅ 11-17 | `Row`: meta under the name, `--container-row-text`, `--container-row-split` |
| A counter says how many and how much                                     | ✅ 11-17 | `Metric detail`                                                             |
| Every `data-ui` part is documented, or the build fails                   | ✅ 11-17 | `tests/componentTokens.test.tsx`                                            |
| A guided tour: the screen names each thing where it is (issue #40)       | ✅ 11-17 | `Guide`, `GuideSpot`; stops are `data-ui` parts, `data-key`, `data-guide`   |
| A tour on a phone goes through the sidebar's drawer and back             | ✅ 11-17 | `Guide` opens and closes the frame's drawer (`useSidebarDrawer`)            |
| A «¿Qué es esto?» mode and hotspots on new features                      | ❓       | later, on the same anchors                                                  |

## 4d. Touch and the counter: POS, kitchen, kiosk, shop (round of 2026-11-20)

The same pieces as the ERP, for a till, a kitchen display, a self-service kiosk and an online
shop — and a kanban that reads as records, not as boxes inside boxes.

| Need                                                                              | Status   | Piece / owner                                                               |
| --------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| The application says «touch» (a till is a touch monitor with a mouse)             | ✅ 11-20 | `data-pointer` (`POINTER_ATTRIBUTE`, `pointerAttributes`), `touch:` variant |
| What is drawn small answers to a finger (a chip's «×» was 16 px)                  | ✅ 11-20 | `--size-target` + `hit-target` (24 px, 44 under a finger)                   |
| Quick filters in sight, with how many each leaves                                 | ✅ 11-20 | `List.Filters` + `Tags size="md"/"lg"`, `count`, `scroll`                   |
| A list's counter narrows the list                                                 | ✅ 11-20 | `ListCounter onClick` / `active` / `tone`                                   |
| A card with N facts, a count on its corner, chosen, unavailable, a state stripe   | ✅ 11-20 | `RecordCard fields` / `badge` / `selected` / `disabled` / `tone`            |
| A product grid (till, shop)                                                       | ✅ 11-20 | `RecordCard layout="tile"`, `List.Tiles` (`present="tiles"`)                |
| A kanban that is not boxes inside boxes; the name never cut by the figure         | ✅ 11-20 | `BoardColumns` lanes as a wash, one-line head; `--ui-record-card-radius`    |
| How long it has been waiting, live (kitchen, SLA)                                 | ✅ 11-20 | `Elapsed`, `RecordCard elapsed`, `useNow`                                   |
| An on-screen number pad                                                           | ✅ 11-20 | `Keypad` (`applyKey` pure)                                                  |
| Few options chosen with a finger (payment, dine-in / takeaway, shipping)          | ✅ 11-20 | `RadioGroup look="cards"` (`ChoiceOption.icon`)                             |
| A workspace modal over a record covered by the record's own dock                  | ✅ 11-20 | `Record` and `List` are `isolate`                                           |
| Templates: till, kitchen, kiosk, shop, reconciliation in three windows            | ✅ 11-20 | `5 · Plantillas/Mostrador/*`, `Procesos/Conciliación › Tres ventanas`       |
| A kiosk frame: attract screen, back to start when idle, reduced-height mode       | ✅ 11-20 | `KioskFrame` (`attract`, `idleAfter`, `onIdle`), `useIdle`                  |
| A customer-facing display (the order mirrored, live)                              | ✅ 11-20 | `Receipt look="screen"`; `Punto de venta › Pantalla del cliente`            |
| A quantity pressed, not typed; at one, «−» removes the line                       | ✅ 11-20 | `Stepper` (`onRemove`)                                                      |
| The pad's own screen                                                              | ✅ 11-20 | `Keypad screen`                                                             |
| The end of an operation, said big (kiosk number, change)                          | ✅ 11-20 | `Outcome`                                                                   |
| The printed ticket (80 mm) and the same document on a screen                      | ✅ 11-20 | `Receipt look="paper"` / `"screen"`                                         |
| A till with orders, tables, invoice or sale note, orders of the day, cash closing | ✅ 11-20 | `5 · Plantillas/Mostrador/Punto de venta`                                   |
| An express till: scan or tap, pay in one tap, the next ticket already open        | ✅ 11-20 | `5 · Plantillas/Mostrador/Caja rápida`                                      |
| The touch and counter pieces, ordered by what they solve                          | ✅ 11-20 | Storybook «Táctil y mostrador» (`stories/Mostrador.mdx`)                    |
| Panels a cashier cannot close by mistake                                          | ❓       | composer                                                                    |
| A QR drawn for a payment or an invoice                                            | ❓       | later — a heavy library, lazily (`tests/heavyChunks`)                       |

## 4e. The shop, the portal and the frame's notices (round of 2026-11-22, issue #78)

What a shop's product, a customer portal and any application's frame needed and drew by hand —
and the same urgency painted the same way everywhere.

| Need                                                                                      | Status   | Piece / owner                                                          |
| ----------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| A price as a shelf says it: the one before struck, how much less (computed, rounded down) | ✅ 11-22 | `Price` (`compareAt`, `per`, `size`), `discountPercent`, `formatPrice` |
| Stars for «how good»: an average with its figure and how many opinions, or asked          | ✅ 11-22 | `Rating` (half stars, radio group in a `Field`, read mode)             |
| The images of one thing: arrows, strip, keyboard, swipe, full size                        | ✅ 11-22 | `Gallery`, `Lightbox`                                                  |
| The notifications: a bell with the unread count and the list; the list as a page          | ✅ 11-22 | `Inbox`, `InboxList`; `SystrayButton` forwards `ref`                   |
| A notice about the whole application, above the bar                                       | ✅ 11-22 | `Banner`, `AppFrame banner`; one tone table with `Callout`             |
| A key drawn as a key, the same in every place (four `<kbd>` drew it four ways)            | ✅ 11-22 | `Kbd` (`keys` by platform, or written)                                 |
| A callout's × named in the session's language (it said «cerrar» in every language)        | ✅ 11-22 | `Callout` (`copy.shell.closeNotice`), `hit-target` + focus ring        |
| The shop and the tiles show the discount with `Price`, not a hand-made tag                | ✅ 11-22 | `5 · Plantillas/Mostrador/Tienda`, `4 · Vistas/Lista/Mosaicos`         |
| A context menu (right click, long press) on rows and cards                                | ❓       | later                                                                  |
| A map as a list's presentation (addresses, deliveries)                                    | ❓       | later — a heavy library, lazily                                        |

## 4f. Modern UI round, iterated (from 2026-11-22, issue #80)

One component or one measured refinement per iteration, all in one PR.

| Need                                                                               | Status   | Piece / owner                                                     |
| ---------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| A range with two ends: a shop's price filter, an ERP's «amount between»            | ✅ 11-22 | `RangeSlider` (`onChangeEnd`, read mode writes both ends)         |
| A slider's thumb named once by its field (it was read with the group's whole text) | ✅ 11-22 | `Slider`, `RangeSlider`; `FieldIds.label` carries the label words |

## 5. Tests

| Need                                                 | Status   | Owner                                                       |
| ---------------------------------------------------- | -------- | ----------------------------------------------------------- |
| Logic and static HTML                                | ✅ 10-31 | `tests/`, vitest `model` project                            |
| Interaction inside the story (`play`), like composer | ✅ 10-31 | `storybook` and `storybook-dark` projects                   |
| Accessibility (axe) as an error in every story       | ✅ 11-03 | `a11y: "error"`; what is excluded says why, right beside it |
