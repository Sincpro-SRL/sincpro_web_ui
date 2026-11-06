# Architecture — where each piece of @sincpro/web-ui goes

`PRINCIPLES.md` says how a screen has to look and behave. This document says
**where each piece lives and what it may depend on**, so that whoever adds something — a person,
an agent, the application that extends it — does not have to guess. As in `PRINCIPLES.md`,
each rule says what enforces it: a rule nobody checks is a suggestion.

## 1. Four levels

| Level       | What it is                                                      | Examples                                        |
| ----------- | --------------------------------------------------------------- | ----------------------------------------------- |
| Foundations | What ALL the pieces speak: decisions, contracts and pure logic  | tokens, copy, density, form mode                |
| Primitives  | A piece that does not know which screen it is on                | `Button`, `TextInput`, `Picker`, `DataTable`    |
| Components  | Primitives composed to answer ONE product question              | `SearchBar`, `LineItems`, `Activity`, `Listing` |
| Views       | The two archetypes: one record (`Record`) or N records (`List`) | `Record`, `List`                                |

A level imports only from the ones below it. **Enforced by**: `make doctor`.

## 2. Three tiers inside the primitives

«Does not know which screen it is on» puts a 30-line `Button` and a 1,400-line `EditableTable`
together. Both are primitives, but they are not used the same way: to build something of your own
you start from the bricks, and among 90 files you must be able to find them. That is why the
primitive families are sorted into three tiers, and a tier imports only from the ones below it:

| Tier           | What it answers                  | Families                                                                                                                |
| -------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **display**    | Show: a datum, a state, a notice | `block` `button` `cell` `dialog` `disclosure` `hint` `menu` `notice` `overlay` `surface` `tabs` `tag` `toolbar` `value` |
| **input**      | Ask: a form control              | `field` `choice` `date` `picker`                                                                                        |
| **collection** | Show N things at once            | `table` `tree` `chart`                                                                                                  |

A datum that is shown does not depend on a control (a `Tag` does not know a form exists); a
control does not depend on a collection (a `Picker` does not drag a table along); a collection may use
both — an editable cell is a control inside a table. **Enforced by**:
`tests/architecture.test.ts`.

### The controls' contract lives in `foundations`

What connects a control to its form — the ids `Field` gives it (`useFieldIds`) and whether it is
looked at or written to (`useFormMode`) — is not a control: it is the contract every control
speaks, like density or the surface. It lives in `foundations/form.tsx`. That way a datum that is
shown differently when reading (`RelationValue`) reads it without depending on `Field`, and **a
control of the application's own** plugs in the same way as the package's:

```tsx
function Signature({ id, invalid }: { id?: string; invalid?: boolean }) {
  const ids = useFieldIds({ id, invalid });
  const read = useFormMode() === "read";
  …
}

<Field label="Firma del cliente"><Signature /></Field>
```

## 3. No cycles

No module in `src/` ends up importing itself by another path, not even through types:
a type cycle is the sign that the direction is backwards — the model (`criteria.ts`)
asking the interface (`FilterBuilder`) for its shapes. The shapes belong to the model; the interface
uses them. **Enforced by**: `tests/architecture.test.ts`.

## 4. Where does what I am about to write go?

1. Does it know what an invoice, a customer, a dataset is? → **It does not go in the package**: it belongs to the application.
2. Is it a decision, a contract several pieces speak, or logic with no drawing? → **foundations**.
3. Does it answer a product question by composing primitives (search, the lines, the activity)? → **components**.
4. Is it one of the two ways of looking at records? → **views** — and there is no third: find out which one it is.
5. Otherwise it is a **primitive**, and its tier is told by what it does: shows → display, asks → input, shows N → collection.

What two views need goes down to `components/`; what two tiers need goes down to the one below or to
`foundations`.

## 5. Open to extension

The application builds its own with the public API (`@sincpro/web-ui`), with no forks or loose classes:

| I want…                                         | With                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A control of my own inside a `Field`            | `useFieldIds`, `useFormMode` (`foundations/form`)                                           |
| A cell with anything inside                     | `DataColumn.cell`, `edit.render`, `rowActions`                                              |
| Another way of looking at a list (map, gallery) | `List.Present` → receives the set (`ListSet`)                                               |
| A composed piece written as a tree              | `slot()`, `pick`, `propsOf` (`foundations/slots`)                                           |
| An operation over N records (the «wizard»)      | `Record` in a modal + `api.pick` / `api.answer` (composer) — see `5 · Plantillas/Operación` |
| My components with the same look                | the token classes (`bg-surface text-ink …`)                                                 |
| My application's words, in its language         | `createCopy` → `install`, `Provider`, `useCopy` (`foundations/catalog`)                     |
| Several sets at once (reconciliation)           | `Panes` / `Pane` — see `5 · Plantillas/Conciliación`                                        |

What is closed on purpose: a component's look (there is no `className` or `style`) and
the domain. What is open is the structure.

## 6. Refactor plan

In phases, each the size of a PR, without breaking whoever imports from `@sincpro/web-ui`
(web-framework and composer import only from there). Deep paths (`…/primitives/field/mode`)
are not public: `package.json` exports the levels, not the files.

### Phase 1 — the layers, explicit and enforced ✅ 2026-11-03

- The controls' contract (`FieldIds`, `FormMode`) moves down from `primitives/field` to
  `foundations/form.tsx`. It cuts `value`'s dependency on `field`.
- `TagsField` (the many2many) moves from `tag` to `picker`, next to the many2one: choosing records —
  one or several — is one family. `tag` stays with what it shows.
- The two cycles: `GroupGrain` moves to `calendar` (a grain belongs to the calendar); `BuiltCondition` and
  `BuiltFilter` move to `criteria.ts` (they are the model, the interface draws them).
- Names in English: `value/Fecha.tsx` → `value/DateValue.tsx`; `field/copy.tsx` →
  `field/clipboard.tsx` (it was the copy button, not the text copy).
- `tests/architecture.test.ts`: tiers and cycles, so they do not come back.

### Phase 2 — copy: one mechanism, not one file per family ✅ 2026-11-03

Splitting the 1,400 texts by family was considered. It was dropped: one catalog per package is
standard (React Aria, MUI) and moving it was a lot of churn for little. The real problems were elsewhere and
were closed:

- **The mechanism, once** (`foundations/catalog.tsx`): `createCopy(english)` → `install`,
  `Provider`, `useCopy`, `current`, `merge`. web-ui's is one; an application's is another.
- **A `Provider` changes its branch and never the installed copy.** Before, it wrote it while rendering:
  one corner in another language changed the whole screen, and a test passed because an earlier one
  had left Spanish installed.
- **A `Provider` leans on what surrounds it**, not on English, and **the merge is deep**:
  renaming one word does not empty its siblings. Adding a section no longer touches five places.
- What is not a component (a sentence built in a function, a month) reads the installed copy;
  a component passes it the one of its branch (`formatRelative`, `writeANote`).

composer and web-framework can adopt `createCopy` for their tables after this release.

### Phase 3 — «Extend», recipes that are tests ✅ 2026-11-03

`stories/Extender.mdx` and `6 · Extender/Recetas`: a control of your own in a `Field`, a cell
of your own, a composed piece with `slot()`, texts of your own. They import only `@sincpro/web-ui`
(`tests/templates.test.ts`): if something stops being public, they stop compiling.

### Phase 4 — screens with several sets: reconciliation ✅ 2026-11-03

`Panes` / `Pane` (`components/shell`): each pane scrolls on its own and what is pinned inside is pinned
to its edge, not to the screen header; when narrow, they stack. `5 · Plantillas/Conciliación`
uses it with two `List`s and a `Record`, each list with its search.

### Phase 5 — accessibility as an error ✅ 2026-11-03

axe fails the story (`.storybook/preview.ts`). The 314 violations were closed at the root:
names that hid the visible text (pivot cells, the editable cell, the options of the
`Picker` and the `ComboBox`, the tabs), empty table headers (a column of buttons
carries a cell), titles that skipped a level, scroll boxes the keyboard could not reach,
tints that lost contrast over a colored background (`Avatar`), the tab that pointed to a
panel that did not exist (`TabsScope` / `TabsPanel`).

### What does not move, and why

- **The levels and their names.** They are fine and `make doctor` looks after them; renaming them is churn.
- **`DataTable`, `EditableTable` and `Picker` remain primitives.** They do not know which screen
  they are on; the `collection`/`input` tier already says they are not bricks.
- **`Dialog` brings `Wizard`** for steps in a standalone dialog. Inside composer's workspace,
  a modal is a composer view (`stories/Estilo.mdx`), and a multi-step operation is written
  there with `StepFlow` (`components/flow`), which draws no dialog of its own:
  `5 · Plantillas/Importar`.
- **The logic of `components/search` and `components/listing`** (`query.ts`, `pages.ts`, …) stays
  next to its interface: only its family uses it. It goes down to `foundations` the day another uses it.
