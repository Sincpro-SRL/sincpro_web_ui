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
