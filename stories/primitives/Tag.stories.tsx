import { Hint, StatusDot, Tag, type TagItem, Tags, type Tone } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarRange, Store, UserRound } from "lucide-react";
import { useState } from "react";

import { OnCanvas, OnChrome } from "../support/surface";

const TONOS: Tone[] = ["neutral", "info", "good", "warn", "bad", "accent"];

const meta = {
  title: "2 · Primitivas/Tag y StatusDot",
  component: Tag,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Contestan la misma pregunta con dos presupuestos de espacio: el punto cabe en una fila de tabla, la cápsula donde hay una línea entera. Un tono es un SIGNIFICADO, no una decoración — cuando una etiqueta usa un tono porque hacía falta variedad, los seis dejan de significar y hay que leer la palabra igual. `Tags` es la tira de fichas: la misma en el buscador, en un desplegable y en cualquier lugar donde haya una lista de palabras cortas que se eligen o se sacan.",
      },
    },
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Los seis tonos en sus dos superficies. El estado no cambia de significado al cruzar del
 *  lienzo al chrome, pero sí de valor: `good` #2F6B3C da 1,4:1 sobre el marino y hay que usar
 *  el aclarado. */
export const Tonos: Story = {
  args: { children: "" },
  render: () => (
    <div className="flex flex-col gap-4">
      <OnCanvas>
        {TONOS.map((t) => (
          <Tag key={t} tone={t}>
            {t}
          </Tag>
        ))}
      </OnCanvas>
      <OnChrome>
        {TONOS.map((t) => (
          <Tag key={t} tone={t} surface="chrome">
            {t}
          </Tag>
        ))}
      </OnChrome>
    </div>
  ),
};

/** El punto NUNCA va solo. Un punto de color sin su palabra obliga a aprenderse una leyenda
 *  que no está escrita en ningún lado, y a quien no distingue rojo de verde no le dice nada.
 *  El punto acelera el barrido de una columna de facturas; la palabra es la que informa. */
export const Estados: Story = {
  args: { children: "" },
  render: () => (
    <div className="flex flex-col gap-4">
      <OnCanvas>
        <StatusDot tone="good" label="pagada" />
        <StatusDot tone="info" label="publicada" />
        <StatusDot tone="warn" label="importando extracto" pulse />
        <StatusDot tone="bad" label="vencida hace 12 días" />
        <StatusDot label="borrador" />
      </OnCanvas>
      <OnChrome>
        <StatusDot tone="good" label="pagada" surface="chrome" />
        <StatusDot tone="warn" label="importando extracto" pulse surface="chrome" />
        <StatusDot tone="bad" label="vencida" surface="chrome" />
      </OnChrome>
    </div>
  ),
};

/** `pulse` es la ÚNICA animación del sistema, y existe porque «importando» e «importado» se
 *  diferencian en una letra — demasiado poco para un estado que cambia solo. Y estas tres no
 *  son estados: son clasificaciones de un producto. */
export const ClasificarNoEsEstado: Story = {
  args: { children: "" },
  render: () => (
    <div className="flex flex-col gap-4">
      <OnCanvas>
        <Tag>almacenable</Tag>
        <Tag>servicio</Tag>
        <Tag>exento de IVA</Tag>
      </OnCanvas>
      <p className="max-w-prose text-meta text-muted">
        Estas tres son <strong className="font-medium text-ink">clasificaciones</strong>, no
        estados: no hay nada «bien» ni «mal» en que un producto sea un servicio. Por eso
        `neutral` es el default — pintar de colores una lista de clasificaciones la convierte
        en un semáforo que no semaforiza nada.
      </p>
    </div>
  ),
};

/** La frase que no cabe en la página. El `?` es el affordance; `Field.hint` se usa cuando
 *  hay una línea entera para la ayuda. */
export const Ayuda: Story = {
  args: { children: "" },
  render: () => (
    <OnCanvas>
      <span className="inline-flex items-center gap-1 text-meta text-ink">
        condición de pago
        <Hint>
          Cuántos días tiene el cliente para pagar desde la fecha de la factura. «Contado» es
          cero.
        </Hint>
      </span>
    </OnCanvas>
  ),
};

const FILTROS: TagItem[] = [
  { id: "cliente", label: "cliente: Distribuidora Andina S.R.L.", icon: UserRound },
  { id: "estado", label: "estado: vencida" },
  { id: "fecha", label: "fecha: octubre 2026", icon: CalendarRange },
  { id: "sucursal", label: "sucursal", note: "El Alto", icon: Store },
];

/**
 * **Fichas que se sacan.** Los filtros aplicados a la lista de facturas: cada uno con su ×,
 * y con el teclado una sola parada de Tab para toda la tira — flechas entre fichas,
 * Retroceso o Suprimir saca la que tiene el foco. Las teclas son las de React Aria, las
 * mismas de cualquier grupo de fichas.
 *
 * Una ficha es un VALOR, no un botón: sin `onSelect` no tiene relieve ni cursor. La de
 * «sucursal» lleva lo que la aclara adentro y apagado — dos fichas para eso serían dos cosas
 * que elegir donde hay una.
 */
export const FiltrosAplicados: Story = {
  args: { children: "" },
  render: function Render() {
    const [filtros, setFiltros] = useState(FILTROS);
    return (
      <div className="flex max-w-2xl flex-col gap-3">
        <OnCanvas>
          <Tags
            label="Filtros de las facturas"
            items={filtros.map((f) => ({
              ...f,
              onRemove: () => setFiltros((all) => all.filter((x) => x.id !== f.id)),
              removeLabel: `Quitar el filtro ${f.label}`,
            }))}
          />
          {filtros.length === 0 ? (
            <span className="text-meta text-muted">sin filtros: se ven las 32 facturas</span>
          ) : null}
        </OnCanvas>
        {filtros.length < FILTROS.length ? (
          <button
            type="button"
            onClick={() => setFiltros(FILTROS)}
            className="self-start text-micro text-primary hover:underline"
          >
            volver a poner los filtros
          </button>
        ) : null}
      </div>
    );
  },
};

/**
 * **Fichas que se eligen.** Cuando la ficha dice si está elegida (`selected`), la tira se
 * anuncia como una lista de selección: acá, el período del reporte de ventas. Apilada
 * (`stack`), porque una lista que SE ELIGE se recorre en columna, y el ojo y el teclado bajan
 * por ella; la tira en línea es la que ACOMPAÑA.
 */
export const FichasQueSeEligen: Story = {
  args: { children: "" },
  render: function Render() {
    const [periodo, setPeriodo] = useState("mes");
    const opciones = [
      { id: "hoy", label: "Hoy" },
      { id: "semana", label: "Esta semana" },
      { id: "mes", label: "Este mes", note: "octubre" },
      { id: "trimestre", label: "Este trimestre", note: "T4" },
      { id: "gestion", label: "Gestión 2026" },
    ];
    return (
      <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
        <OnCanvas>
          <div className="w-56">
            <Tags
              stack
              label="Período del reporte"
              items={opciones.map((o) => ({
                ...o,
                selected: o.id === periodo,
                onSelect: () => setPeriodo(o.id),
              }))}
            />
          </div>
        </OnCanvas>
        <OnChrome>
          <Tags
            surface="chrome"
            label="Período del reporte"
            items={opciones.map((o) => ({
              ...o,
              selected: o.id === periodo,
              onSelect: () => setPeriodo(o.id),
            }))}
          />
        </OnChrome>
      </div>
    );
  },
};
