# AGENTS.md — working on @sincpro/web-ui

Rules for any agent (or person) changing this design system. Read the README first for the
idea; this file is how to keep it.

## Before you change anything

- Read [`docs/PRINCIPLES.md`](./docs/PRINCIPLES.md): the design principles (hierarchy, one primary
  action, color that means something, progressive disclosure, undo over confirm…) and, for each,
  the component that applies it and the check that enforces it. A screen that breaks one of
  them is a bug, not a matter of taste.

- Run `make dev` and read the existing stories (Storybook serves an MCP endpoint at `/mcp`).
  The piece you are about to write probably exists, or its sibling does.
- Find the level first. Every file belongs to exactly one, and that decides where it goes and
  what it may import.

## The four levels (and the templates)

| Level       | Folder                                          | Story folder           |
| ----------- | ----------------------------------------------- | ---------------------- |
| Foundations | `src/tokens.css`, `src/foundations/`            | `stories/foundations/` |
| Primitives  | `src/primitives/<family>/`                      | `stories/primitives/`  |
| Components  | `src/components/<family>/`                      | `stories/components/`  |
| Views       | `src/views/list/` (N) · `src/views/record/` (1) | `stories/views/`       |
| Templates   | — (not in the package)                          | `stories/templates/`   |

- A level imports only from the levels below it. A primitive never imports a component.
- A primitive does not know the screen it is on: a `TextInput` does not know a form exists.
- There are two views — one record, N records. Do not add a third; find which one it is.
- No domain. If it needs to know what an invoice or a dataset is, it belongs to the app.
- What two views need goes DOWN into `components/` — `Listing`, `Pagination`, `Breadcrumb`
  live there so the activity panel or a frame can reuse them without importing a view.
- Templates are whole pages (`5 · Plantillas`) built ONLY from the public API, with example
  domain data from `stories/support/`. If a template needs something the package does not
  export, the package is missing it — add it there, not in the template.

## Hard rules (the build enforces them)

- **Tokens only.** No arbitrary Tailwind values (`h-[26px]`), no hex, no raw `px`, no raw
  palette (`text-red-500`). Missing a value? Add a token to `src/tokens.css`. A real
  exception goes into `PERMITIDO` in `tests/tokenLint.test.ts`, with its reason.
- **Contrast next to every color token**, on the same line (`/* 7.48:1 … */`).
  `tests/tokens.test.ts` recomputes it.
- **Self-imports, no extensions.** Inside `src/`, import `@sincpro/web-ui/<path>` — never a
  relative path, never `.ts`/`.tsx` (`make doctor`).
- **No copy in components.** User-facing text comes from the copy table (`useUiCopy`); a new
  string is added to `ENGLISH_COPY` and `SPANISH_COPY` together.
- **Levels do not climb.** Foundations import nothing above them; a primitive never imports a
  component or a view; a component never imports a view (`make doctor`).
- **Client boundary.** A module with hooks, context, event handlers or `document`/`window`
  starts with `"use client";` (`tests/clientBoundary.test.ts`). Pure logic stays without it.
- **Public means exported from its family `index.ts`.** The level barrel re-exports the
  families, and `src/index.ts` re-exports the levels. Not in a family barrel = internal.

## Conventions

- Code and comments in English. Comments explain _why_ — a comment that repeats the code is
  noise. The `Context:` blocks at the top of files are the design record; keep them true.
- Tests go in `tests/` with `node:test` + `node:assert/strict`; render with
  `renderToStaticMarkup` when markup matters. A change ships with a test that fails without it.
- Every new piece gets a story in the folder of its level, and `make smoke` must stay green.
- Form controls take their wiring from `Field`: write `<Field label="…"><TextInput … /></Field>`.
  A new control reads `useFieldIds({ id, describedBy, invalid })` so it works the same way.
- Compound pieces are written as a tree with `slot()` (`foundations/slots.ts`), the way
  `Record.*` and `List.*` are: if it is not written, it is not there.

## Known traps

- **`overflow-hidden` around a `List` inside `AppFrame`** makes the card a scroll container,
  and the sticky list bar sticks inside it — pushed down by the application bar, covering the
  metrics. Use `overflow-clip`: it rounds the corners the same and does not break `sticky`.
- **Never decide "is it focusable" by `aria-hidden` / `inert`.** While a list is open (a
  `Picker`, a `TagsField`) React Aria's `ariaHideOutside` marks everything outside it that
  way — the rest of the row included. React Aria's hidden form mirrors carry `[hidden]` or
  `[data-react-aria-prevent-focus]`; filter by those (see `stopsIn` in `EditableTable`).

## Templates are composition only

`stories/templates/` are whole screens built with the public API and nothing else:
`tests/templates.test.ts` fails on any `className`/`style` there and on any deep import. When a
template needs styling, the package is missing a component — add it to the right level and family.

## Before you hand it back

Run the checklist at the end of `docs/PRINCIPLES.md` on every screen you touched, then:

```bash
make verify-format   # eslint --fix + prettier + typecheck + doctor
make test
make build
make smoke           # with Chrome installed: every story renders clean
```

Never bump `version` in `package.json` — the release pipeline does. Never commit; a person
does.
