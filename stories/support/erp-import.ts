/**
 * Context: the file of the «Importar» template — a spreadsheet of contacts as a person really
 * exports it from somewhere else: its own column names, a column nobody wants, a row without a
 * name, a mistyped e-mail and a customer the company already has. In an app the server reads
 * the file; here it is already read, and whatever file is dropped stands for this one.
 */

import type { SelectOption } from "@sincpro/web-ui";

import { CUSTOMER_OPTIONS } from "./erp";

/** One column of the file: its header as the file wrote it. */
export type FileColumn = { key: string; header: string };

export const IMPORT_FILE = {
  name: "contactos_noviembre.csv",
  detail: "9 filas · 6 columnas",
  columns: [
    { key: "A", header: "Razón social" },
    { key: "B", header: "NIT" },
    { key: "C", header: "E-mail" },
    { key: "D", header: "Celular" },
    { key: "E", header: "Ciudad" },
    { key: "F", header: "Observaciones" },
  ] satisfies FileColumn[],
  rows: [
    [
      "Librería Gisbert",
      "1004433021",
      "ventas@gisbert.com.bo",
      "+591 71 555 010",
      "La Paz",
      "",
    ],
    [
      "Hotel Los Tajibos",
      "1023344556",
      "compras@lostajibos.com",
      "+591 3 342-1000",
      "Santa Cruz",
      "VIP",
    ],
    [
      "",
      "4455667788",
      "info@sinnombre.bo",
      "+591 70 000 111",
      "Cochabamba",
      "sin razón social",
    ],
    [
      "Farmacia Chávez",
      "2233445566",
      "pedidos@farmaciachavez",
      "+591 72 123 456",
      "Sucre",
      "",
    ],
    [
      "Distribuidora Andina S.R.L.",
      "1028457021",
      "andina@distribuidora.bo",
      "+591 2 244-0000",
      "La Paz",
      "ya es cliente",
    ],
    [
      "Agropecuaria San Julián",
      "3300112244",
      "contacto@sanjulian.bo",
      "+591 75 998 877",
      "Santa Cruz",
      "",
    ],
    [
      "Taller Mecánico El Alto",
      "5566778899",
      "taller.elalto@gmail.com",
      "+591 76 543 210",
      "El Alto",
      "",
    ],
    [
      "Cooperativa Jesús Nazareno",
      "1012121212",
      "socios@jesusnazareno.coop",
      "+591 3 336-6000",
      "Santa Cruz",
      "",
    ],
    [
      "Café Typica",
      "6677889900",
      "hola@cafetypica.com",
      "+591 71 777 333",
      "La Paz",
      "pidió factura",
    ],
  ] as readonly (readonly string[])[],
};

/** What a column can become. `skip` is a real choice: a column nobody needs is answered,
 *  not left blank. */
export type ContactField = "name" | "taxId" | "email" | "phone" | "city" | "skip";

export const CONTACT_FIELDS: readonly (SelectOption & { value: ContactField })[] = [
  { value: "name", label: "Nombre" },
  { value: "taxId", label: "NIT" },
  { value: "email", label: "Correo" },
  { value: "phone", label: "Teléfono" },
  { value: "city", label: "Ciudad" },
  { value: "skip", label: "No importar" },
];

export const fieldLabel = (field: ContactField) =>
  CONTACT_FIELDS.find((f) => f.value === field)?.label ?? field;

/** Column key → field. */
export type Mapping = Readonly<Record<string, ContactField>>;

const SYNONYMS: Readonly<Record<Exclude<ContactField, "skip">, readonly string[]>> = {
  name: ["nombre", "razon social", "cliente"],
  taxId: ["nit", "ci", "documento"],
  email: ["correo", "e-mail", "email"],
  phone: ["telefono", "celular", "movil"],
  city: ["ciudad", "localidad"],
};

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** The first guess, from the headers: what an import screen offers before anyone touches it.
 *  A header it does not recognise is «No importar» — and the person can change it. */
export function guessMapping(columns: readonly FileColumn[]): Mapping {
  const out: Record<string, ContactField> = {};
  for (const column of columns) {
    const header = plain(column.header);
    const hit = (Object.keys(SYNONYMS) as Exclude<ContactField, "skip">[]).find((field) =>
      SYNONYMS[field].includes(header),
    );
    out[column.key] = hit ?? "skip";
  }
  return out;
}

/** Why the mapping cannot go on, or `undefined` when it can. */
export function mappingProblem(mapping: Mapping): string | undefined {
  const fields = Object.values(mapping).filter((f) => f !== "skip");
  if (!fields.includes("name")) return "Elegí qué columna es el «Nombre» para seguir.";
  const twice = fields.find((f, i) => fields.indexOf(f) !== i);
  if (twice !== undefined) return `«${fieldLabel(twice)}» está elegido en dos columnas.`;
  return undefined;
}

/** A row of the file, as it would become a contact — with the reason it cannot, if any. */
export type ImportRow = {
  id: string;
  line: number;
  name: string;
  taxId: string;
  email: string;
  phone: string;
  city: string;
  problem?: string;
};

const KNOWN_TAX_IDS = new Set(CUSTOMER_OPTIONS.map((c) => c.value as string));

/** The rows read through the mapping, each checked. */
export function reviewRows(mapping: Mapping): ImportRow[] {
  const keys = IMPORT_FILE.columns.map((c) => c.key);
  const valueOf = (row: readonly string[], field: ContactField) => {
    const key = Object.keys(mapping).find((k) => mapping[k] === field);
    return key === undefined ? "" : (row[keys.indexOf(key)] ?? "");
  };
  return IMPORT_FILE.rows.map((row, i) => {
    const one: ImportRow = {
      id: `fila-${i + 2}`,
      /* Line 1 is the header: the person looks for line 4 in their spreadsheet, not row 3. */
      line: i + 2,
      name: valueOf(row, "name"),
      taxId: valueOf(row, "taxId"),
      email: valueOf(row, "email"),
      phone: valueOf(row, "phone"),
      city: valueOf(row, "city"),
    };
    const problem =
      one.name === ""
        ? "Falta el nombre."
        : one.email !== "" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(one.email)
          ? "El correo no es válido."
          : one.taxId !== "" && KNOWN_TAX_IDS.has(one.taxId)
            ? "Ya existe un contacto con ese NIT."
            : undefined;
    return problem === undefined ? one : { ...one, problem };
  });
}

/** The contacts the company already has, as the list of the template starts. */
export type Contact = {
  id: string;
  name: string;
  taxId: string;
  email: string;
  city: string;
};

export const EXISTING_CONTACTS: readonly Contact[] = CUSTOMER_OPTIONS.map((c, i) => ({
  id: `c-${i + 1}`,
  name: c.label,
  taxId: c.value,
  email: "",
  city: ["La Paz", "Santa Cruz", "Cochabamba"][i % 3]!,
}));
