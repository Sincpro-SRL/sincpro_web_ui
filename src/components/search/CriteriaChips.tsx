"use client";

import {
  type CriteriaJoin,
  type CriteriaPath,
  filtersOf,
  groupsOf,
  type SearchCriteria,
} from "@sincpro/web-ui/components/search/criteria";
import { JoinWord } from "@sincpro/web-ui/components/search/JoinWord";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { ChevronRight, Layers, X } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";

/* ==================================================================== *
 *  LO PUESTO, DIBUJADO EN LA BARRA.
 *
 *      [ año › mes › día ]   [ todas: (sólo vencidas) [ cualquiera: (A) (B) ] ]
 *        ↑ los de GRUPO        ↑ los de FILTRO, con su anidado
 *
 *  ── Los de grupo van SIEMPRE a la izquierda ─────────────────────────
 *
 *  Y encadenados con «›» y no con una conjunción: no se cruzan, se ANIDAN. «Año
 *  y mes» no quiere decir nada; «año, y adentro mes» sí, y el orden ES la
 *  pregunta. Van primero porque cambian la FORMA de lo que se está mirando —una
 *  lista o montones— y eso se lee antes que cuáles filas quedaron.
 *
 *  ── Los de filtro se anidan, y cada nodo dice cómo ──────────────────
 *
 *  La palabra de cada nodo se toca y se cambia ahí mismo —todas, cualquiera,
 *  ninguna— sin abrir nada. Es la misma lista que el selector de atributos, por
 *  la misma razón: con tres opciones, un botón que rota no dice cuáles hay ni
 *  cuál está puesta.
 *
 *  ── Todo se toca, y todo abre lo mismo ──────────────────────────────
 *
 *  Cualquier instancia abre el constructor parada sobre ella. No hay una que se
 *  edite acá y otra allá: lo que se ve en la barra y lo que se edita en el
 *  diálogo son el mismo objeto.
 * ==================================================================== */

export type CriteriaChipsProps = {
  /** Lo que la barra tiene puesto. Grupos y filtros mezclados: acá se separan. */
  criteria: readonly SearchCriteria[];
  /** Abrir el constructor sobre una instancia. */
  onOpen?: (path: CriteriaPath) => void;
  /** Cambiar cómo se juntan los de un nodo. */
  onJoin?: (path: CriteriaPath, join: CriteriaJoin) => void;
  /** Sacar una instancia, o una rama entera. */
  onRemove?: (path: CriteriaPath) => void;
  /** Sacar varias de una vez: the × of the grouping chain drops every level. */
  onRemoveMany?: (paths: readonly CriteriaPath[]) => void;
  /**
   * Cuál nodo está ABIERTO: dónde va a caer lo próximo que se escriba.
   *
   * Se marca porque si no, escribir `#and` y después una condición la mete en un
   * lugar que nadie eligió mirando: el grupo existe, la condición entra, y el
   * único que sabía dónde era el que la escribió.
   */
  open?: CriteriaPath;
  /** How many facets show before the rest fold into «+N» (the grouping chain counts as one).
   *  Below `@md` of the bar only the first one shows. `Infinity` never folds. */
  collapseAfter?: number;
  surface?: Surface;
};

export function CriteriaChips({
  criteria,
  onOpen,
  onJoin,
  onRemove,
  onRemoveMany,
  open,
  collapseAfter = 4,
  surface,
}: CriteriaChipsProps) {
  const sup = useSurface(surface);
  const copy = useUiCopy();
  const [expanded, setExpanded] = useState(false);
  const groups = groupsOf(criteria);
  const filters = filtersOf(criteria);
  /* La ruta se cuenta sobre la lista ENTERA y no sobre la mitad dibujada: es la
     identidad de la instancia, y una identidad que cambia según de qué lado se
     la mire no identifica nada. */
  const pathOf = (one: SearchCriteria): CriteriaPath => [
    criteria.findIndex((each) => each.id === one.id),
  ];

  const facets: { key: string; label: string; node: ReactNode }[] = [
    ...(groups.length === 0
      ? []
      : [
          {
            key: "grouping",
            label: `${copy.search.groupedBy} ${groups.map((one) => one.label).join(" › ")}`,
            node: (
              <GroupChain
                groups={groups.map((one) => ({ label: one.label, path: pathOf(one) }))}
                {...(onOpen === undefined ? {} : { onOpen })}
                {...(onRemoveMany === undefined ? {} : { onRemoveMany })}
                surface={sup}
              />
            ),
          },
        ]),
    ...filters.map((one) => ({
      key: one.id,
      label: labelOf(one, copy.search.joins),
      node: (
        <Node
          node={one}
          path={pathOf(one)}
          {...(onOpen === undefined ? {} : { onOpen })}
          {...(onJoin === undefined ? {} : { onJoin })}
          {...(onRemove === undefined ? {} : { onRemove })}
          {...(open === undefined ? {} : { open })}
          surface={sup}
        />
      ),
    })),
  ];

  /* Folding hides, it does not remove: the open node is where the next one lands, so while
     there is one everything shows. */
  const unfolded = expanded || open !== undefined || !Number.isFinite(collapseAfter);
  const beyondWide = Math.max(0, facets.length - collapseAfter);
  const beyondNarrow = Math.max(0, facets.length - 1);
  const more = (count: number, hidden: string, className: string) => (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      title={hidden}
      aria-label={`${fillCopy(copy.search.moreFacets, { count })}: ${hidden}`}
      className={`${className} shrink-0 items-center rounded-pill border px-2 py-0.5 text-micro font-medium tabular-nums transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${bySurface(
        sup,
        "border-line-strong text-muted hover:bg-ink/5 hover:text-ink",
        "border-chrome-ink/30 text-chrome-muted hover:bg-chrome-ink/10 hover:text-chrome-ink",
      )}`}
    >
      {fillCopy(copy.search.moreFacets, { count })}
    </button>
  );
  const hiddenFrom = (from: number) =>
    facets
      .slice(from)
      .map((one) => one.label)
      .join(" · ");

  const drawn = (facet: (typeof facets)[number], index: number) => (
    <span
      key={facet.key}
      className={`min-w-0 max-w-full ${
        unfolded
          ? "inline-flex"
          : index >= collapseAfter
            ? "hidden"
            : index >= 1
              ? "inline-flex @max-md/bar:hidden"
              : "inline-flex"
      }`}
    >
      {facet.node}
    </span>
  );
  const offset = groups.length === 0 ? 0 : 1;

  return (
    <>
      {offset === 0 ? null : drawn(facets[0]!, 0)}
      {/* The lead word is no longer drawn — the chain has its icon, the filters are the rest —
          but a screen reader still hears what the chips are. `contents`, so they keep wrapping
          in the bar's line. */}
      {filters.length === 0 ? null : (
        <span role="group" aria-label={copy.search.narrowedBy} className="contents">
          {facets.slice(offset).map((facet, at) => drawn(facet, at + offset))}
        </span>
      )}
      {unfolded ? (
        expanded && facets.length > 1 ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className={`shrink-0 rounded-control px-1 text-micro underline decoration-dotted underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${bySurface(
              sup,
              "text-muted hover:text-ink",
              "text-chrome-muted hover:text-chrome-ink",
            )}`}
          >
            {copy.search.fewerFacets}
          </button>
        ) : null
      ) : (
        <>
          {beyondWide === 0
            ? null
            : more(beyondWide, hiddenFrom(collapseAfter), "inline-flex @max-md/bar:hidden")}
          {beyondNarrow === 0
            ? null
            : more(beyondNarrow, hiddenFrom(1), "hidden @max-md/bar:inline-flex")}
        </>
      )}
    </>
  );
}

/** How a facet reads when it is folded away: in the «+N» title and for a screen reader. */
function labelOf(
  node: SearchCriteria,
  joins: { all: string; any: string; none: string },
): string {
  if (node.kind !== "join") return node.label;
  const word = joins[node.join === "not" ? "none" : node.join];
  return `${word} (${node.of.map((child) => labelOf(child, joins)).join(", ")})`;
}

/**
 * THE GROUPING, as ONE chip: «⧉ vendedor › trimestre › mes ×».
 *
 * Context: N chips with N crosses read as N filters, and the levels are not N things — they
 * are one shape, nested in order. Neutral and not gold: the grouping changes how the rows
 * are laid out, not which rows there are, and it must not read as one more filter. Each level
 * still opens the builder on itself; the × drops the whole chain.
 */
function GroupChain({
  groups,
  onOpen,
  onRemoveMany,
  surface,
}: {
  groups: readonly { label: string; path: CriteriaPath }[];
  onOpen?: (path: CriteriaPath) => void;
  onRemoveMany?: (paths: readonly CriteriaPath[]) => void;
  surface: Surface;
}) {
  const copy = useUiCopy();
  const chain = groups.map((one) => one.label).join(" › ");
  return (
    <span
      role="group"
      aria-label={`${copy.search.groupedBy} ${chain}`}
      title={`${copy.search.groupedBy} ${chain}`}
      className={`inline-flex min-w-0 max-w-(--container-chain) items-center gap-1 rounded-pill border py-0.5 pl-1.5 text-micro ${bySurface(
        surface,
        "border-line-strong bg-surface text-ink",
        "border-chrome-ink/30 bg-chrome-ink/8 text-chrome-ink",
      )} ${onRemoveMany === undefined ? "pr-2" : "pr-0.5"}`}
    >
      <Layers
        className={`size-3 shrink-0 ${bySurface(surface, "text-muted", "text-chrome-muted")}`}
        strokeWidth={2}
        aria-hidden
      />
      {/* Inline, not flex: the chain truncates at its END as one sentence. As flex items each
          level shrank on its own and a narrow bar read «v… › Fech… › Fech…». */}
      <span className="min-w-0 truncate">
        {groups.map((one, at) => (
          <Fragment key={one.path.join(".")}>
            {at === 0 ? null : (
              <ChevronRight
                className={`mx-0.5 inline size-3 align-middle ${bySurface(surface, "text-muted", "text-chrome-muted")}`}
                strokeWidth={2}
                aria-hidden
              />
            )}
            {onOpen === undefined ? (
              <span>{one.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => onOpen(one.path)}
                title={copy.search.openBuilderHere}
                className="inline rounded-control hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              >
                {one.label}
              </button>
            )}
          </Fragment>
        ))}
      </span>
      {onRemoveMany === undefined ? null : (
        <button
          type="button"
          onClick={() => onRemoveMany(groups.map((one) => one.path))}
          aria-label={copy.search.removeGrouping}
          title={copy.search.removeGrouping}
          className={`inline-flex size-4 shrink-0 items-center justify-center rounded-pill transition-colors duration-(--duration-instant) ${bySurface(
            surface,
            "hover:bg-ink/10",
            "hover:bg-chrome-ink/20",
          )}`}
        >
          <X className="size-3" strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}

function Node({
  node,
  path,
  onOpen,
  onJoin,
  onRemove,
  open,
  surface,
}: {
  node: SearchCriteria;
  path: CriteriaPath;
  onOpen?: (path: CriteriaPath) => void;
  onJoin?: (path: CriteriaPath, join: CriteriaJoin) => void;
  onRemove?: (path: CriteriaPath) => void;
  open?: CriteriaPath;
  surface: Surface;
}) {
  const copy = useUiCopy();

  if (node.kind !== "join") {
    /* Una instancia que no lleva expresión no tiene qué editar: el constructor
       edita lo que VIAJA, y ésta la contesta quien la declaró. Se ve y se saca
       como cualquiera; lo que no hace es prometer una puerta que da a nada. */
    const editable = node.kind === "group" || node.where !== undefined;
    return (
      <Chip
        label={node.label}
        path={path}
        {...(onOpen === undefined || !editable ? {} : { onOpen })}
        {...(onRemove === undefined ? {} : { onRemove })}
        surface={surface}
      />
    );
  }

  /* El nodo abierto se marca: es donde va a caer lo próximo. Un anillo y no un
     fondo, porque adentro hay fichas que ya tienen el suyo. */
  const isOpen = open !== undefined && open.join(".") === path.join(".");

  return (
    <span
      className={`inline-flex min-w-0 flex-wrap items-center gap-1 rounded-control border px-1.5 py-0.5 ${bySurface(
        surface,
        "border-line bg-ink/4",
        "border-chrome-ink/25 bg-chrome-ink/8",
      )} ${isOpen ? "ring-1 ring-primary/60" : ""}`}
    >
      <JoinWord
        join={node.join}
        {...(onJoin === undefined ? {} : { onChange: (next) => onJoin(path, next) })}
        surface={surface}
      />
      {node.of.length === 0 ? (
        /* Un nodo recién abierto no tiene nada adentro, y un corchete vacío se
           lee como un error. Dice que está esperando. */
        <span
          className={`shrink-0 text-micro italic ${bySurface(surface, "text-muted", "text-chrome-muted")}`}
        >
          {copy.search.landsHere}
        </span>
      ) : null}
      {node.of.map((child, at) => (
        <Node
          key={child.id}
          node={child}
          path={[...path, at]}
          {...(onOpen === undefined ? {} : { onOpen })}
          {...(onJoin === undefined ? {} : { onJoin })}
          {...(onRemove === undefined ? {} : { onRemove })}
          {...(open === undefined ? {} : { open })}
          surface={surface}
        />
      ))}
    </span>
  );
}

function Chip({
  label,
  path,
  onOpen,
  onRemove,
  surface,
}: {
  label: string;
  path: CriteriaPath;
  onOpen?: (path: CriteriaPath) => void;
  onRemove?: (path: CriteriaPath) => void;
  surface: Surface;
}) {
  const copy = useUiCopy();
  const shell = `inline-flex min-w-0 max-w-(--container-facet) items-center gap-1 rounded-pill border py-0.5 text-micro ${bySurface(
    surface,
    "border-accent/40 bg-accent/18 text-ink",
    "border-chrome-link/35 bg-chrome-link/18 text-chrome-link",
  )} ${onRemove === undefined ? "px-2" : "pr-0.5 pl-2"}`;

  const remove =
    onRemove === undefined ? null : (
      <button
        type="button"
        onClick={(event) => {
          /* Sin esto, sacarla también la abre: el click llega acá y después
             sube. */
          event.stopPropagation();
          onRemove(path);
        }}
        aria-label={copy.search.removeFilter.replace("{label}", label)}
        className={`inline-flex size-4 shrink-0 items-center justify-center rounded-pill transition-colors duration-(--duration-instant) ${bySurface(
          surface,
          "hover:bg-primary/20",
          "hover:bg-chrome-link/25",
        )}`}
      >
        <X className="size-3" strokeWidth={2.5} />
      </button>
    );

  if (onOpen === undefined) {
    return (
      <span className={shell}>
        <span className="min-w-0 truncate">{label}</span>
        {remove}
      </span>
    );
  }

  /* Un botón adentro de otro es HTML inválido —el navegador cierra el de afuera
     antes de tiempo y el click deja de llegar—, así que la ficha que se abre Y se
     saca es un `span` con `role`, y la × adentro es el único botón de verdad. */
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => onOpen(path)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(path);
        }
      }}
      title={copy.search.openBuilderHere}
      className={`${shell} cursor-pointer`}
    >
      <span className="min-w-0 truncate">{label}</span>
      {remove}
    </span>
  );
}
