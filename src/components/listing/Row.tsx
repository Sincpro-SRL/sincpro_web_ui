"use client";

import { RecordLink } from "@sincpro/web-ui/components/listing/RecordLink";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { stickyTop } from "@sincpro/web-ui/foundations/sticky";
import { Menu, type MenuGroup } from "@sincpro/web-ui/primitives/menu/Menu";
import { HEADER_TEXT } from "@sincpro/web-ui/primitives/table/Table";
import { CopyButton } from "@sincpro/web-ui/primitives/value/Copyable";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Eye, MoreHorizontal, SquareArrowOutUpRight } from "lucide-react";
import type { ReactNode } from "react";

const ICON_BUTTON =
  "inline-flex size-(--size-control-sm) items-center justify-center rounded-pill text-muted transition-colors duration-(--duration-instant) hover:bg-ink/6 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** The buttons at the end of a row. Its own piece so `RowHeader` can draw the same one,
 *  invisible, and reserve exactly its width — a spacer of a guessed width drifted every time
 *  a button was added. */
function Trail({
  name,
  openAs,
  actions,
  copy: copyAs,
  onPeek,
  onOpen,
  more,
  onMoreSelect,
}: {
  name: string;
  openAs: string;
  actions?: ReactNode;
  copy?: string | false;
  onPeek?: () => void;
  onOpen?: () => void;
  more?: readonly MenuGroup[];
  onMoreSelect?: (id: string) => void;
}) {
  const copy = useUiCopy();
  return (
    <>
      {actions}
      {copyAs === false ? null : (
        <CopyButton
          value={copyAs ?? name}
          label={fillCopy(copy.copyable.field, { label: name })}
        />
      )}
      {/* The two ways in, said with their icon: 👁 looks without leaving the list, ↗ goes to
              the record. The row's body already peeks, but a click nobody announces is a
              click nobody makes. */}
      {onPeek === undefined ? null : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPeek();
          }}
          title={copy.list.peek}
          aria-label={`${copy.list.peek}: ${name}`}
          className={ICON_BUTTON}
        >
          <Eye className="size-(--size-icon-sm)" strokeWidth={2} />
        </button>
      )}
      {onOpen === undefined ? null : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          title={openAs}
          aria-label={`${openAs}: ${name}`}
          className={ICON_BUTTON}
        >
          <SquareArrowOutUpRight className="size-(--size-icon-sm)" strokeWidth={2} />
        </button>
      )}
      {more === undefined || more.length === 0 ? null : (
        <span onClick={(e) => e.stopPropagation()} role="presentation">
          <Menu
            label={fillCopy(copy.selection.moreOf, { name })}
            groups={more}
            icon={MoreHorizontal}
            iconOnly
            chevron={false}
            align="end"
            width="sm"
            variant="text"
            {...(onMoreSelect === undefined ? {} : { onSelect: onMoreSelect })}
          />
        </span>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- *
 *  THE RICH ROW — the other density
 * ---------------------------------------------------------------- */

/** A record in two lines: big name on top, metadata below.
 *
 *  ── The name opens, the body peeks ──────────────────────────────────
 *
 *  Two different targets and zero waiting. The name is a LINK and opens with
 *  one click; the rest of the row does a preview. It used to open with a double
 *  click, and to be able to tell it apart from the single one ALL clicks had to
 *  be delayed by 220 ms — a name painted as a link discovers itself, «try
 *  double clicking» is written nowhere.
 *
 *  The gesture is invisible if nothing says so, so on hover `⇱ abrir` appears:
 *  it is learned in one hover and never has to be explained.
 *
 *  ── The metadata is in plain sight ──────────────────────────────────
 *
 *  «some metadata that might help is not visible» — and it was literal: to know
 *  whether `FAC/2026/0118` was paid or overdue you had to open it. */
export function Row({
  icon: Icon,
  name,
  onOpen,
  onPeek,
  click = "peek",
  tags,
  meta,
  selected,
  onSelectedChange,
  actions,
  more,
  onMoreSelect,
  openHint,
  children,
  copy: copyAs,
}: {
  icon?: LucideIcon;
  name: string;
  /** The copy button among the row's actions: on by default, copying the row's name — the
   *  number of an invoice, a customer — without opening it. A string copies that instead;
   *  `false` removes it. */
  copy?: string | false;
  onOpen?: () => void;
  onPeek?: () => void;
  /** What a press on the body does when both exist: the look (default) or the record. */
  click?: "peek" | "open";
  tags?: ReactNode;
  /** The secondary data, already formatted. In mono: it aligns across rows. */
  meta?: string;
  selected?: boolean;
  onSelectedChange?: (next: boolean) => void;
  actions?: ReactNode;
  /** The `⋯` menu. **Without this the button is not drawn**: there used to be a
   *  fixed one that opened nothing — a control that exists and does nothing
   *  teaches people not to press it, and after that nobody presses the one that
   *  does work. */
  more?: readonly MenuGroup[];
  onMoreSelect?: (id: string) => void;
  /** What happens on open, when «as a panel» is not true: «open the order that
   *  produced it». It is the `title` and the accessible name. */
  openHint?: string;
  /** What the resource PRODUCED, hanging below. Context: the indent and the
   *  rule are put there by the system and not by the view, because the
   *  relationship «this came out of that» has to look the same in the four
   *  lists that need it. */
  children?: ReactNode;
}) {
  const d = useDensity();
  const copy = useUiCopy();
  const openAs = openHint ?? copy.list.open;
  /* A read-only row (nothing to peek, nothing to open) does not light up on hover: a wash
     and a hand promise a click that does nothing. */
  const interactive = (onPeek ?? onOpen) !== undefined;

  const row = (
    /* A `div` and not an `li`: whoever composes decides whether this is a list,
       a table or a branch of a tree. And the zone that peeks is a `div` with
       `onClick` and not a `button` — the actions are buttons too, and a button
       inside another one is invalid HTML: the browser takes it apart and the
       clicks get lost. */
    <div className="border-b border-line px-1 py-0.5 last:border-b-0">
      <div
        /* `data-slot` is the stable anchor for composing and for testing:
         `group/row` is Tailwind's and can change its name; this cannot. */
        data-slot="row"
        /* The hairline stays on the shell, full width: eighty similar names with
         no rule between them read as a paragraph. The wash is the inner row,
         inset and rounded, so the hover is a mark and not a stripe. The inner
         padding is shorter by exactly that inset, so the text does not move. */
        className={`group/row flex min-w-0 items-center rounded-control transition-colors duration-(--duration-instant) ${
          interactive ? "cursor-pointer hover:bg-ink/4" : ""
        } ${byDensity(d, "gap-3 px-2 py-2", "gap-2 px-1.5 py-1")}`}
        /* `onPeek` con `onOpen` de reserva: quien sólo declara `onOpen` —lo
         natural si nunca oyó hablar de la vista previa— tiene que poder abrir
         igual haciendo click en cualquier parte de la fila, no sólo en el
         nombre. Con la vista previa apagada (`PeekLayer.tsx`) esto es hoy el
         caso de todos: un click en la fila abre, sin más. */
        onClick={click === "open" ? (onOpen ?? onPeek) : (onPeek ?? onOpen)}
        role="presentation"
      >
        {onSelectedChange === undefined ? null : (
          <input
            type="checkbox"
            checked={selected ?? false}
            aria-label={fillCopy(copy.selection.named, { name })}
            onChange={(e) => onSelectedChange(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="size-3.5 shrink-0 cursor-pointer accent-primary"
          />
        )}

        {Icon === undefined ? null : (
          <Icon
            className="size-(--size-icon-md) shrink-0 text-muted"
            strokeWidth={1.75}
            aria-hidden
          />
        )}

        {/* One line while the two of them fit, two when they do not. It is not a
          preference: with the name and the metadata on the same line, the
          metadata of the row above and the one below fall at the same height
          and get compared without reading — which is the only thing a metadata
          in a list is good for. When there is no room for that, what wraps is
          the metadata and never the name.

          **There is no width written here, and that is the whole point.** The
          zone asks for `--container-name` and the metadata for what it says; if
          both fit on the line they stay on it, and if they do not, the line
          breaks by itself. A checkbox, an icon or an open actions menu take
          their width from this same line, so a list that selects wraps a little
          earlier than one that does not without anybody declaring it — and a
          row inside a drawer, a card or the peek does the right thing without
          being told where it is. */}
        <div
          className={`flex min-w-0 shrink grow basis-(--container-name) flex-wrap items-center gap-y-0 ${byDensity(
            d,
            "gap-x-3",
            "gap-x-2",
          )}`}
        >
          <span className="min-w-0 grow basis-(--container-name)">
            {/* The name opens the record; a row that only offers a preview opens the preview —
                the name used to swallow the click (`stopPropagation`) and do nothing. */}
            <RecordLink
              {...((onOpen ?? onPeek) === undefined ? {} : { onClick: (onOpen ?? onPeek)! })}
              title={name}
            >
              {name}
            </RecordLink>
          </span>
          {meta === undefined ? null : (
            /* Wrapped or not, the metadata is still there —it is what saves
             having to open a set to know whether it is a thousand rows or a
             million— and it truncates instead of wrapping into itself: three
             lines per row in a 480 px drawer means three rows fit on screen. */
            <span className="min-w-0 truncate text-micro tabular-nums text-muted">
              {meta}
            </span>
          )}
        </div>

        {/* The tags go in their own column and not glued to the name. Hanging off
          the name they land wherever each one ends —one in the middle, the next
          at twice that— and twelve tags at twelve different heights is exactly
          what makes a list read as cluttered. In a column they get compared top
          to bottom without reading, which is what a tag exists for.

          The column ASKS FOR `--container-tags` and does not impose it. With
          room it takes all of it and the tags fall on the same vertical, which
          is the point. Without room it gives back what it is not using —in a
          480 px drawer that reservation is a quarter of the box, taken from the
          name— and it stops at the width of its own tags: from there down what
          would shrink is a tag, and a tag that shrinks stops being readable. */}
        {tags === undefined ? null : (
          <span className="flex min-w-fit shrink basis-(--container-tags) items-center justify-end gap-1.5">
            {tags}
          </span>
        )}

        {/* The gesture, made visible. It shows up on hover and always occupies its
          place, so nothing shifts when it appears. */}
        <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-(--duration-instant) group-hover/row:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
          <Trail
            name={name}
            openAs={openAs}
            {...(actions === undefined ? {} : { actions })}
            copy={copyAs}
            {...(onPeek === undefined ? {} : { onPeek })}
            {...(onOpen === undefined ? {} : { onOpen })}
            {...(more === undefined ? {} : { more })}
            {...(onMoreSelect === undefined ? {} : { onMoreSelect })}
          />
        </span>
      </div>
    </div>
  );

  if (children === undefined) return row;

  /* What the resource produced, hanging below. The indent reaches up to where
     the name starts —not up to the edge— so the rule falls exactly below the
     icon and the relationship reads without reading: this came out of that.

     The child is NOT another `Row`: an invoice line does not open, does not get
     selected and has no actions of its own. Treating it as a row would make it promise
     all of that. */
  return (
    <div data-slot="branch" className="flex min-w-0 flex-col">
      {row}
      {/* El riel de la rama. El padding DERECHO es el mismo que el de la fila
          padre y no es estético: sin él, lo que la rama alinea a la derecha
          —cuánto se facturó, el estado— se iba más allá del borde del
          contenido y quedaba cortado contra el filo de la pantalla, mientras
          la ficha del padre terminaba veinte píxeles antes. Dos cosas del
          mismo renglón visual que no se alineaban. */}
      <div
        className={`flex min-w-0 flex-col gap-1 border-l border-line-strong ${byDensity(
          d,
          "mb-2 ml-8 pb-0.5 pl-3 pr-3",
          "mb-1.5 ml-6 pl-2.5 pr-2.5",
        )}`}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * EL ENCABEZADO DE LA PRESENTACIÓN DE FILAS.
 *
 * Context: la tabla y la planilla dicen qué es cada columna; la lista de filas
 * no decía nada. Ochenta renglones con «Ferretería Sur · 13 sept · Bs 12.480» a la
 * derecha y una ficha al final, y había que deducir qué era cada número — o
 * cambiar a la tabla para averiguarlo, que es cambiar de presentación para leer
 * la misma pantalla.
 *
 * **No son columnas: son las ZONAS de la fila, rotuladas.** Una fila tiene un
 * nombre que se estira, un `meta` que es UNA cadena ya formateada, y una
 * columna de fichas de ancho fijo. Rotularlas como si fueran tres columnas
 * alineadas sería mentir sobre lo que hay debajo: el `meta` de una fila puede
 * decir tres cosas y el de otra dos.
 *
 * Por eso calca la caja de `Row` —mismo padding, mismos huecos, mismos
 * espaciadores de casilla, ícono y acciones— en vez de declarar un ancho
 * propio. Si `Row` cambia su geometría, esto la sigue.
 */
export function RowHeader({
  name,
  meta,
  tags,
  withSelection = false,
  withIcon = false,
  withActions = false,
  trail,
}: {
  name: string;
  meta?: string;
  tags?: string;
  /** Los espaciadores de la izquierda. Los pone quien dibuja las filas, porque
   *  es el único que sabe si esta lista elige y si sus filas tienen ícono. */
  withSelection?: boolean;
  withIcon?: boolean;
  /** La zona de acciones de la derecha ocupa su lugar aunque esté invisible
   *  —así nada se corre al pasar el puntero—, así que el rótulo de las fichas
   *  queda desalineado si acá no se reserva lo mismo. */
  withActions?: boolean;
  /** What the rows have at their end — the same flags `Row` gets — drawn invisible here so
   *  the header reserves exactly that width. Takes over from `withActions`. */
  trail?: { actions?: ReactNode; peek?: boolean; open?: boolean; copy?: boolean };
}) {
  const d = useDensity();
  const rotulo = `truncate ${HEADER_TEXT}`;

  return (
    <div
      data-slot="row-header"
      /* Se pega debajo de la barra de la lista, como el encabezado de la tabla
         y el de la planilla. Ver `system/sticky.tsx`. */
      className={`sticky z-10 flex min-w-0 items-center border-b border-line-strong bg-ground ${byDensity(
        d,
        "gap-3 px-3 py-2",
        "gap-2 px-2.5 py-1.5",
      )}`}
      style={stickyTop}
      role="presentation"
    >
      {!withSelection ? null : <span className="size-3.5 shrink-0" aria-hidden />}
      {!withIcon ? null : <span className="size-(--size-icon-md) shrink-0" aria-hidden />}
      {/* La misma caja que arma `Row`, con los mismos pedidos: cuando la fila
          parte su renglón, el rótulo del `meta` cae al segundo igual que el
          `meta` que rotula. Calcar la caja es lo único que mantiene alineadas
          dos cosas que se dibujan por separado. */}
      <div
        className={`flex min-w-0 shrink grow basis-(--container-name) flex-wrap items-center gap-y-0 ${byDensity(
          d,
          "gap-x-3",
          "gap-x-2",
        )}`}
      >
        <span className={`min-w-0 grow basis-(--container-name) ${rotulo}`}>{name}</span>
        {meta === undefined ? null : <span className={`min-w-0 ${rotulo}`}>{meta}</span>}
      </div>
      {tags === undefined ? null : (
        <span className="flex min-w-fit shrink basis-(--container-tags) items-center justify-end">
          <span className={rotulo}>{tags}</span>
        </span>
      )}
      {trail !== undefined ? (
        <span inert aria-hidden className="invisible flex shrink-0 items-center gap-1">
          <Trail
            name=""
            openAs=""
            {...(trail.actions === undefined ? {} : { actions: trail.actions })}
            {...(trail.copy === false ? { copy: false as const } : {})}
            {...(trail.peek === true ? { onPeek: () => {} } : {})}
            {...(trail.open === true ? { onOpen: () => {} } : {})}
          />
        </span>
      ) : !withActions ? null : (
        <span className="size-(--size-control-sm) shrink-0" aria-hidden />
      )}
    </div>
  );
}

/**
 * The header of a group inside a list.
 *
 * Context: grouping existed ONLY inside `DataTable`, so changing presentation
 * —from table to rows— lost the grouping. Grouping belongs to the SET and not
 * to the presentation; that is why it lives here.
 *
 * **`field` is drawn, and it is not decoration.** With one level nobody needed
 * it: there was a single axis and everyone knew what it was. With several,
 * «2026-09» does not say whether it is when the thing was registered or when it
 * ran, and two consecutive headers can read as siblings when one is inside the
 * other. The field names the cut; the indent says how deep it is.
 */
export function GroupHeader({
  field,
  label,
  count,
  detail,
  depth = 0,
  open = true,
  onToggle,
}: {
  /** By which field this pile was cut. Without it a value is ambiguous as soon
   *  as there is more than one level. */
  field?: string;
  label: string;
  count?: number;
  /** What the pile ADDS UP TO, already written: «412 facturas · Bs 1.204.933». A
   *  folded pile that only says how many there are hides the answer instead of
   *  summarising it. */
  detail?: string;
  /** How deep the pile is. `0` is the first level. */
  depth?: number;
  open?: boolean;
  onToggle?: () => void;
}) {
  const d = useDensity();
  const copy = useUiCopy();
  const content = (
    <>
      {onToggle === undefined ? null : (
        <ChevronRight
          className={`size-(--size-icon-sm) shrink-0 text-muted transition-transform duration-(--duration-instant) ${
            open ? "rotate-90" : ""
          }`}
          strokeWidth={2}
          aria-hidden
        />
      )}
      {field === undefined ? null : (
        <span className="shrink-0 text-micro text-muted/70">{field}</span>
      )}
      <span className="truncate text-micro font-medium text-ink">{label}</span>
      {count === undefined ? null : (
        <span className="inline-flex shrink-0 items-center rounded-pill border border-line-strong bg-ink/5 px-2 py-0.5 text-micro tabular-nums text-muted">
          {count.toLocaleString(copy.locale)}
        </span>
      )}
      {detail === undefined ? null : (
        <span className="shrink-0 text-micro tabular-nums text-muted">{detail}</span>
      )}
    </>
  );

  /* La sangría va en el relleno de la izquierda y no en un margen: el
     encabezado tiene fondo y borde inferior, y un margen los cortaría antes del
     borde de la lista — la banda dejaría de leerse como una franja. El hover
     no reemplaza ese fondo: es una marca metida adentro, redondeada. */
  const box = `flex min-w-0 items-center gap-2 border-b border-line bg-ground ${byDensity(
    d,
    "px-3 py-1.5",
    "px-2.5 py-1",
  )}`;
  const indent =
    depth === 0 ? undefined : { paddingLeft: `calc(var(--spacing-indent) * ${depth})` };
  const mark = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-1 inset-y-0.5 rounded-control group-hover/head:bg-ink/4"
    />
  );

  return onToggle === undefined ? (
    <div className={box} style={indent}>
      {content}
    </div>
  ) : (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      style={indent}
      className={`group/head relative ${box} w-full text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary`}
    >
      {mark}
      {content}
    </button>
  );
}
