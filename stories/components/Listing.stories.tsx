import { GroupHeader, Row, Tag } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, Receipt, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { expect } from "storybook/test";

/**
 * Context: acá van las PIEZAS de una lista, cada una sola. La lista armada vive
 * en `4 · Vistas/Lista`, y en un solo lugar.
 */

const ITEMS = [
  {
    id: "1",
    n: "S00142 · Importadora y Exportadora del Oriente Boliviano Ltda.",
    t: "pedido",
    m: "4 líneas · 28/10/2026 · Bs. 58.000,00",
    i: ShoppingCart,
  },
  {
    id: "2",
    n: "S00139 · Clínica San Gabriel S.A.",
    t: "facturado",
    m: "3 líneas · 22/10/2026 · Bs. 25.620,00",
    i: Receipt,
  },
  {
    id: "3",
    n: "S00140 · Ferretería El Progreso",
    t: "cotización",
    m: "1 línea · 26/10/2026 · Bs. 1.800,00",
    i: FileText,
  },
];

const TONE = { pedido: "info", facturado: "good", cotización: "neutral" } as const;
const meta = {
  title: "3 · Componentes/Datos/Filas · la presentación angosta",
  component: Row,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Las piezas que arman una lista, cada una sola. La lista entera está en `4 · Vistas/Lista`.",
      },
    },
  },
} satisfies Meta<typeof Row>;

export default meta;
type Story = StoryObj<typeof meta>;

function Caja({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="font-mono text-micro tracking-[0.1em] text-muted uppercase">
        {label}
      </figcaption>
      <div className="rounded-box border border-line bg-surface">{children}</div>
    </figure>
  );
}

/**
 * La fila. **El nombre abre y el cuerpo mira** — dos blancos distintos en vez de
 * dos tiempos sobre el mismo, así que ninguno espera nada. Sin línea entre
 * filas: lo que separa es el espacio, y el hover dice cuál está bajo el cursor.
 */
export const OneRow: Story = {
  args: { name: "S00142" },
  render: () => {
    const [elegidas, setElegidas] = useState<string[]>(["2"]);
    return (
      <div className="flex flex-col gap-6 bg-ground p-8">
        <Caja label="sola, con selección">
          {ITEMS.map((d) => (
            <Row
              key={d.id}
              icon={d.i}
              name={d.n}
              meta={d.m}
              tags={<Tag tone={TONE[d.t as keyof typeof TONE]}>{d.t}</Tag>}
              selected={elegidas.includes(d.id)}
              onSelectedChange={() =>
                setElegidas((e) =>
                  e.includes(d.id) ? e.filter((x) => x !== d.id) : [...e, d.id],
                )
              }
              onOpen={() => {}}
              onPeek={() => {}}
            />
          ))}
        </Caja>

        <Caja label="con sus entregas colgando">
          <Row
            icon={ShoppingCart}
            name="S00141 · Distribuidora Andina S.R.L."
            meta="2 líneas · 27/10/2026 · Bs. 14.300,00"
            tags={<Tag tone="info">pedido</Tag>}
            onOpen={() => {}}
            onPeek={() => {}}
          >
            <p className="py-0.5 text-micro text-muted tabular-nums">
              WH/OUT/00229 → entregada el 24/10 · 12 unidades
            </p>
            <p className="py-0.5 text-micro text-muted tabular-nums">
              WH/OUT/00230 → atrasada: prometida para el 20/10
            </p>
          </Row>
        </Caja>
      </div>
    );
  },
};

/** El encabezado de un grupo. La agrupación es del CONJUNTO, no de la
 *  presentación: por eso vive acá y no adentro de la tabla. */
export const Grupos: Story = {
  args: { name: "" },
  render: () => (
    <div className="bg-ground p-8">
      <Caja label="abierto y cerrado">
        <GroupHeader label="pedido" count={3} onToggle={() => {}} />
        {ITEMS.slice(0, 1).map((d) => (
          <Row key={d.id} icon={d.i} name={d.n} meta={d.m} onPeek={() => {}} />
        ))}
        <GroupHeader label="cotización" count={12} open={false} onToggle={() => {}} />
        <GroupHeader label="sin agrupar" />
      </Caja>
    </div>
  ),
};

/* quipu's dashboard: the shop's orders, one with a short meta and one with a long one — the
   pair that, before, laid out two different ways in the same list. */
const COMPRAS = [
  { id: "c1", n: "Pedido 0007 · Ana Gutiérrez", m: "2 ítems · Bs 120,00", t: "por enviar" },
  {
    id: "c2",
    n: "Pedido 0008 · Colegio de Auditores de Oruro",
    m: "14 ítems · 12/11/2026 · retiro en oficina · Bs 880,00",
    t: "pagado",
  },
  { id: "c3", n: "Pedido 0009 · Luis Mamani", m: "1 ítem · Bs 45,00", t: "por enviar" },
] as const;

const ANCHOS = [390, 1280, 2000] as const;

/**
 * **Una sola estructura para cada fila, en cualquier ancho.** El nombre, el `meta` debajo y las
 * fichas al final. Antes la fila decidía sola: con un `meta` corto lo ponía a la DERECHA del
 * nombre y con uno largo DEBAJO — en la misma lista. Y en un espacio de 2000 px el `meta` y la
 * ficha quedaban a 1300 px del nombre. Ahora el texto tiene un ancho de lectura y las fichas
 * van justo después; en un ancho angosto bajan a una línea propia, en TODAS las filas.
 */
export const MismaEstructura: Story = {
  name: "Una estructura · en 390, 1280 y 2000 px",
  args: { name: "" },
  render: () => (
    <div className="flex flex-col gap-6 overflow-x-auto bg-ground p-8">
      {ANCHOS.map((ancho) => (
        <div key={ancho} data-ancho={ancho} style={{ width: ancho }}>
          <Caja label={`${ancho} px`}>
            {COMPRAS.map((c) => (
              <Row
                key={c.id}
                icon={ShoppingCart}
                name={c.n}
                meta={c.m}
                tags={<Tag tone={c.t === "pagado" ? "good" : "warn"}>{c.t}</Tag>}
                onOpen={() => {}}
                onPeek={() => {}}
              />
            ))}
          </Caja>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const ancho of ANCHOS) {
      const caja = canvasElement.querySelector<HTMLElement>(`[data-ancho="${ancho}"]`)!;
      const filas = [...caja.querySelectorAll<HTMLElement>('[data-slot="row"]')];
      await expect(filas).toHaveLength(COMPRAS.length);
      const medidas = filas.map((fila) => {
        const texto = fila.querySelector<HTMLElement>('[data-slot="row-text"]')!;
        const [nombre, meta] = [...texto.children].map((el) => el.getBoundingClientRect());
        return {
          texto: texto.getBoundingClientRect(),
          nombre: nombre!,
          meta: meta!,
          fichas: fila
            .querySelector<HTMLElement>('[data-slot="row-tags"]')!
            .getBoundingClientRect(),
        };
      });
      for (const m of medidas) {
        // The meta is UNDER the name, short or long.
        await expect(m.meta.top).toBeGreaterThanOrEqual(m.nombre.bottom - 1);
        await expect(Math.abs(m.meta.left - m.nombre.left)).toBeLessThan(1);
      }
      // Every row puts its tags at the same place.
      const lefts = medidas.map((m) => Math.round(m.fichas.left));
      await expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(1);
      const primera = medidas[0]!;
      if (ancho === 390) {
        // Narrow: the tags take a line of their own, under the meta — in every row.
        for (const m of medidas)
          await expect(m.fichas.top).toBeGreaterThanOrEqual(m.meta.bottom - 1);
      } else {
        // Wide: beside the text, and close to it — the text stops at its reading width.
        for (const m of medidas) await expect(m.fichas.top).toBeLessThan(m.meta.bottom);
        const lectura = parseFloat(getComputedStyle(document.documentElement).fontSize) * 40;
        await expect(primera.fichas.left - primera.texto.left).toBeLessThanOrEqual(
          lectura + 16,
        );
      }
    }
  },
};
