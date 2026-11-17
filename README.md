# @sincpro/web-ui

**A design system for enterprise web software** — ERPs, back offices, management tools: the
screens where people spend eight hours a day reading records, filtering lists and filling
forms. React + Tailwind v4, open source, by [Sincpro](https://github.com/Sincpro-SRL).

Most design systems are built for marketing sites and consumer apps, then stretched over
business software. This one starts from the other end: dense data, long sessions, keyboard
users, numbers that must be legible, and screens that are always about _records_.

## A UI that evolves — a method that holds

`@sincpro/web-ui` **will keep changing.** Its look, the set of components and their props grow
and get corrected as real screens ask for them. It is `0.x`: a minor release may break an API,
and each release says what changed in
[GitHub Releases](https://github.com/Sincpro-SRL/sincpro_web_ui/releases).

What does not change is **how the components are managed** — and that is what this project is
about:

| Stable — the contract                                       | Evolving — the content            |
| ----------------------------------------------------------- | --------------------------------- |
| Every piece belongs to one of four levels, and imports down | Which components exist            |
| Values come from tokens; contrast is measured               | The palette, sizes, density steps |
| Interface copy is data, never written in a component        | The wording                       |
| Every piece ships with a test and a story                   | Props, their names and defaults   |
| Whole pages are built from the public API alone             | Visual details of each piece      |

Each rule on the left is checked by a machine — `make test`, `make doctor`, `make smoke` — not
by anyone's memory, so the catalogue can grow fast without rotting.

## The idea

**Every management screen is one of two things: one record, or N records.** That is the
whole product surface, and the system is organised around it in four levels — each one
defined by what it _knows_, and each one importing only from the levels below:

| Level           | What it knows                           | Examples                                                 |
| --------------- | --------------------------------------- | -------------------------------------------------------- |
| **Foundations** | The decisions. No components.           | color, typography, scales, motion, surfaces              |
| **Primitives**  | Nothing about the screen it is on.      | `Button`, `Field`, `Menu`, `Tag`, `Table`, `Dialog`      |
| **Components**  | One question of the product, by family. | data tables, search and criteria, record parts, activity |
| **Views**       | The two macros, and nothing else.       | `Record` (one) · `List` (N)                              |

If something does not fit one of the two views, it is not a view — it is a component in
disguise. And if something needs to know what an invoice, a dataset or a customer _is_, it
does not belong here: that is domain, and it lives in the application.

### Principles

- **Tokens or nothing.** Every color, size and radius comes from `src/tokens.css`. No
  arbitrary Tailwind values, no hand-written hex, no raw `px`, no raw Tailwind palette — a
  test enforces it, and every exception is written down with its reason.
- **Contrast is measured, not guessed.** Each color token carries its WCAG ratio next to it,
  and a test recomputes it: a number that drifted from its color fails the build.
- **Two surfaces.** The work happens on a warm light _canvas_; navigation lives on a dark
  _chrome_. A piece is judged on the surface it will actually live on.
- **Density is a setting, not a fork.** The same components serve a dense ERP grid and a
  roomy form (`DensityProvider`).
- **Language is data.** Interface copy is English by default and replaced as a whole table
  (`installCopy(SPANISH_COPY)`, `UiCopyProvider`) — never hard-coded in a component.
- **Accessible by default.** Storybook runs the a11y checks as errors, not warnings.

The full set — hierarchy, one primary action, color that means something, progressive
disclosure, undo over confirm… — each with the piece that applies it and the check that
enforces it, is in
[`docs/PRINCIPLES.md`](https://github.com/Sincpro-SRL/sincpro_web_ui/blob/main/docs/PRINCIPLES.md)
(in Spanish).

## Using it

```bash
yarn add @sincpro/web-ui react react-dom tailwindcss @tanstack/react-table @tanstack/react-virtual
```

Your bundler must run Tailwind v4 (`@tailwindcss/vite` or `@tailwindcss/postcss`). Then import
the tokens once — fonts, theme and Tailwind come with it:

```css
@import "@sincpro/web-ui/tokens.css";
```

```tsx
import { Field, installCopy, SPANISH_COPY, TextInput } from "@sincpro/web-ui";

installCopy(SPANISH_COPY); // optional: the interface in Spanish

export function CompanyName({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Company name" required>
      <TextInput value={value} onChange={onChange} />
    </Field>
  );
}
```

Each level is also its own entry — `@sincpro/web-ui/foundations`, `/primitives`,
`/components`, `/views` — so what a level offers is one import away.

**React Server Components.** Every module that needs the browser (hooks, context, events)
starts with `"use client"`, and a test keeps it that way; pure logic (calendar, pivot,
criteria) stays callable from the server. The views are client components: compose
`Record` inside a client component of your own.

### Theming (light / dark)

The palettes live in `tokens.css`: the same `--color-*` names, redefined for dark. Components
never read the theme — they use `bg-surface` / `text-ink` and the cascade resolves them — so
a screen needs no change to work in both.

- With nothing configured the stylesheet follows `prefers-color-scheme`.
- `data-theme="dark"` / `"light"` on **any** element forces that palette for everything under it
  (a light invoice preview inside a dark app works). Portals live under `<html>`, so an app
  switch writes it there.
- `ThemeProvider` + `useTheme()` do that write (`"system" | "light" | "dark"`; `"system"`
  removes the attribute) and `ThemeSwitcher` is the tiny control. Remembering the choice is
  the app's job (`onChange`).

```tsx
<ThemeProvider
  defaultValue="system"
  onChange={(theme) => localStorage.setItem("theme", theme)}
>
  <App /> {/* somewhere: <ThemeSwitcher /> */}
</ThemeProvider>
```

#### Your brand

The colours a brand owns read a `--brand-*` variable before the system's value. Set them once,
on `:root`, and every palette — light, dark, and a light subtree inside a dark page — follows:

```css
:root {
  --brand-accent: #d4a73a; /* the primary action */
  --brand-accent-hover: #c0942c;
  --brand-primary: #1f3a6e; /* links, the current place */
  --brand-primary-hover: #152a52;
  --brand-chrome: #10203f; /* the application bar */
  --brand-chrome-raised: #1a2c52;
  --brand-chrome-edge: #10203f;
  --brand-ground: #f7f8fa; /* the page's paper */
  --brand-surface: #ffffff; /* raised boxes, menus */

  --brand-dark-accent: #e0b850; /* the same, for the dark palette */
  --brand-dark-chrome: #0a1428;
  --brand-dark-ground: #121417;

  --brand-radius: 0.5; /* the corners: 0 square everywhere · 1 the system's · 1.5 rounder */
}
```

The full list is `ground`, `surface`, `line`, `line-strong`, `ink`, `muted`, `accent`,
`accent-hover`, `on-accent`, `primary`, `primary-hover`, `chrome`, `chrome-raised`, `chrome-edge`,
`chrome-accent` and `chrome-link`; `--brand-<token>` is the light palette's and
`--brand-dark-<token>` the dark's. One left unset keeps the system's value. Do not
override `--color-*` directly: those are redefined per theme, so an override on `:root` loses to
`[data-theme="light"]` and leaks into the dark palette. The system measures its own contrasts;
your brand's are checked by Storybook's a11y pass if you render your stories with it.

The corners are one knob: `--brand-radius` multiplies the whole radius scale (`mark`, `control`,
`box`, `panel`, `pill`), so the steps keep their proportion and a dropdown stays concentric with
its rows. `0` squares everything, the capsules too. A single step can still be set on its own —
`--brand-radius-control: 6px`. Both go on `:root`.

#### Living beside a site's own CSS

The package's styles are in cascade layers (`@layer base`, `utilities`), and **CSS outside any
layer always beats CSS inside one** — so a site's global `h1 { font-family: … }` restyles every
heading web-ui draws. Put the site's element rules in a layer too:

```css
@layer base {
  h1,
  h2 {
    font-family: var(--font-display);
  }
}
```

or scope them to the site's own pages (`.site h1`). Classes are not affected; element selectors
and `*` are.

Rules a new token must follow: define it in **both** palettes with its contrast on the same line
(`tests/tokens.test.ts` measures each theme against its own ground, surface and chrome, and fails
if a light token has no dark twin or the two dark copies drift); the gold stays the primary
action in both (`on-accent` keeps the text on it dark); never write a colour outside
`tokens.css`; use `bg-scrim` — not `bg-ink/30` — for a veil. In Storybook the toolbar has a
theme switch, or open a story with `&globals=theme:dark`.

## Developing it

```bash
make init        # pre-commit + yarn install
make dev         # Storybook on :6006 — the living documentation
make test        # vitest: logic in Node + every story in Chrome (play, a11y), light and dark
make smoke       # only the stories: their play, a11y and screen rules, light and dark
make build       # dist/ (JS + .d.ts + tokens.css)
```

Node 26 (the active LTS) or newer — `nvm use` reads `.nvmrc`. Every operation — local or CI —
goes through the `Makefile`; run `make` to list the targets.

```text
src/
├── tokens.css     the source of every value: color, type, spacing, radii, motion
├── index.ts       the public surface: the four levels below
├── foundations/   density, surface, copy, slots, calendar, pivot, xlsx
├── primitives/    one folder per family: button, field, menu, table, tabs, …
├── components/    one folder per family: listing, record, search, form, activity, frame, shell
└── views/         list (N records) · record (one record)
stories/           Storybook, by level — and templates/: whole pages built from the public API
tests/             vitest, `model` project: logic and static markup in Node
```

`make doctor` rejects an import that climbs a level (a primitive importing a component, a
component importing a view), so the layering holds without anyone remembering it.

### Iterating with AI

This system is developed together with AI agents, and it is set up for it: the rules an
agent must follow live in [`AGENTS.md`](https://github.com/Sincpro-SRL/sincpro_web_ui/blob/main/AGENTS.md), the guards that catch what an agent
gets wrong (tokens, contrast, import direction, client boundaries, stories that blow up)
run in `make test`, `make doctor` and `make smoke`, and
while `make dev` runs, Storybook serves an MCP endpoint at `/mcp` so an agent reads the
stories that already exist instead of guessing them.

## Contributing

See [CONTRIBUTING.md](https://github.com/Sincpro-SRL/sincpro_web_ui/blob/main/CONTRIBUTING.md). Issues and pull requests are welcome — especially
from people who build business software for a living.

## License

[MIT](https://github.com/Sincpro-SRL/sincpro_web_ui/blob/main/LICENSE) © SINCPRO S.R.L.
