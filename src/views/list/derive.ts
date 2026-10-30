import {
  type GroupLevel,
  levelKey,
  pathKey,
  type Pile,
  pileItems,
  pileLabel,
} from "@sincpro/web-ui/foundations/grouping";
import { aggregateOf, type DataColumn } from "@sincpro/web-ui/primitives/table/DataTable";
import type { ReportRow } from "@sincpro/web-ui/primitives/table/ReportTable";
import type { SheetColumn } from "@sincpro/web-ui/primitives/table/SheetTable";
import type { ListGroup, ListSheet, RowOf } from "@sincpro/web-ui/views/list/types";

/**
 * Context: what a list DERIVES from its set, as pure functions — the table's group levels,
 * the sheet drawn from the declared columns, the sheet's flattened band/row sequence and
 * the report built from the piles. `ListView` calls them inside `useMemo` with the same
 * dependencies they always had; nothing here knows React.
 */

/**
 * Los niveles, como los necesita la tabla: uno por NIVEL y no uno por campo.
 *
 * La clave sale de `group.of` —la misma que arman las otras cinco
 * presentaciones— así que los montones de la tabla son los mismos y lo plegado
 * vale para todas. El rótulo sale de la misma regla que el árbol: un nivel no
 * repite lo que el de arriba, del mismo campo, ya dijo.
 */
export function groupLevelsOf<T extends object>(
  group: ListGroup<T> | undefined,
  columns: readonly DataColumn<T>[] | undefined,
) {
  if (group === undefined || group.levels.length === 0) return [];
  const above: GroupLevel[] = [];
  const label = group.label ?? pileLabel;
  return group.levels.map((level) => {
    const within = above.flatMap((one) =>
      one.field === level.field && one.grain !== undefined ? [one.grain] : [],
    );
    above.push(level);
    /* Cómo se llama el corte: como lo llama la columna que contesta por ese
       campo, que es el único rótulo humano que esta capa tiene. */
    const column = columns?.find(
      (one) => one.id === level.field || one.field === level.field,
    );
    return {
      id: levelKey(level),
      label: column?.header ?? level.field,
      keyOf: (item: T) => group.of(item, level),
      labelOf: (key: string) => label(key, level, within),
    };
  });
}

/**
 * La planilla de un conjunto de REGISTROS sale de las columnas que la lista
 * ya declaró. Sin esto, ofrecer `sheet` obligaba a escribir las columnas dos
 * veces —una como `DataColumn` y otra como `SheetColumn`— y entonces nadie la
 * ofrecía: la presentación existía en el arquetipo y no estaba en ninguna
 * pantalla.
 *
 * `sheet` explícita sigue siendo para los DATOS CRUDOS, donde las columnas
 * salen del archivo y el código no sabe cuáles son.
 */
export function sheetFromColumns<T extends object>(
  shownColumns: readonly DataColumn<T>[] | undefined,
): ListSheet<T> | undefined {
  if (shownColumns === undefined || shownColumns.length === 0) return undefined;
  const byId = new Map(shownColumns.map((column) => [column.id, column]));
  return {
    columns: shownColumns.map((column) => ({
      id: column.id,
      header: column.header,
      ...(column.numeric === true ? { numeric: true } : {}),
      ...(column.width === undefined ? {} : { width: column.width }),
    })),
    cell: (item, column) => {
      const declared = byId.get(column.id);
      /* `text` primero: `value` es la clave de ORDEN, no lo que se lee. Sin
         esto la planilla mostraba `computed` donde la tabla muestra
         «calculado». */
      if (declared?.text !== undefined) return declared.text(item);
      const raw = declared?.value(item);
      /* Un booleano no es una celda: la cuadrícula dibuja texto o número, y
         `false` se vería como una celda vacía, que significa otra cosa. */
      return typeof raw === "boolean" ? String(raw) : (raw ?? null);
    },
    tone: (item, column) => byId.get(column.id)?.tone?.(item),
    note: (item, column) => byId.get(column.id)?.note?.(item),
    /* Crece con la página en vez de abrir una caja con scroll adentro de otra
       que ya scrollea. La lista ya vino paginada, así que son ochenta filas y
       no ciento ochenta y siete — el caso de un millón es el de los datos
       crudos, y ése declara su propio alto. */
    height: "auto",
  };
}

export type SheetEntry<T> = {
  band?: {
    field: string;
    label: string;
    count: number;
    open: boolean;
    key: string;
    depth: number;
    total?: (column: SheetColumn, columnIndex: number) => string | number | null;
  };
  item?: T;
  /* El número de fila cuenta FILAS, no posiciones de la secuencia: con las
     bandas ocupando un índice, numerar por posición saltaba —1, 2…11, 13—
     y un número de fila que saltea no sirve para nada. */
  n?: number;
};

/**
 * La planilla, cuando hay montones: una SECUENCIA donde cada índice es una
 * fila o la cabecera del montón que empieza ahí.
 *
 * **Acá decía que la planilla no agrupa y estaba mal razonado.** El argumento
 * —una banda corre la cuadrícula y mirar datos crudos es seguir una fila a lo
 * ancho— vale para los datos crudos, donde las columnas salen del archivo y
 * no hay ningún eje del dominio por el que agrupar. Pero la planilla DERIVADA
 * es el mismo conjunto de registros que la tabla, con los mismos ejes: que
 * agrupe la tabla y no ella es exactamente el drift que este arquetipo existe
 * para impedir — cambiar de presentación perdía la agrupación.
 *
 * La regla queda en manos de la vista, como corresponde: si declara `group`,
 * agrupa; si no, no hay montones que dibujar.
 */
export function sheetRowsOf<T extends object>(
  piles: readonly Pile<T>[] | null,
  isOpen: (pile: Pile<T>) => boolean,
  columns: readonly DataColumn<T>[] | undefined,
): SheetEntry<T>[] | null {
  if (piles === null) return null;
  const out: SheetEntry<T>[] = [];
  let n = 0;

  /* Aplanar es recursivo porque el árbol lo es. La planilla no puede recibir
     el árbol: está virtualizada por índice, y un índice es una posición en una
     secuencia — así que la jerarquía se expresa en la sangría de cada banda. */
  const walk = (list: readonly Pile<T>[]) => {
    for (const pile of list) {
      const open = isOpen(pile);
      const inside = pile.piles.length === 0 ? pile.items : pileItems(pile.piles);
      out.push({
        band: {
          field: pile.field,
          label: pile.label,
          count: pile.count,
          open,
          key: pathKey(pile.path),
          depth: pile.depth,
          /* El total de cada columna, en la posición de esa columna. Sale de
             las `columns` de la lista —las mismas que suma el pie de la
             tabla— para que la planilla y la tabla no digan números distintos
             del mismo montón. La planilla declara SUS columnas aparte, así que
             se busca por id. */
          total: (column: SheetColumn) => {
            const declared = columns?.find((one) => one.id === column.id);
            return declared === undefined ? null : aggregateOf(declared, inside);
          },
        },
      });
      if (!open) continue;
      if (pile.piles.length > 0) {
        walk(pile.piles);
        continue;
      }
      for (const one of pile.items) {
        n += 1;
        out.push({ item: one, n });
      }
    }
  };
  walk(piles);
  return out;
}

/**
 * El informe armado a partir de los montones, cuando el dominio no declaró
 * líneas.
 *
 * Cada montón es una línea con los agregados de las columnas que declararon
 * uno, y el nivel más profundo cuelga sus filas. Las columnas del informe las
 * pone `report.columns`; los números salen de las `columns` de la lista, que
 * son las mismas que suma el pie de la tabla — para que el informe y la tabla
 * no digan totales distintos del mismo conjunto.
 */
export function reportRowsOf<T extends object>(
  piles: readonly Pile<T>[] | null,
  columns: readonly DataColumn<T>[] | undefined,
  row: (item: T) => RowOf,
): readonly ReportRow[] {
  if (piles === null || columns === undefined) return [];
  const numeric = columns.filter((column) => column.aggregate !== undefined);

  /* A pile is named by the HEADER of the column that answers for its field — the word the
     person reads in the table — not by the field's id: «stage · pedido» showed the
     model's name for it. */
  const fieldName = (field: string) =>
    columns.find((column) => column.id === field || column.field === field)?.header ?? field;

  const line = (pile: Pile<T>): ReportRow => {
    const inside = pile.piles.length === 0 ? pile.items : pileItems(pile.piles);
    const children =
      pile.piles.length > 0
        ? pile.piles.map(line)
        : pile.items.map((item, index) => ({
            id: `${pathKey(pile.path)}\u0000${index}`,
            label: row(item).name,
            kind: "line" as const,
            level: pile.depth + 1,
            values: numeric.map((column) => {
              const value = column.value(item);
              return typeof value === "number" ? value : null;
            }),
          }));
    return {
      id: pathKey(pile.path),
      label: `${fieldName(pile.field)} · ${pile.label}`,
      kind: pile.depth === 0 ? "section" : "group",
      level: pile.depth,
      values: numeric.map((column) => aggregateOf(column, inside)),
      children,
    };
  };

  return piles.map(line);
}
