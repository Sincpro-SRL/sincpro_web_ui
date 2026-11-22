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

installCopy(SPANISH_COPY); // optional: the interface in Spanish — once, where the app starts

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

**What your application ships.** Only what it uses: a `Button` alone is ~2.5 KB gzip, a form
~74, a `Record` ~130, a `List` ~283 — React aside. The heavy pieces (calendar, Gantt, rich-text
and JSON editors, charts, PDF) load in their own chunk when they are drawn, and a library's
stylesheet comes with the component that draws it (the Gantt's alone is ~160 KB), not with
`tokens.css`. `tests/bundle.test.ts` holds those numbers. Your bundler only needs to handle a
CSS import from a dependency — Vite, webpack, Turbopack and Next.js do. Tests that load the
package in Node (Vitest's `node` environment) inline it so those imports go through Vite:
`test: { server: { deps: { inline: [/@sincpro\/web-ui/] } } }`.

### Server rendering (Next.js)

It works as it is with the App Router and the Pages Router, under Turbopack and webpack.
`tokens.css` goes in your global stylesheet, with Tailwind's PostCSS plugin:

```js
// postcss.config.mjs
export default { plugins: { "@tailwindcss/postcss": {} } };
```

- **Server Components** may import from `@sincpro/web-ui`. Every module that needs the browser
  (hooks, context, events) starts with `"use client"`, and a test keeps it that way. What is
  public and draws nothing lives in a module WITHOUT it, so a Server Component calls it and
  gets a value, not a client reference: the looks (`buttonClasses`, `controlClasses`,
  `menuTriggerClasses`, `CELL_TONE`, `byDensity`, `bySurface`), the formatters (`formatCount`,
  `formatNumber`, `formatWith`, `formatDateTime`, `formatRelative`, `countText`), the words
  (`installCopy`, `currentCopy`, `fillCopy`, `ENGLISH_COPY`), the theme's names
  (`THEME_ATTRIBUTE`, `isTheme`), `writeXlsx`, the calendar, the pivot, the criteria and the
  filter's tree (`describeFilter`, `treeFromFilter`) — `tests/serverBoundary.test.ts` holds
  it. What needs a browser stays client: `downloadFile`, `downloadXlsx`, `applyTheme`,
  `sanitizeRichText`. The views are client components: compose `Record` or `List` inside a
  client component of your own.

  ```tsx
  // app/invoices/page.tsx — a Server Component
  import Link from "next/link";
  import { buttonClasses, formatCount } from "@sincpro/web-ui";

  export default async function Invoices() {
    const pending = await countPending();
    return (
      <header>
        <p>{formatCount(pending)} por cobrar</p>
        <Link href="/invoices/new" className={buttonClasses("primary", "md")}>
          Nueva factura
        </Link>
      </header>
    );
  }
  ```

- **The language.** `installCopy` sets the one global there is — and on a server, one process
  renders every page and every request. Installed in one page, it leaks into the next page the
  server renders, which the browser then draws in English: a hydration error. Install it in a
  module EVERY page loads (your root layout's client providers), or — when the language changes
  per user — give it with `UiCopyProvider`, which never writes the global:

  ```tsx
  // app/providers.tsx — rendered by app/layout.tsx around {children}
  "use client";
  import { SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";

  export function Providers({ children }: { children: React.ReactNode }) {
    return <UiCopyProvider copy={SPANISH_COPY}>{children}</UiCopyProvider>;
  }
  ```

  A Server Component that formats (`formatCount`, `formatDateTime`, `describeFilter`) reads
  the words installed in ITS module graph — the server components' copy of the package is not
  the browser's. Install the language there too, at the top of a module your root layout
  imports (the same for every request), or pass the locale: `formatCount(total, "es-BO")`.

- **webpack** (`next build --webpack`): a Server Component that imports from the package root
  makes webpack send the WHOLE library to the browser (~1.2 MB gzip for one `Button`). Let Next
  rewrite those imports — Turbopack, the default, does not need it:

  ```js
  // next.config.mjs
  export default { experimental: { optimizePackageImports: ["@sincpro/web-ui"] } };
  ```

- What only a browser can draw is drawn there: the Gantt (SVAR paints its grid on a canvas)
  renders its skeleton on the server and the chart after hydration.

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

#### Customizing a component

The brand changes the whole product. To change **one component** — square buttons for a
till, a cooler menu, cards without a border — set its `--ui-*` tokens, on `:root` for the
whole application or on any element for a zone. Each one falls back to the system's token, so
setting nothing changes nothing, and each resolves on the element, so the dark theme still
follows:

```css
:root {
  --ui-button-radius: 0;
  --ui-popover-bg: var(--color-ground);
}
.till {
  --ui-control-radius: 0; /* only inside this zone */
}
```

| Component                                                                      | Tokens                                                                                 |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `Button`, `ButtonLink`                                                         | `--ui-button-radius`                                                                   |
| `IconButton`, `IconLink`                                                       | `--ui-icon-button-radius`                                                              |
| Inputs, selects, date and pickers' boxes                                       | `--ui-control-radius`, `--ui-control-bg`, `--ui-control-border`                        |
| Menus, lists, popovers, the cuts panel                                         | `--ui-popover-radius`, `--ui-popover-bg`, `--ui-popover-border`, `--ui-popover-shadow` |
| A row inside them (menu item, option)                                          | `--ui-option-radius`, `--ui-option-active-bg`                                          |
| `Dialog`                                                                       | `--ui-dialog-radius`, `--ui-dialog-bg`                                                 |
| `Block`, `RecordCard`, `Metric`                                                | `--ui-card-radius`, `--ui-card-bg`, `--ui-card-border`                                 |
| A record's card on a board or a grid (`RecordCard`, `RadioGroup look="cards"`) | `--ui-record-card-radius` (falls back to the card's, then to the control's corner)     |
| A board's `BoardTile` and `BoardStat`                                          | `--ui-tile-radius`, `--ui-tile-bg`, `--ui-tile-border` (fall back to the card's)       |
| `Tag`, `Tags`, the search bar's chips                                          | `--ui-tag-radius`                                                                      |
| `SearchBar`'s field                                                            | `--ui-search-radius` (and the control's bg and border)                                 |
| The sidebar on the canvas                                                      | `--ui-sidebar-bg`, `--ui-sidebar-border`                                               |
| `NavigationTree`                                                               | `--ui-nav-radius`, `--ui-nav-current-bg`                                               |
| Table headers (`DataTable`, `EditableTable`, `ReportTable`)                    | `--ui-table-head-bg`                                                                   |
| `Guide` (a guided tour): its card and its veil                                 | `--ui-guide-radius`, `--ui-guide-bg`, `--ui-guide-scrim`                               |

What a token does not cover, a **part** does. Every customizable piece names its root
`data-ui="<component>"` and its parts `data-ui="<component>.<part>"`, with its variant beside
(`data-emphasis`, `data-size`, `data-surface`, `data-tone`) — stable names for your CSS, instead
of classes that change with the next refactor:

```css
[data-ui="button"][data-emphasis="primary"] {
  letter-spacing: 0.02em;
}
[data-ui="popover"] {
  backdrop-filter: blur(8px);
}
```

The parts: `button`, `icon-button`, `control`, `popover`, `menu`, `menu.trigger`,
`menu.section`, `menu.item`, `menu.fold`, `dialog`, `block`, `record-card` (with `data-layout`
`card` | `compact` | `tile`), `record-card.title`, `record-card.figure`, `record-card.fields`,
`record-card.media`, `record-card.badge`, `record-card.footer`, `record-card.stripe`,
`board.lane`, `list.tiles`, `elapsed`, `keypad`, `keypad.key`, `keypad.screen`, `stepper`,
`radio-group`, `radio-group.card`, `tags.count`, `outcome`, `outcome.figure`, `receipt`,
`receipt.document`, `receipt.lines`, `receipt.totals`, `kiosk`, `kiosk.attract`,
`kiosk.content`, `kiosk.reach`, `board.tile`,
`board.stat`, `board.stat.value`, `activity.changes`, `file-list`, `file-list.file`, `file-value`, `metric`, `metric.detail`, `tag`, `tags.item`, `search`, `search.field`, `search.chip`,
`search.panel`, `search.suggestions`, `search.suggestion`, `search.record`, `search.recent`,
`search.advanced`, `search.keys`, `search.completion`, `search.undo`, `search.slash`, `search-entry`, `search-entry.keys`, `table`, `table.pile`, `yes-no`,
`table.head`, `row.ways`, `topbar`, `topbar.brand`, `topbar.menus`, `topbar.actions`, `topbar.user`,
`frame`, `frame.banner`, `frame.bar`, `frame.sidebar`, `frame.main`, `banner`, `banner.action`,
`inbox`, `inbox.item` (with `data-unread`), `kbd`, `price`, `price.before`, `rating`, `gallery`,
`gallery.main`, `gallery.strip`, `lightbox`, `sidebar`, `sidebar.brand`,
`sidebar.user`, `sidebar.search`, `sidebar.nav`, `sidebar.account`, `navigation`,
`navigation.item`, `dirty.blocked`, `dirty.bar`, `field`, `field.label`, `form.section`,
`form.index`, `dock`, `dock.pill`, `dock.bare`, `pager`, `pagination`, `smart`, `guide`, `guide.veil`, `guide.spot`, `guide.card`,
`guide.progress`, `guide.title`, `guide.body`, `guide.actions`. A part that is one of many
carries `data-key` too (`navigation.item`). Put your rules in a cascade layer above web-ui's, or
outside any layer.

#### Touch and the counter: a till, a kitchen, a kiosk, a shop

The same pieces as the ERP, drawn for a finger — no «POS» inside the package. The application
says what the person presses with, on `<html>` or on a zone (a till is a touch monitor with a
mouse plugged in, so the browser alone says «mouse»):

```tsx
<html {...pointerAttributes("touch")}> {/* data-pointer="touch" */}
```

Controls grow to 44 px, what is drawn small answers to `--size-target` (`hit-target`), and what
only shows on hover follows the `touch:` variant. Then: `List.Tiles` (a product grid),
`List.Filters` with `Tags size="md" | "lg"` and `count`, `RadioGroup look="cards"`, `Keypad`
(with `screen`), `Stepper`, `RecordCard elapsed`, `Outcome`, `Receipt`, and `KioskFrame` (an
attract screen, `idleAfter`, a reduced-height mode). The Storybook page «Táctil y mostrador»
orders them by what they solve; `5 · Plantillas/Mostrador` has the till, the express till, the
kitchen, the kiosk and the shop.

For a shop's product page and a customer portal: `Price` (the price before struck, the discount
computed), `Rating` (an average with its figure, or the opinion asked), `Gallery` (with a
full-size `Lightbox`), `Inbox` (the bell in `TopBar systray`, or `InboxList` as a page), and
`Banner` — a notice about the whole application, in `AppFrame banner`.

#### A form that explains itself: the «settings» style

The default form is the dense sheet of an ERP — label | control, two columns, help behind a
`?`. An application whose forms are filled once in a while and read before they are typed into
(a back office's settings, an account) can choose the **settings** style, once, around the app:

```tsx
<FormStyleProvider value="settings">
  <App />
</FormStyleProvider>
```

Then every `Field` is a row — the label with `*` or «(opcional)» (`optional`) and its `hint`
written out under it on the left, the control on the right —, every `FormSection` is a card
(`form.section`) with an index of the titled ones at the sheet's left (`form.index`), and a
`Record` with `dirty` floats Discard · Save at the bottom of the screen (`dirty.bar`) instead of
the rail. The layout (`stacked` / `horizontal`) is still the screen's: stacked, the help and the
control go under the label. Without the provider nothing changes.

#### A dense record found by its index: the «sections» style

`FormStyleProvider value="sections"` keeps the ERP's density and takes the settings' shape:
every `SheetGroup` on the paper and every notebook page (`Record.Page`) is a card on the
ground, listed in the index at the left (sticky under the application bar, marking the one
being read), and inside each card the dense grid stays — label | value, two or three columns,
a group inside a card stays a titled group. The notebook's pages are not tabs any more: a long
record is read top to bottom and found by its index, nothing hidden behind a tab. Save and
Discard float as in settings, and the activity stands apart. Pair it with the modern style:
`5 · Plantillas/Registros/Ficha de contacto › En secciones`.

A table's TITLE column (the card's title on a phone: `stack: "title"`, or the first column)
keeps `--size-cell-title` (14 rem): a product name cut with «…» asks for no width of its own,
and beside figures with a width it was squeezed to «Imp…».

#### Searching the records of a relation — and extending the search

Typing «andres» in the bar offers «Cliente con «andres» ▸», and the ▸ (or →) unfolds the
CLIENTS that match — the way Odoo's «Search Contact for: …» does. Choosing one filters by that
record: what travels is its key, what reads is its name («Cliente: Andrés Pérez»), and a second
one lands in the same chip («… o Andrés Gutiérrez», sent as `in`). An enum unfolds into its
words («Pagada», sent as `paid`), and the builder asks the same way: «Cliente es [Andrés Pérez]»
with a picker, «está en» with tags, «está vacío» with nothing.

web-ui does not know where the records live. The application gives **one** search, by prop or
once for the whole app — web-framework wires it to the relation's literal search, the one a
many2one already asks:

```tsx
const searchRecords: SearchRecords = ({ relation, path, text, keys, signal }) =>
  keys !== undefined
    ? api.names(relation, keys, { signal }) // name what a filter read back carries
    : api.literalSearch(relation, text, { limit: 8, signal }); // what was typed

<SearchProvider
  searchRecords={searchRecords}
  browseRecords={(browse) => openChooser(browse)} // your list in choosing mode, its own bar
  valueEditor={myValueEditor}
>
  <App /> {/* every SearchBar, FilterBuilder and CriteriaBuilder inside */}
</SearchProvider>;
```

`RecordOption.id` is what the relation compares: for a many2one, what its identifying column
(`identifiedBy`, its foreign key) holds; for a to-many relation, the key of the record on the
other side (`relationKey`, `id` by default) — the filter crosses it with `through`. An enum's
words come from `translations.choices`.

A path is walked the same way: in «Cliente › País» the first option is «País (el registro)» —
the rule then asks for COUNTRIES, picked by name— above País's own fields, for when the
question is about a field («Código empieza con B»). «Buscar más…» opens your chooser: another
context, the relation's whole list with its own search bar (which unfolds relations too).

Who does what: web-ui draws and notifies; **web-framework** wires `searchRecords` to the
entity's literal search, `browseRecords` to the entity's list in choosing mode and `loadModel`
to the related meta — once, for every entity; composer decides where the chooser opens (a modal
over a page, beside a modal); the application only overrides what it wants.

What can be extended, and how:

| You want                                         | Use                                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| The records of a relation, from your server      | `searchRecords` (prop, or `SearchProvider` once)                                             |
| A record drawn your way in the dropdown          | `SearchBar renderRecord`                                                                     |
| «Buscar más…» under the records: your chooser    | `browseRecords` (prop or `SearchProvider`), bar and builder; answer with `choose`            |
| A field's value drawn your way in the builder    | `valueEditor` (prop or `SearchProvider`): answer `undefined` to keep ours                    |
| A list that opens filtered (defaults, a link)    | `queryField` + `valuesCriteria` / `conditionCriteria` / `toggleNamed`                        |
| One more value into a chip, by code              | `withValue(criteria, field, record)`                                                         |
| The filter said with names, for your own chip    | `describeFilter(selection, model, modelAt, names)`, `FilterBuilder onApply(selection, said)` |
| Your own builder                                 | `SelectionTree`, `RuleValue`, `liftRecords`, `recordsFilter`, `recordOps`                    |
| The words of an operator («no está establecido») | the copy table: `ops`                                                                        |

#### A group says what it adds up to, under each column

A table grouped by a field draws each pile's row like Odoo's grouped list: its name, how many,
and under every column that declared an `aggregate` what the pile adds up to — written like
the footer («185.200,50», «máx 5»). Whoever counts the piles (the server's grouped read) sends
the sums in `Pile.totals`, by column id; without them the table sums the rows when the pile
holds all of them — the sum of one page of a pile of thousands looks like its total and is
not. The sheet's bands and the report built from the piles say the same numbers: in the report
every pile is a group with its amounts, and a «Total» line closes it.

A column's numbers are written ONE way, in its cells, its piles and its footer: its `format`,
else its `decimals` (`DataColumn.decimals`, `SheetColumn.decimals`): `2` writes «6.057,10»
under «8.370,57», not «6.057,1».

#### The direction: the modern style (`ViewStyleProvider`)

**Modern is Sincpro's own style, and where the system is going.** It is not a trial: it is how
new screens are drawn, and it keeps being iterated — small things that help, one round at a
time. `traditional` stays, for good — same API, same data —: it is how business software is
done (Odoo's way), and the applications already drawn in it keep it. The API both styles read
(settled in #68): `ViewStyleProvider` / `Record look`; `Record.Dock` (`rail` | `bottom`);
`List.Dock` (`placement`, `selectionPlacement`, the pill named by the list); `List openTargets`

- `onOpenIn`; `DataColumn.yesNo`; `Pagination look` / `Pager look`; `StatusBar look`. What the
  direction is:

* **The page breathes on the ground.** No white band on top of the paper: the trail IS the
  page's heading (`Breadcrumb size="lg"`), and a step down, what the record has (the
  counters, boxes) and where it is at (the state).
* **One floating pill holds the actions** — at the bottom of the screen, centred, under the
  thumb —: a record's, a settings form's, and a list's, named by the list it acts on
  («Pedidos │ Importar · Nueva cotización») so one action is never a lone button. It turns into
  «N cambios · Descartar · Guardar» while there are changes, and into what is done to the chosen
  rows while some are chosen. One per screen: a collection's chosen rows take the record's
  place.
* **Pills are the shape of the identity**: the actions' pill, the pager (a translucent primary
  pill), the state as a pill of pills (`StatusBar look="segmented"`), the row's ways in.
* **Colour means something**: the gold is the one action that moves the record forward; the
  translucent primary, where you are; red, what undoes.
* **The keyboard reaches everything**: every action can carry its shortcut, drawn for the
  person's keyboard (see below).
* **A number reads the same everywhere**: its column's decimals and format in the cells, the
  groups, the footer and the report.

Already in the direction: dense records in sections with an index (`FormStyleProvider
value="sections"`, below) and the state on a phone (`display="auto"`). Next: the rest of the
screens taking the floating pill, and the phone's pill when an action does not fit.

A record and a list are written once — `Record.Dock` and `List.Dock` with their actions as
data — and the application's style decides how they are drawn, the way it chooses its density:

```tsx
// "traditional" is the default; a single Record can say its own with `look`.
<ViewStyleProvider value="modern">
  <App />
</ViewStyleProvider>
```

- **traditional**: the ERP rail — a band with the trail, the counters and the pager; the
  actions as the bar's buttons (the primary first and gold, «⋯» with the rest), in a record
  and in a list alike.
- **modern**: the trail is the page's heading with the pager as a translucent primary pill on
  its line (`Pager look="pill"`); a step down, the counters (boxes) and the state; the band is
  the ground; and the actions float in ONE pill at the bottom of the screen, centred — a
  record's, and a list's named by the list (`List.Dock placement="bar"` keeps a list's in its
  header). Two things were tried and dropped: a pill resting in the rail and floating at the
  TOP, and the counters as links.

**The state.** `StatusBar look`: `track` (Odoo's — the traditional style's), `segmented` (a
pill of pills, the actions' shape — the modern style's), `steps`, `progress` and `pill` (one chip that unfolds the stages). Each
stage can carry an `icon`, an `activeIcon` (worn when it is the current or the chosen one:
○ → ◉), a `hint` (said when pointed at) and a `count` (how many are there, in a list grouped by
stage). `display` says what a stage shows — `auto` (the default: every name where there is
room, on a phone only the current one's), `both`, `label`, `icon` (the name said to a screen
reader and on hover) or `current` (the icons, and the current stage's name) —, and
`renderStage` draws a stage your way inside the system's segment, which keeps the order, the
paint, the focus and the names. `Record.Status look` picks one; all side by side in
`3 · Componentes/Registro/Riel, estado y contadores`.

#### Keyboard shortcuts that run

A combination is written once — `"Alt+D"`, `"Mod+S"` (⌘ on a Mac, Ctrl elsewhere) — and is
pressed, drawn and announced for the person's keyboard (`foundations/keys`: «⌥D» / «Alt+D»,
`aria-keyshortcuts`). It RUNS while the piece that declares it is on screen, and declarations
stack: the record in a peek over the page answers, not the page under it.

- `DockAction.shortcut` — any action, a sub-action or one waiting in «Más» included.
- `Record.Pager` / `Pager keys` — Alt+P and Alt+N by default (Odoo's), `false` for none.
- Save answers Mod+S wherever it is (`DirtyActions`).
- Your own: `useShortcuts([{ keys: "Alt+K", run, enabled }])`, and `useKeysHint(keys)` to draw
  it.

A combination with a modifier works while a field is being typed in; a bare key does not.

#### The record's actions floating (`Record.Dock`)

The «settings» style floats Save and Discard in a dark pill; `Record.Dock` tries that pill for
ALL of a record's actions. In place of `Record.Actions`, the actions are written as data, and the
pill decides what is seen: the primary, gold and last; `visible` secondary ones (one with
sub-actions is a menu button, «Imprimir ▾»); the rest in «Más ⋯», sub-actions as submenus, what
undoes apart and last, in red. Where it goes is `placement`: `rail` (the traditional buttons),
`bottom` (the modern default, floating centred) or `top` (resting in the rail, a layer of the
sticky stack once it scrolls away); while there are changes the same pill holds «N cambios ·
Descartar · Guardar».

```tsx
<Record.Rail>
  <Record.Crumbs crumbs={…} />
  <Record.Dock
    label="Acciones de la factura"
    actions={[
      { id: "pay", label: "Registrar pago", icon: CreditCard, primary: true, onSelect: pay },
      { id: "send", label: "Enviar", icon: Send, onSelect: send },
      { id: "print", label: "Imprimir", icon: Printer, items: [
        { id: "print-invoice", label: "Factura", shortcut: "Mod+P", onSelect: printInvoice },
        { id: "print-note", label: "Remito", onSelect: printNote },
      ] },
      { id: "copy", label: "Duplicar", icon: Copy, shortcut: "Alt+D", onSelect: duplicate },
      { id: "void", label: "Anular en el SIAT", icon: Ban, danger: true, onSelect: voidIt },
    ]}
    // placement="rail" | "bottom" | "top", align="center" | "end", look="chrome" | "canvas", visible={2}
  />
  <Record.Status stages={…} current="posted" />
</Record.Rail>
```

A list says the same with `List.Dock` — `actions` (what it starts) and `selection` (what is
done to the chosen rows). `placement` is `bar` (the bar's buttons; the chosen rows' in place of
the search) or `bottom` (ONE floating pill, the chosen rows' while some are chosen); absent,
the view style decides. `selectionPlacement` overrides where the chosen rows' actions go.

`ActionDock` is the pill alone (`placement="inline"`, or sticky `top` / `bottom` anywhere, with
a `lead` before the actions) and `dockPlan` the rule, for a screen that is neither.

#### A guided tour: the screen says what each thing is

`Guide` walks a person through a screen: the rest dims, the thing being explained is cut out,
and a card beside it names it. Its stops are the anchors above, so no component needs a prop to
be pointed at:

```tsx
<Guide
  open={open}
  label="Recorrido del portal"
  steps={[
    { id: "hola", title: "Bienvenida", body: "Un minuto para ver dónde está cada cosa." },
    { id: "buscar", target: { part: "sidebar.search" }, placement: "right", title: "Buscar", body: "…" },
    { id: "cuotas", target: { part: "navigation.item", key: "socios.cuotas" }, title: "Cuotas", body: "…" },
    { id: "cifras", target: { spot: "cifras" }, title: "Las cifras de hoy", body: "…" },
  ]}
  onClose={(reason, index) => {
    setOpen(false);
    markSeen(reason); // "finish" | "skip" | "dismiss" — remembering it is the application's
  }}
/>

<GuideSpot id="cifras">
  <Metrics>…</Metrics>
</GuideSpot>
```

- **A target** is a part (`{ part }`), one item of a collection (`{ part, key }`), anything wrapped
  in `GuideSpot` or carrying `data-guide` (`{ spot }`), a selector, or a function returning an
  element. A step without one is centred.
- **`before()`** runs first — navigate, open a tab — and the step waits for its target to appear.
  A target that never appears is skipped; the tour does not break when the screen changes.
- **On a phone**, a stop inside the frame's sidebar opens its drawer, and the next stop outside
  closes it. Render the `Guide` inside the `AppFrame`.
- It is a modal dialog: focus on «Siguiente» (Enter walks it), → and ←, Escape to leave, and
  every step announced. `onStepChange` and `startAt` let an application save and resume it.
- `placeCard`, `findTarget`, `selectorOf` and `boxOf` are exported: a tour of your own follows the
  same rules.

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
