"use client";

import {
  at,
  criteriaId,
  type CriteriaJoin,
  type CriteriaPath,
  filterCriteria,
  removeAt,
  replaceAt,
  type SearchCriteria,
} from "@sincpro/web-ui/components/search/criteria";
import { CriteriaChips } from "@sincpro/web-ui/components/search/CriteriaChips";
import type { ModelDefinition } from "@sincpro/web-ui/components/search/model";
import {
  describeCondition,
  opLabel,
  type QueryField,
  queryFields,
  type QuerySuggestion,
  readTyped,
  suggest,
  withoutValue,
} from "@sincpro/web-ui/components/search/query";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import type { MenuGroup, MenuOption } from "@sincpro/web-ui/primitives/menu/Menu";
import { Tags } from "@sincpro/web-ui/primitives/tag/Tags";
import {
  ChevronRight,
  CornerDownRight,
  ListFilter,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Fragment, type ReactNode, useEffect, useId, useRef, useState } from "react";

/* ==================================================================== *
 *  LA BARRA — buscar es preguntar DÓNDE, no sólo qué.
 *
 *  El diagnóstico del producto fue literal: «actualmente estamos poniendo todo
 *  en el menú como si fueran filtros». El menú del costado dice QUÉ OBJETOS hay;
 *  la barra dice CUÁLES DE ELLOS estoy mirando. Son dos preguntas, y por eso son
 *  dos controles — poner los recortes en el menú obliga a navegar para filtrar.
 *
 *  ── La faceta es la pieza que no se puede saltear ───────────────────
 *
 *  Un campo de búsqueda sin facetas busca donde decidió el que lo programó.
 *  Escribir «edad» puede querer decir *«el archivo se llama edad»* o *«tiene una
 *  columna edad»*, y son dos preguntas con dos respuestas distintas. La solución
 *  no es adivinar ni buscar en todos lados: es PREGUNTAR. Se escribe, el
 *  desplegable ofrece en qué campo buscarlo, y lo elegido queda como una ficha
 *  que se ve y se saca.
 *
 *  Con un MODELO la barra deja de buscar texto y pregunta: de él salen el tipo
 *  de cada campo, sus comparaciones, sus valores posibles y la columna por la
 *  que se busca un relacional. Sin modelo, una faceta es un campo de texto y la
 *  barra sigue funcionando — es el mismo camino, con menos metadatos.
 *
 *  ── Los recortes viven ADENTRO del campo ────────────────────────────
 *
 *  Filtros, agrupado y favoritos son un solo panel colgado del borde derecho de
 *  la barra, y no tres botones al lado. Son la misma pregunta —*¿qué parte de
 *  esto estoy mirando?*— y separados obligan a abrir tres desplegables para
 *  armar un recorte, sin poder ver los tres estados a la vez.
 *
 *  ── Todo lo puesto es una INSTANCIA, y se dibuja ────────────────────
 *
 *  Tildar un filtro, escribir una pregunta, abrir un grupo con `#and` o agregar
 *  un nivel de agrupado dejan todos la misma cosa: una instancia en la lista que
 *  la barra dibuja. Los de grupo van siempre a la izquierda, encadenados; los de
 *  filtro a la derecha, con su anidado.
 *
 *  Un contador en el embudo no alcanzaba: había que abrir el panel para saber
 *  QUÉ estaba puesto, y una lista que parece sin filtrar es como alguien termina
 *  mirando un subconjunto sin saberlo. Y cómo se juntan no se deduce: es una
 *  palabra —«todas», «cualquiera», «ninguna»— que se lee y se toca ahí mismo.
 *
 *  Odoo cuelga su panel de un chevron, y ése es su defecto: un `▾` no dice qué
 *  hay del otro lado, así que hay que abrirlo para averiguarlo. Acá el disparador
 *  es un ícono de filtro con su contador — se ve que filtra, y cuánto.
 * ==================================================================== */

/** Dónde se puede buscar. Lo declara el dominio, no esta pieza. */
export interface SearchFacet {
  id: string;
  /** Cómo se lee en la sugerencia y en la ficha: «nombre», «columnas». */
  label: string;
}

/** Una columna del panel de recortes. O una lista de opciones, o una pieza que
 *  se dibuja sola — el agrupado dejó de ser una lista de casillas el día que
 *  pasó a ser N niveles ordenados, pero sigue siendo la misma pregunta que los
 *  filtros y por eso sigue en el mismo panel. */
interface Column {
  title: string;
  groups?: readonly MenuGroup[];
  content?: ReactNode;
  onSelect?: (id: string) => void;
}

function Option({ o, onSelect }: { o: MenuOption; onSelect?: (id: string) => void }) {
  const Icon = o.icon;
  return (
    <button
      type="button"
      disabled={o.disabled}
      onClick={() => onSelect?.(o.id)}
      className={`flex w-full items-start gap-2 rounded-control px-1.5 py-1 text-left transition-colors duration-(--duration-instant) disabled:pointer-events-none disabled:opacity-45 hover:bg-primary/8 ${
        o.checked === true ? "bg-primary/6" : ""
      }`}
    >
      {/* La columna de la marca existe siempre, aunque no haya nada elegido: sin
          ella, tildar una opción corre todo el texto y el panel pega un salto.
          Apagada se ve el aro: un hueco del tamaño del ícono se lee como un
          padding que nadie pidió. */}
      <span className="mt-0.5 flex size-(--size-icon-sm) shrink-0 items-center justify-center">
        {o.checked === true ? (
          <span className="size-1.5 rounded-pill bg-primary" />
        ) : Icon !== undefined ? (
          <Icon className="size-(--size-icon-sm) text-muted" strokeWidth={2} />
        ) : (
          <span className="size-3 rounded-pill border border-line-strong" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={`truncate text-meta ${o.checked === true ? "font-medium text-ink" : "text-ink"}`}
          >
            {o.label}
          </span>
          {o.badge === undefined ? null : (
            <span className="inline-flex shrink-0 items-center rounded-pill border border-warn/30 bg-warn/10 px-2 py-0.5 text-micro text-warn">
              {o.badge}
            </span>
          )}
        </span>
        {o.hint === undefined ? null : (
          <span className="mt-0.5 block truncate text-micro text-muted">{o.hint}</span>
        )}
      </span>
    </button>
  );
}

/** Un grupo del panel. Plegable cuando lo pide —una fecha, que trae once
 *  opciones— y abierto de entrada si ya tiene algo tildado: si no, lo puesto
 *  queda escondido detrás de un chevron y hay que adivinar dónde está. */
function Group({
  group,
  first,
  onSelect,
}: {
  group: MenuGroup;
  first: boolean;
  onSelect?: (id: string) => void;
}) {
  const active = group.options.some((o) => o.checked === true);
  const [open, setOpen] = useState(active);

  const options = (
    <>
      {group.options.map((o) => (
        <Fragment key={o.id}>
          {o.divider === true ? <div className="my-1 h-px bg-line" role="separator" /> : null}
          <Option o={o} onSelect={onSelect} />
        </Fragment>
      ))}
    </>
  );

  return (
    <div className="flex flex-col gap-0.5">
      {first ? null : <div className="my-1 h-px bg-line" role="separator" />}
      {group.label === undefined ? null : group.collapsible !== true ? (
        /* El rótulo del grupo va en la columna del TEXTO, no en la del borde.
           La banda de la columna ya es el título (medium, sobre la línea). Este
           es un escalón abajo: peso normal, y el mismo hueco de la marca para
           que «mostrar sólo» arranque donde arranca «traídos». */
        <div className="flex items-center gap-2 px-1.5 pt-1 pb-0.5 text-micro text-muted">
          <span className="size-(--size-icon-sm) shrink-0" aria-hidden />
          {group.label}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-control px-1.5 py-1 text-left transition-colors duration-(--duration-instant) hover:bg-primary/8"
        >
          <ChevronRight
            className={`size-(--size-icon-sm) shrink-0 text-muted transition-transform duration-(--duration-instant) ${
              open ? "rotate-90" : ""
            }`}
            strokeWidth={2}
            aria-hidden
          />
          <span
            className={`min-w-0 flex-1 truncate text-meta ${active ? "font-medium text-ink" : "text-ink"}`}
          >
            {group.label}
          </span>
          {/* Cuántos recortes tiene puestos, sin abrirlo. */}
          {!active ? null : (
            <span className="inline-flex shrink-0 items-center rounded-pill border border-accent/40 bg-accent/18 px-2 py-0.5 text-micro tabular-nums text-ink">
              {group.options.filter((o) => o.checked === true).length}
            </span>
          )}
        </button>
      )}
      {group.collapsible === true && !open ? null : (
        <div
          className={
            group.collapsible === true
              ? "flex flex-col gap-0.5 pl-(--spacing-indent)"
              : "flex flex-col gap-0.5"
          }
        >
          {options}
        </div>
      )}
    </div>
  );
}

/**
 * La CONJUNCIÓN entre dos recortes: «y» o «o».
 *
 * Con `onToggle` se puede tocar, y eso no es un adorno: «vencidas Y de este
 * mes» y «vencidas O de este mes» son dos listas completamente distintas, y
 * hasta acá cuál de las dos era estaba decidido por dentro y no se podía cambiar
 * sin abrir el constructor. Sin `onToggle` es una palabra y nada más — que es lo
 * correcto entre dos ejes, donde la Y no es una opción.
 */
/**
 * Lo que la barra necesita. Está aparte de la función porque es el contrato: lo
 * que una lista tiene que darle para que la barra pregunte, y nada más.
 */
export type SearchBarProps = {
  facets: readonly SearchFacet[];
  /**
   * El modelo, cuando la lista lo tiene.
   *
   * Es lo que convierte la barra de «buscar un texto en un campo» a «hacer una
   * pregunta»: de acá salen el tipo de cada campo —y con él qué se le puede
   * escribir—, los operadores que acepta, sus valores posibles si es un enum, y
   * por qué columna se busca un relacional. Sin esto, `facets` sigue funcionando
   * como siempre: cada faceta es un campo de texto.
   */
  model?: ModelDefinition;
  /**
   * TODO lo que la barra tiene puesto: los niveles de agrupado y los filtros, en
   * una sola lista de instancias.
   *
   * Una sola y no tres porque son lo mismo con clases distintas —ver
   * `criteria.ts`—: lo que entra por el numeral, lo que se escribe a mano, lo
   * que un filtro declarado trae con nombre y lo que sale del constructor son
   * todas instancias, y por eso todas se leen, se tocan y se sacan igual.
   */
  criteria: readonly SearchCriteria[];
  onCriteriaChange: (next: SearchCriteria[]) => void;
  placeholder?: string;
  /** Lo que el panel OFRECE. Lo puesto no sale de acá: sale de `criteria`. */
  filters?: readonly MenuGroup[];
  /**
   * El editor de niveles de agrupado: `<GroupingLevels …/>`.
   *
   * Va en la MISMA columna del panel donde están los filtros, porque es la misma
   * pregunta —«qué parte de esto estoy mirando»— y separarlos obliga a abrir dos
   * cosas para armar un recorte sin poder ver los dos estados a la vez.
   */
  grouping?: ReactNode;
  /**
   * Alguien escribió `#and`, `#or` o `#not` y la barra abrió un nodo: esto avisa
   * cuál, por si quien compone quiere hacer algo más con eso.
   */
  onOpenGroup?: (join: CriteriaJoin) => void;
  favorites?: readonly MenuGroup[];
  onFilterSelect?: (id: string) => void;
  onFavoriteSelect?: (id: string) => void;
  /**
   * Abre el constructor. Recibe la RUTA de la instancia que se tocó, cuando se
   * tocó una: el constructor abre ahí, en vez de abrir en la primera regla y
   * obligar a buscar la que uno venía mirando entre doce.
   */
  onOpenBuilder?: (path?: CriteriaPath) => void;
  /** Lo que va pegado al campo, a su derecha. */
  trailing?: ReactNode;
  /** How many facets the bar shows before folding the rest into «+N»; the grouping chain
   *  counts as one. On a narrow bar only the first shows. `Infinity` never folds. */
  collapseAfter?: number;
  /** Por default la hereda de la superficie que la envuelve. */
  surface?: Surface;
};

export function SearchBar({
  facets,
  model,
  criteria,
  onCriteriaChange,
  placeholder,
  filters,
  grouping,
  onOpenGroup,
  favorites,
  onFilterSelect,
  onFavoriteSelect,
  onOpenBuilder,
  trailing,
  collapseAfter,
  surface,
}: SearchBarProps) {
  const copy = useUiCopy();
  const sup = useSurface(surface);
  const [text, setText] = useState("");
  const [panel, setPanel] = useState(false);
  /** El paso en el que está la pregunta que se escribe: sin campo, con campo, o
   *  con campo y operador. */
  const [step, setStep] = useState<{ field?: QueryField; op?: string }>({});
  /** Cuál de lo ofrecido está marcado. Arranca en el primero, que es el que
   *  Enter toma sin bajar ni una vez. */
  const [active, setActive] = useState(0);
  /**
   * El grupo ABIERTO: dónde cae lo próximo que se escriba.
   *
   * `null` es «al final de la lista», que es lo normal. Se abre con `#and` y se
   * cierra con Escape o eligiendo otro — un grupo que no se puede cerrar es una
   * trampa en la que todo lo que se escriba después queda adentro sin que nadie
   * lo haya pedido.
   */
  const [openGroup, setOpenGroup] = useState<CriteriaPath | null>(null);

  /* Cuál es el nodo abierto se DERIVA de la ruta y del árbol, y no se guarda
     aparte: guardado, el día que alguien le cambia la conjunción desde la ficha
     quedan dos verdades sobre la misma cosa. */
  const openNode = openGroup === null ? undefined : at(criteria, openGroup);
  const openJoin = openNode?.kind === "join" ? openNode.join : undefined;

  /**
   * Cerrar el nodo abierto: lo que siga vuelve a caer afuera.
   *
   * Si quedó VACÍO se lo saca. Abrirlo y no poner nada deja un corchete que no
   * agrupa nada, y alguien tendría que descubrir que se saca con la × de una
   * ficha que no dice nada adentro.
   */
  function closeGroup() {
    if (openGroup !== null && openNode?.kind === "join" && openNode.of.length === 0) {
      onCriteriaChange(removeAt(criteria, openGroup));
    }
    setOpenGroup(null);
    input.current?.focus();
  }

  /* Cuántas cosas hay puestas, para el número del embudo. Se cuenta lo de
     ARRIBA y no las hojas: «tres» tiene que ser lo que se ve en la barra, y lo
     que se ve es un grupo, no sus dos condiciones. */
  const puestos = criteria.length;
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  /**
   * Los campos por los que se puede preguntar.
   *
   * Con un modelo, salen de él con su tipo, sus operadores y sus relaciones —y
   * entonces la barra sabe que «total» acepta «menor que» y «estado» sólo
   * tres valores. Sin modelo, una faceta es un campo de texto y nada más: es
   * exactamente lo que una lista podía declarar hasta ahora, dibujado por el
   * mismo camino. Dos caminos serían dos barras.
   */
  const fields: readonly QueryField[] =
    model === undefined
      ? facets.map((facet) => ({
          field: facet.id,
          label: facet.label,
          kind: "text" as const,
          /* Las tres que se le pueden hacer a un texto sin saber nada más de
             él. Con una sola —«contiene»— el paso de la comparación ofrecía un
             botón y nada que elegir, que es peor que no tener el paso. Un modelo
             publica las suyas y éstas no se usan. */
          ops: ["like", "=", "!="],
        }))
      : queryFields(model, copy.locale);

  /* Lo marcado vuelve al primero cuando cambia lo ofrecido: dejar la marca en el
     cuarto renglón mientras se sigue escribiendo hace que Enter tome algo que ya
     no es lo que dice la pantalla. */
  const suggestions = suggest(
    {
      ...(step.field === undefined ? {} : { field: step.field }),
      ...(step.op === undefined ? {} : { op: step.op }),
      text,
    },
    fields,
  );

  /* Lo escrito, ya leído: hace falta acá para saber si se está eligiendo un
     ATRIBUTO —lo que empieza con `#`— y dibujar fichas en vez de renglones. */
  const asked = readTyped(text);
  /* Se abre cuando hay algo que ofrecer Y alguien empezó: escribiendo, o
     eligiendo un campo, que ya es haber empezado. */
  const open = suggestions.length > 0 && (text.trim() !== "" || step.field !== undefined);

  /* Se eligen FICHAS cuando lo que se elige es un atributo o una comparación, y
     renglones cuando lo que se elige es una pregunta entera. */
  const asTags =
    asked.attribute === true || (step.field !== undefined && step.op === undefined);

  const shown = suggestions.map((one) => one.id).join("\u0000");
  useEffect(() => {
    setActive(0);
  }, [shown]);

  /** Una columna sin opciones no es una columna: aparecería el disparador y el
   *  panel abriría en blanco. Pasar `[]` es lo que hace quien tiene una lista que
   *  no declara ningún recorte, y tiene que leerse igual que no pasar nada. */
  const withOptions = (groups: readonly MenuGroup[]): boolean =>
    groups.some((group) => group.options.length > 0);

  const columns: Column[] = [
    ...(filters === undefined || !withOptions(filters)
      ? []
      : [{ title: copy.search.filters, groups: filters, onSelect: onFilterSelect }]),
    ...(grouping === undefined ? [] : [{ title: copy.search.groupBy, content: grouping }]),
    ...(favorites === undefined || !withOptions(favorites)
      ? []
      : [{ title: copy.search.favorites, groups: favorites, onSelect: onFavoriteSelect }]),
  ];

  useEffect(() => {
    if (!panel) return;
    function outside(e: MouseEvent) {
      if (box.current?.contains(e.target as Node) === true) return;
      setPanel(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setPanel(false);
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [panel]);

  /**
   * UNA PREGUNTA ENTERA entra como instancia, y la barra vuelve al principio.
   *
   * Cae adentro del grupo ABIERTO si hay uno —lo que hace `#and`— y al final de
   * la lista si no. Es lo único que la barra decide sobre dónde van las cosas:
   * el resto lo decide quien tiene la lista.
   */
  function commit(field: QueryField, op: string, value: string) {
    const one = filterCriteria(
      /* El que no lleva valor viaja con `true`, que es lo que el motor espera de
         «está vacío»: mandarle la cadena vacía sería preguntar por el campo que
         vale "". */
      { field: field.field, operator: op, value: withoutValue(op) ? true : value },
      describeCondition(field, op, value),
    );
    onCriteriaChange(
      openGroup === null
        ? [...criteria, one]
        : replaceAt(criteria, openGroup, addTo(at(criteria, openGroup), one)),
    );
    setText("");
    setStep({});
    input.current?.focus();
  }

  /** Lo elegido en el desplegable, según de qué clase sea. */
  function pick(suggestion: QuerySuggestion) {
    if (suggestion.kind === "field") {
      setStep({ field: suggestion.field });
      setText("");
      input.current?.focus();
      return;
    }
    if (suggestion.kind === "op") {
      setStep((current) => ({ ...current, op: suggestion.op }));
      input.current?.focus();
      return;
    }
    if (suggestion.kind === "group") {
      /* Abrir un grupo es poner un nodo VACÍO y recordar que lo que venga cae
         adentro. Vacío y no con lo de antes metido a la fuerza: quien escribe
         `#and` está diciendo «lo que sigue va junto», no «agrupá lo que ya
         puse». */
      const node: SearchCriteria = {
        id: criteriaId("n"),
        kind: "join",
        join: suggestion.join,
        of: [],
      };
      onCriteriaChange([...criteria, node]);
      setOpenGroup([criteria.length]);
      onOpenGroup?.(suggestion.join);
      setText("");
      input.current?.focus();
      return;
    }
    commit(suggestion.field, suggestion.op, suggestion.value);
  }

  /** El nodo con una instancia más adentro. */
  function addTo(node: SearchCriteria | undefined, one: SearchCriteria): SearchCriteria {
    return node === undefined || node.kind !== "join"
      ? one
      : { ...node, of: [...node.of, one] };
  }

  return (
    <div ref={box} className="relative flex min-w-0 items-center gap-2">
      {/* Three columns: the magnifier, what is set plus the input (the only part that wraps),
          and the buttons. The two ends sit on the FIRST line: when the middle wraps they
          stay where the eye starts reading, instead of floating to its middle. */}
      <div
        className={`@container/bar flex min-h-(--size-control-md) w-full min-w-0 items-start rounded-box border transition-colors duration-(--duration-instant) ${bySurface(
          sup,
          "border-line-strong bg-surface focus-within:border-primary/60",
          /* Sobre el cromo lo que define al campo es el BORDE, no el relleno. El
             azul ya es casi negro, así que hundirlo no da contraste (1,05:1) y
             levantarlo da 1,21:1 — en los dos casos el campo no se lee como un
             campo, que era «no llama la atención». La tinta al 45 % es el primer
             borde que pasa 3:1 contra el relleno Y contra el cromo, que es lo que
             1.4.11 le pide a un control. */
          "border-chrome-ink/45 bg-chrome-ink/8 focus-within:border-chrome-link",
        )}`}
      >
        <span className="mt-0.75 flex h-7 shrink-0 items-center pr-1.5 pl-2.5">
          <Search
            className="size-(--size-icon-md) shrink-0 text-muted"
            strokeWidth={2}
            aria-hidden
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-0.75">
          {/* LO PUESTO. Una sola pieza para las dos clases: los de grupo a la
              izquierda, encadenados; los de filtro después, con su anidado y su
              conjunción tocable. Todo abre el constructor parado sobre lo que se
              tocó — ver `CriteriaChips`. */}
          <CriteriaChips
            criteria={criteria}
            surface={sup}
            {...(openGroup === null ? {} : { open: openGroup })}
            {...(onOpenBuilder === undefined ? {} : { onOpen: onOpenBuilder })}
            {...(collapseAfter === undefined ? {} : { collapseAfter })}
            onRemoveMany={(paths) => {
              /* From the deepest index up, so each removal leaves the next path valid. */
              const sorted = [...paths].sort((a, b) => (b[0] ?? 0) - (a[0] ?? 0));
              onCriteriaChange(
                sorted.reduce<SearchCriteria[]>(
                  (left, path) => removeAt(left, path),
                  [...criteria],
                ),
              );
            }}
            onJoin={(path, join) => {
              const node = at(criteria, path);
              if (node?.kind !== "join") return;
              onCriteriaChange(replaceAt(criteria, path, { ...node, join }));
            }}
            onRemove={(path) => {
              onCriteriaChange(removeAt(criteria, path));
              /* Si lo que se sacó era el grupo abierto, deja de estarlo: escribir
                 adentro de algo que ya no existe es escribir en el aire. */
              if (openGroup !== null && path.join(".") === openGroup.join(".")) {
                setOpenGroup(null);
              }
            }}
          />

          {/* EL BORRADOR, en la barra y no en el desplegable.
              
              Mientras se arma, la pregunta se ve donde va a quedar: el campo
              elegido y la comparación elegida son fichas acá adentro, delante de
              lo que se está escribiendo. El desplegable sólo OFRECE — si además
              dijera en qué paso se está, el estado viviría en dos lugares y el
              que desaparece al hacer clic afuera se llevaría la mitad.

              Cada ficha del borrador se saca y se vuelve a elegir: la × del
              campo devuelve al paso 1, la de la comparación al paso 2. */}
          <Tags
            surface={sup}
            items={[
              /* ADENTRO DE QUÉ se está escribiendo, primero: es lo que envuelve
                 al resto del borrador, y es la única ficha que se saca para
                 CERRAR en vez de para deshacer un paso. Sin ella, `#and` abría
                 un grupo y lo único que lo decía era que la próxima pregunta
                 aparecía en un lugar que nadie eligió mirando. */
              ...(openJoin === undefined
                ? []
                : [
                    {
                      id: "draft-group",
                      label: copy.search.joins[openJoin === "not" ? "none" : openJoin],
                      icon: CornerDownRight,
                      selected: true,
                      onRemove: closeGroup,
                      removeLabel: copy.search.closeGroup,
                    },
                  ]),
              ...(step.field === undefined
                ? []
                : [
                    {
                      id: "draft-field",
                      label: step.field.label,
                      ...(step.field.through === undefined
                        ? {}
                        : { note: step.field.through }),
                      selected: true,
                      onRemove: () => {
                        setStep({});
                        input.current?.focus();
                      },
                      removeLabel: copy.search.dropField,
                    },
                  ]),
              ...(step.field === undefined || step.op === undefined
                ? []
                : [
                    {
                      id: "draft-op",
                      label: opLabel(step.op),
                      note: step.op,
                      selected: true,
                      onRemove: () => {
                        setStep({ field: step.field });
                        input.current?.focus();
                      },
                      removeLabel: copy.search.dropOp,
                    },
                  ]),
            ]}
          />

          <input
            ref={input}
            /* Named even when a placeholder shows: a placeholder is not a label, and once
               chips are set there is none at all. */
            aria-label={copy.choice.search}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              /* Retroceso con el campo vacío saca la ÚLTIMA instancia: el gesto
                 que ya existe en cualquier campo de fichas y el único que se
                 descubre sin que nadie lo explique. La última y no la última de
                 su clase — ahora son una sola lista, así que no hay un orden de
                 preferencia que recordar. */
              if (e.key === "Backspace" && text === "") {
                if (criteria.length > 0) {
                  onCriteriaChange(removeAt(criteria, [criteria.length - 1]));
                }
                return;
              }
              /* Las flechas RECORREN lo ofrecido y Enter toma lo que esté
                 marcado. Sin esto, escribir «#nom» y bajar no hacía nada: la
                 lista se veía y no se podía tocar sin el mouse, que es
                 justamente lo que una barra de búsqueda no puede pedir. */
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                if (suggestions.length === 0) return;
                e.preventDefault();
                setActive((current) => {
                  const next = e.key === "ArrowDown" ? current + 1 : current - 1;
                  /* Da la vuelta: con cinco campos, bajar seis veces vuelve al
                     primero en vez de quedarse trabado en el último. */
                  return (next + suggestions.length) % suggestions.length;
                });
                return;
              }
              /* Enter toma lo MARCADO, que arranca siendo lo primero — y lo
                 primero es lo más probable: con «test» el primer campo de texto,
                 con «<= 100» el único que puede contestarlo. */
              if (e.key === "Enter") {
                e.preventDefault();
                const chosen = suggestions[active] ?? suggestions[0];
                if (chosen !== undefined) pick(chosen);
              }
              /* Escape DESHACE, un paso por vez y siempre el último: primero lo
                 escrito, después la comparación, después el campo. Quien se
                 equivocó de campo quiere cambiarlo, no volver a empezar — y
                 quien no está armando nada no espera que le pase nada.

                 Antes sólo desarmaba el paso cuando ya había un campo elegido,
                 así que con «vent» a medio escribir no hacía nada: la tecla que
                 todo el mundo aprieta para deshacer no deshacía. */
              if (e.key === "Escape") {
                if (text !== "") {
                  e.preventDefault();
                  setText("");
                  return;
                }
                if (step.op !== undefined) {
                  e.preventDefault();
                  setStep({ field: step.field });
                  return;
                }
                if (step.field !== undefined) {
                  e.preventDefault();
                  setStep({});
                  return;
                }
                /* Y al final, el grupo: lo último que se abrió es lo último que
                   se deshace. */
                if (openGroup !== null) {
                  e.preventDefault();
                  closeGroup();
                }
                return;
              }
            }}
            placeholder={
              step.field !== undefined
                ? copy.search.typeValue
                : criteria.length === 0
                  ? (placeholder ?? copy.search.placeholder)
                  : ""
            }
            /* CON UN CAMPO ELEGIDO, lo que se escribe es el VALOR — y se dibuja
               como la ficha que va a ser, atrás de las otras dos. No es un
               adorno: el borrador se lee entero —«nombre · contiene · vent▌»—
               antes de existir como recorte, así que se ve lo que va a quedar
               antes de que quede. Y sigue siendo el input: nada se duplica, y
               nada se convierte en filtro hasta que alguien aprieta Enter o
               elige de la lista.

               El ancho lo pide el CONTENIDO —`field-sizing`— para que la ficha
               crezca con lo escrito en vez de reservar una banda vacía. Donde no
               esté, el input se estira como siempre. */
            style={step.field === undefined ? undefined : { fieldSizing: "content" }}
            className={
              step.field === undefined
                ? `h-7 ${criteria.length === 0 ? "min-w-24" : "min-w-16"} flex-1 bg-transparent text-meta outline-none ${bySurface(sup, "text-ink placeholder:text-muted", "text-chrome-ink placeholder:text-chrome-muted")}`
                : `min-w-16 rounded-pill px-2 py-0.5 text-micro outline-none ${bySurface(
                    sup,
                    "bg-accent/18 text-ink placeholder:text-muted",
                    "bg-chrome-link/20 text-chrome-ink placeholder:text-chrome-muted",
                  )}`
            }
          />
        </div>

        {puestos === 0 ? null : (
          <button
            type="button"
            onClick={() => {
              onCriteriaChange([]);
              setOpenGroup(null);
              input.current?.focus();
            }}
            aria-label={copy.search.clearAll}
            title={copy.search.clearAll}
            className={`my-0.5 inline-flex h-(--size-control-sm) shrink-0 items-center rounded-control px-1.5 transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${bySurface(
              sup,
              "text-muted hover:bg-ink/5 hover:text-ink",
              "text-chrome-muted hover:bg-chrome-ink/10 hover:text-chrome-ink",
            )}`}
          >
            <X className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
          </button>
        )}

        {columns.length === 0 && onOpenBuilder === undefined ? null : (
          <button
            type="button"
            onClick={() => setPanel((v) => !v)}
            aria-expanded={panel}
            aria-controls={panel ? id : undefined}
            title={copy.search.tools}
            className={`my-0.5 mr-0.5 inline-flex h-(--size-control-sm) shrink-0 items-center gap-1 rounded-control border px-2 text-micro transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
              puestos > 0 || panel
                ? bySurface(
                    sup,
                    "border-accent/40 bg-accent/18 text-ink",
                    "border-chrome-link/35 bg-chrome-link/15 text-chrome-link",
                  )
                : bySurface(
                    sup,
                    "border-transparent text-muted hover:bg-ink/5 hover:text-ink",
                    "border-transparent text-chrome-muted hover:bg-chrome-ink/10 hover:text-chrome-ink",
                  )
            }`}
          >
            <ListFilter className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
            {puestos > 0 ? <span className="text-micro tabular-nums">{puestos}</span> : null}
          </button>
        )}
      </div>

      {trailing}

      {/* LO OFRECIDO, y nada más.
          
          El desplegable no dice en qué paso se está: eso ya se ve en la barra,
          en fichas, donde va a quedar. Acá sólo están las opciones — y la forma
          la decide qué se está eligiendo, porque elegir entre fichas y elegir
          entre renglones no son el mismo gesto.

              atributos       fichas, porque es lo que va a quedar puesto
              comparaciones   fichas en un cuadro chico: son tres símbolos
              preguntas       renglones «campo: valor», como van a quedar */}
      {open ? (
        <div
          className={`absolute top-full z-30 mt-1 overflow-hidden rounded-panel border border-line-strong bg-surface shadow-float ${
            asTags ? "left-0 w-max max-w-full" : "right-0 left-0"
          }`}
        >
          {/* DÓNDE VA A CAER lo que se elija. Va arriba de lo ofrecido porque es
              la condición de todo lo de abajo: la misma pregunta elegida cae en
              un lugar distinto según haya un nodo abierto o no. */}
          {openJoin === undefined ? null : (
            <div className="flex items-center gap-1.5 border-line border-b px-3 py-1.5 text-micro text-muted">
              <CornerDownRight className="size-3 shrink-0" strokeWidth={2} aria-hidden />
              <span className="min-w-0 truncate">{copy.search.landsHere}</span>
              <span className="shrink-0 rounded-pill border border-accent/40 bg-accent/18 px-1.5 text-ink">
                {copy.search.joins[openJoin === "not" ? "none" : openJoin]}
              </span>
            </div>
          )}
          {asTags ? (
            /* UNA LISTA, no una tira. Se está ELIGIENDO: el ojo baja por una
               columna y el teclado también. Doce atributos doblados en tres
               renglones son doce cosas que barrer en zigzag para encontrar una. */
            <div className="max-h-72 overflow-y-auto p-1">
              <Tags
                stack
                surface="canvas"
                label={
                  step.field !== undefined ? copy.search.askOp : copy.search.askAttribute
                }
                items={suggestions.map((one, at) => ({
                  id: one.id,
                  label: one.label,
                  ...(one.kind === "op"
                    ? { note: one.op }
                    : one.kind === "field" && one.hint !== undefined
                      ? { note: one.hint }
                      : {}),
                  active: at === active,
                  onSelect: () => pick(one),
                }))}
              />
            </div>
          ) : (
            <div className="p-1">
              {suggestions.map((one, at) => (
                <button
                  key={one.id}
                  type="button"
                  onClick={() => pick(one)}
                  onMouseEnter={() => setActive(at)}
                  className={`flex w-full items-baseline gap-1.5 rounded-control px-2 py-1.5 text-left text-meta transition-colors duration-(--duration-instant) ${
                    at === active ? "bg-primary/8" : "hover:bg-ink/4"
                  }`}
                >
                  <span className="shrink-0 font-medium text-ink">{one.label}</span>
                  {one.kind === "condition" ? (
                    <>
                      <span className="shrink-0 text-muted">:</span>
                      <span className="min-w-0 truncate font-mono text-micro text-ink">
                        {one.hint}
                      </span>
                    </>
                  ) : one.kind === "field" && one.hint !== undefined ? (
                    <span className="inline-flex shrink-0 items-center rounded-pill border border-line-strong bg-ink/5 px-2 py-0.5 text-micro text-muted">
                      {one.hint}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* El panel de recortes. En una pantalla ancha las tres columnas se ven de
          una —que es justamente el punto: armar un recorte sin abrir tres cosas—;
          en una angosta se apilan solas y termina pareciendo una hoja emergente,
          que es exactamente lo que hace falta en un teléfono. */}
      {panel && (columns.length > 0 || onOpenBuilder !== undefined) ? (
        <div
          id={id}
          className="absolute top-full right-0 z-30 mt-1 flex w-max max-w-full flex-wrap overflow-hidden rounded-panel border border-line-strong bg-surface shadow-float"
        >
          {columns.map((c, i) => (
            <div
              key={c.title}
              className={`flex min-w-48 flex-1 flex-col ${
                i === 0 ? "" : "border-t border-line sm:border-t-0 sm:border-l"
              }`}
            >
              {/* El título es una banda de la columna, no un rótulo con su propio
                  padding adentro de otro padding. Las dos columnas arrancan el
                  contenido a la misma altura. */}
              <div className="border-b border-line px-2.5 py-1.5 text-micro font-medium text-muted">
                {c.title}
              </div>
              <div className="flex flex-col gap-0.5 p-1">
                {c.content ??
                  c.groups?.map((g, gi) => (
                    <Group
                      key={g.label ?? gi}
                      group={g}
                      first={gi === 0}
                      onSelect={c.onSelect}
                    />
                  ))}
              </div>
            </div>
          ))}

          {/* LA PUERTA AL CONSTRUCTOR, abajo y a lo ancho de las tres columnas.
              
              Las columnas de arriba son las preguntas que alguien YA PENSÓ —los
              filtros con nombre, los cortes de una fecha, los favoritos— y ésta
              es la puerta a las que no pensó nadie. Va afuera de ellas porque no
              es un recorte que se tilda: es otra pantalla.

              Estaba escondida como una opción más adentro de la columna de
              filtros, o directamente no estaba, y entonces el constructor que
              existe no se podía abrir desde el único lugar donde alguien lo
              busca. */}
          {onOpenBuilder === undefined ? null : (
            <div className="w-full border-t border-line p-1">
              <button
                type="button"
                onClick={() => {
                  onOpenBuilder();
                  setPanel(false);
                }}
                className="flex w-full items-center gap-2 rounded-control px-1.5 py-1 text-left text-meta text-ink transition-colors duration-(--duration-instant) hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              >
                <SlidersHorizontal className="size-(--size-icon-sm)" strokeWidth={2} />
                {copy.search.openBuilder}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
