"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import {
  type Grouping,
  pathKey,
  type Pile,
  pileIsOpen,
  pileItems,
  pilesOf,
} from "@sincpro/web-ui/foundations/grouping";
import { HANDHELD_WIDTH } from "@sincpro/web-ui/foundations/layout";
import { stickyTop, useScrollBox } from "@sincpro/web-ui/foundations/sticky";
import { IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { Plus, Trash2 } from "lucide-react";
import {
  Fragment,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useKeyboard } from "react-aria";

/* ==================================================================== *
 *  EDITABLE TABLE — the list you write inside of.
 *
 *  It is the pattern of the lines of a document: the lines of an invoice, the
 *  products of a sales order, the installments of a payment term. Up to now that was solved
 *  by opening one dialog per line, and editing six lines was six dialogs — with
 *  the table covered up right when what you need is to compare the line you are
 *  writing with the ones above it.
 *
 *  ── You edit the ROW, not the cell ──────────────────────────────────
 *
 *  Touching a row puts the whole thing into editing; the rest stays in reading
 *  mode. It is the decision that separates this from a spreadsheet, and it is
 *  deliberate:
 *
 *    · a line is a UNIT —a method without its column means nothing—, so
 *      committing it piece by piece leaves states that do not exist;
 *    · with every cell editable at once, the table is a wall of boxes and
 *      cannot be read;
 *    · and the tab key walks the row, which is how you actually enter data.
 *
 *  ── Leaving the row commits ─────────────────────────────────────────
 *
 *  There is no accept button per line. `Escape` cancels —the row goes back to
 *  what it said before you touched it—, and clicking outside, tabbing out of it
 *  or `Enter` commits. One button per row is N buttons saying the same thing as
 *  the one below, and whoever enters ten lines presses them ten times for nothing.
 *
 *  ── The keyboard route ──────────────────────────────────────────────
 *
 *  Rows are ONE stop in the tab order (a roving tab index, the grid pattern):
 *  twenty lines are not twenty tab presses to get past the table. Up and down
 *  arrows walk the rows, `Enter` or `F2` opens the focused row and puts the focus
 *  on its first control, `Tab` walks that row's controls, and `Enter` / `Escape`
 *  close it with the focus back on the row — so the next arrow press goes on from
 *  where you were. A read-only table (no `onChange`) has no stops at all: there
 *  is nothing to do on its rows.
 *
 *  ── The header sticks the way `Table`'s does ────────────────────────
 *
 *  The box around the table is decided by `useScrollBox` (see `sticky.tsx`): no
 *  scroll container unless it has a height or does not fit, so inside a record
 *  the header sticks under the application bar and the rail; inside its own
 *  scroll box the sticky stack starts from zero. A hard-coded `overflow-auto`
 *  made every editable table its own scroller, and the header, still reading the
 *  page's `--sticky-top`, was pushed down over the first lines.
 *
 *  ── On a phone each row is a stacked card ───────────────────────────
 *
 *  Below `--container-handheld` (40rem) of its OWN box —a phone, a drawer, a
 *  narrow panel— a grid of five columns showed the first one and clipped the
 *  rest behind a horizontal scroll nobody discovers: an invoice line said its
 *  product and hid its amount, the one figure a person opens it for. There the
 *  table draws each row as a card instead:
 *
 *      Licencia de usuario adicional                         [trail]
 *      Por usuario y mes · LIC-USR
 *      12 × Bs. 120,00 · desc. 10 %                    Bs. 1.296,00
 *
 *  the TITLE on top, one DETAIL line under it, muted, and the AMOUNT at the
 *  right of that line, in ink. Where each column goes is said on the column
 *  (`stack`), and how it reads in the detail line too (`brief`): a quantity
 *  reads «12 × Bs. 120,00», not «Cantidad 12». The defaults need nothing —
 *  the first column is the title, the last numeric one the amount, the rest
 *  detail— so a table that declares nothing still reads on a phone.
 *
 *  It needs two renderings —a card cannot be a `<tr>` without some browser
 *  dropping the table's semantics— so the box is measured (`ResizeObserver`,
 *  before paint) and only ONE is mounted: never a table and a list both in the
 *  accessibility tree. The keyboard model is the same in both: one tab stop,
 *  arrows, `Enter` / `F2`, `Escape` puts the row back. A card being edited
 *  shows its controls under it, each with the column's name above it. A
 *  consumer that edits the whole row in a form of its own (`LineItems`' dialog,
 *  a bottom sheet on a phone) passes `onOpen`, and pressing the card opens that
 *  instead: three number boxes squeezed into a card are worse than a real form.
 * ==================================================================== */

/** Where a column goes when the row is drawn as a stacked card (a narrow box).
 *  `trail` sits at the top right, beside the title — a state, the row's buttons. */
export type StackPlace = "title" | "detail" | "amount" | "trail" | "hidden";

/** How the rows are drawn: `auto` measures the box and stacks them below
 *  `--container-handheld`; `table` and `stacked` force one — a side panel that is
 *  always narrow, a test that has no box to measure. */
export type EditLayout = "auto" | "table" | "stacked";

export interface EditColumn<T> {
  id: string;
  header: string;
  width?: number;
  numeric?: boolean;
  /** How the cell reads when the row is NOT being edited. */
  render: (row: T) => ReactNode;
  /** The control, when the row is being edited. Without this the column is read
   *  only: an identifier or a computed value. Give the control an `aria-label`
   *  (the column's name, or a longer one): a cell has no `Field` to name it, and
   *  `Tab` through the row reads each control by that name. */
  edit?: (row: T, set: (next: T) => void) => ReactNode;
  /** Where the column goes in the stacked card, below `--container-handheld`. By
   *  default the first column is the `title`, the last numeric one the `amount` and
   *  the rest `detail`. `hidden` for what another column's `brief` already says. */
  stack?: StackPlace;
  /** How the column reads inside the card's detail line, when «header value» is not
   *  the way to say it: «12 × Bs. 120,00» for a quantity, «desc. 10 %» for a
   *  discount. `null` or `""` leaves it out of that row's line — a zero discount is
   *  not news. Without it the line reads «<header> <cell>». */
  brief?: (row: T) => ReactNode;
}

/**
 * Where each column goes in the stacked card, defaults resolved: a declared `stack`
 * wins; otherwise the first undeclared column is the title (unless one was declared),
 * the last undeclared numeric one is the amount (unless one was declared), and the rest
 * are detail.
 */
export function stackPlaces(
  columns: readonly { stack?: StackPlace; numeric?: boolean }[],
): StackPlace[] {
  const titleAt = columns.some((c) => c.stack === "title")
    ? -1
    : columns.findIndex((c) => c.stack === undefined);
  const amountAt = columns.some((c) => c.stack === "amount")
    ? -1
    : columns.findLastIndex(
        (c, i) => c.stack === undefined && c.numeric === true && i !== titleAt,
      );
  return columns.map(
    (c, i) => c.stack ?? (i === titleAt ? "title" : i === amountAt ? "amount" : "detail"),
  );
}

/** A brief that says nothing is left out of the line, separator included. */
function says(node: ReactNode): boolean {
  return node !== null && node !== undefined && node !== false && node !== "";
}

/** The label of a group band — its field, its value, how many rows it holds. The same
 *  in the table's band and the stacked list's. */
function pileTag<T>(pile: Pile<T>, locale: string): ReactNode {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-micro text-muted/70">{pile.field}</span>
      <span className="truncate text-micro font-medium text-ink">{pile.label}</span>
      <span className="inline-flex shrink-0 items-center rounded-pill border border-line-strong bg-ink/5 px-2 py-0.5 text-micro tabular-nums text-muted">
        {pile.count.toLocaleString(locale)}
      </span>
    </span>
  );
}

/** The focus ring of an operable row: drawn on the row, inset, so it is not cut by the
 *  box and does not move the cells. */
const RING =
  "outline-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary forced-colors:focus-visible:outline-[Highlight]";

/** What can take the focus in a row. Filtered again in `firstControl`: React Aria's
 *  hidden form mirrors (a `<select>` behind a `Select`) match this and are not stops. */
const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]';

/** The first control of a row being edited: the first one in an editable cell, else
 *  anything focusable in the row (a column without `edit` may still hold a button). */
function firstControl(row: HTMLElement): HTMLElement | null {
  const stops = (scope: string) =>
    [...row.querySelectorAll<HTMLElement>(scope)].find(
      (el) => el.tabIndex >= 0 && el.closest('[aria-hidden="true"], [inert]') === null,
    ) ?? null;
  return stops(`[data-edit] :is(${FOCUSABLE})`) ?? stops(FOCUSABLE);
}

/** Keys a control inside the row already answers with `Enter`: a button presses, a
 *  link follows, a text area breaks the line, an open list picks its option. */
function ownsEnter(target: EventTarget): boolean {
  return (
    target instanceof Element &&
    target.closest(
      'button, a[href], textarea, [role="button"], [role="combobox"][aria-expanded="true"]',
    ) !== null
  );
}

type RowKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

/**
 * One body row. Its own component so that it can hold React Aria's `useKeyboard`
 * (a hook per row) and the timer that decides whether the focus really left it.
 * The same row is a `<tr>` in the table and an `<li>` in the stacked list: one
 * keyboard model, two shapes.
 */
function EditRow({
  as,
  rowId,
  rowRef,
  editable,
  editing,
  tabbable,
  className,
  onStart,
  onCommit,
  onCancel,
  onMove,
  onFocusRow,
  children,
}: {
  as: "tr" | "li";
  rowId: string;
  rowRef: (node: HTMLElement | null) => void;
  editable: boolean;
  editing: boolean;
  tabbable: boolean;
  className: string;
  onStart: (viaKeyboard: boolean) => void;
  onCommit: (refocus: boolean) => void;
  onCancel: () => void;
  onMove: (key: RowKey) => void;
  onFocusRow: () => void;
  children: ReactNode;
}) {
  const leaving = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stay = () => {
    if (leaving.current !== null) clearTimeout(leaving.current);
    leaving.current = null;
  };
  useEffect(() => stay, []);

  /* React Aria's `useKeyboard` stops the propagation of what it handles and lets
     the rest through (`continuePropagation`), so an `Escape` the row did not use
     still reaches the dialog or the drawer around the table. */
  const { keyboardProps } = useKeyboard({
    isDisabled: !editable,
    onKeyDown: (e) => {
      if (!editing) {
        /* Only on the row itself: a link drawn inside a reading cell keeps its
           own `Enter`. */
        if (e.target !== e.currentTarget) return e.continuePropagation();
        if (e.key === "Enter" || e.key === "F2") {
          e.preventDefault();
          onStart(true);
          return;
        }
        if (
          e.key === "ArrowDown" ||
          e.key === "ArrowUp" ||
          e.key === "Home" ||
          e.key === "End"
        ) {
          e.preventDefault();
          onMove(e.key);
          return;
        }
        return e.continuePropagation();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      e.continuePropagation();
    },
  });

  const props: HTMLAttributes<HTMLElement> & { "data-row-id": string } = {
    ...keyboardProps,
    /* `Enter` commits in the CAPTURE phase: React Aria's number field answers
         `Enter` itself and stops it, so it would never bubble up to the row. Taking
         it on the way down —and only from the row's own cells, not from a list
         open in a portal— commits from any control. Focusing the row first lets
         that field write the value it was holding (it commits on blur). */
    onKeyDownCapture: editing
      ? (e) => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
          if (!(e.target instanceof Node) || !e.currentTarget.contains(e.target)) return;
          if (ownsEnter(e.target)) return;
          e.preventDefault();
          e.stopPropagation();
          onCommit(true);
        }
      : undefined,
    ...(editable
      ? {
          /* While it is being edited the row itself is not a stop: `Shift+Tab`
               from its first control leaves it (and commits) instead of landing on
               the row it is already in. */
          tabIndex: tabbable && !editing ? 0 : -1,
          "aria-keyshortcuts": editing ? undefined : "Enter F2",
          onFocus: () => {
            stay();
            onFocusRow();
          },
          onBlur: editing
            ? () => {
                /* Commit only if the focus left the WHOLE row — and the row is
                     not only its DOM. A `Select`'s list opens in a portal, outside
                     the `<tr>`, so "the next focused element is not inside" would
                     close the row the moment its list opened. The focus event of a
                     portal still bubbles through React's tree back to this row, so
                     the commit waits one tick: if the focus landed anywhere that
                     belongs to the row, `onFocus` above cancels it. */
                stay();
                leaving.current = setTimeout(() => {
                  leaving.current = null;
                  onCommit(false);
                }, 0);
              }
            : undefined,
          onClick: editing ? undefined : () => onStart(false),
        }
      : {}),
    className,
    "data-row-id": rowId,
  };

  return as === "li" ? (
    <li ref={rowRef} {...props}>
      {children}
    </li>
  ) : (
    <tr ref={rowRef} {...props}>
      {children}
    </tr>
  );
}

/**
 * A table whose rows are edited in place, one row at a time.
 *
 * Mouse: touching a row opens it. Keyboard: the rows are one tab stop, the arrows walk
 * them, `Enter` / `F2` open one, `Tab` walks its controls, `Enter` commits and `Escape`
 * puts the row back as it was; both return the focus to the row. Leaving the row
 * (click outside, tabbing past its last control) commits.
 *
 * Narrower than `--container-handheld`, each row is a stacked card (see the file's
 * header): the same keys, and `onOpen` —when given— instead of editing in place.
 */
export function EditableTable<T>({
  rows,
  columns,
  getRowId,
  onChange,
  onRemove,
  onAdd,
  addLabel,
  /** The footer with the aggregates, already formatted. `null` on the columns
   *  that do not add up. Whoever composes computes it, because whoever composes
   *  knows what adding up means in their domain —a percentage is not summed, it
   *  is averaged. */
  totals,
  empty,
  grouping,
  /** El total de una columna DENTRO de un montón, ya formateado. Lo calcula quien
   *  compone, por el mismo motivo que `totals`: sumar significa cosas distintas
   *  según el dominio, y un porcentaje se promedia, no se suma. */
  groupTotal,
  height,
  layout = "auto",
  onOpen,
}: {
  rows: readonly T[];
  columns: readonly EditColumn<T>[];
  getRowId: (row: T) => string;
  onChange?: (id: string, next: T) => void;
  onRemove?: (id: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  totals?: readonly (ReactNode | null)[];
  empty?: string;
  /**
   * El agrupado, con el mismo contrato que el resto de las vistas de datos.
   *
   * Editar y agrupar no se estorban: la fila que se edita sigue siendo una fila,
   * y el montón sólo decide dónde cae. Lo que no se hereda es el orden — las
   * filas de un montón quedan juntas, así que agregar una fila nueva la pone al
   * final de todo y no adentro del montón que estabas mirando, que es el
   * comportamiento honesto: todavía no tiene valor en el campo por el que se
   * agrupa.
   */
  grouping?: Grouping<T>;
  groupTotal?: (column: EditColumn<T>, rows: readonly T[]) => ReactNode | null;
  /** A height of its own, as `Table`'s: the lines scroll inside the box and the header
   *  sticks to its top. A number means pixels; a string goes through as is (`20rem`).
   *  Without it the table grows with its lines and the header sticks to the page. */
  height?: number | string;
  /** `auto` (the default) stacks the rows as cards when the box is narrower than
   *  `--container-handheld`; `table` and `stacked` force one. */
  layout?: EditLayout;
  /** Only in the stacked layout: pressing a card (or `Enter` / `F2` on it) calls this
   *  instead of editing the row in place — for a consumer that edits the whole row in a
   *  form of its own, a dialog that is a bottom sheet on a phone. The table ignores it:
   *  there the row is edited where it is read. */
  onOpen?: (id: string) => void;
}) {
  const copy = useUiCopy();
  const d = useDensity();
  const box = useScrollBox<HTMLDivElement>(height === undefined ? {} : { height });
  const [editing, setEditing] = useState<string | null>(null);
  /* The row that holds the one tab stop of the body: the last one focused. */
  const [active, setActive] = useState<string | null>(null);
  const rowNodes = useRef(new Map<string, HTMLElement>());
  /* The row as it was when editing began, to put it back on `Escape`; `touched` says
     whether any control wrote to it since, so a cancel without changes changes nothing. */
  const before = useRef<{ id: string; row: T; touched: boolean } | null>(null);
  /* Set when the keyboard opened the row: its first control takes the focus once
     the controls exist. A click opens it without moving the focus. */
  const focusOnOpen = useRef<string | null>(null);

  /* La secuencia que se dibuja: montones y filas intercalados. Sin agrupado, las
     filas tal cual — una tabla que no agrupa no paga nada por poder hacerlo. */
  const drawn = useMemo<{ pile?: Pile<T>; row?: T }[]>(() => {
    const piles = pilesOf(rows, grouping);
    if (piles === null) return rows.map((row) => ({ row }));
    const out: { pile?: Pile<T>; row?: T }[] = [];
    const walk = (list: readonly Pile<T>[]) => {
      for (const pile of list) {
        out.push({ pile });
        if (!pileIsOpen(pile, grouping)) continue;
        if (pile.piles.length > 0) walk(pile.piles);
        else for (const row of pile.items) out.push({ row });
      }
    };
    walk(piles);
    return out;
  }, [rows, grouping]);
  /* The width of the box decides, not the window's: a drawer on a wide screen is as
     narrow as a phone. Measured before paint, so a phone never sees the table first. */
  const frame = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = frame.current;
    if (layout !== "auto" || el === null) return;
    /* A box that measures zero is hidden (a closed tab): it keeps what it had. */
    const measure = (width: number) => {
      if (width > 0) setNarrow(width < HANDHELD_WIDTH);
    };
    measure(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(([entry]) => {
      if (entry !== undefined) measure(entry.contentRect.width);
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, [layout]);
  const stacked = layout === "stacked" || (layout === "auto" && narrow);

  const editable = onChange !== undefined;
  /* A card that opens the consumer's form is operable even with nothing to edit in
     place: it has a tab stop, takes Enter and answers a press. */
  const opens = stacked && onOpen !== undefined;
  const operable = editable || opens;
  const cell = byDensity(d, "px-3 py-1.5", "px-2 py-1");
  const add = addLabel ?? copy.editable.add;
  const emptyText = empty ?? copy.editable.empty;

  /* The rows in the order they are drawn: what the arrows walk. */
  const order = drawn.flatMap((entry) =>
    entry.row === undefined ? [] : [getRowId(entry.row)],
  );
  const stop = active !== null && order.includes(active) ? active : (order[0] ?? null);

  useEffect(() => {
    const id = focusOnOpen.current;
    if (id === null || id !== editing) return;
    focusOnOpen.current = null;
    const node = rowNodes.current.get(id);
    if (node !== undefined) (firstControl(node) ?? node).focus();
  }, [editing]);

  const start = (id: string, row: T, viaKeyboard: boolean) => {
    if (opens) {
      setActive(id);
      onOpen?.(id);
      return;
    }
    before.current = { id, row, touched: false };
    focusOnOpen.current = viaKeyboard ? id : null;
    setActive(id);
    setEditing(id);
  };

  /* Keyed by the row: a commit that arrives late (the blur of the row you clicked
     away from) must not close the row the click just opened. */
  const close = (id: string) => setEditing((current) => (current === id ? null : current));

  const commit = (id: string, refocus: boolean) => {
    if (refocus) rowNodes.current.get(id)?.focus();
    if (before.current?.id === id) before.current = null;
    close(id);
  };

  const cancel = (id: string) => {
    /* The focus goes back to the row FIRST: a control that writes its value on blur
       (a number field) writes it now, and the old row is put back after it, not
       before. */
    rowNodes.current.get(id)?.focus();
    const was = before.current;
    before.current = null;
    if (was !== null && was.id === id && was.touched) onChange?.(id, was.row);
    close(id);
  };

  /* What a control writes, marking the row as touched for `Escape`. */
  const setter = (id: string) => (next: T) => {
    if (before.current?.id === id) before.current.touched = true;
    onChange?.(id, next);
  };

  /* The wiring a row needs, the same for the table's `<tr>` and the stacked `<li>`. */
  const rowWiring = (id: string, row: T) => ({
    rowId: id,
    rowRef: (node: HTMLElement | null) => {
      if (node === null) rowNodes.current.delete(id);
      else rowNodes.current.set(id, node);
    },
    editable: operable,
    editing: editing === id,
    tabbable: stop === id,
    onStart: (viaKeyboard: boolean) => start(id, row, viaKeyboard),
    onCommit: (refocus: boolean) => commit(id, refocus),
    onCancel: () => cancel(id),
    onMove: (key: RowKey) => move(id, key),
    onFocusRow: () => setActive(id),
  });

  const move = (from: string, key: RowKey) => {
    const at = order.indexOf(from);
    const to =
      key === "Home"
        ? 0
        : key === "End"
          ? order.length - 1
          : key === "ArrowDown"
            ? Math.min(at + 1, order.length - 1)
            : Math.max(at - 1, 0);
    const id = order[to];
    if (id === undefined) return;
    setActive(id);
    rowNodes.current.get(id)?.focus();
  };

  /* ── the stacked list: one card per row, below `--container-handheld` ── */

  const places = stackPlaces(columns);
  const placed = (place: StackPlace) => columns.filter((_, i) => places[i] === place);
  const titles = placed("title");
  const details = placed("detail");
  const amounts = placed("amount");
  const trails = placed("trail");
  const pad = byDensity(d, "px-3 py-2.5", "px-2 py-1.5");

  const card = (row: T) => {
    const id = getRowId(row);
    const isEditing = editing === id;
    const set = setter(id);
    const parts = details.flatMap((c) => {
      const said = c.brief === undefined ? null : c.brief(row);
      if (c.brief !== undefined) return says(said) ? [{ id: c.id, node: said }] : [];
      return [
        {
          id: c.id,
          node: (
            <>
              {c.header} {c.render(row)}
            </>
          ),
        },
      ];
    });
    const controls = editable && isEditing ? columns.filter((c) => c.edit !== undefined) : [];
    return (
      <EditRow
        key={id}
        as="li"
        {...rowWiring(id, row)}
        className={`group/row flex min-w-0 flex-col gap-1 rounded-control border-b border-line ${pad} ${
          isEditing ? "bg-primary/5" : "hover:bg-ink/4"
        } ${operable ? RING : ""} ${
          operable && !isEditing ? (opens ? "cursor-pointer" : "cursor-text") : ""
        }`}
      >
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-meta text-ink">
            {titles.map((c) => (
              <div key={c.id} className="min-w-0">
                {c.render(row)}
              </div>
            ))}
          </div>
          {trails.map((c) => (
            <div key={c.id} className="shrink-0">
              {c.render(row)}
            </div>
          ))}
          {/* Without hover there is no trash waiting on the row: it shows on the card
              being edited, the one a press already chose. */}
          {isEditing && onRemove !== undefined ? (
            <IconButton
              icon={Trash2}
              label={copy.editable.remove}
              size="sm"
              tone="danger"
              onClick={() => onRemove(id)}
            />
          ) : null}
        </div>

        {parts.length === 0 && amounts.length === 0 ? null : (
          <div className="flex min-w-0 items-baseline gap-3 text-meta">
            <span className="min-w-0 flex-1 text-muted tabular-nums">
              {parts.map((p, i) => (
                <Fragment key={p.id}>
                  {i > 0 ? " · " : null}
                  {p.node}
                </Fragment>
              ))}
            </span>
            {amounts.map((c) => (
              /* The amount is read by its figure on screen and by its name aloud: a
                 lone «Bs. 1.296,00» at the end of a card does not say what it is. */
              <span
                key={c.id}
                className="shrink-0 text-right font-medium whitespace-nowrap text-ink tabular-nums"
              >
                <span className="sr-only">{c.header} </span>
                {c.render(row)}
              </span>
            ))}
          </div>
        )}

        {controls.length === 0 ? null : (
          /* Each control under the column's name: a cell had the header above it, a
             card has nothing, and a number box that does not say what it holds is a
             guess. The name is drawn for the eye; the control carries its own label. */
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1.5">
            {controls.map((c) => (
              <div
                key={c.id}
                data-edit=""
                className={`flex min-w-0 flex-col gap-1 ${c.numeric === true ? "" : "col-span-2"}`}
              >
                <span aria-hidden="true" className="text-micro text-muted">
                  {c.header}
                </span>
                {c.edit?.(row, set)}
              </div>
            ))}
          </div>
        )}
      </EditRow>
    );
  };

  const list = (
    <>
      <ul data-stacked="" className="flex min-w-0 flex-col px-1">
        {rows.length === 0 ? (
          <li className={`text-meta text-muted italic ${pad}`}>{emptyText}</li>
        ) : (
          drawn.map((entry) => {
            if (entry.pile !== undefined) {
              const pile = entry.pile;
              const inside = pile.piles.length === 0 ? pile.items : pileItems(pile.piles);
              return (
                /* The band says the group and, at the right, what its rows add up to in
                   the column that is the card's amount: the figure under the figures. */
                <li
                  key={`pile:${pathKey(pile.path)}`}
                  className={`flex min-w-0 items-center gap-3 bg-ground text-meta ${pad}`}
                  style={
                    pile.depth > 0
                      ? {
                          paddingLeft: `calc(var(--spacing-indent) * ${pile.depth} + 0.625rem)`,
                        }
                      : undefined
                  }
                >
                  <span className="min-w-0 flex-1">{pileTag(pile, copy.locale)}</span>
                  {amounts.map((c) => (
                    <span key={c.id} className="shrink-0 text-ink tabular-nums">
                      {groupTotal?.(c, inside) ?? null}
                    </span>
                  ))}
                </li>
              );
            }
            return card(entry.row as T);
          })
        )}
      </ul>
      {totals === undefined ? null : (
        /* The footer's aggregates, one per line with the column's name: under a card
           there is no column to stand under. */
        <dl className={`mx-1 flex flex-col gap-1 border-t border-line-strong ${pad}`}>
          {columns.map((c, i) => {
            const total = totals[i];
            if (total === null || total === undefined) return null;
            return (
              <div key={c.id} className="flex items-baseline justify-between gap-3 text-meta">
                <dt className="text-muted">{c.header}</dt>
                <dd className="font-semibold text-ink tabular-nums">{total}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </>
  );

  return (
    <div ref={frame} className="min-w-0">
      {/* When this box is a scroll container and when it is not is decided by
          `useScrollBox`, exactly as in `Table`: the header sticks to the page while
          the table fits, and to the box when the box scrolls. */}
      <div ref={box.ref} className={`min-w-0 ${box.className}`} style={box.style}>
        {stacked ? (
          list
        ) : (
          <table className="w-full border-separate border-spacing-0 px-1 text-left">
            <thead className="sticky z-10 bg-ground" style={stickyTop}>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.id}
                    scope="col"
                    style={c.width === undefined ? undefined : { width: c.width }}
                    className={`border-b border-line-strong text-meta font-medium whitespace-nowrap text-muted ${cell} ${
                      c.numeric === true ? "text-right" : "text-left"
                    }`}
                  >
                    {c.header}
                  </th>
                ))}
                {onRemove === undefined ? null : (
                  <th className="w-0 border-b border-line-strong" />
                )}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (onRemove === undefined ? 0 : 1)}
                    className={`text-meta text-muted italic ${cell}`}
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                drawn.map((entry) => {
                  if (entry.pile !== undefined) {
                    const pile = entry.pile;
                    const inside =
                      pile.piles.length === 0 ? pile.items : pileItems(pile.piles);
                    return (
                      /* La banda respeta la cuadrícula: el rótulo en la primera
                       columna y cada total bajo la suya. Un total en un rincón
                       obliga a buscar de qué columna es; alineado no hay nada que
                       buscar. */
                      <tr key={`pile:${pathKey(pile.path)}`}>
                        {columns.map((c, ci) => (
                          <td
                            key={c.id}
                            className={`bg-ground text-meta ${cell} ${
                              c.numeric === true ? "text-right tabular-nums" : ""
                            }`}
                            style={
                              ci === 0 && pile.depth > 0
                                ? {
                                    paddingLeft: `calc(var(--spacing-indent) * ${pile.depth} + 0.625rem)`,
                                  }
                                : undefined
                            }
                          >
                            {ci === 0
                              ? pileTag(pile, copy.locale)
                              : (groupTotal?.(c, inside) ?? null)}
                          </td>
                        ))}
                        {onRemove === undefined ? null : <td className="w-0 bg-ground" />}
                      </tr>
                    );
                  }
                  const row = entry.row as T;
                  const id = getRowId(row);
                  const isEditing = editing === id;
                  /* The wash lives on the cells. A background on the row paints
                   edge to edge, and `border-collapse` would ignore a radius. */
                  const wash = isEditing ? "bg-primary/5" : "group-hover/row:bg-ink/4";
                  const mark = `border-b border-line first:rounded-l-control last:rounded-r-control ${wash}`;
                  const set = setter(id);
                  return (
                    <EditRow
                      key={id}
                      as="tr"
                      {...rowWiring(id, row)}
                      /* The focus ring is drawn on the row, inset, so it is not cut by
                       the box and does not move the cells. */
                      className={`group/row ${editable ? RING : ""} ${
                        editable && !isEditing ? "cursor-text" : ""
                      }`}
                    >
                      {columns.map((c) => {
                        const control = isEditing && c.edit !== undefined && editable;
                        return (
                          <td
                            key={c.id}
                            {...(control ? { "data-edit": "" } : {})}
                            className={`text-meta text-ink ${mark} ${cell} ${
                              c.numeric === true ? "text-right tabular-nums" : ""
                            }`}
                          >
                            {control ? c.edit?.(row, set) : c.render(row)}
                          </td>
                        );
                      })}

                      {onRemove === undefined ? null : (
                        <td className={`w-0 py-1 pr-2 pl-1 align-middle ${mark}`}>
                          {/* Hidden until the row is hovered: a trash can lit up on
                            each of twenty lines is twenty times the invitation to
                            delete something by accident. */}
                          <span
                            className="flex opacity-0 transition-opacity duration-(--duration-instant) group-hover/row:opacity-100 group-focus-visible/row:opacity-100 focus-within:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconButton
                              icon={Trash2}
                              label={copy.editable.remove}
                              size="sm"
                              tone="danger"
                              /* Only the row holding the tab stop offers its trash to
                               `Tab`; the others are reached with the arrows first. */
                              {...(editable && stop !== id ? { tabIndex: -1 } : {})}
                              onClick={() => onRemove(id)}
                            />
                          </span>
                        </td>
                      )}
                    </EditRow>
                  );
                })
              )}
            </tbody>

            {totals === undefined ? null : (
              <tfoot>
                <tr>
                  {columns.map((c, i) => (
                    <td
                      key={c.id}
                      className={`border-t border-line-strong text-meta font-semibold text-ink ${cell} ${
                        c.numeric === true ? "text-right tabular-nums" : ""
                      }`}
                    >
                      {totals[i] ?? null}
                    </td>
                  ))}
                  {onRemove === undefined ? null : (
                    <td className="border-t border-line-strong" />
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {onAdd === undefined ? null : (
        /* The «add» goes under the grid, as text, not as a button away from it:
           what is about to happen is that one more row shows up right here.
           The hover is the same inset mark as a row: the shell lines the label
           up with the cells, and the button itself is the rounded wash. It sits
           outside the scroll box, so a table with its own height keeps it in view. */
        <div className="px-1 py-0.5">
          <button
            type="button"
            onClick={onAdd}
            className={`flex w-full items-center gap-1.5 rounded-control text-left text-meta text-primary transition-colors duration-(--duration-instant) hover:bg-primary/5 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-primary ${byDensity(
              d,
              "px-3 py-1",
              "px-2 py-0.5",
            )}`}
          >
            <Plus className="size-(--size-icon-sm)" strokeWidth={2.5} aria-hidden />
            {add}
          </button>
        </div>
      )}
    </div>
  );
}
