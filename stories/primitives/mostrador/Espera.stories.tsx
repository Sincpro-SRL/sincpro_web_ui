import { Elapsed } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

/**
 * Context: **cuánto lleva esperando** — un ticket de cocina, un caso con SLA, un pedido en el
 * mostrador. Se lee la EDAD y no la hora de llegada, y se pinta por dos umbrales del dominio
 * (en minutos): ámbar pasado `warnAfter`, rojo pasado `badAfter`. El reloj del ícono y la cifra
 * escrita hacen que el color nunca vaya solo. Corre en vivo con un solo reloj compartido; en
 * el servidor no dibuja nada.
 */
const meta: Meta = {
  title: "2 · Primitivas/Mostrador/Espera · el tiempo que lleva",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/* A fixed «now», so the story (and its screenshot) reads the same every time. */
const NOW = Date.UTC(2026, 10, 20, 15, 0, 0);
const ago = (minutes: number, seconds = 0) => NOW - minutes * 60_000 - seconds * 1000;

/** **Tres esperas, tres tonos.** Umbrales de 10 y 20 minutos. */
export const Umbrales: Story = {
  render: () => (
    <dl className="grid max-w-xs grid-cols-2 gap-x-6 gap-y-2 text-meta">
      <dt className="text-muted">Mesa 4</dt>
      <dd>
        <Elapsed since={ago(4, 5)} now={NOW} warnAfter={10} badAfter={20} />
      </dd>
      <dt className="text-muted">Kiosco · 117</dt>
      <dd>
        <Elapsed since={ago(12, 40)} now={NOW} warnAfter={10} badAfter={20} />
      </dd>
      <dt className="text-muted">Delivery</dt>
      <dd>
        <Elapsed since={ago(23)} now={NOW} warnAfter={10} badAfter={20} />
      </dd>
      <dt className="text-muted">Sin umbrales</dt>
      <dd>
        <Elapsed since={ago(75, 3)} now={NOW} />
      </dd>
    </dl>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("4:05")).toBeVisible();
    await expect(canvas.getByText("23:00").closest("[data-tone]")).toHaveAttribute(
      "data-tone",
      "bad",
    );
    await expect(canvas.getByText("1:15:03")).toBeVisible();
  },
};

/** **En vivo**: sin `now`, corre con el reloj. */
export const EnVivo: Story = {
  name: "En vivo",
  render: function Render() {
    return <Elapsed since={Date.now() - 9 * 60_000 - 50_000} warnAfter={10} badAfter={20} />;
  },
};
