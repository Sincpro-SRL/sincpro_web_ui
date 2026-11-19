import type {
  BuiltFilter,
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

const PARTNERS: readonly RecordOption[] = CUSTOMER_OPTIONS.map((one) => ({
  id: one.value,
  name: one.label,
  meta: `NIT ${one.value}`,
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
  User: USERS,
  Tag: TAGS,
};

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
