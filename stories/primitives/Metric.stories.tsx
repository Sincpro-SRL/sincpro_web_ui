import { Metric, Metrics } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Users } from "lucide-react";
import { useState } from "react";
import { expect } from "storybook/test";

/**
 * Context: **la cifra que se lee en dos segundos, y que filtra.** Arriba de una lista o de un
 * tablero, cada `Metric` es un número grande con su rótulo; con `onClick` acota la lista, y
 * encendida pinta su tono. Los números llegan de a uno: mientras uno se lee la caja guarda su
 * tamaño (`loading`), y uno que no se pudo contar dice «—», que no es cero.
 */
const meta: Meta<typeof Metric> = {
  title: "2 · Primitivas/Metric · la cifra que filtra",
  component: Metric,
  parameters: {
    docs: {
      description: {
        component:
          "La cifra arriba, el rótulo abajo, la variación contra un período nombrado (`change`). Con `onClick` es un botón que acota la lista y `active` dice cuál está aplicado. `loading` guarda el tamaño mientras se lee; sin `value` dice «—».",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Metric>;

/** **El tablero de un colegio profesional.** Las cuotas vencidas acotan el padrón (tocá la
 *  tarjeta); las inscripciones del mes todavía se están leyendo; los pagos del portal no se
 *  pudieron contar. */
export const Cifras: Story = {
  render: function Render() {
    const [vencidas, setVencidas] = useState(false);
    return (
      <Metrics>
        <Metric
          value={412}
          label="socios al día"
          icon={Users}
          change={{ by: 0.06, against: "2025" }}
        />
        <Metric
          value={37}
          label="cuotas vencidas"
          tone="bad"
          active={vencidas}
          onClick={() => setVencidas((v) => !v)}
          change={{ by: 0.12, against: "el mes pasado", better: "down" }}
        />
        <Metric label="inscripciones del mes" loading />
        <Metric label="pagos del portal" />
      </Metrics>
    );
  },
  play: async ({ canvasElement }) => {
    const leyendo = canvasElement.querySelector('[aria-busy="true"]');
    await expect(leyendo?.textContent).toContain("inscripciones del mes");
    // Not counted is «—», never «0».
    await expect(canvasElement.textContent).toContain("—");
  },
};

/** **Cuántos y cuánto.** Un contador del tablero de quipu: seis mensualidades por revisar, y
 *  lo que suman. El monto va debajo del rótulo (`detail`), apagado: la cifra de arriba sigue
 *  siendo la que se compara entre tarjetas. Mientras se lee, el monto no aparece — junto a un
 *  esqueleto se leería como la cifra. */
export const ConMonto: Story = {
  render: function Render() {
    const [activa, setActiva] = useState(false);
    return (
      <Metrics>
        <Metric
          value={6}
          label="Mensualidades por revisar"
          detail="Bs 1.000,00"
          tone="warn"
          active={activa}
          onClick={() => setActiva((a) => !a)}
        />
        <Metric value={14} label="Compras de la tienda" detail="Bs 3.240,50" />
        <Metric label="Pagos del portal" detail="Bs 980,00" loading />
      </Metrics>
    );
  },
  play: async ({ canvasElement }) => {
    const revisar = canvasElement.querySelector("button[data-ui='metric']");
    await expect(revisar?.textContent).toContain("Bs 1.000,00");
    /* The amount is part of what a screen reader hears for the card that only informs. */
    const compras = canvasElement.querySelector("div[data-ui='metric']");
    await expect(compras?.getAttribute("aria-label")).toBe(
      "14 Compras de la tienda, Bs 3.240,50",
    );
    /* Loading: the label stays, the amount waits for the figure. */
    const leyendo = canvasElement.querySelector('[aria-busy="true"]');
    await expect(leyendo?.textContent).not.toContain("Bs 980,00");
  },
};
