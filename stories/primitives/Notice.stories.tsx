import { Button, Empty, Failed, Flag, ICONO_ROTO, Missing, Skeleton } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "2 · Primitivas/Estados · vacío, falló, no existe",
  component: Empty,
  parameters: {
    docs: {
      description: {
        component:
          "Cuatro formas de no tener el contenido todavía, y son distintas porque cada una la arregla otra persona. Cargando conserva la silueta de la lista; vacío es NORMAL y lleva el gesto que lo resuelve; falló lleva la frase del backend entera; no existe lleva el identificador, que es lo único que permite arreglarlo.",
      },
    },
  },
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

function Marco({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="font-mono text-micro tracking-[0.1em] text-muted uppercase">
        {label}
      </figcaption>
      <div className="rounded-box border border-line bg-surface">{children}</div>
    </figure>
  );
}

/** Cargando no es un vacío. Las barras guardan el lugar de las filas — nombre a
 *  la izquierda, cifra a la derecha — y la frase queda para quien no las ve. */
export const Cargando: Story = {
  args: { sentence: "" },
  render: () => (
    <div className="bg-ground p-8">
      <Marco label="cargando">
        <Skeleton label="Cargando…" />
      </Marco>
    </div>
  ),
};

/** El vacío de una lista nueva: la frase dice qué falta y el botón lo resuelve.
 *  «No hay resultados» a secas es un callejón sin salida. */
export const Vacio: Story = {
  args: {
    sentence:
      "Todavía no registraste ningún producto. Con el primero ya podés armar una cotización.",
    action: (
      <Button role="primary" size="md">
        Crear un producto
      </Button>
    ),
  },
  render: (args) => (
    <div className="bg-ground p-8">
      <Marco label="vacío de verdad">
        <Empty {...args} />
      </Marco>
    </div>
  ),
};

/** El vacío de un filtro es otro problema: no falta contenido, sobra un
 *  recorte. Por eso el gesto que ofrece es limpiarlo, no crear algo. */
export const VacioPorFiltro: Story = {
  args: {
    sentence:
      "Ninguna factura coincide con lo que buscaste. Sacá una ficha del buscador o limpiá los filtros.",
    action: (
      <Button role="secondary" size="md">
        Limpiar los filtros
      </Button>
    ),
  },
  render: (args) => (
    <div className="bg-ground p-8">
      <Marco label="vacío por un filtro">
        <Empty {...args} />
      </Marco>
    </div>
  ),
};

/** Dentro de un bloque, alineado a la izquierda: centrarlo lo despegaría de todo
 *  lo demás de la sección. */
export const DentroDeUnBloque: Story = {
  args: { sentence: "Este cliente todavía no tiene pagos registrados.", align: "start" },
  render: (args) => (
    <div className="bg-ground p-8">
      <Marco label="align=start">
        <Empty {...args} />
      </Marco>
    </div>
  ),
};

/** La frase del backend va entera y tal cual. Recortarla o reemplazarla por una
 *  propia es lo que obliga a ir a la consola para saber qué pasó. */
export const Fallo: Story = {
  args: { sentence: "" },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Marco label="falló">
        <div className="p-3">
          <Failed
            heading="No se pudo confirmar la orden de venta"
            sentence="La línea 3 pide 600 bolsas de «Cemento Portland IP-40» y el Almacén Central tiene 0 disponibles. Reducí la cantidad, elegí otro almacén o dejá la orden en espera de reposición."
            action={
              <Button role="secondary" size="sm">
                Elegir otro almacén
              </Button>
            }
          />
        </div>
      </Marco>

      <Marco label="no existe · error de cableado">
        <Missing
          heading="Nadie sabe resolver esta referencia"
          detail="account.asset/42 — ¿falta registrar el modelo «account.asset» en la aplicación?"
        />
      </Marco>

      <Marco label="no existe · se rompió al dibujar">
        <Missing
          icon={ICONO_ROTO}
          tone="bad"
          heading="Esta vista falló al dibujarse"
          detail="sale.order/SO-2026-0418 — Cannot read properties of undefined (reading 'lines')"
        />
      </Marco>
    </div>
  ),
};

/**
 * **Una marca sobre UNA cosa.** Lo que está mal en una línea, en un campo, en una cifra no se
 * anuncia arriba del documento: se marca ahí. Cada tono tiene su forma además de su color —el
 * círculo detiene, el triángulo advierte, la «i» informa, el visto confirma— y la marca se
 * nombra con su frase. Tocala: el detalle se abre y queda hasta que lo cerrás.
 */
export const Marcas: Story = {
  args: { sentence: "" },
  render: () => (
    <div className="flex flex-col gap-3 bg-ground p-8 text-meta text-ink">
      <span className="flex items-center gap-2">
        <Flag tone="bad" label="Sin existencias">
          Se piden 3 y hay 0 en el depósito central. Llegan 10 el 04/11/2026.
        </Flag>
        Impresora térmica de tickets 80 mm
      </span>
      <span className="flex items-center gap-2">
        <Flag tone="warn" label="Existencias justas">
          Se piden 3 y quedan 3: no queda ninguna para otra venta.
        </Flag>
        Pantalla táctil 15″ para caja
      </span>
      <span className="flex items-center gap-2">
        <Flag tone="info" label="Precio de lista actualizado">
          El precio subió el 01/10/2026; esta línea usa el anterior.
        </Flag>
        Lector de código de barras inalámbrico
      </span>
      <span className="flex items-center gap-2">
        <Flag tone="good" label="Reservado">
          Las 3 unidades quedaron apartadas para este pedido.
        </Flag>
        Cajón de dinero con apertura automática
      </span>
    </div>
  ),
};
