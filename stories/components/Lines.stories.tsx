import { LineItems, NumberInput, TextInput, ToastProvider } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

import { type InvoiceLine, money } from "../support/erp";
import {
  blankLine,
  DRAFT_LINES,
  lineColumns,
  lineEditor,
  lineIsValid,
  lineTotals,
  MANY_LINES,
  restoreAt,
} from "../support/erp-lines";

/**
 * Context: the one2many of a record — the lines of an invoice, of a sales order. A count and
 * a search above (the search only when there are enough lines to need one), the lines edited
 * in place or in a popup editor, and the totals apart, on the right. Removing a line does not
 * ask: it happens and the notice offers «Deshacer».
 */
const meta: Meta<typeof LineItems> = {
  title: "3 · Componentes/Datos/Líneas · el detalle de un documento",
  component: LineItems,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Las líneas dentro de un registro (el one2many de Odoo): contarlas, buscarlas, editarlas en el lugar o en un editor emergente, quitarlas con deshacer, y el total abajo a la derecha.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof LineItems>;

function Sheet({ children, phone = false }: { children: ReactNode; phone?: boolean }) {
  return (
    <ToastProvider>
      <div className={`min-h-screen bg-ground ${phone ? "p-3" : "p-8"}`}>
        <div
          className={`mx-auto max-w-(--container-sheet) rounded-box border border-line bg-surface ${
            phone ? "p-3" : "p-6"
          }`}
        >
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}

const PHONE = { viewport: { value: "telefono", isRotated: false } };

const CONTEXT = { kind: "factura", label: "Borrador · Distribuidora Andina S.R.L." };

/** The lines a story owns, with every callback wired the way a record wires them. */
function useLines(initial: readonly InvoiceLine[]) {
  const [lines, setLines] = useState<readonly InvoiceLine[]>(initial);
  return {
    lines,
    onChange: (id: string, next: InvoiceLine) =>
      setLines((all) => all.map((l) => (l.id === id ? next : l))),
    onAdd: (line: InvoiceLine) => setLines((all) => [...all, line]),
    onRemove: (id: string) => setLines((all) => all.filter((l) => l.id !== id)),
    onRestore: (line: InvoiceLine, index: number) =>
      setLines((all) => restoreAt(all, line, index)),
  };
}

/**
 * **Un borrador.** Tocá una fila para cambiar la cantidad o el descuento ahí mismo; el lápiz
 * («Editar la línea») abre la línea entera en un editor: producto, cantidad, precio y
 * descuento. Con el teclado: Tab hasta el lápiz, Enter, editá, Enter guarda y el foco vuelve
 * a la fila. La papelera quita la línea al instante, y el aviso ofrece deshacer.
 */
export const Borrador: Story = {
  render: function Render() {
    const state = useLines(DRAFT_LINES);
    return (
      <Sheet>
        <LineItems
          {...state}
          columns={lineColumns({ pictures: true })}
          getLineId={(l) => l.id}
          lineLabel={(l) => l.product || "línea nueva"}
          newLine={blankLine}
          editor={lineEditor}
          isValid={lineIsValid}
          context={CONTEXT}
          totals={lineTotals(state.lines)}
        />
      </Sheet>
    );
  },
};

/**
 * **Agregar en línea.** «Agregar una línea» está debajo de la grilla y la línea nueva aparece
 * ahí, ya abierta, con el cursor en el producto: se escribe el código, se elige, `Tab` a la
 * cantidad, `Tab` al descuento, y `Tab` otra vez empieza la siguiente — veinte líneas de un
 * pedido en papel sin tocar el mouse. Una línea agregada y dejada en blanco se va sola, y
 * `Escape` la descarta. El lápiz sigue abriendo la línea entera en el editor.
 */
export const EnLinea: Story = {
  render: function Render() {
    const state = useLines(DRAFT_LINES);
    return (
      <Sheet>
        <LineItems
          {...state}
          columns={lineColumns({ productInCell: true })}
          getLineId={(l) => l.id}
          lineLabel={(l) => l.product || "línea nueva"}
          newLine={blankLine}
          adding="inline"
          editor={lineEditor}
          isValid={lineIsValid}
          context={CONTEXT}
          totals={lineTotals(state.lines)}
        />
      </Sheet>
    );
  },
};

/**
 * **Publicada.** La misma factura cuando ya no puede cambiar: sin agregar, sin editar, sin
 * quitar — sólo las líneas y el total.
 */
export const Publicada: Story = {
  render: () => (
    <Sheet>
      <LineItems
        mode="read"
        lines={DRAFT_LINES}
        columns={lineColumns({ pictures: true })}
        getLineId={(l) => l.id}
        totals={lineTotals(DRAFT_LINES)}
      />
    </Sheet>
  ),
};

/**
 * **Una factura nueva.** Todavía no hay líneas: se dice, con la salida al lado. «Agregar una
 * línea» abre el editor con una línea en blanco; «Listo» sin producto marca el campo — recién
 * ahí.
 */
export const Nueva: Story = {
  render: function Render() {
    const state = useLines([]);
    return (
      <Sheet>
        <LineItems
          {...state}
          columns={lineColumns()}
          getLineId={(l) => l.id}
          lineLabel={(l) => l.product || "línea nueva"}
          newLine={blankLine}
          editor={lineEditor}
          isValid={lineIsValid}
          totals={lineTotals(state.lines)}
        />
      </Sheet>
    );
  },
};

/**
 * **Muchas líneas.** Con más de ocho aparece la búsqueda: escribí «impresora» o un código
 * («HW-») y el contador dice cuántas de todas quedan.
 */
export const MuchasLineas: Story = {
  name: "Muchas líneas",
  render: function Render() {
    const state = useLines(MANY_LINES);
    return (
      <Sheet>
        <LineItems
          {...state}
          columns={lineColumns({ pictures: true })}
          getLineId={(l) => l.id}
          lineLabel={(l) => l.product || "línea nueva"}
          newLine={blankLine}
          editor={lineEditor}
          isValid={lineIsValid}
          context={CONTEXT}
          totals={lineTotals(state.lines)}
        />
      </Sheet>
    );
  },
};

/**
 * **En el teléfono.** El mismo borrador a 390 px. Una tabla de cinco columnas mostraba el
 * producto y escondía el resto detrás de un scroll lateral que nadie descubre — justo el
 * importe, el número que se viene a mirar. Debajo de `--container-handheld` cada línea es una
 * tarjeta: el producto arriba, «3 × Bs. 1.450,00 · desc. 5 %» debajo, callado, y el importe a
 * la derecha, en tinta. Tocá una línea (o `Enter` sobre ella) y se abre el editor, que en el
 * teléfono es una hoja desde abajo; «Quitar la línea» está ahí adentro.
 */
export const EnElTelefono: Story = {
  name: "En el teléfono",
  globals: PHONE,
  render: function Render() {
    const state = useLines(DRAFT_LINES);
    return (
      <Sheet phone>
        <LineItems
          {...state}
          columns={lineColumns({ pictures: true })}
          getLineId={(l) => l.id}
          lineLabel={(l) => l.product || "línea nueva"}
          newLine={blankLine}
          editor={lineEditor}
          isValid={lineIsValid}
          context={CONTEXT}
          totals={lineTotals(state.lines)}
        />
      </Sheet>
    );
  },
};

/**
 * **Publicada, en el teléfono.** Sin editor ni acciones: las tarjetas se leen y no se tocan
 * — no hay parada de tabulador sobre ellas, no hay nada que hacer.
 */
export const PublicadaEnElTelefono: Story = {
  name: "Publicada · en el teléfono",
  globals: PHONE,
  render: () => (
    <Sheet phone>
      <LineItems
        mode="read"
        lines={DRAFT_LINES}
        columns={lineColumns()}
        getLineId={(l) => l.id}
        totals={lineTotals(DRAFT_LINES)}
      />
    </Sheet>
  ),
};

type Renglon = {
  id: string;
  tipo: "line" | "section" | "note";
  texto: string;
  cuenta: string;
  cantidad: number;
  precio: number;
};

const renglon = (
  id: string,
  texto: string,
  cantidad: number,
  precio: number,
  cuenta = "4.1.01 Ventas de equipos",
): Renglon => ({ id, tipo: "line", texto, cuenta, cantidad, precio });
const seccion = (id: string, texto: string): Renglon => ({
  id,
  tipo: "section",
  texto,
  cuenta: "",
  cantidad: 0,
  precio: 0,
});
const nota = (id: string, texto: string): Renglon => ({
  ...seccion(id, texto),
  tipo: "note",
});

const COTIZACION: readonly Renglon[] = [
  seccion("s1", "Equipos"),
  renglon("1", "Impresora térmica de tickets 80 mm", 3, 1450),
  renglon("2", "Lector de código de barras inalámbrico", 3, 780),
  renglon("3", "Cajón de dinero con apertura automática", 3, 690),
  nota("n1", "Los equipos se entregan configurados y con un año de garantía."),
  seccion("s2", "Instalación y capacitación"),
  renglon("4", "Instalación en sucursal (por punto de venta)", 3, 450, "4.1.02 Servicios"),
  renglon("5", "Capacitación presencial (por hora)", 6, 420, "4.1.02 Servicios"),
  seccion("s3", "Soporte"),
  renglon("6", "Soporte mensual (plan estándar)", 12, 1800, "4.1.02 Servicios"),
  nota("n2", "El soporte se factura mes a mes desde la puesta en marcha."),
];

const importe = (r: Renglon) => r.cantidad * r.precio;
const suma = (rs: readonly Renglon[]) => money(rs.reduce((a, r) => a + importe(r), 0));

/**
 * **Con secciones y notas.** Una cotización de cuarenta líneas se lee por partes: «Equipos»,
 * «Instalación», «Soporte». Una SECCIÓN encabeza las líneas de abajo hasta la siguiente y dice
 * cuánto suman; una NOTA es una frase entre líneas. Las dos se escriben en el lugar —«Agregar
 * una sección», «Agregar una nota», abajo de la grilla—, no cuentan como líneas, y al buscar
 * sólo quedan líneas.
 *
 * **Columnas opcionales.** La cuenta contable arranca escondida: el menú «columnas» la
 * muestra, como en las listas. Una línea real tiene diez campos y una pantalla muestra cinco.
 */
export const ConSecciones: Story = {
  render: function Render() {
    const [lines, setLines] = useState<readonly Renglon[]>(COTIZACION);
    const [siguiente, setSiguiente] = useState(100);
    const nuevo = (tipo: Renglon["tipo"]) => () => {
      setSiguiente((n) => n + 1);
      return tipo === "line"
        ? renglon(`r${siguiente}`, "", 1, 0)
        : { ...seccion(`r${siguiente}`, ""), tipo };
    };
    return (
      <Sheet>
        <LineItems<Renglon>
          lines={lines}
          getLineId={(r) => r.id}
          lineLabel={(r) => r.texto || "línea nueva"}
          adding="inline"
          onChange={(id, next) => setLines((all) => all.map((r) => (r.id === id ? next : r)))}
          onAdd={(r) => setLines((all) => [...all, r])}
          onRemove={(id) => setLines((all) => all.filter((r) => r.id !== id))}
          onRestore={(r, index) => setLines((all) => restoreAt(all, r, index))}
          newLine={nuevo("line")}
          structure={{
            kind: (r) => r.tipo,
            text: (r) => r.texto,
            withText: (r, texto) => ({ ...r, texto }),
            newSection: nuevo("section"),
            newNote: nuevo("note"),
          }}
          columns={[
            {
              id: "texto",
              header: "Descripción",
              value: (r) => r.texto,
              edit: (r, set) => (
                <TextInput
                  aria-label="Descripción"
                  value={r.texto}
                  onChange={(texto) => set({ ...r, texto })}
                />
              ),
            },
            {
              id: "cuenta",
              header: "Cuenta",
              value: (r) => r.cuenta,
              optional: true,
              defaultHidden: true,
            },
            {
              id: "cantidad",
              header: "Cantidad",
              numeric: true,
              width: 110,
              value: (r) => r.cantidad,
              edit: (r, set) => (
                <NumberInput
                  aria-label="Cantidad"
                  value={r.cantidad}
                  min={0}
                  onChange={(v) => set({ ...r, cantidad: v === "" ? 0 : v })}
                />
              ),
            },
            {
              id: "precio",
              header: "Precio unit.",
              numeric: true,
              width: 140,
              value: (r) => r.precio,
              cell: (r) => money(r.precio),
              optional: true,
            },
            {
              id: "importe",
              header: "Importe",
              numeric: true,
              width: 150,
              value: (r) => importe(r),
              cell: (r) => money(importe(r)),
              subtotal: suma,
              stack: "amount",
            },
          ]}
          totals={[
            {
              label: "Total",
              value: suma(lines.filter((r) => r.tipo === "line")),
              total: true,
            },
          ]}
        />
      </Sheet>
    );
  },
};
