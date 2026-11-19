import {
  Pager,
  SmartButton,
  SmartButtons,
  type Stage,
  StatusBar,
  type StatusLook,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookOpen, CreditCard, RotateCcw, Truck } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: **las piezas del riel y sus formas, lado a lado** — la barra de estado, el paginador y
 * los contadores. El estilo de la aplicación elige una de cada (`RecordStyleProvider`): el
 * tradicional la pista, el paginador quieto y las cajas; el moderno la barra de progreso, la
 * píldora azul y los contadores como enlaces. Acá se comparan para elegir.
 */
const meta: Meta = {
  title: "4 · Vistas/Registro/Riel · estado, paginador y contadores",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const STAGES: Stage[] = [
  { id: "draft", label: "Borrador" },
  { id: "posted", label: "Publicada" },
  { id: "paid", label: "Pagada" },
];

const LOOKS: { look: StatusLook; name: string; note: string }[] = [
  { look: "track", name: "Pista", note: "la de Odoo — el estilo tradicional" },
  {
    look: "progress",
    name: "Progreso",
    note: "cuánto falta, de un vistazo — el estilo moderno",
  },
  { look: "steps", name: "Pasos", note: "puntos unidos por una línea" },
  { look: "pill", name: "Ficha", note: "una sola, para donde no hay lugar" },
];

function Row({
  name,
  note,
  children,
}: {
  name: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line py-3">
      <div className="w-56 shrink-0">
        <p className="text-meta font-semibold text-ink">{name}</p>
        <p className="text-micro text-muted">{note}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * **La barra de estado, en sus cuatro formas** — la misma factura publicada, y la misma
 * anulada en el SIAT (`failed`). La de abajo de cada una se puede ELEGIR: no avanza la factura,
 * elige de qué etapa se habla.
 */
export const BarraDeEstado: Story = {
  name: "Barra de estado · cuatro formas",
  render: function Render() {
    const [viewed, setViewed] = useState("posted");
    return (
      <div className="max-w-4xl">
        {LOOKS.map(({ look, name, note }) => (
          <Row key={look} name={name} note={note}>
            <StatusBar stages={STAGES} current="posted" look={look} layout="trail" />
            <StatusBar stages={STAGES} current="posted" look={look} layout="trail" failed />
            <StatusBar
              stages={STAGES}
              current="posted"
              look={look}
              layout="trail"
              selected={viewed}
              onSelect={setViewed}
            />
          </Row>
        ))}
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Every form says where the record is, to a screen reader too.
    await expect(canvas.getAllByRole("list", { name: "Estado" }).length).toBeGreaterThan(0);
    await expect(canvas.getAllByRole("status", { name: /Estado: Publicada/ }).length).toBe(2);
    // The chip that unfolds says what it shows: its name holds the stage and the position.
    await expect(
      canvas.getByRole("button", { name: "Estado: Publicada 2/3" }),
    ).toBeInTheDocument();
  },
};

/**
 * **El paginador**: quieto (el tradicional) o como una píldora azul translúcida (el moderno),
 * que se lee como el par de las migas en la línea. Los dos responden a Alt+P y Alt+N.
 */
export const Paginador: Story = {
  render: function Render() {
    const [at, setAt] = useState(12);
    const move = { onPrev: () => setAt((n) => n - 1), onNext: () => setAt((n) => n + 1) };
    return (
      <div className="max-w-4xl">
        <Row name="Quieto" note="el tradicional">
          <Pager index={at} total={80} {...move} />
        </Row>
        <Row name="Píldora" note="el moderno — Alt+P / Alt+N">
          <Pager index={at} total={80} look="pill" keys={false} {...move} />
        </Row>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.keyboard("{Alt>}n{/Alt}");
    await expect(await canvas.findAllByText("13 / 80")).toHaveLength(2);
  },
};

/**
 * **Los contadores**: cajas (el tradicional) o enlaces (el moderno) — el número en una pastilla,
 * el nombre y una «›» que dice que lleva a otro lugar. En cero se apagan y pierden la «›».
 */
export const Contadores: Story = {
  render: () => {
    const links = [
      { icon: CreditCard, count: 2, label: "pagos" },
      { icon: BookOpen, count: 1, label: "asiento" },
      { icon: Truck, count: 2, label: "entregas" },
      { icon: RotateCcw, count: 0, label: "devoluciones" },
    ];
    return (
      <div className="max-w-4xl">
        {(["box", "link"] as const).map((look) => (
          <Row
            key={look}
            name={look === "box" ? "Cajas" : "Enlaces"}
            note={look === "box" ? "el tradicional" : "el moderno"}
          >
            <SmartButtons>
              {links.map((one) => (
                <SmartButton
                  key={one.label}
                  icon={one.icon}
                  count={one.count}
                  label={one.label}
                  layout="inline"
                  look={look}
                  {...(one.count === 0 ? {} : { onClick: () => {} })}
                />
              ))}
            </SmartButtons>
          </Row>
        ))}
      </div>
    );
  },
};
