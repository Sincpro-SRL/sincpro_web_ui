"use client";

import {
  type CriteriaJoin,
  type CriteriaPath,
  filtersOf,
  groupsOf,
  type SearchCriteria,
} from "@sincpro/web-ui/components/search/criteria";
import { JoinWord } from "@sincpro/web-ui/components/search/JoinWord";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { ChevronRight, Layers, ListFilter, X } from "lucide-react";

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
  /**
   * Cuál nodo está ABIERTO: dónde va a caer lo próximo que se escriba.
   *
   * Se marca porque si no, escribir `#and` y después una condición la mete en un
   * lugar que nadie eligió mirando: el grupo existe, la condición entra, y el
   * único que sabía dónde era el que la escribió.
   */
  open?: CriteriaPath;
  surface?: Surface;
};

export function CriteriaChips({
  criteria,
  onOpen,
  onJoin,
  onRemove,
  open,
  surface,
}: CriteriaChipsProps) {
  const sup = useSurface(surface);
  const copy = useUiCopy();
  const groups = groupsOf(criteria);
  const filters = filtersOf(criteria);
  /* La ruta se cuenta sobre la lista ENTERA y no sobre la mitad dibujada: es la
     identidad de la instancia, y una identidad que cambia según de qué lado se
     la mire no identifica nada. */
  const pathOf = (one: SearchCriteria): CriteriaPath => [
    criteria.findIndex((each) => each.id === one.id),
  ];

  return (
    <>
      {groups.length === 0 ? null : (
        <Zone lead={copy.search.groupedBy} icon={Layers} surface={sup}>
          {groups.map((one, at) => (
            <span key={one.id} className="flex min-w-0 items-center gap-1">
              {at === 0 ? null : (
                <ChevronRight
                  className="size-3 shrink-0 text-muted"
                  strokeWidth={2}
                  aria-hidden
                />
              )}
              <Chip
                label={one.label}
                path={pathOf(one)}
                {...(onOpen === undefined ? {} : { onOpen })}
                {...(onRemove === undefined ? {} : { onRemove })}
                surface={sup}
              />
            </span>
          ))}
        </Zone>
      )}

      {filters.length === 0 ? null : (
        <Zone lead={copy.search.narrowedBy} icon={ListFilter} surface={sup}>
          {filters.map((one) => (
            <Node
              key={one.id}
              node={one}
              path={pathOf(one)}
              {...(onOpen === undefined ? {} : { onOpen })}
              {...(onJoin === undefined ? {} : { onJoin })}
              {...(onRemove === undefined ? {} : { onRemove })}
              {...(open === undefined ? {} : { open })}
              surface={sup}
            />
          ))}
        </Zone>
      )}
    </>
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

/** El contexto, con su palabra adelante. Sin la palabra, las fichas no dicen de
 *  qué son. No lleva caja: una caja adentro del campo las separa de él. */
function Zone({
  lead,
  icon: Icon,
  surface,
  children,
}: {
  lead: string;
  icon: typeof Layers;
  surface: Surface;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex min-w-0 shrink items-center gap-1">
      <Icon
        className={`size-3 shrink-0 ${bySurface(surface, "text-muted", "text-chrome-muted")}`}
        strokeWidth={2}
        aria-hidden
      />
      <span
        className={`shrink-0 text-micro ${bySurface(surface, "text-muted", "text-chrome-muted")}`}
      >
        {lead}
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-1">{children}</span>
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
  const shell = `inline-flex min-w-0 shrink-0 items-center gap-1 rounded-pill border py-0.5 text-micro ${bySurface(
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
