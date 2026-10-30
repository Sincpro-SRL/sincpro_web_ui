import { Button, DataField, Field, Step, Steps, TextInput, useSteps } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Landmark, Lock, Receipt, Scale } from "lucide-react";

const meta = {
  title: "2 · Primitivas/Steps · un procedimiento en una página",
  component: Steps,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Un trabajo que dura días, no una sesión —el cierre contable del mes—. Cada etapa cerrada hasta que se la necesita, con su estado en la línea del título: cerrado, el conjunto es el índice del trabajo — se ve qué está resuelto y qué espera sin abrir nada. Una etapa que todavía no puede empezar dice QUÉ la desbloquea, porque «no podés hacer esto» sin «hacé aquello primero» es lo que hace que la gente abra sección por sección buscando la que anda.",
      },
    },
  },
} satisfies Meta<typeof Steps>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El cierre de octubre: una etapa resuelta, una bloqueada, una que espera y otra
 *  bloqueada por la anterior. */
export const Procedimiento: Story = {
  args: { children: null },
  render: function Render() {
    const steps = useSteps("conciliacion");

    return (
      <div className="flex flex-col gap-3 bg-ground p-8">
        {/* En la aplicación este botón NO va acá: vive en el riel, con las demás
            acciones del registro. Se lo deja en la story para poder probar que
            `openStep` abre la etapa correcta desde afuera de la pila. */}
        <div>
          <Button role="secondary" size="sm" onClick={() => steps.openStep("ufv")}>
            ir al ajuste por UFV
          </Button>
        </div>
        <Steps>
          <Step
            title="Conciliación bancaria"
            icon={Landmark}
            status={{ label: "completo", tone: "good" }}
            open={steps.isOpen("conciliacion")}
            onToggle={() => steps.toggle("conciliacion")}
          >
            <div className="flex flex-col gap-3">
              <DataField label="Extracto" value="BNB · cuenta 1000-245781 · octubre 2026" />
              <Field label="Saldo final según el banco">
                <TextInput value="Bs. 412.380,15" onChange={() => {}} />
              </Field>
              <div>
                <Button role="primary" size="sm">
                  Guardar
                </Button>
              </div>
            </div>
          </Step>

          <Step
            title="Depreciación de activos fijos"
            icon={Lock}
            open={steps.isOpen("depreciacion")}
            onToggle={() => steps.toggle("depreciacion")}
            locked="Faltan dos altas de activos de octubre sin fecha de puesta en marcha: cargalas en Activos fijos y esta etapa se habilita."
          >
            {null}
          </Step>

          <Step
            title="Ajuste por inflación (UFV)"
            icon={Scale}
            status={{ label: "requerido", tone: "neutral" }}
            open={steps.isOpen("ufv")}
            onToggle={() => steps.toggle("ufv")}
          >
            <p className="text-body text-muted">
              Reexpresa los rubros no monetarios con la UFV del 31/10/2026 y genera el
              asiento.
            </p>
          </Step>

          <Step
            title="Declaración de IVA (F-200)"
            icon={Receipt}
            open={steps.isOpen("iva")}
            onToggle={() => steps.toggle("iva")}
            locked="Sin el libro de compras de octubre cerrado no hay contra qué declarar."
          >
            {null}
          </Step>
        </Steps>
      </div>
    );
  },
};

/** Todo cerrado: lo que se ve cuando volvés al cierre del mes a medio hacer. Esa columna de
 *  estados a la derecha del título ES la vista. */
export const Cerrado: Story = {
  args: { children: null },
  render: function Render() {
    const steps = useSteps();

    return (
      <div className="bg-ground p-8">
        <Steps>
          <Step
            title="Conciliación bancaria"
            icon={Landmark}
            status={{ label: "completo", tone: "good" }}
            open={steps.isOpen("conciliacion")}
            onToggle={() => steps.toggle("conciliacion")}
          >
            {null}
          </Step>
          <Step
            title="Ajuste por inflación (UFV)"
            icon={Scale}
            status={{ label: "falta la UFV del 31/10", tone: "warn" }}
            open={steps.isOpen("ufv")}
            onToggle={() => steps.toggle("ufv")}
          >
            {null}
          </Step>
          <Step
            title="Declaración de IVA (F-200)"
            icon={Receipt}
            status={{ label: "requerido", tone: "neutral" }}
            open={steps.isOpen("iva")}
            onToggle={() => steps.toggle("iva")}
          >
            {null}
          </Step>
        </Steps>
      </div>
    );
  },
};
