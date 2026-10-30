import {
  Accordion,
  Button,
  Disclosure,
  Field,
  IconButton,
  KeyValue,
  Meter,
  NumberInput,
  PopoverTrigger,
  Select,
  Switch,
  TextInput,
  Toolbar,
  ToolbarSeparator,
  Tooltip,
  TooltipTrigger,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Copy,
  Download,
  Filter,
  Pencil,
  Plus,
  Printer,
  Trash2,
  UserRound,
} from "lucide-react";
import { useState } from "react";

/**
 * Context: **lo que flota y lo que se pliega.** Cinco piezas sobre React Aria para no perder
 * de vista la pantalla: el nombre de un ícono al pasar por encima, un formulario chico que se
 * abre al lado de su botón, una sección que se pliega, una barra que el teclado recorre con
 * las flechas y una medida contra su tope.
 */
const meta: Meta = {
  title: "2 · Primitivas/Superposiciones y pliegues",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`Tooltip`, `PopoverTrigger`, `Disclosure` / `Accordion`, `Toolbar` y `Meter`. El teclado, el foco y los anuncios al lector de pantalla los resuelve React Aria; acá se visten con los tokens del sistema.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function Box({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-box border border-line bg-surface p-4 ${wide ? "max-w-3xl" : "max-w-xl"}`}
    >
      {children}
    </div>
  );
}

const LINEAS = [
  { codigo: "PRD-0412", producto: "Cemento portland 50 kg", cantidad: 120, precio: 62.5 },
  { codigo: "PRD-0533", producto: "Fierro corrugado 12 mm", cantidad: 80, precio: 118 },
  { codigo: "PRD-0791", producto: "Ladrillo 6 huecos", cantidad: 3000, precio: 1.35 },
];

const cantidad = new Intl.NumberFormat("es-BO");
const bs = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function Lineas({ actions = false }: { actions?: boolean }) {
  return (
    <table className="w-full border-separate border-spacing-0 text-left text-meta">
      <thead>
        <tr className="text-micro text-muted">
          <th className="border-b border-line px-2 py-1.5 font-medium">Código</th>
          <th className="border-b border-line px-2 py-1.5 font-medium">Producto</th>
          <th className="border-b border-line px-2 py-1.5 text-right font-medium">
            Cantidad
          </th>
          <th className="border-b border-line px-2 py-1.5 text-right font-medium">Precio</th>
          {actions ? <th className="border-b border-line px-2 py-1.5" /> : null}
        </tr>
      </thead>
      <tbody>
        {LINEAS.map((l) => (
          <tr key={l.codigo} className="text-ink">
            <td className="border-b border-line px-2 py-1 text-muted">{l.codigo}</td>
            <td className="border-b border-line px-2 py-1">{l.producto}</td>
            <td className="border-b border-line px-2 py-1 text-right tabular-nums">
              {cantidad.format(l.cantidad)}
            </td>
            <td className="border-b border-line px-2 py-1 text-right tabular-nums">
              {bs.format(l.precio)}
            </td>
            {actions ? (
              <td className="border-b border-line px-2 py-0.5">
                <span className="flex justify-end gap-0.5">
                  <IconButton icon={Pencil} label="Editar línea" />
                  <IconButton icon={Copy} label="Duplicar línea" />
                  <IconButton icon={Trash2} label="Eliminar línea" tone="danger" />
                </span>
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** **Los íconos de una fila.** Son `IconButton` del sistema, tal cual: cada uno ya trae su
 *  tooltip con el `label`. Pasá el mouse por un ícono —o llegá con Tab— y aparece su nombre.
 *  El primero espera un momento; los vecinos se abren al instante mientras el mouse recorre
 *  la fila. */
export const IconosConTooltip: Story = {
  render: () => (
    <Box wide>
      <Lineas actions />
    </Box>
  ),
};

/** **Un tooltip escrito a mano.** `TooltipTrigger` con cualquier botón del sistema adentro —
 *  sin adaptadores—, para un control que no es un ícono o para decir más que su rótulo. */
export const TooltipAMano: Story = {
  render: () => (
    <Box>
      <div className="flex items-center gap-2">
        <TooltipTrigger>
          <Button icon={Printer} size="sm">
            Imprimir
          </Button>
          <Tooltip>Sale por la impresora del almacén central</Tooltip>
        </TooltipTrigger>
        <TooltipTrigger>
          <IconButton icon={Download} label="Exportar a Excel" />
          <Tooltip placement="bottom">
            Exporta las 3 líneas visibles, no las filtradas
          </Tooltip>
        </TooltipTrigger>
      </div>
    </Box>
  ),
};

/** **Filtrar por monto.** Un formulario chico al lado de su botón: la tabla que se filtra no
 *  se tapa. «Aplicar» lo cierra; Escape o un click afuera también. */
export const FiltrarPorMonto: Story = {
  render: function Render() {
    const [desde, setDesde] = useState<number | "">("");
    const [hasta, setHasta] = useState<number | "">("");
    const [filtro, setFiltro] = useState<string>("sin filtro");
    return (
      <Box>
        <div className="flex items-center gap-2">
          <PopoverTrigger
            title="Filtrar por monto"
            trigger={
              <Button icon={Filter} size="sm">
                Filtrar por monto
              </Button>
            }
          >
            {(close) => {
              const aplicar = () => {
                setFiltro(`${desde === "" ? "…" : desde} – ${hasta === "" ? "…" : hasta} Bs`);
                close();
              };
              return (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    aplicar();
                  }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Desde">
                      <NumberInput value={desde} onChange={setDesde} min={0} unit="Bs" />
                    </Field>
                    <Field
                      label="Hasta"
                      error={
                        desde !== "" && hasta !== "" && hasta < desde
                          ? "Menor que «desde»."
                          : undefined
                      }
                    >
                      <NumberInput value={hasta} onChange={setHasta} min={0} unit="Bs" />
                    </Field>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      role="ghost"
                      onClick={() => {
                        setDesde("");
                        setHasta("");
                        setFiltro("sin filtro");
                        close();
                      }}
                    >
                      Limpiar
                    </Button>
                    <Button size="sm" onClick={aplicar}>
                      Aplicar
                    </Button>
                  </div>
                </form>
              );
            }}
          </PopoverTrigger>
          <PopoverTrigger
            label="Detalle del cliente"
            trigger={<IconButton icon={UserRound} label="Ver detalle del cliente" />}
          >
            <dl className="grid grid-cols-2 gap-3">
              <KeyValue label="Cliente" value="Ferretería El Puente" />
              <KeyValue label="NIT" value="1023456027" />
              <KeyValue label="Saldo" value="Bs 12.480,00" />
              <KeyValue label="Vence" value="15 nov 2026" />
            </dl>
          </PopoverTrigger>
        </div>
        <p className="text-micro text-muted tabular-nums">filtro: {filtro}</p>
        <Lineas />
      </Box>
    );
  },
};

/** **Opciones avanzadas.** Lo que pocas veces se toca queda plegado al pie del formulario —
 *  sigue siendo parte de la factura, por eso es una línea y no una caja. */
export const OpcionesAvanzadas: Story = {
  render: function Render() {
    const [cliente, setCliente] = useState("Ferretería El Puente");
    const [glosa, setGlosa] = useState("");
    const [moneda, setMoneda] = useState("BOB");
    const [exenta, setExenta] = useState(false);
    return (
      <Box>
        <Field label="Cliente" required>
          <TextInput value={cliente} onChange={setCliente} />
        </Field>
        <Disclosure title="Opciones avanzadas" detail="3 campos">
          <div className="flex flex-col gap-3">
            <Field label="Glosa contable">
              <TextInput value={glosa} onChange={setGlosa} placeholder="Escribí la glosa" />
            </Field>
            <Field label="Moneda">
              <Select
                value={moneda}
                onChange={setMoneda}
                options={[
                  { value: "BOB", label: "Bolivianos" },
                  { value: "USD", label: "Dólares" },
                ]}
              />
            </Field>
            <Switch checked={exenta} onChange={setExenta}>
              Exenta de IVA
            </Switch>
          </div>
        </Disclosure>
      </Box>
    );
  },
};

/** **Un acordeón.** Las líneas de un pedido agrupadas por almacén: se abre uno por vez; con
 *  `allowsMultipleExpanded` se comparan dos lado a lado. */
export const Acordeon: Story = {
  render: () => (
    <Box>
      <Accordion defaultExpanded={["central"]}>
        <Disclosure id="central" title="Almacén central" detail="2 líneas · Bs 16.940,00">
          <p className="text-muted">Cemento portland 50 kg · Fierro corrugado 12 mm</p>
        </Disclosure>
        <Disclosure id="norte" title="Almacén norte" detail="1 línea · Bs 4.050,00">
          <p className="text-muted">Ladrillo 6 huecos</p>
        </Disclosure>
        <Disclosure id="sur" title="Almacén sur" detail="sin líneas" disabled>
          <p className="text-muted">—</p>
        </Disclosure>
      </Accordion>
    </Box>
  ),
};

/** **Una barra sobre la tabla.** Tab entra a la barra una sola vez; las flechas recorren sus
 *  botones. Son el `Button` y el `IconButton` del sistema, tal cual. */
export const BarraSobreTabla: Story = {
  render: () => (
    <Box wide>
      <Toolbar label="Acciones de las líneas">
        <Button icon={Plus} size="sm">
          Agregar línea
        </Button>
        <IconButton icon={Copy} label="Duplicar seleccionadas" />
        <IconButton icon={Trash2} label="Eliminar seleccionadas" tone="danger" />
        <ToolbarSeparator />
        <IconButton icon={Printer} label="Imprimir" />
        <IconButton icon={Download} label="Exportar a Excel" />
      </Toolbar>
      <Lineas />
    </Box>
  ),
};

/** **Medidores.** Una medida contra su tope: el color lo pone el valor —verde hasta 70 %,
 *  ámbar hasta 90 %, rojo arriba— para que el que hay que mirar se vea en una columna de
 *  treinta. */
export const Medidores: Story = {
  render: () => (
    <Box>
      <Meter
        width="w-full"
        label="Crédito usado"
        value={42_500}
        maxValue={50_000}
        valueLabel="Bs 42.500 de 50.000"
      />
      <Meter
        width="w-full"
        label="Crédito usado · Constructora Andina"
        value={48_900}
        maxValue={50_000}
        valueLabel="Bs 48.900 de 50.000"
      />
      <Meter width="w-full" label="Stock · Cemento portland" value={1_240} maxValue={4_000} />
      <Meter
        width="w-full"
        label="Stock · almacén que trabaja lleno"
        value={3_720}
        maxValue={4_000}
        thresholds={{ warn: 96, danger: 99 }}
      />
      <Meter
        width="w-full"
        label="Presupuesto de marketing"
        value={0.62}
        maxValue={1}
        formatOptions={{ style: "percent" }}
      />
    </Box>
  ),
};
