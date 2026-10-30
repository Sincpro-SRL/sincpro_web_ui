import {
  CellStack,
  Field,
  type LineEditorState,
  type LineItemColumn,
  NumberInput,
  Picker,
  type PickerItem,
  TextInput,
  type TotalsRow,
} from "@sincpro/web-ui";
import { Package } from "lucide-react";

import {
  type InvoiceLine,
  INVOICES,
  lineTotal,
  money,
  PRODUCT_DETAIL,
  TAX_RATE,
} from "./erp";
import { PRODUCTS as CATALOG } from "./erp-catalog";

/**
 * Context: the lines of an invoice as `LineItems` reads them — the product catalogue a line
 * picks from, the columns, the popup editor and the totals. Shared by the component's stories
 * and the invoice template so both show the same block, built only from the public API.
 *
 * The catalogue joins the two the stories already had: the services of `erp.ts` (their price
 * is the one the invoices charge) and the products of `erp-catalog.ts` (with photos).
 */

type LineProduct = {
  name: string;
  description: string;
  sku: string;
  price: number;
  photo?: string;
};

const INVOICED_PRICE = new Map<string, number>(
  INVOICES.flatMap((i) => i.lines).map((l) => [l.product, l.unitPrice]),
);

export const LINE_PRODUCTS: readonly LineProduct[] = [
  ...CATALOG.map((p) => ({
    name: p.name,
    description: p.description,
    sku: p.sku,
    price: p.price,
    ...(p.photo === undefined ? {} : { photo: p.photo }),
  })),
  ...Object.entries(PRODUCT_DETAIL)
    .filter(([name]) => !CATALOG.some((p) => p.name === name))
    .map(([name, d]) => ({
      name,
      description: d.description,
      sku: d.sku,
      price: INVOICED_PRICE.get(name) ?? 0,
    })),
];

const BY_NAME = new Map(LINE_PRODUCTS.map((p) => [p.name, p]));

/** The picker's options: the name, the price to choose well, the code to type. */
export const PRODUCT_ITEMS: readonly PickerItem[] = LINE_PRODUCTS.map((p) => ({
  id: p.name,
  name: p.name,
  meta: money(p.price),
  haystack: p.sku,
}));

let next = 1000;

/** A line with nothing chosen yet: what «Agregar una línea» starts from. */
export function blankLine(): InvoiceLine {
  next += 1;
  return { id: `N${next}`, product: "", quantity: 1, unitPrice: 0, discount: 0 };
}

export function line(
  id: string,
  product: string,
  quantity: number,
  discount = 0,
): InvoiceLine {
  return { id, product, quantity, unitPrice: BY_NAME.get(product)?.price ?? 0, discount };
}

/** A draft quote of a point-of-sale setup: services and hardware, with a discount. */
export const DRAFT_LINES: readonly InvoiceLine[] = [
  line("D1", "Implementación Odoo — módulo de ventas", 1),
  line("D2", "Impresora térmica de tickets 80 mm", 3, 5),
  line("D3", "Lector de código de barras inalámbrico", 3),
  line("D4", "Licencia de usuario adicional", 12, 10),
];

/** Twenty-four lines: an order that is searched, not read. */
export const MANY_LINES: readonly InvoiceLine[] = Array.from({ length: 24 }, (_, i) =>
  line(
    `M${i + 1}`,
    LINE_PRODUCTS[(i * 5) % LINE_PRODUCTS.length]!.name,
    1 + ((i * 7) % 15),
    i % 4 === 0 ? 10 : 0,
  ),
);

const number = (v: number) => v.toLocaleString("es-BO");

/** The columns of an invoice line. The product reads in two lines — the name, and what tells
 *  it apart — with its picture when `pictures`; the numbers are edited in place. On a phone
 *  each line is a card: the product, «3 × Bs. 1.450,00 · desc. 5 %» under it and the amount
 *  at the right — the price is said by the quantity's `brief`, so its own column hides. */
export function lineColumns({
  pictures = false,
  productInCell = false,
} = {}): LineItemColumn<InvoiceLine>[] {
  return [
    {
      id: "product",
      header: "Producto",
      /* Adding in place needs the product in the cell: a new line is nothing without it. */
      ...(productInCell
        ? {
            edit: (l: InvoiceLine, set: (next: InvoiceLine) => void) => (
              <Picker
                aria-label="Producto"
                items={PRODUCT_ITEMS}
                value={l.product}
                onChange={(name) =>
                  set({ ...l, product: name, unitPrice: BY_NAME.get(name)?.price ?? 0 })
                }
                placeholder="Buscá un producto o su código…"
              />
            ),
          }
        : {}),
      value: (l) => l.product,
      text: (l) => `${l.product} ${BY_NAME.get(l.product)?.sku ?? ""}`,
      cell: (l) => {
        const p = BY_NAME.get(l.product);
        return (
          <CellStack
            primary={l.product === "" ? "—" : l.product}
            {...(p === undefined ? {} : { secondary: `${p.description} · ${p.sku}` })}
            {...(pictures
              ? {
                  media:
                    p?.photo === undefined
                      ? { icon: Package }
                      : { src: p.photo, alt: p.name },
                }
              : {})}
          />
        );
      },
    },
    {
      id: "quantity",
      header: "Cantidad",
      numeric: true,
      width: 120,
      value: (l) => l.quantity,
      cell: (l) => number(l.quantity),
      brief: (l) => `${number(l.quantity)} × ${money(l.unitPrice)}`,
      edit: (l, set) => (
        <NumberInput
          aria-label="Cantidad"
          value={l.quantity}
          min={0}
          onChange={(v) => set({ ...l, quantity: v === "" ? 0 : v })}
        />
      ),
    },
    {
      id: "price",
      header: "Precio unit.",
      numeric: true,
      width: 140,
      value: (l) => l.unitPrice,
      cell: (l) => money(l.unitPrice),
      stack: "hidden",
    },
    {
      id: "discount",
      header: "Desc. %",
      numeric: true,
      width: 110,
      value: (l) => l.discount,
      cell: (l) => (l.discount === 0 ? "—" : `${number(l.discount)} %`),
      brief: (l) => (l.discount === 0 ? null : `desc. ${number(l.discount)} %`),
      edit: (l, set) => (
        <NumberInput
          aria-label="Descuento %"
          value={l.discount}
          min={0}
          max={100}
          onChange={(v) => set({ ...l, discount: v === "" ? 0 : v })}
        />
      ),
    },
    {
      id: "amount",
      header: "Importe",
      numeric: true,
      width: 140,
      value: (l) => lineTotal(l),
      cell: (l) => money(lineTotal(l)),
      stack: "amount",
    },
  ];
}

/** The whole line as a form. Choosing the product brings its price; the amount is read. */
export function lineEditor(
  draft: InvoiceLine,
  set: (next: InvoiceLine) => void,
  state: LineEditorState,
) {
  return (
    <>
      <Field
        label="Producto"
        required
        error={
          state.tried && draft.product === ""
            ? "Elegí qué se vende en esta línea."
            : undefined
        }
      >
        <Picker
          items={PRODUCT_ITEMS}
          value={draft.product}
          onChange={(name) =>
            set({ ...draft, product: name, unitPrice: BY_NAME.get(name)?.price ?? 0 })
          }
          placeholder="Buscá un producto o su código…"
        />
      </Field>
      <Field label="Cantidad">
        <NumberInput
          value={draft.quantity}
          min={0}
          onChange={(v) => set({ ...draft, quantity: v === "" ? 0 : v })}
        />
      </Field>
      <Field label="Precio unitario" hint="Sale del producto; cambialo sólo para esta venta.">
        <NumberInput
          value={draft.unitPrice}
          min={0}
          format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          unit="Bs."
          onChange={(v) => set({ ...draft, unitPrice: v === "" ? 0 : v })}
        />
      </Field>
      <Field label="Descuento">
        <NumberInput
          value={draft.discount}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => set({ ...draft, discount: v === "" ? 0 : v })}
        />
      </Field>
      <Field label="Importe">
        <TextInput mode="read" value={money(lineTotal(draft))} />
      </Field>
    </>
  );
}

export const lineIsValid = (l: InvoiceLine) => l.product !== "";

/** The summary under the lines: IVA included in the price, shown apart for the fiscal invoice. */
export function lineTotals(lines: readonly InvoiceLine[]): TotalsRow[] {
  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const tax = total * TAX_RATE;
  return [
    { label: "Subtotal", value: money(total - tax) },
    { label: "IVA (13 %)", detail: "incluido en el precio", value: money(tax) },
    { label: "Total", value: money(total), total: true },
  ];
}

/** Undo puts the line back where it was. */
export function restoreAt<T>(list: readonly T[], item: T, index: number): T[] {
  const out = [...list];
  out.splice(Math.min(index, out.length), 0, item);
  return out;
}
