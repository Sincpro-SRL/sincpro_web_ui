import type {
  BuiltFilter,
  FieldPathValue,
  ModelDefinition,
  RecordOption,
  RecordSearch,
  SearchRecords,
} from "@sincpro/web-ui";

import {
  CUSTOMER_OPTIONS,
  type Invoice,
  INVOICES,
  SALESPERSON_OPTIONS,
  STATE_LABEL,
  subtotalOf,
} from "./erp";
import { INVOICE_LABELS } from "./erp-tags";

/**
 * Context: the invoices as sincpro_framework publishes them (`model_meta_data`): a many2one is
 * identified by its FOREIGN KEY (`customer_id`), not by a name, a many2many has no column on
 * this side, and an enum carries the word of each value. And the application's search over the
 * records of a relation — what web-framework gives `SearchProvider` — answered here from memory,
 * a little late, the way a server does.
 */

const FK_OPS = ["=", "!=", "in", "not in", "is null", "is not null"];

export const INVOICE_SEARCH_MODEL: ModelDefinition = {
  aggregate: "invoice",
  identity: "id",
  fields: {
    number: { type: "text", nullable: false, sortable: true, ops: ["=", "!=", "like"] },
    state: {
      type: "text",
      nullable: false,
      sortable: true,
      ops: ["=", "!=", "in", "not in"],
      choices: Object.keys(STATE_LABEL),
    },
    date: { type: "date", nullable: false, sortable: true, ops: ["=", ">", ">=", "<", "<="] },
    total: {
      type: "monetary",
      nullable: false,
      sortable: true,
      ops: ["=", "!=", ">", ">=", "<", "<="],
    },
    customer: {
      type: "many2one",
      nullable: false,
      sortable: false,
      ops: [],
      kind: "relation",
      relation: "Partner",
      identifiedBy: "customer_id",
    },
    customer_id: { type: "text", nullable: false, sortable: true, ops: FK_OPS },
    salesperson: {
      type: "many2one",
      nullable: true,
      sortable: false,
      ops: [],
      kind: "relation",
      relation: "User",
      identifiedBy: "salesperson_id",
    },
    salesperson_id: { type: "text", nullable: true, sortable: true, ops: FK_OPS },
    labels: {
      type: "many2many",
      nullable: true,
      sortable: false,
      ops: [],
      kind: "relation",
      many: true,
      relation: "Tag",
    },
  },
  translations: {
    name: { default: "Factura" },
    labels: {
      number: { default: "Número" },
      state: { default: "Estado" },
      date: { default: "Fecha" },
      total: { default: "Total" },
      customer: { default: "Cliente" },
      customer_id: { default: "Cliente" },
      salesperson: { default: "Vendedor" },
      salesperson_id: { default: "Vendedor" },
      labels: { default: "Etiquetas" },
    },
    choices: {
      state: Object.fromEntries(
        Object.entries(STATE_LABEL).map(([value, word]) => [value, { default: word }]),
      ),
    },
  },
};

/* ── The records on the other side ─────────────────────────────────── */

export type Region = "andina" | "cono-sur" | "amazonica";
const REGION_LABEL: Record<Region, string> = {
  andina: "Andina",
  "cono-sur": "Cono Sur",
  amazonica: "Amazónica",
};

export type CountryRow = { id: string; name: string; code: string; region: Region };
export const COUNTRY_ROWS: readonly CountryRow[] = [
  { id: "BO", name: "Bolivia", code: "BO", region: "andina" },
  { id: "PE", name: "Perú", code: "PE", region: "andina" },
  { id: "EC", name: "Ecuador", code: "EC", region: "andina" },
  { id: "CL", name: "Chile", code: "CL", region: "cono-sur" },
  { id: "AR", name: "Argentina", code: "AR", region: "cono-sur" },
  { id: "PY", name: "Paraguay", code: "PY", region: "cono-sur" },
  { id: "BR", name: "Brasil", code: "BR", region: "amazonica" },
];

export type PartnerRow = {
  id: string;
  name: string;
  tax_id: string;
  country_id: string;
  country: CountryRow;
};
const PARTNER_COUNTRY = ["BO", "PE", "BO", "AR", "BO", "CL"];
export const PARTNER_ROWS: readonly PartnerRow[] = CUSTOMER_OPTIONS.map((one, at) => {
  const country = COUNTRY_ROWS.find((each) => each.id === PARTNER_COUNTRY[at % 6])!;
  return {
    id: one.value,
    name: one.label,
    tax_id: one.value,
    country_id: country.id,
    country,
  };
});

/** A customer as a many2one reaches it: the record, with its own country. */
export function partnerOf(taxId: string): PartnerRow | undefined {
  return PARTNER_ROWS.find((one) => one.id === taxId);
}

export const COUNTRY_MODEL: ModelDefinition = {
  aggregate: "country",
  identity: "id",
  fields: {
    name: { type: "text", nullable: false, sortable: true, ops: ["=", "!=", "like"] },
    code: { type: "text", nullable: false, sortable: true, ops: ["=", "!=", "like"] },
    region: {
      type: "text",
      nullable: false,
      sortable: true,
      ops: ["=", "!=", "in", "not in"],
      choices: Object.keys(REGION_LABEL),
    },
  },
  translations: {
    name: { default: "País" },
    labels: {
      name: { default: "Nombre" },
      code: { default: "Código" },
      region: { default: "Región" },
    },
    choices: {
      region: Object.fromEntries(
        Object.entries(REGION_LABEL).map(([value, word]) => [value, { default: word }]),
      ),
    },
  },
};

export const PARTNER_MODEL: ModelDefinition = {
  aggregate: "partner",
  identity: "id",
  fields: {
    name: { type: "text", nullable: false, sortable: true, ops: ["=", "!=", "like"] },
    tax_id: { type: "text", nullable: false, sortable: true, ops: ["=", "like"] },
    country: {
      type: "many2one",
      nullable: true,
      sortable: false,
      ops: [],
      kind: "relation",
      relation: "Country",
      identifiedBy: "country_id",
    },
    country_id: {
      type: "text",
      nullable: true,
      sortable: true,
      ops: ["=", "!=", "in", "not in", "is null", "is not null"],
    },
  },
  translations: {
    name: { default: "Cliente" },
    labels: {
      name: { default: "Nombre" },
      tax_id: { default: "NIT" },
      country: { default: "País" },
      country_id: { default: "País" },
    },
  },
};

const NAMED_MODEL = (aggregate: string, label: string): ModelDefinition => ({
  aggregate,
  identity: "id",
  fields: { name: { type: "text", nullable: false, sortable: true, ops: ["=", "like"] } },
  translations: { name: { default: label }, labels: { name: { default: "Nombre" } } },
});

const MODELS_AT: Readonly<Record<string, ModelDefinition>> = {
  customer: PARTNER_MODEL,
  "customer.country": COUNTRY_MODEL,
  salesperson: NAMED_MODEL("user", "Vendedor"),
  labels: NAMED_MODEL("tag", "Etiqueta"),
};

/** The model at the end of a path of relations, a little late — what `loadModel` answers. */
export function loadInvoiceModel(path: FieldPathValue): Promise<ModelDefinition> {
  const model = MODELS_AT[path.join(".")];
  return new Promise((resolve, reject) =>
    setTimeout(
      () => (model === undefined ? reject(new Error(`no model at ${path}`)) : resolve(model)),
      120,
    ),
  );
}

const PARTNERS: readonly RecordOption[] = PARTNER_ROWS.map((one) => ({
  id: one.id,
  name: one.name,
  meta: `NIT ${one.tax_id} · ${one.country.name}`,
}));
const COUNTRIES: readonly RecordOption[] = COUNTRY_ROWS.map((one) => ({
  id: one.id,
  name: one.name,
  meta: one.code,
}));
const USERS: readonly RecordOption[] = SALESPERSON_OPTIONS.map((one) => ({
  id: one.value,
  name: one.label,
}));
const TAGS: readonly RecordOption[] = INVOICE_LABELS.map((one) => ({
  id: one.value,
  name: one.label,
}));
const RECORDS: Readonly<Record<string, readonly RecordOption[]>> = {
  Partner: PARTNERS,
  Country: COUNTRIES,
  User: USERS,
  Tag: TAGS,
};

/** Every record of a relation, for a chooser. */
export function recordsOf(relation: string): readonly RecordOption[] {
  return RECORDS[relation] ?? [];
}

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();

/** The labels of an invoice: a many2many, the same every time it is read. */
export function labelsOf(invoice: Invoice): string[] {
  const at = INVOICES.indexOf(invoice);
  return TAGS.filter((_, index) => (at + index) % 3 === 0).map((one) => String(one.id));
}

/** Every search asked, in order — a story reads it to show what the application was asked. */
export const ASKED: RecordSearch[] = [];

/**
 * The application's search over the records of a relation: by a text (its literal search, by
 * name and NIT) or by keys (to name the ones a filter carries). Six at most — a dropdown is not
 * a page —, 250 ms late, and quiet when the question was replaced.
 */
export const searchInvoiceRecords: SearchRecords = (search) => {
  ASKED.push(search);
  const all = RECORDS[search.relation] ?? [];
  const found =
    search.keys !== undefined
      ? all.filter((one) => search.keys!.some((key) => String(key) === String(one.id)))
      : all
          .filter(
            (one) =>
              fold(one.name).includes(fold(search.text)) ||
              fold(one.meta ?? "").includes(fold(search.text)),
          )
          .slice(0, 6);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(found), 250);
    search.signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("replaced", "AbortError"));
    });
  });
};

/** What a field of an invoice is, for the filters answered in memory (`keepMatching`). */
export function readInvoice(invoice: Invoice, field: string): unknown {
  switch (field) {
    case "customer_id":
      return invoice.taxId;
    case "customer":
      return partnerOf(invoice.taxId);
    case "customer_name":
      return invoice.customer;
    case "salesperson_id":
      return invoice.salesperson;
    case "labels":
      return labelsOf(invoice).map((id) => ({ id }));
    case "total":
      return subtotalOf(invoice);
    default:
      return (invoice as unknown as Record<string, unknown>)[field];
  }
}

/** The set's own search: what a free text means — the number or the customer. */
export function literalInvoices(text: string): BuiltFilter {
  return {
    any: [
      { field: "number", operator: "like", value: `%${text}%` },
      { field: "customer_name", operator: "like", value: `%${text}%` },
    ],
  };
}
