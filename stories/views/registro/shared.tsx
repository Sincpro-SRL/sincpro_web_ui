/* The data and the pieces the stories of this folder share. Not a story file. */
import { type ActivityEvent, Button, type Message, Record } from "@sincpro/web-ui";

import type { InvoiceLine } from "../../support/erp";
import { ORDER_EVENTS, ORDER_MESSAGES } from "../../support/erp-lists";

/** The four lines of S00142. They add up to the total the rail and the list show. */
export const LINEAS: readonly InvoiceLine[] = [
  {
    id: "l1",
    product: "Implementación Odoo — módulo de ventas",
    quantity: 1,
    unitPrice: 12500,
    discount: 0,
  },
  {
    id: "l2",
    product: "Licencia de usuario adicional",
    quantity: 12,
    unitPrice: 350,
    discount: 10,
  },
  {
    id: "l3",
    product: "Capacitación presencial (por hora)",
    quantity: 16,
    unitPrice: 420,
    discount: 0,
  },
  {
    id: "l4",
    product: "Desarrollo a medida (por hora)",
    quantity: 125,
    unitPrice: 280,
    discount: 0,
  },
];

export const EVENTOS: ActivityEvent[] = ORDER_EVENTS;
export const MENSAJES: Message[] = ORDER_MESSAGES.slice(0, 1);

export const CLIENTE = "Importadora y Exportadora del Oriente Boliviano Ltda.";

export const RIEL = (
  <Record.Rail>
    <Record.Crumbs
      crumbs={[
        { label: "Ventas", onClick: () => {} },
        { label: "Pedidos", onClick: () => {} },
        { label: "S00142" },
      ]}
    />
    <Record.Actions>
      <Button role="primary" size="sm">
        Crear factura
      </Button>
    </Record.Actions>
  </Record.Rail>
);
