import {
  Button,
  Callout,
  Copyable,
  Field,
  Suggest,
  ToastProvider,
  useToast,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

import { money } from "../support/erp";

const meta: Meta = {
  title: "2 · Primitivas/Aviso, copiar y sugerir",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Las piezas que cada pantalla venía improvisando: el aviso sobre lo que se está mirando, el aviso flotante de lo que acaba de pasar, el valor que se copia, y el campo abierto que propone. Existen porque su ausencia tenía una consecuencia medible, no porque estén en otros sistemas.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * **El aviso** habla de lo que está EN pantalla. `Empty`, `Failed` y `Missing` dicen que no
 * hay contenido y ocupan el lugar de la vista; esto es lo contrario: hay contenido, se ve, y
 * hace falta decir algo además.
 *
 * El ícono sale del tono y no se elige — un aviso rojo con un tilde verde adentro es una
 * contradicción que alguien va a escribir si se lo dejamos escribir. Y el texto va en tinta
 * normal: el color se queda en el ícono y el borde, porque un párrafo entero pintado se lee
 * peor.
 */
export const Avisos: Story = {
  render: function Render() {
    const [visible, setVisible] = useState(true);
    return (
      <div className="flex flex-col gap-3">
        <Callout tone="info">
          Hay <strong className="font-medium">asientos contables sin registrar</strong>{" "}
          anteriores o incluidos en este período.
        </Callout>

        <Callout
          tone="warn"
          title="El período de septiembre está cerrado"
          action={
            <Button role="secondary" size="sm">
              Reabrir el período
            </Button>
          }
        >
          Las facturas con fecha de septiembre ya no se pueden modificar. Una corrección va
          como nota de crédito en octubre.
        </Callout>

        <Callout tone="bad">
          El cliente «Constructora Illimani» superó su límite de crédito: debe {money(48250)}{" "}
          sobre un límite de {money(40000)}. La orden no se puede confirmar.
        </Callout>

        {visible ? (
          <Callout tone="good" onDismiss={() => setVisible(false)} dismissLabel="cerrar">
            La conciliación bancaria de octubre cuadró: 214 movimientos, ninguna diferencia.
          </Callout>
        ) : (
          <Button role="ghost" size="sm" onClick={() => setVisible(true)}>
            volver a mostrar el que se cierra
          </Button>
        )}
      </div>
    );
  },
};

function Pagos() {
  const toast = useToast();
  const [pagada, setPagada] = useState(false);
  const importacion = useRef(0);
  return (
    <div className="flex max-w-prose flex-col gap-3 rounded-box border border-line bg-surface p-4">
      <p className="text-meta text-ink">
        FAC/2026/0118 · Distribuidora Andina S.R.L. ·{" "}
        <span className={pagada ? "text-good" : "text-bad"}>
          {pagada ? "pagada" : "vencida hace 12 días"}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          role="secondary"
          size="sm"
          disabled={pagada}
          onClick={() => {
            setPagada(true);
            toast.show({
              message: `Pago registrado: ${money(18650)} de Distribuidora Andina S.R.L.`,
              tone: "good",
              action: { label: "Deshacer", onSelect: () => setPagada(false) },
            });
          }}
        >
          Registrar pago
        </Button>
        <Button
          role="secondary"
          size="sm"
          onClick={() => {
            importacion.current = Math.min(100, importacion.current + 35);
            toast.show({
              key: "extracto",
              message:
                importacion.current >= 100
                  ? "Extracto del BNB importado: 214 movimientos."
                  : `Importando el extracto del BNB… ${importacion.current} %`,
              tone: importacion.current >= 100 ? "good" : "info",
              ...(importacion.current >= 100
                ? { action: { label: "Ver la conciliación", href: "#conciliacion" } }
                : { duration: 0 }),
            });
            if (importacion.current >= 100) importacion.current = 0;
          }}
        >
          Avanzar la importación
        </Button>
        <Button
          role="secondary"
          size="sm"
          onClick={() =>
            toast.show({
              message: "No se pudo emitir la factura FAC/2026/0119.",
              detail:
                "Impuestos Nacionales rechazó el envío: el NIT 1028457021 no está habilitado para facturación electrónica (código 1037).",
              tone: "bad",
            })
          }
        >
          Emitir factura que falla
        </Button>
      </div>
    </div>
  );
}

/**
 * **El aviso flotante** es lo contrario del aviso de arriba: habla de lo que PASÓ, aunque ya
 * estés mirando otra cosa. Es la única noticia que no vive en la vista.
 *
 * - «Registrar pago» hace el pago en el acto y el aviso ofrece **Deshacer** — no «¿estás
 *   seguro?»: confirmar cada pago entrena a apretar «sí» sin leer.
 * - «Avanzar la importación» manda el MISMO aviso (misma `key`) varias veces: se reemplaza en
 *   su lugar en vez de apilarse tres copias.
 * - El que falla no se va solo: una falla que desaparece es una falla que nadie vio.
 *
 * Los buenos se van a los 8 s, salvo con el puntero o el foco encima. Con F6 se llega a la
 * pila desde cualquier lugar de la página.
 */
export const AvisoFlotante: Story = {
  render: () => (
    <ToastProvider>
      <Pagos />
    </ToastProvider>
  ),
};

/**
 * **Copiar.** La mitad de los valores de un ERP existen para pegarse en otro lado: el NIT de
 * un cliente, el CUF de una factura electrónica, el número de una cuenta bancaria.
 * Seleccionarlos a mano falla justo con los que más importa no equivocar.
 *
 * Confirma con un tilde por dos segundos, porque copiar no tiene efecto visible —el
 * portapapeles está afuera de la pantalla— y un botón que no contesta se aprieta tres veces.
 * Y si falla lo dice: una confirmación falsa hace que alguien pegue lo que tenía antes sin
 * enterarse.
 *
 * Pasá el puntero por un valor.
 */
export const Copiar: Story = {
  render: () => (
    <div className="flex max-w-prose flex-col gap-3 rounded-box border border-line bg-surface p-4">
      <p className="text-meta text-muted">
        El botón ocupa lugar siempre aunque se vea con el puntero: si apareciera de la nada,
        el valor se correría justo cuando vas a seleccionarlo.
      </p>
      <dl className="flex flex-col gap-2">
        <div className="flex items-baseline gap-3">
          <dt className="w-28 shrink-0 text-meta text-muted">NIT</dt>
          <dd className="min-w-0 text-meta text-ink">
            <Copyable value="1028457021" />
          </dd>
        </div>
        <div className="flex items-baseline gap-3">
          <dt className="w-28 shrink-0 text-meta text-muted">CUF</dt>
          <dd className="min-w-0 text-meta text-ink">
            {/* Se muestra cortado y se copia ENTERO: por eso el valor y lo que se dibuja son
                dos props distintas. */}
            <Copyable value="46A1C3F0E1B2D2026103000011800000A3F9D7E2C1B04" mono>
              46A1C3F0E1B2…7E2C1B04
            </Copyable>
          </dd>
        </div>
      </dl>
    </div>
  ),
};

/**
 * **Sugerir.** El campo abierto que propone. `Select` es una lista cerrada —lo que no está no
 * se puede escribir— y `TextInput` es libre pero no ayuda.
 *
 * La consecuencia de no tenerlo se ve en los datos: sin sugerencias aparecen «Bs.», «BOB» y
 * «bolivianos» en la misma columna, y después alguien escribe un `CASE` para unificarlos.
 * **Sugerir no prohíbe**: escribir algo nuevo y apretar Enter lo deja pasar.
 *
 * Flechas para recorrer, Enter para elegir, Escape para cerrar.
 */
export const Sugerir: Story = {
  render: function Render() {
    const [unidad, setUnidad] = useState("");
    const [referencia, setReferencia] = useState("contado");
    return (
      <div className="flex max-w-prose flex-col gap-4 rounded-box border border-line bg-surface p-4">
        <Field label="Unidad de medida" hint="Ya se usaron éstas. Podés escribir una nueva.">
          {(aria) => (
            <Suggest
              id={aria.id}
              describedBy={aria.describedBy}
              value={unidad}
              onChange={setUnidad}
              placeholder="unidad, bolsa, kg…"
              suggestions={["unidad", "bolsa", "kg", "litro", "barra", "hora"]}
            />
          )}
        </Field>

        <Field label="Referencia de pago">
          {(aria) => (
            <Suggest
              id={aria.id}
              value={referencia}
              onChange={setReferencia}
              suggestions={[
                "contado",
                "transferencia BNB",
                "cheque",
                "QR simple",
                "depósito",
              ]}
            />
          )}
        </Field>

        <p className="text-micro text-muted">
          Cuando la lista es de cientos y lo que se elige es un REGISTRO y no un valor —un
          producto, un cliente— lo que hace falta es un{" "}
          <code className="font-mono">Picker</code>, que trae búsqueda y los datos para
          elegir.
        </p>
      </div>
    );
  },
};
