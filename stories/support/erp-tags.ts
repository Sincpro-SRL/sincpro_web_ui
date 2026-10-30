import type { TagOption } from "@sincpro/web-ui";

/**
 * Context: the many2many catalogs of the sales module — the categories of a customer and the
 * labels of an invoice. Short words that CLASSIFY (neutral) and the two or three that warn
 * («crédito suspendido») with the tone of what they mean.
 */
export const CUSTOMER_CATEGORIES: readonly TagOption[] = [
  { value: "cat-mayorista", label: "mayorista" },
  { value: "cat-minorista", label: "minorista" },
  { value: "cat-exportacion", label: "exportación" },
  { value: "cat-credito30", label: "crédito 30 días" },
  { value: "cat-credito60", label: "crédito 60 días" },
  { value: "cat-gobierno", label: "sector público" },
  { value: "cat-retencion", label: "agente de retención", tone: "info" },
  { value: "cat-suspendido", label: "crédito suspendido", tone: "bad" },
  { value: "cat-vip", label: "cuenta clave", tone: "accent" },
];

export const INVOICE_LABELS: readonly TagOption[] = [
  { value: "lbl-anticipo", label: "anticipo" },
  { value: "lbl-contrato", label: "contrato anual" },
  { value: "lbl-reclamo", label: "con reclamo", tone: "warn" },
  { value: "lbl-auditoria", label: "revisar en auditoría", tone: "info" },
];
