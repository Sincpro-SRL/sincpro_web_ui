import type { FieldDefinition, LoadModel, ModelDefinition } from "@sincpro/web-ui";

/**
 * Context: a small graph of models for the stories of `FieldPath` — an invoice, its partner
 * and the partner's country (to-one), its lines and each line's taxes (to-many). `loadModel`
 * answers them the way a framework would: by walking the relation names of the path, after a
 * short wait, so the stories show the loading state. One relation («Contratos») points to a
 * model nobody can load, so the failure is drawn too.
 */

const STRING = ["=", "!=", "like", "in", "is null"];
const NUMBER = ["=", "!=", ">", ">=", "<", "<=", "between"];
const DATE = ["=", ">=", "<=", "between"];

const text = (): FieldDefinition => ({
  type: "string",
  nullable: true,
  sortable: true,
  ops: STRING,
});
const number = (): FieldDefinition => ({
  type: "number",
  nullable: false,
  sortable: true,
  ops: NUMBER,
});
const date = (): FieldDefinition => ({
  type: "date",
  nullable: true,
  sortable: true,
  ops: DATE,
});
const one = (relation: string): FieldDefinition => ({
  type: "relation",
  nullable: true,
  sortable: false,
  ops: [],
  kind: "relation",
  relation,
});
const many = (relation: string): FieldDefinition => ({ ...one(relation), many: true });

function model(
  aggregate: string,
  name: string,
  fields: Record<string, [FieldDefinition, string]>,
): ModelDefinition {
  return {
    aggregate,
    identity: "id",
    fields: Object.fromEntries(Object.entries(fields).map(([key, [field]]) => [key, field])),
    translations: {
      name: { default: name },
      labels: Object.fromEntries(
        Object.entries(fields).map(([key, [, label]]) => [key, { default: label }]),
      ),
    },
  };
}

export const INVOICE_MODEL = model("invoice", "Factura", {
  name: [text(), "Número"],
  state: [text(), "Estado"],
  date: [date(), "Fecha"],
  amount_total: [number(), "Total"],
  partner_id: [one("partner"), "Cliente"],
  lines: [many("invoice.line"), "Líneas"],
  contracts: [many("contract"), "Contratos"],
});

const MODELS: Record<string, ModelDefinition> = {
  partner: model("partner", "Cliente", {
    name: [text(), "Nombre"],
    city: [text(), "Ciudad"],
    credit_limit: [number(), "Límite de crédito"],
    country: [one("country"), "País"],
  }),
  country: model("country", "País", {
    name: [text(), "Nombre"],
    code: [text(), "Código"],
  }),
  "invoice.line": model("invoice.line", "Línea de factura", {
    product: [text(), "Producto"],
    quantity: [number(), "Cantidad"],
    price: [number(), "Precio unitario"],
    taxes: [many("tax"), "Impuestos"],
  }),
  tax: model("tax", "Impuesto", {
    name: [text(), "Nombre"],
    amount: [number(), "Monto"],
  }),
};

/** How long a «request» takes, so the stories show the loading state. */
const LATENCY = 250;

/** The model at the end of a path of relations, walked from the invoice. */
export const loadInvoiceModel: LoadModel = async (path) => {
  let current = INVOICE_MODEL;
  for (const name of path) {
    const relation = current.fields[name]?.relation;
    const next = relation === undefined || relation === null ? undefined : MODELS[relation];
    if (next === undefined) {
      await new Promise((done) => setTimeout(done, LATENCY));
      throw new Error(`HTTP 404 · model_meta_data/${relation ?? name}`);
    }
    current = next;
  }
  await new Promise((done) => setTimeout(done, LATENCY));
  return current;
};

/** Invoices with their related records inline, for the in-memory filter of the stories. */
export const INVOICES = [
  {
    name: "FAC-0418",
    state: "publicada",
    amount_total: 3480,
    partner_id: {
      name: "Clínica San Gabriel S.A.",
      country: { name: "Bolivia", code: "BO" },
    },
    lines: [
      {
        product: "Implementación Odoo",
        quantity: 1,
        price: 3000,
        taxes: [{ name: "IVA", amount: 13 }],
      },
      { product: "Capacitación", quantity: 2, price: 240, taxes: [] },
    ],
  },
  {
    name: "FAC-0419",
    state: "borrador",
    amount_total: 520,
    partner_id: { name: "Ferretería El Progreso", country: { name: "Perú", code: "PE" } },
    lines: [
      {
        product: "Soporte mensual",
        quantity: 1,
        price: 520,
        taxes: [{ name: "IVA", amount: 8 }],
      },
    ],
  },
  {
    name: "FAC-0420",
    state: "publicada",
    amount_total: 9100,
    partner_id: { name: "Constructora Illimani", country: { name: "Bolivia", code: "BO" } },
    lines: [
      {
        product: "Licencias",
        quantity: 10,
        price: 700,
        taxes: [
          { name: "IVA", amount: 13 },
          { name: "IT", amount: 3 },
        ],
      },
      {
        product: "Consultoría ISO",
        quantity: 3,
        price: 700,
        taxes: [{ name: "IT", amount: 3 }],
      },
    ],
  },
];
