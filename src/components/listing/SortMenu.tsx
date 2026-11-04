"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { Menu, menuTriggerClasses } from "@sincpro/web-ui/primitives/menu/Menu";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import {
  compareBy,
  flipSort,
  moveSort,
  type SortState,
} from "@sincpro/web-ui/primitives/table/sorting";
import {
  ArrowDownUp,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronDown,
  GripVertical,
  Plus,
  X,
} from "lucide-react";
import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  GridList,
  GridListItem,
  useDragAndDrop,
} from "react-aria-components";

/**
 * ORDENAR — por uno o por varios campos, desde la barra.
 *
 * Context: ordenar era una capacidad de `DataTable` y de nadie más. Se hacía
 * clic en el encabezado de la columna, que es la forma correcta **cuando hay
 * encabezados**. En filas, en tablero y en la planilla no los hay, así que
 * cambiar de presentación no perdía sólo el orden puesto: perdía la posibilidad
 * de ordenar.
 *
 * El orden es del CONJUNTO y no de la presentación, igual que los niveles y que
 * lo plegado. Por eso el control vive en la barra y no adentro de la tabla, y
 * por eso la tabla sigue teniendo además sus encabezados: son dos puertas a lo
 * mismo, y la de los encabezados es más rápida cuando existe.
 *
 * ── Varios criterios, y por eso un panel y no un menú ───────────────
 *
 * Se decía que ordenar por dos campos era «un desempate que hace el motor» y
 * que alcanzaba con elegir uno. La gente pidió lo contrario en la pantalla: por
 * fecha, y en la misma fecha por cliente, y después por producto. El motor ya
 * lo aceptaba (`order: [...]`); faltaba poder decirlo. Un orden de N campos
 * tiene ORDEN entre ellos —el segundo sólo decide entre las filas que el
 * primero dejó iguales—, y eso un menú de tildes no lo expresa: hace falta una
 * lista que se reordena. Es la de React Aria (`GridList` + `useDragAndDrop`):
 * se arrastra con el mouse, y con el teclado desde el asa (Enter, flechas,
 * Enter), anunciado.
 */

export type SortField<T = unknown> = {
  field: string;
  label: string;
  /**
   * Por qué valor se ordena, cuando ordena el NAVEGADOR.
   *
   * Ausente = ya viene ordenado de donde salió. Es la misma división que tiene
   * el agrupado con `piles`: un conjunto que el servidor pagina no se puede
   * ordenar acá —ordenar doce filas de ciento ochenta y siete da un orden
   * falso— así que ahí el orden viaja en la lectura y esto sólo lo refleja.
   */
  value?: (item: T) => string | number | null | undefined;
  /** Qué quiere decir «ascendente» para este campo. Sin esto, «ascendente».
   *  Una fecha asciende de vieja a nueva y un importe de chico a grande, y
   *  decirlo evita el clic de prueba. */
  ascLabel?: string;
  descLabel?: string;
};

export type SortMenuProps = {
  /** Por qué campos se puede ordenar. Sin ninguno, el control no se dibuja. */
  fields: readonly SortField<never>[];
  /** El orden, de afuera hacia adentro. Vacío es «como llegaron». */
  sort: readonly SortState[];
  onSortChange: (next: SortState[]) => void;
  surface?: Surface;
};

/**
 * Las filas, ordenadas acá, por cada criterio en su orden.
 *
 * Sólo por los campos que declaran `value`; los demás se saltean —ordenar una
 * página de un conjunto que se pagina afuera produce un orden que es mentira,
 * porque ordena las doce que llegaron y no las ciento ochenta y siete. Sin
 * ningún criterio legible, se devuelven tal cual.
 *
 * Los faltantes van SIEMPRE al final, suba o baje el orden (ver `compareBy`).
 */
export function sortItems<T>(
  items: readonly T[],
  fields: readonly SortField<T>[],
  sort: readonly SortState[] | undefined,
): readonly T[] {
  if (sort === undefined || sort.length === 0) return items;
  const read = (key: string) => fields.find((one) => one.field === key)?.value;
  if (!sort.some((one) => read(one.key) !== undefined)) return items;
  return [...items].sort(compareBy(sort, read));
}

export function SortMenu({ fields, sort, onSortChange, surface }: SortMenuProps) {
  const copy = useUiCopy();
  const fieldOf = (key: string) => fields.find((one) => one.field === key);
  const labelOf = (key: string) => fieldOf(key)?.label ?? key;

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ "text/plain": labelOf(String(key)) })),
    onReorder: (event) =>
      onSortChange(
        moveSort(
          sort,
          new Set([...event.keys].map(String)),
          String(event.target.key),
          event.target.dropPosition === "before" ? "before" : "after",
        ),
      ),
  });

  if (fields.length === 0) return null;

  const first = sort[0];
  const label =
    first === undefined
      ? copy.sorting.label
      : sort.length === 1
        ? labelOf(first.key)
        : fillCopy(copy.sorting.more, { label: labelOf(first.key), count: sort.length - 1 });
  const TriggerIcon =
    first === undefined
      ? ArrowDownUp
      : first.direction === "asc"
        ? ArrowUpNarrowWide
        : ArrowDownWideNarrow;
  const left = fields.filter((one) => !sort.some((s) => s.key === one.field));

  return (
    <DialogTrigger>
      <AriaButton
        className={({ isPressed, isFocusVisible }) =>
          menuTriggerClasses({
            ...(surface === undefined ? {} : { surface }),
            active: sort.length > 0,
            open: isPressed,
            focusVisible: isFocusVisible,
          })
        }
      >
        <TriggerIcon className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
        {label}
        <ChevronDown className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
      </AriaButton>
      <Popover placement="bottom start" className="w-80">
        <Dialog aria-label={copy.sorting.label} className="flex flex-col gap-1 p-2 outline-0">
          {sort.length === 0 ? (
            <p className="px-1 py-1 text-meta text-muted">{copy.sorting.none}</p>
          ) : (
            <GridList
              aria-label={copy.sorting.label}
              items={sort.map((one, index) => ({ ...one, id: one.key, index }))}
              dragAndDropHooks={dragAndDropHooks}
              className="flex flex-col outline-0"
            >
              {(item) => {
                const field = fieldOf(item.key);
                const name = labelOf(item.key);
                const direction =
                  item.direction === "asc"
                    ? (field?.ascLabel ?? copy.sorting.asc)
                    : (field?.descLabel ?? copy.sorting.desc);
                const DirectionIcon =
                  item.direction === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow;
                return (
                  <GridListItem
                    id={item.id}
                    textValue={`${item.index + 1}. ${name}, ${direction}`}
                    className="flex min-w-0 items-center gap-1.5 rounded-control px-1 py-1 outline-0 transition-colors duration-(--duration-instant) data-dragging:opacity-50 data-drop-target:bg-primary/8 data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-primary data-hovered:bg-ink/4"
                  >
                    <AriaButton
                      slot="drag"
                      aria-label={fillCopy(copy.sorting.move, { field: name })}
                      className="inline-flex shrink-0 cursor-grab items-center rounded-mark p-0.5 text-muted outline-0 hover:text-ink data-focus-visible:outline-2 data-focus-visible:outline-primary"
                    >
                      <GripVertical className="size-(--size-icon-sm)" strokeWidth={2} />
                    </AriaButton>
                    {/* The first decides; the rest only break its ties — said, not left to
                        the number. */}
                    <span className="w-16 shrink-0 text-micro text-muted">
                      {item.index === 0 ? copy.sorting.by : copy.sorting.then}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-meta text-ink">{name}</span>
                    <AriaButton
                      aria-label={`${fillCopy(copy.sorting.flip, { field: name })}: ${direction}`}
                      onPress={() => onSortChange(flipSort(sort, item.index))}
                      className="inline-flex shrink-0 items-center gap-1 rounded-mark px-1 py-0.5 text-micro text-primary outline-0 hover:bg-primary/8 data-focus-visible:outline-2 data-focus-visible:outline-primary"
                    >
                      <DirectionIcon
                        className="size-(--size-icon-sm)"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {direction}
                    </AriaButton>
                    <AriaButton
                      aria-label={fillCopy(copy.sorting.remove, { field: name })}
                      onPress={() => onSortChange(sort.filter((_, i) => i !== item.index))}
                      className="inline-flex shrink-0 items-center rounded-mark p-0.5 text-muted outline-0 hover:bg-ink/6 hover:text-ink data-focus-visible:outline-2 data-focus-visible:outline-primary"
                    >
                      <X className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
                    </AriaButton>
                  </GridListItem>
                );
              }}
            </GridList>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
            {left.length === 0 ? (
              <span />
            ) : (
              <Menu
                label={copy.sorting.add}
                icon={Plus}
                variant="text"
                chevron={false}
                width="sm"
                groups={[
                  { options: left.map((one) => ({ id: one.field, label: one.label })) },
                ]}
                onSelect={(id) => onSortChange([...sort, { key: id, direction: "asc" }])}
              />
            )}
            {sort.length === 0 ? null : (
              <AriaButton
                onPress={() => onSortChange([])}
                className="rounded-mark px-1.5 py-0.5 text-micro text-muted outline-0 hover:bg-ink/6 hover:text-ink data-focus-visible:outline-2 data-focus-visible:outline-primary"
              >
                {copy.sorting.clear}
              </AriaButton>
            )}
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
