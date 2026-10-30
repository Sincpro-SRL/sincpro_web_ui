import { Button, DataField, Listing, ListingBar, Peek, Row, Tag } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  INVOICES,
  money,
  shortDate,
  STATE_LABEL,
  STATE_TONE,
  subtotalOf,
  taxOf,
} from "../support/erp";

/**
 * Context: **el cajón de vista previa.** Entra por la derecha y no oscurece lo que hay
 * detrás: la lista de la que salió sigue clickeable. Un velo lo convertiría en un diálogo,
 * y un diálogo es para lo que hay que contestar antes de seguir. Al abrirse, el foco entra
 * al cajón; Escape (con el foco adentro) lo cierra y el foco vuelve a la fila.
 */
const meta: Meta = {
  title: "2 · Primitivas/Peek · el cajón",
  component: Peek,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "El cajón entra por la derecha y no oscurece lo que hay detrás: la lista de la que salió sigue clickeable. Un velo lo convertiría en un diálogo, y un diálogo es para lo que hay que contestar antes de seguir. Todo lo que entra se dibuja compacto — lo declara la superficie, que es la única que conoce su ancho.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const ITEMS = INVOICES.slice(0, 7);

/** **Tocá una fila: el cajón se abre y la lista sigue viva detrás.** Tocá otra: se
 *  reemplaza a sí mismo, no abre un segundo cajón. */
export const SobreUnaLista: Story = {
  render: function Render() {
    const [elegida, setElegida] = useState<string | null>(ITEMS[2]!.id);
    const factura = ITEMS.find((f) => f.id === elegida);
    const cobrable = factura?.state === "posted" || factura?.state === "overdue";

    return (
      <div className="relative h-128 overflow-hidden bg-ground p-8">
        <Listing bar={<ListingBar title="Facturas de cliente" description="tocá una fila" />}>
          {ITEMS.map((f) => (
            <Row
              key={f.id}
              name={f.number}
              meta={`${f.customer} · ${money(subtotalOf(f))} · vence ${shortDate(f.due)}`}
              tags={<Tag tone={STATE_TONE[f.state]}>{STATE_LABEL[f.state]}</Tag>}
              onOpen={() => setElegida(f.id)}
              onPeek={() => setElegida(f.id)}
            />
          ))}
        </Listing>

        {factura === undefined ? null : (
          <Peek
            open
            title={factura.number}
            subtitle={`${factura.customer} · NIT ${factura.taxId}`}
            onClose={() => setElegida(null)}
            onPromote={() => {}}
            actions={
              cobrable ? (
                <Button role="primary" size="sm">
                  Registrar pago
                </Button>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                <Tag tone={STATE_TONE[factura.state]}>{STATE_LABEL[factura.state]}</Tag>
              </div>
              <DataField label="Emitida" value={shortDate(factura.date)} layout="inline" />
              <DataField label="Vence" value={shortDate(factura.due)} layout="inline" />
              <DataField label="Vendedor" value={factura.salesperson} layout="inline" />
              <DataField
                label="Total"
                value={<span className="tabular-nums">{money(subtotalOf(factura))}</span>}
                layout="inline"
              />
              <DataField
                label="IVA incluido"
                value={<span className="tabular-nums">{money(taxOf(factura))}</span>}
                layout="inline"
              />
              <ul className="flex flex-col gap-1 border-t border-line pt-3 text-meta">
                {factura.lines.map((l) => (
                  <li key={l.id} className="flex gap-2">
                    <span className="min-w-0 flex-1 truncate text-ink">{l.product}</span>
                    <span className="shrink-0 text-muted tabular-nums">× {l.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Peek>
        )}
      </div>
    );
  },
};

/** **En el teléfono el cajón sube desde abajo.** No hay «al costado» en 390 px: el mismo
 *  cajón se ancla al borde de abajo, a todo el ancho y hasta el 90 % del alto, y sus
 *  acciones —«Registrar pago»— bajan al pie, donde está el pulgar. La lista sigue arriba,
 *  sin velo y clickeable. */
export const EnElTelefono: Story = {
  ...SobreUnaLista,
  name: "En el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
};

/** **Sin `onPromote` ni `actions` el cajón es sólo cabecera y cuerpo: mirar y cerrar.** La
 *  barra de acciones aparece cuando hay algo que hacer. */
export const SoloMirar: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <div className="relative h-112 overflow-hidden bg-ground p-8">
        <Button role="secondary" size="sm" onClick={() => setOpen(true)}>
          Ver el cliente
        </Button>
        <Peek
          open={open}
          title="Importadora y Exportadora del Oriente Boliviano Ltda."
          subtitle="NIT 3214569870 · Santa Cruz de la Sierra"
          onClose={() => setOpen(false)}
        >
          <div className="flex flex-col gap-3">
            <DataField
              label="Contacto"
              value="María Fernanda Quispe Mamani"
              layout="inline"
            />
            <DataField label="Teléfono" value="+591 3 345 6789" layout="inline" />
            <DataField label="Límite de crédito" value={money(80000)} layout="inline" />
            <DataField label="Saldo vencido" value={money(0)} layout="inline" />
            <DataField label="Lista de precios" value={null} layout="inline" />
          </div>
        </Peek>
      </div>
    );
  },
};
