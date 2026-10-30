"use client";

import {
  blankGroup,
  type BuiltFilter,
  ExpressionView,
  treeFromFilter,
  type TreeGroup,
  treeToFilter,
  WhereTree,
} from "@sincpro/web-ui/components/search/FilterBuilder";
import { JsonEditor } from "@sincpro/web-ui/components/search/JsonEditor";
import {
  filterableNames,
  type ModelDefinition,
} from "@sincpro/web-ui/components/search/model";
import { currentCopy, fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { GRAIN_ORDER } from "@sincpro/web-ui/foundations/grouping";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import { Rule } from "@sincpro/web-ui/primitives/block/Block";
import { Button } from "@sincpro/web-ui/primitives/button/index";
import { Tags } from "@sincpro/web-ui/primitives/tag/Tags";
import { Plus, Trash2 } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

/* ====================================================================== *
 *  EL CONSTRUCTOR DE LA CRITERIA ENTERA, NO SÓLO DEL FILTRO.
 *
 *  Una lectura son cuatro preguntas, y hasta acá sólo se podía armar la
 *  primera:
 *
 *    where          ¿qué filas?          — el árbol de condiciones
 *    order          ¿en qué orden?       — N campos, cada uno asc o desc
 *    grouping       ¿partidas por qué?   — N niveles, con grano si es fecha
 *    specification  ¿qué de cada una?    — los campos que vuelven
 *
 *  Las cuatro son la MISMA criteria, así que se editan en un solo lugar y se
 *  serializan en un solo JSON — el mismo objeto que viaja por la URL, por el
 *  cuerpo de un POST o por una cola, sin traducción en el medio.
 *
 *  El editor de código de abajo muestra la criteria COMPLETA, no el filtro
 *  suelto: es la forma real de lo que se está armando, y se puede escribir o
 *  pegar ahí en vez de tocar los controles.
 * ====================================================================== */

export interface BuiltSort {
  field: string;
  descending?: boolean;
}

export interface BuiltLevel {
  field: string;
  grain?: string | null;
}

/** Un número plegado de las filas de un montón: `["sum", "row_count"]`. */
export type BuiltFold = [string, string];

/** Desde dónde empieza una página de montones — la misma forma que la paginación de filas. */
export type BuiltPageStrategy = { token?: string | null } | { rows?: number };

export interface BuiltGroupPagination {
  limit?: number;
  strategy?: BuiltPageStrategy;
}

export interface BuiltGrouping {
  by?: BuiltLevel[];
  totals?: Record<string, BuiltFold>;
  /** Un filtro sobre lo que los montones plegaron: `count > 10`. Los nombres que admite son
   *  los de `totals`, más `"count"`. */
  having?: BuiltFilter;
  /** En qué orden vuelven los montones: por el propio campo del nivel, por un nombre de
   *  `totals`, o por `count`. */
  order?: BuiltSort[];
  /** Cuántos montones del primer nivel vuelven, y desde dónde. Ausente es todos. */
  pagination?: BuiltGroupPagination;
}

/** La criteria tal como la declara el motor. Es lo que este componente arma y devuelve, y lo
 *  que el editor de código muestra. */
export interface BuiltCriteria {
  where?: BuiltFilter;
  order?: BuiltSort[];
  grouping?: BuiltGrouping;
  specification?: Record<string, Record<string, never>>;
}

/**
 * Los cortes de una fecha, de GRUESO a fino, con `null` adelante: sin corte, un
 * campo de fecha parte por instante y cada fila termina en su propio montón.
 *
 * El orden no es una preferencia — un día entero vive adentro de un solo mes— y
 * es el mismo que `GRAIN_ORDER` publica para la barra: una sola dirección para
 * las dos pantallas. La ficha de un nivel rota por esta lista.
 */
const GRAINS: readonly (string | null)[] = [null, ...GRAIN_ORDER];

/** Qué tipos admiten un grano: recortar un texto por mes no significa nada. */
const DATE_TYPES = new Set(["date", "datetime"]);

/** Los operadores que un plegado —siempre un número— o `count` admiten en un `having`: los
 *  mismos que la definición del modelo publica para un campo numérico, `is null` aparte, que
 *  no significa nada sobre un número que el propio motor calculó. */
const COMPARABLE = ["=", "!=", ">", ">=", "<", "<=", "between"] as const;

/** Las funciones que un plegado puede pedir, cerradas del lado del servidor porque el nombre
 *  llega a SQL. */
const FOLD_FUNCTIONS = ["sum", "avg", "min", "max", "count"] as const;

function isEmpty(criteria: BuiltCriteria): boolean {
  return (
    criteria.where === undefined &&
    (criteria.order ?? []).length === 0 &&
    (criteria.grouping?.by ?? []).length === 0 &&
    Object.keys(criteria.grouping?.totals ?? {}).length === 0 &&
    Object.keys(criteria.specification ?? {}).length === 0
  );
}

/**
 * LA FICHA QUE AGREGA: un «+» que abre la lista de lo que se puede elegir.
 *
 * Es lo mismo que hace el numeral en la barra, y por la misma razón: elegir
 * entre veinte campos es elegir de una LISTA, no desplegar un `<select>` que ya
 * viene con uno puesto y que hay que cambiar. Con el `<select>`, agregar un
 * nivel ponía el primer campo del modelo aunque nadie lo hubiera pedido.
 */
function AddTag({
  label,
  options,
  onPick,
}: {
  label: string;
  options: readonly string[];
  onPick: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (options.length === 0) return null;
  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="inline-flex shrink-0 items-center gap-1 rounded-pill border border-dashed border-line-strong px-2 py-0.5 text-micro text-muted transition-colors duration-(--duration-instant) hover:border-line-strong hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      >
        <Plus className="size-3" strokeWidth={2} aria-hidden />
        {label}
      </button>
      {open ? (
        <span className="absolute top-full left-0 z-40 mt-1 max-h-64 overflow-y-auto rounded-panel border border-line-strong bg-surface p-1 shadow-float">
          <Tags
            stack
            label={label}
            items={options.map((name) => ({
              id: name,
              label: name,
              onSelect: () => {
                onPick(name);
                setOpen(false);
              },
            }))}
          />
        </span>
      ) : null}
    </span>
  );
}

/** El corte siguiente, y vuelta a empezar. */
function nextGrain(grain: string | null | undefined): string | null {
  const at = GRAINS.indexOf(grain ?? null);
  return GRAINS[(at + 1) % GRAINS.length] ?? null;
}

export function CriteriaBuilder({
  model,
  initial,
  focus,
  onApply,
  onCancel,
}: {
  model: ModelDefinition;
  /** La criteria que ya estaba puesta. Reabrir tiene que seguir donde quedó. */
  initial?: BuiltCriteria;
  /**
   * El campo de la condición que hay que mostrar primero: la ficha que alguien
   * tocó en la barra.
   *
   * Sin esto, tocar un recorte abría el constructor en la regla uno y había que
   * buscar entre doce la que uno venía mirando — que es la manera más rápida de
   * editar la equivocada.
   */
  focus?: string;
  onApply: (criteria: BuiltCriteria | undefined) => void;
  onCancel?: () => void;
}) {
  const surface = useSurface();
  const names = Object.keys(model.fields).sort();
  /* Nunca un relacional ni un valor-objeto: ninguno de los dos tiene una comparación propia
     (`ops` vacío), así que ninguno sirve de blanco para un filtro, un orden o un nivel. */
  const scalarNames = filterableNames(model);
  const sortable = names.filter((name) => model.fields[name]?.sortable === true);

  const decomposed = initial?.where === undefined ? null : treeFromFilter(initial.where);
  const [tree, setTree] = useState<TreeGroup>(() =>
    decomposed !== null && decomposed.kind === "group"
      ? decomposed
      : decomposed !== null
        ? { kind: "group", join: "all", children: [decomposed] }
        : blankGroup(model, scalarNames[0]),
  );
  const copy = useUiCopy();
  const [lockedWhere, setLockedWhere] = useState<BuiltFilter | null>(
    initial?.where !== undefined && decomposed === null ? initial.where : null,
  );
  const [order, setOrder] = useState<BuiltSort[]>(initial?.order ?? []);
  const [levels, setLevels] = useState<BuiltLevel[]>(initial?.grouping?.by ?? []);
  const [totals, setTotals] = useState<Record<string, BuiltFold>>(
    initial?.grouping?.totals ?? {},
  );
  const [groupOrder, setGroupOrder] = useState<BuiltSort[]>(initial?.grouping?.order ?? []);
  const [groupLimit, setGroupLimit] = useState<number | undefined>(
    initial?.grouping?.pagination?.limit,
  );

  /* `having` es un filtro como cualquier otro, sobre un modelo sintético cuyos únicos campos
     son los nombres que admite: los de `totals`, más `count`. Reutilizar `WhereTree` sobre ese
     modelo es más simple y más correcto que armar un editor de condiciones aparte. */
  const havingModel = useMemo<ModelDefinition>(
    () => ({
      aggregate: "having",
      identity: "count",
      fields: Object.fromEntries([
        ["count", { type: "integer", nullable: false, sortable: false, ops: COMPARABLE }],
        ...Object.keys(totals).map((name) => [
          name,
          { type: "number", nullable: false, sortable: false, ops: COMPARABLE },
        ]),
      ]),
    }),
    [totals],
  );
  const havingDecomposed =
    initial?.grouping?.having === undefined ? null : treeFromFilter(initial.grouping.having);
  const [havingTree, setHavingTree] = useState<TreeGroup>(() =>
    havingDecomposed !== null && havingDecomposed.kind === "group"
      ? havingDecomposed
      : havingDecomposed !== null
        ? { kind: "group", join: "all", children: [havingDecomposed] }
        : blankGroup(havingModel, "count"),
  );

  const [fields, setFields] = useState<string[]>(Object.keys(initial?.specification ?? {}));
  const [rawText, setRawText] = useState<string>(() =>
    initial === undefined ? "" : JSON.stringify(initial, null, 2),
  );
  const [rawError, setRawError] = useState<string | null>(null);

  /** Lo que los controles dicen, junto: es lo que se aplica y lo que el JSON muestra. */
  function assemble(next: {
    tree?: TreeGroup;
    locked?: BuiltFilter | null;
    order?: BuiltSort[];
    levels?: BuiltLevel[];
    totals?: Record<string, BuiltFold>;
    havingTree?: TreeGroup;
    groupOrder?: BuiltSort[];
    groupLimit?: number | undefined;
    fields?: string[];
  }): BuiltCriteria {
    const where = next.locked ?? lockedWhere ?? treeToFilter(next.tree ?? tree);
    const sorts = next.order ?? order;
    const by = next.levels ?? levels;
    const folds = next.totals ?? totals;
    const having = treeToFilter(next.havingTree ?? havingTree);
    const groupSorts = next.groupOrder ?? groupOrder;
    const limit = "groupLimit" in next ? next.groupLimit : groupLimit;
    const chosen = next.fields ?? fields;

    /* Sin niveles no hay qué plegar, qué filtrar entre montones ni en qué orden o página
       volverían — un total, un `having` o una página puestos y luego vaciados de niveles no
       tienen que sobrevivir sueltos en la criteria que se manda. */
    const grouping: BuiltGrouping =
      by.length === 0
        ? {}
        : {
            by,
            ...(Object.keys(folds).length === 0 ? {} : { totals: folds }),
            ...(having === undefined ? {} : { having }),
            ...(groupSorts.length === 0 ? {} : { order: groupSorts }),
            ...(limit === undefined ? {} : { pagination: { limit } }),
          };

    return {
      ...(where === undefined ? {} : { where }),
      ...(sorts.length === 0 ? {} : { order: sorts }),
      ...(Object.keys(grouping).length === 0 ? {} : { grouping }),
      ...(chosen.length === 0
        ? {}
        : {
            specification: Object.fromEntries(
              chosen.map((name) => [name, {} as Record<string, never>]),
            ),
          }),
    };
  }

  /* Tocar cualquier control reescribe el JSON entero: las dos vistas son la misma criteria. */
  function push(next: Parameters<typeof assemble>[0]) {
    if (next.tree !== undefined) setTree(next.tree);
    if (next.locked !== undefined) setLockedWhere(next.locked);
    if (next.order !== undefined) setOrder(next.order);
    if (next.levels !== undefined) setLevels(next.levels);
    if (next.totals !== undefined) setTotals(next.totals);
    if (next.havingTree !== undefined) setHavingTree(next.havingTree);
    if (next.groupOrder !== undefined) setGroupOrder(next.groupOrder);
    if ("groupLimit" in next) setGroupLimit(next.groupLimit);
    if (next.fields !== undefined) setFields(next.fields);

    const built = assemble(next);
    setRawText(isEmpty(built) ? "" : JSON.stringify(built, null, 2));
    setRawError(null);
  }

  /* Escribir el JSON rehace los controles, mientras lo escrito sea una criteria. */
  function updateRaw(text: string) {
    setRawText(text);
    if (text.trim() === "") {
      setRawError(null);
      return;
    }

    let parsed: BuiltCriteria;
    try {
      parsed = JSON.parse(text) as BuiltCriteria;
    } catch {
      setRawError(currentCopy().builder.invalidJson);
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setRawError(currentCopy().builder.notCriteria);
      return;
    }
    setRawError(null);

    const node = parsed.where === undefined ? null : treeFromFilter(parsed.where);
    if (node !== null) {
      setTree(
        node.kind === "group" ? node : { kind: "group", join: "all", children: [node] },
      );
      setLockedWhere(null);
    } else if (parsed.where !== undefined) {
      setLockedWhere(parsed.where);
    } else {
      setTree(blankGroup(model, scalarNames[0]));
      setLockedWhere(null);
    }
    setOrder(parsed.order ?? []);
    setLevels(parsed.grouping?.by ?? []);
    setTotals(parsed.grouping?.totals ?? {});
    setGroupOrder(parsed.grouping?.order ?? []);
    setGroupLimit(parsed.grouping?.pagination?.limit);

    const havingNode =
      parsed.grouping?.having === undefined ? null : treeFromFilter(parsed.grouping.having);
    setHavingTree(
      havingNode !== null && havingNode.kind === "group"
        ? havingNode
        : havingNode !== null
          ? { kind: "group", join: "all", children: [havingNode] }
          : blankGroup(havingModel, "count"),
    );
    setFields(Object.keys(parsed.specification ?? {}));
  }

  const box =
    surface === "chrome"
      ? "border-chrome-ink/20 bg-chrome text-chrome-ink"
      : "border-ink/15 bg-surface text-ink";
  const select = `min-w-0 flex-1 basis-40 rounded-control border px-2 py-1 text-meta ${box}`;

  return (
    <div className="flex min-w-0 flex-col gap-3 p-3">
      {/* ── qué filas ─────────────────────────────────────────────────── */}
      <section className="flex min-w-0 flex-col gap-2">
        <Rule label={copy.builder.filter} />
        <div className="max-h-72 min-w-0 overflow-auto">
          {lockedWhere !== null ? (
            <>
              <p className="mb-2 text-meta text-muted">{copy.search.unreadable}</p>
              <ExpressionView node={lockedWhere} model={model} />
            </>
          ) : (
            <WhereTree
              model={model}
              group={tree}
              onChange={(next) => push({ tree: next })}
              {...(focus === undefined ? {} : { focus })}
            />
          )}
        </div>
      </section>

      {/* ── en qué orden ──────────────────────────────────────────────── */}
      <section className="flex min-w-0 flex-col gap-2">
        <Rule label={copy.builder.order} />
        {/* FICHAS, como en la barra: un orden son N campos con su dirección, y
            eso se lee de un vistazo en una línea. Con un `<select>` por campo
            más otro por dirección, tres campos ocupaban seis controles y había
            que leerlos todos para saber por dónde ordena. La flecha se toca y
            da vuelta la dirección; la × saca el campo. */}
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <Tags
            items={order.map((sort, index) => ({
              id: `${sort.field}-${index}`,
              label: sort.field,
              note: sort.descending === true ? "↓" : "↑",
              title:
                sort.descending === true
                  ? `${copy.builder.descending} · ${copy.builder.flip}`
                  : `${copy.builder.ascending} · ${copy.builder.flip}`,
              onSelect: () =>
                push({
                  order: order.map((one, at) =>
                    at === index ? { ...one, descending: one.descending !== true } : one,
                  ),
                }),
              onRemove: () => push({ order: order.filter((_, at) => at !== index) }),
              removeLabel: fillCopy(copy.builder.dropOrderBy, { field: sort.field }),
            }))}
          />
          {/* Sólo lo que el modelo declara ordenable: una columna que admite
              vacío pierde filas en la paginación por cursor, y por eso el
              servidor no la ofrece. */}
          <AddTag
            label={copy.builder.addOrder}
            options={sortable.filter((name) => !order.some((one) => one.field === name))}
            onPick={(name) => push({ order: [...order, { field: name, descending: false }] })}
          />
        </div>
        {order.length === 0 ? (
          <p className="text-meta text-muted">{copy.builder.noOrder}</p>
        ) : null}
      </section>

      {/* ── partidas por qué ──────────────────────────────────────────── */}
      <section className="flex min-w-0 flex-col gap-2">
        <Rule label={copy.builder.groupBy} />
        {/* Encadenados con «›» y no en renglones: los niveles NO se suman, se
            anidan —«año, y adentro mes»— y el orden ES la pregunta. Es el mismo
            dibujo que la barra, así que lo que se arma acá se reconoce allá. */}
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {levels.map((level, index) => (
            <Fragment key={`${level.field}-${index}`}>
              {index === 0 ? null : (
                <span className="shrink-0 text-micro text-muted" aria-hidden>
                  ›
                </span>
              )}
              <Tags
                items={[
                  {
                    id: `${level.field}-${index}`,
                    label: level.field,
                    ...(level.grain == null ? {} : { note: level.grain }),
                    ...(DATE_TYPES.has(model.fields[level.field]?.type ?? "")
                      ? {
                          title: copy.builder.changeGrain,
                          onSelect: () =>
                            push({
                              levels: levels.map((one, at) =>
                                at === index ? { ...one, grain: nextGrain(one.grain) } : one,
                              ),
                            }),
                        }
                      : {}),
                    onRemove: () => push({ levels: levels.filter((_, at) => at !== index) }),
                    removeLabel: fillCopy(copy.builder.dropLevel, { field: level.field }),
                  },
                ]}
              />
            </Fragment>
          ))}
          <AddTag
            label={copy.builder.addGroup}
            options={scalarNames.filter((name) => !levels.some((one) => one.field === name))}
            onPick={(name) => push({ levels: [...levels, { field: name }] })}
          />
        </div>
        {levels.length === 0 ? (
          <p className="text-meta text-muted">{copy.builder.noGrouping}</p>
        ) : null}
      </section>

      {/* Lo que sigue sólo importa habiendo al menos un nivel: sin montones no hay qué
          plegar, qué filtrar entre montones, ni en qué orden ni cuántos de ellos volver. */}
      {levels.length > 0 ? (
        <>
          {/* ── qué se plega de cada montón ─────────────────────────────── */}
          <section className="flex min-w-0 flex-col gap-2">
            <Rule label={copy.builder.totals} />
            {Object.keys(totals).length === 0 ? (
              <p className="text-meta text-muted">{copy.builder.noTotals}</p>
            ) : null}
            {Object.entries(totals).map(([name, [fn, field]]) => (
              <div key={name} className="flex min-w-0 flex-wrap items-center gap-2">
                <select
                  value={fn}
                  onChange={(event) =>
                    push({
                      totals: { ...totals, [name]: [event.target.value, field] },
                    })
                  }
                  className={`min-w-0 flex-1 basis-28 rounded-control border px-2 py-1 text-meta ${box}`}
                >
                  {FOLD_FUNCTIONS.map((one) => (
                    <option key={one} value={one}>
                      {one}
                    </option>
                  ))}
                </select>
                <select
                  value={field}
                  onChange={(event) =>
                    push({ totals: { ...totals, [name]: [fn, event.target.value] } })
                  }
                  className={select}
                >
                  {scalarNames.map((one) => (
                    <option key={one} value={one}>
                      {one}
                    </option>
                  ))}
                </select>
                <span className="shrink-0 text-micro text-muted">
                  {fillCopy(copy.builder.totalAs, { name })}
                </span>
                <button
                  type="button"
                  aria-label={copy.builder.dropTotal}
                  onClick={() => {
                    const { [name]: _dropped, ...rest } = totals;
                    push({ totals: rest });
                  }}
                  className="ml-auto shrink-0 text-muted"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <div>
              <Button
                role="ghost"
                disabled={scalarNames.length === 0}
                onClick={() => {
                  let name = "total";
                  let index = 2;
                  while (name in totals) name = `total_${index++}`;
                  push({
                    totals: { ...totals, [name]: ["sum", scalarNames[0] ?? ""] },
                  });
                }}
              >
                <Plus className="size-4" /> {copy.builder.addTotal}
              </Button>
            </div>
          </section>

          {/* ── qué montones quedan ──────────────────────────────────────── */}
          <section className="flex min-w-0 flex-col gap-2">
            <Rule label={copy.builder.filterPiles} />
            <p className="text-meta text-muted">{copy.builder.pilesNote}</p>
            <WhereTree
              model={havingModel}
              group={havingTree}
              onChange={(next) => push({ havingTree: next })}
            />
          </section>

          {/* ── en qué orden vuelven los montones ────────────────────────── */}
          <section className="flex min-w-0 flex-col gap-2">
            <Rule label={copy.builder.pileOrder} />
            {groupOrder.length === 0 ? (
              <p className="text-meta text-muted">{copy.builder.noPileOrder}</p>
            ) : null}
            {groupOrder.map((sort, index) => (
              <div key={index} className="flex min-w-0 flex-wrap items-center gap-2">
                <select
                  value={sort.field}
                  onChange={(event) =>
                    push({
                      groupOrder: groupOrder.map((one, at) =>
                        at === index ? { ...one, field: event.target.value } : one,
                      ),
                    })
                  }
                  className={select}
                >
                  {[
                    ...levels.map((level) => level.field),
                    ...Object.keys(totals),
                    "count",
                  ].map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={sort.descending === true ? "desc" : "asc"}
                  onChange={(event) =>
                    push({
                      groupOrder: groupOrder.map((one, at) =>
                        at === index
                          ? { ...one, descending: event.target.value === "desc" }
                          : one,
                      ),
                    })
                  }
                  className={`min-w-0 flex-1 basis-32 rounded-control border px-2 py-1 text-meta ${box}`}
                >
                  <option value="asc">{copy.builder.ascending}</option>
                  <option value="desc">{copy.builder.descending}</option>
                </select>
                <button
                  type="button"
                  aria-label={copy.builder.dropOrder}
                  onClick={() =>
                    push({ groupOrder: groupOrder.filter((_, at) => at !== index) })
                  }
                  className="ml-auto shrink-0 text-muted"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <div>
              <Button
                role="ghost"
                onClick={() =>
                  push({
                    groupOrder: [...groupOrder, { field: "count", descending: true }],
                  })
                }
              >
                <Plus className="size-4" /> {copy.builder.addPileOrder}
              </Button>
            </div>
          </section>

          {/* ── cuántos montones vuelven ──────────────────────────────────── */}
          <section className="flex min-w-0 flex-col gap-2">
            <Rule label={copy.builder.pilePage} />
            <p className="text-meta text-muted">{copy.builder.pilePageNote}</p>
            <label className="flex items-center gap-2 text-meta">
              <input
                type="checkbox"
                checked={groupLimit !== undefined}
                onChange={(event) =>
                  push({ groupLimit: event.target.checked ? 20 : undefined })
                }
              />
              {copy.builder.limitPiles}
            </label>
            {groupLimit !== undefined ? (
              <input
                type="number"
                min={0}
                value={groupLimit}
                onChange={(event) => push({ groupLimit: Number(event.target.value) })}
                className={`w-32 rounded-control border px-2 py-1 text-meta ${box}`}
              />
            ) : null}
          </section>
        </>
      ) : null}

      {/* ── qué de cada fila ──────────────────────────────────────────── */}
      <section className="flex min-w-0 flex-col gap-2">
        <Rule label={copy.builder.fields} />
        <p className="text-meta text-muted">
          {fields.length === 0
            ? copy.builder.allFields
            : fillCopy(copy.builder.someFields, {
                shown: fields.length,
                total: names.length,
              })}
        </p>
        <div className="flex flex-wrap gap-2">
          {names.map((name) => {
            const chosen = fields.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() =>
                  push({
                    fields: chosen ? fields.filter((one) => one !== name) : [...fields, name],
                  })
                }
                className={`rounded-pill border px-2 py-0.5 text-micro ${
                  chosen ? "border-accent/40 bg-accent/18 text-ink" : `text-muted ${box}`
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── la criteria entera, en su forma real ──────────────────────── */}
      <JsonEditor
        value={rawText}
        onChange={updateRaw}
        error={rawError}
        height="14rem"
        label={copy.builder.json}
      />

      <div className="flex gap-2">
        <Button
          role="primary"
          disabled={rawError !== null}
          onClick={() =>
            onApply(
              rawText.trim() === "" ? undefined : (JSON.parse(rawText) as BuiltCriteria),
            )
          }
        >
          {copy.builder.apply}
        </Button>
        {onCancel === undefined ? null : (
          <Button role="ghost" onClick={onCancel}>
            {copy.builder.cancel}
          </Button>
        )}
      </div>
    </div>
  );
}
