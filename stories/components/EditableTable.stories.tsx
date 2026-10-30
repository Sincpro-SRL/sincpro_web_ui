import {
  EditableTable,
  type EditColumn,
  NumberInput,
  Select,
  StatusDot,
  Switch,
  Tag,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { PRODUCT_NAMES } from "../support/erp";

interface Linea {
  id: string;
  producto: string;
  unidad: string;
  entrega: string;
  cantidad: number | "";
  descuento: number | "";
  urgente: boolean;
}

/** The unit comes from the product, not from the line: it is read, never typed. */
const UNIDAD: Record<string, string> = {
  "Implementación Odoo — módulo de ventas": "proyecto",
  "Soporte mensual (plan estándar)": "mes",
  "Licencia de usuario adicional": "usuario",
  "Capacitación presencial (por hora)": "hora",
  "Consultoría ISO 9001 — diagnóstico": "proyecto",
  "Desarrollo a medida (por hora)": "hora",
};

const PRODUCTOS = PRODUCT_NAMES.map((name) => ({ value: name, label: name }));

const ENTREGAS = [
  { value: "inmediata", label: "despacho inmediato" },
  { value: "programada", label: "entrega programada" },
  { value: "contra_pedido", label: "contra pedido" },
  { value: "sin_stock", label: "sin stock" },
];

const TONO_ENTREGA: Record<string, "good" | "info" | "warn" | "bad"> = {
  inmediata: "good",
  programada: "info",
  contra_pedido: "warn",
  sin_stock: "bad",
};

const linea = (
  id: string,
  producto: string,
  entrega: string,
  cantidad: number | "",
  descuento: number | "",
  urgente = false,
): Linea => ({
  id,
  producto,
  unidad: UNIDAD[producto] ?? "unidad",
  entrega,
  cantidad,
  descuento,
  urgente,
});

const INICIAL: Linea[] = [
  linea("1", "Implementación Odoo — módulo de ventas", "programada", 1, ""),
  linea("2", "Licencia de usuario adicional", "inmediata", 12, 10, true),
  linea("3", "Capacitación presencial (por hora)", "contra_pedido", 16, 5),
  linea("4", "Soporte mensual (plan estándar)", "inmediata", 12, ""),
];

const meta: Meta<typeof EditableTable> = {
  title: "3 · Componentes/Datos/Tabla editable",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Las líneas de un documento: las de un pedido de venta, las de un asiento contable. Se edita la FILA y no la celda — una línea es una unidad, y confirmarla de a pedazos deja estados que no existen.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditableTable>;

const nombreEntrega = (l: Linea) =>
  ENTREGAS.find((one) => one.value === l.entrega)?.label ?? l.entrega;

const vacio = <span className="text-line-strong">·</span>;

/**
 * **Tocá una fila.** Se pone en edición entera; el resto siguen en lectura.
 * `Escape` cancela —la fila vuelve a lo que decía—, `Enter` o tocar afuera
 * confirma. El tabulador recorre la fila sin cerrarla, que es como se carga de
 * verdad.
 *
 * **Con el teclado:** las filas son UNA parada del tabulador. Las flechas
 * recorren las líneas, `Enter` o `F2` abren la que tenés enfocada con el foco en
 * su primer control, y `Enter` o `Escape` la cierran devolviéndote a la fila,
 * para seguir con la flecha desde ahí.
 *
 * La papelera está escondida hasta que la fila esté señalada: una prendida en
 * cada una de veinte líneas es veinte veces la invitación a borrar sin querer.
 */
export const Lineas: Story = {
  render: () => {
    const [lines, setLineas] = useState<Linea[]>(INICIAL);
    const [siguiente, setSiguiente] = useState(5);

    const COLUMNS: EditColumn<Linea>[] = [
      {
        id: "producto",
        header: "producto",
        width: 300,
        render: (l) => <span className="text-ink">{l.producto || "—"}</span>,
        edit: (l, set) => (
          <Select
            aria-label="Producto"
            value={l.producto}
            options={PRODUCTOS}
            onChange={(v) => set({ ...l, producto: v, unidad: UNIDAD[v] ?? "unidad" })}
          />
        ),
      },
      {
        id: "unidad",
        header: "unidad",
        width: 110,
        /* Sin `edit`: la unidad sale del producto. Una columna de sólo lectura
           dentro de una fila editable es perfectamente normal. */
        render: (l) => <span className="text-muted">{l.unidad}</span>,
      },
      {
        id: "entrega",
        header: "entrega",
        width: 210,
        render: (l) => (
          <StatusDot tone={TONO_ENTREGA[l.entrega] ?? "neutral"} label={nombreEntrega(l)} />
        ),
        edit: (l, set) => (
          <Select
            aria-label="Entrega"
            value={l.entrega}
            options={ENTREGAS}
            onChange={(v) => set({ ...l, entrega: v })}
          />
        ),
      },
      {
        id: "cantidad",
        header: "cantidad",
        width: 120,
        numeric: true,
        render: (l) => (l.cantidad === "" ? vacio : l.cantidad.toLocaleString("es-BO")),
        edit: (l, set) => (
          <NumberInput
            aria-label="Cantidad"
            value={l.cantidad}
            step={1}
            onChange={(v) => set({ ...l, cantidad: v })}
          />
        ),
      },
      {
        id: "descuento",
        header: "descuento %",
        width: 130,
        numeric: true,
        render: (l) => (l.descuento === "" ? vacio : `${l.descuento} %`),
        edit: (l, set) => (
          <NumberInput
            aria-label="Descuento %"
            value={l.descuento}
            step={0.5}
            onChange={(v) => set({ ...l, descuento: v })}
          />
        ),
      },
      {
        id: "urgente",
        header: "urgente",
        width: 130,
        render: (l) => (l.urgente ? <Tag tone="warn">sí</Tag> : vacio),
        edit: (l, set) => (
          <Switch checked={l.urgente} onChange={(v) => set({ ...l, urgente: v })}>
            urgente
          </Switch>
        ),
      },
    ];

    const unidades = lines.reduce((a, l) => a + (l.cantidad === "" ? 0 : l.cantidad), 0);
    const conDescuento = lines.filter((l) => l.descuento !== "" && l.descuento > 0).length;

    return (
      <div className="flex flex-col gap-4 bg-ground p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-title font-semibold text-ink">Líneas del pedido S00142</h1>
          <p className="max-w-prose text-body text-muted">
            Qué se vende en este pedido. La unidad sale del producto y no se edita; el
            producto, cómo se entrega, la cantidad y el descuento, sí.
          </p>
        </header>

        <div className="max-w-[68rem] overflow-clip rounded-box border border-line bg-surface">
          <EditableTable
            rows={lines}
            columns={COLUMNS}
            getRowId={(l) => l.id}
            onChange={(id, next) =>
              setLineas((prev) => prev.map((l) => (l.id === id ? next : l)))
            }
            onRemove={(id) => setLineas((prev) => prev.filter((l) => l.id !== id))}
            onAdd={() => {
              setLineas((prev) => [
                ...prev,
                linea(String(siguiente), "", "inmediata", 1, ""),
              ]);
              setSiguiente((n) => n + 1);
            }}
            addLabel="Agregar un producto"
            totals={[
              `${lines.length} líneas`,
              null,
              null,
              unidades.toLocaleString("es-BO"),
              `${conDescuento} con descuento`,
              null,
            ]}
          />
        </div>
      </div>
    );
  },
};

/** Sin `onChange` la misma tabla es de sólo lectura: las mismas columnas, el
 *  mismo pie, y ni un control a la vista. Es lo que se dibuja cuando el pedido ya
 *  se facturó. */
export const Congelada: Story = {
  render: () => {
    const COLUMNS: EditColumn<Linea>[] = [
      {
        id: "producto",
        header: "producto",
        width: 300,
        render: (l) => <span className="text-ink">{l.producto}</span>,
      },
      {
        id: "unidad",
        header: "unidad",
        width: 110,
        render: (l) => <span className="text-muted">{l.unidad}</span>,
      },
      {
        id: "entrega",
        header: "entrega",
        width: 210,
        render: (l) => (
          <StatusDot tone={TONO_ENTREGA[l.entrega] ?? "neutral"} label={nombreEntrega(l)} />
        ),
      },
      {
        id: "cantidad",
        header: "cantidad",
        width: 120,
        numeric: true,
        render: (l) => (l.cantidad === "" ? vacio : l.cantidad.toLocaleString("es-BO")),
      },
    ];
    return (
      <div className="bg-ground p-8">
        <div className="max-w-[56rem] overflow-clip rounded-box border border-line bg-surface">
          <EditableTable rows={INICIAL} columns={COLUMNS} getRowId={(l) => l.id} />
        </div>
      </div>
    );
  },
};

/**
 * **Agrupada.** Editar y agrupar no se estorban: la fila que se edita sigue
 * siendo una fila, y el montón sólo decide dónde cae. Tocá una fila de adentro
 * de un montón y sigue abriéndose como siempre.
 *
 * La banda **respeta la cuadrícula**: el rótulo va en la primera columna y cada
 * total bajo la suya. Un total puesto en un rincón obliga a buscar de qué
 * columna es; alineado, la cuadrícula ya lo dice.
 */
export const Agrupada: Story = {
  render: () => {
    const [lines, setLineas] = useState<Linea[]>([
      ...INICIAL,
      linea("5", "Desarrollo a medida (por hora)", "programada", 40, 7.5, true),
      linea("6", "Consultoría ISO 9001 — diagnóstico", "programada", 1, ""),
    ]);

    const COLUMNS: EditColumn<Linea>[] = [
      {
        id: "producto",
        header: "producto",
        width: 300,
        render: (l) => <span className="text-ink">{l.producto}</span>,
        edit: (l, set) => (
          <Select
            aria-label="Producto"
            value={l.producto}
            options={PRODUCTOS}
            onChange={(v) => set({ ...l, producto: v, unidad: UNIDAD[v] ?? "unidad" })}
          />
        ),
      },
      {
        id: "cantidad",
        header: "cantidad",
        width: 120,
        numeric: true,
        render: (l) =>
          l.cantidad === "" ? <span className="text-muted">—</span> : l.cantidad,
      },
      {
        id: "descuento",
        header: "descuento %",
        width: 180,
        numeric: true,
        render: (l) =>
          l.descuento === "" ? <span className="text-muted">—</span> : `${l.descuento} %`,
      },
    ];

    return (
      <div className="bg-ground p-8">
        <div className="mx-auto max-w-[52rem] rounded-box border border-line bg-surface p-4">
          <EditableTable<Linea>
            rows={lines}
            columns={COLUMNS}
            getRowId={(l) => l.id}
            onChange={(id, next) =>
              setLineas((current) => current.map((l) => (l.id === id ? next : l)))
            }
            grouping={{
              levels: [{ field: "unidad" }],
              of: (l) => `por ${l.unidad}`,
            }}
            /* El total de una columna DENTRO de un montón lo calcula quien
               compone: sumar significa cosas distintas según el dominio, y un
               descuento se promedia, no se suma. */
            groupTotal={(column, rows) => {
              if (column.id !== "descuento") return null;
              const numeros = rows
                .map((l) => l.descuento)
                .filter((one): one is number => typeof one === "number");
              if (numeros.length === 0) return null;
              const media = numeros.reduce((a, b) => a + b, 0) / numeros.length;
              return (
                <span className="text-ink">
                  medio {media.toLocaleString("es-BO", { maximumFractionDigits: 2 })} %
                </span>
              );
            }}
          />
        </div>
      </div>
    );
  },
};

/**
 * **Con alto propio.** Un pedido de reposición con muchas líneas, dentro de una
 * caja de alto fijo: las líneas scrollean adentro y el encabezado queda pegado
 * arriba de la caja, sin taparlas. Sin `height`, la misma tabla crece con sus
 * líneas y el encabezado se pega a la página, debajo de la barra de la
 * aplicación y del riel del registro — es lo que decide `useScrollBox`, igual que
 * en `Table`.
 *
 * Scrolleá la caja y abrí una línea de abajo con el teclado: `Tab` hasta la
 * tabla, flecha `Fin` para la última, `F2`.
 */
export const ConAltoPropio: Story = {
  render: () => {
    const [lines, setLineas] = useState<Linea[]>(() =>
      Array.from({ length: 24 }, (_, i) => {
        const producto = PRODUCT_NAMES[i % PRODUCT_NAMES.length] ?? "";
        const entrega = ENTREGAS[i % ENTREGAS.length]?.value ?? "inmediata";
        return linea(String(i + 1), producto, entrega, (i * 7) % 40, i % 5 === 0 ? 5 : "");
      }),
    );

    const COLUMNS: EditColumn<Linea>[] = [
      {
        id: "producto",
        header: "producto",
        width: 320,
        render: (l) => <span className="text-ink">{l.producto}</span>,
        edit: (l, set) => (
          <Select
            aria-label="Producto"
            value={l.producto}
            options={PRODUCTOS}
            onChange={(v) => set({ ...l, producto: v, unidad: UNIDAD[v] ?? "unidad" })}
          />
        ),
      },
      {
        id: "entrega",
        header: "entrega",
        width: 210,
        render: (l) => (
          <StatusDot tone={TONO_ENTREGA[l.entrega] ?? "neutral"} label={nombreEntrega(l)} />
        ),
      },
      {
        id: "cantidad",
        header: "cantidad",
        width: 140,
        numeric: true,
        render: (l) => (l.cantidad === "" ? vacio : l.cantidad.toLocaleString("es-BO")),
        edit: (l, set) => (
          <NumberInput
            aria-label="Cantidad"
            value={l.cantidad}
            step={1}
            onChange={(v) => set({ ...l, cantidad: v })}
          />
        ),
      },
    ];

    return (
      <div className="bg-ground p-8">
        <div className="max-w-[48rem] overflow-clip rounded-box border border-line bg-surface">
          <EditableTable
            rows={lines}
            columns={COLUMNS}
            getRowId={(l) => l.id}
            height="20rem"
            onChange={(id, next) =>
              setLineas((prev) => prev.map((l) => (l.id === id ? next : l)))
            }
          />
        </div>
      </div>
    );
  },
};

/**
 * **En el teléfono.** Debajo de `--container-handheld` (40rem) de su propia caja, cada fila
 * es una tarjeta: la primera columna arriba, una línea de detalle callada debajo y, a la
 * derecha, la cifra de la fila. Cada columna dice dónde va (`stack`) y cómo se lee en el
 * detalle (`brief`); lo que no dice nada toma el valor por defecto — la primera columna es el
 * título, la última numérica la cifra, el resto «encabezado valor» en el detalle.
 *
 * Acá la cifra es la cantidad (`stack: "amount"`), la entrega va arriba a la derecha
 * (`trail`), el descuento se dice «desc. 10 %» y sólo cuando hay, y la unidad queda con su
 * lectura por defecto. Tocá una tarjeta: se abre con sus controles debajo, cada uno con el
 * nombre de la columna, y la papelera aparece en la que estás editando. El teclado es el
 * mismo que en la tabla: una parada, flechas, `Enter`/`F2`, `Escape` la deja como estaba.
 */
export const EnElTelefono: Story = {
  name: "En el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => {
    const [lines, setLineas] = useState<Linea[]>(INICIAL);
    const [siguiente, setSiguiente] = useState(5);

    const COLUMNS: EditColumn<Linea>[] = [
      {
        id: "producto",
        header: "producto",
        render: (l) => <span className="font-medium text-ink">{l.producto || "—"}</span>,
        edit: (l, set) => (
          <Select
            aria-label="Producto"
            value={l.producto}
            options={PRODUCTOS}
            onChange={(v) => set({ ...l, producto: v, unidad: UNIDAD[v] ?? "unidad" })}
          />
        ),
      },
      {
        id: "entrega",
        header: "entrega",
        stack: "trail",
        render: (l) => (
          <StatusDot tone={TONO_ENTREGA[l.entrega] ?? "neutral"} label={nombreEntrega(l)} />
        ),
        edit: (l, set) => (
          <Select
            aria-label="Entrega"
            value={l.entrega}
            options={ENTREGAS}
            onChange={(v) => set({ ...l, entrega: v })}
          />
        ),
      },
      {
        id: "unidad",
        header: "unidad",
        render: (l) => l.unidad,
      },
      {
        id: "cantidad",
        header: "cantidad",
        numeric: true,
        stack: "amount",
        render: (l) => (l.cantidad === "" ? vacio : l.cantidad.toLocaleString("es-BO")),
        edit: (l, set) => (
          <NumberInput
            aria-label="Cantidad"
            value={l.cantidad}
            step={1}
            onChange={(v) => set({ ...l, cantidad: v })}
          />
        ),
      },
      {
        id: "descuento",
        header: "descuento %",
        numeric: true,
        render: (l) => (l.descuento === "" ? vacio : `${l.descuento} %`),
        brief: (l) =>
          l.descuento === "" || l.descuento === 0
            ? null
            : `desc. ${l.descuento.toLocaleString("es-BO")} %`,
        edit: (l, set) => (
          <NumberInput
            aria-label="Descuento %"
            value={l.descuento}
            step={0.5}
            onChange={(v) => set({ ...l, descuento: v })}
          />
        ),
      },
    ];

    return (
      <div className="flex min-h-screen flex-col gap-3 bg-ground p-3">
        <h1 className="px-1 text-lead font-semibold text-ink">Líneas del pedido S00142</h1>
        <div className="overflow-clip rounded-box border border-line bg-surface py-1">
          <EditableTable
            rows={lines}
            columns={COLUMNS}
            getRowId={(l) => l.id}
            onChange={(id, next) =>
              setLineas((prev) => prev.map((l) => (l.id === id ? next : l)))
            }
            onRemove={(id) => setLineas((prev) => prev.filter((l) => l.id !== id))}
            onAdd={() => {
              setLineas((prev) => [
                ...prev,
                linea(String(siguiente), "", "inmediata", 1, ""),
              ]);
              setSiguiente((n) => n + 1);
            }}
            addLabel="Agregar un producto"
          />
        </div>
      </div>
    );
  },
};
