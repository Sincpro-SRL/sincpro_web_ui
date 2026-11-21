import type { ResourceRef, ViewProps, ViewSpec } from "@sincpro/web-composer";
import {
  Button,
  Field,
  Keypad,
  type LineItemColumn,
  LineItems,
  List,
  Pane,
  Panes,
  Record,
  RecordCard,
  SearchField,
  Stepper,
  Switch,
  Tags,
  TextInput,
  Totals,
  useToast,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Banknote, CreditCard, QrCode, Receipt, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { Workspace } from "../../support/composer";
import {
  bs,
  CATEGORIES,
  codeOf,
  lineAmount,
  MENU,
  type MenuCategory,
  type MenuItem,
  type TicketLine,
} from "../../support/erp-pos";

/**
 * Context: **la caja rápida** — un mostrador de paso (una cafetería a la salida del metro, un
 * kiosco de diarios, una farmacia) donde cada venta dura diez segundos y nada se pregunta dos
 * veces. Una sola pantalla, sin modales y sin pasos: se escanea o se toca, y se cobra con UN
 * toque — «Efectivo exacto» (F9), «QR» (F10) o «Tarjeta» (F11). Cobrado, el aviso ofrece
 * «Deshacer» y el ticket siguiente ya está abierto: no hay un «¿seguro?» ni un «Aceptar» de por
 * medio. La factura no es un trámite: un interruptor y el NIT, en el mismo lugar. Si el cliente
 * paga con otro billete, «Con vuelto» abre el teclado ahí mismo.
 *
 * La misma lista en mosaicos, el registro, el `Stepper`, el teclado y el dock de siempre: la
 * diferencia con el punto de venta completo es lo que se DEJA AFUERA.
 */
const meta: Meta = {
  tags: ["screen"],
  title: "5 · Plantillas/Mostrador/Caja rápida · tocar y cobrar",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Escaneá (el código y Enter) o tocá productos; cobrá con un toque: efectivo exacto, QR o tarjeta. El ticket siguiente ya está abierto; el aviso ofrece «Deshacer».",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

type Method = "efectivo" | "QR" | "tarjeta";

const COLUMNS: readonly LineItemColumn<TicketLine>[] = [
  { id: "name", header: "Producto", value: (l) => l.name },
  {
    id: "quantity",
    header: "Cant.",
    numeric: true,
    value: (l) => l.quantity,
    brief: (l) => `${l.quantity} × ${bs(l.price)}`,
    edit: (l, set) => (
      <Stepper
        value={l.quantity}
        min={1}
        unitLabel={l.name}
        onChange={(quantity) => set({ ...l, quantity })}
      />
    ),
  },
  {
    id: "amount",
    header: "Importe",
    numeric: true,
    value: (l) => lineAmount(l),
    cell: (l) => bs(lineAmount(l)),
  },
];

function Express({ api }: ViewProps) {
  const toast = useToast();
  const [lines, setLines] = useState<readonly TicketLine[]>([]);
  const [number, setNumber] = useState(231);
  const [scan, setScan] = useState("");
  const [category, setCategory] = useState<MenuCategory | "all">("all");
  const [invoice, setInvoice] = useState(false);
  const [taxId, setTaxId] = useState("");
  const [withChange, setWithChange] = useState(false);
  const [received, setReceived] = useState("");
  useEffect(() => api.setTitle(`Caja rápida · Ticket ${number}`), [api, number]);

  const total = Math.round(lines.reduce((sum, l) => sum + lineAmount(l), 0) * 100) / 100;
  const got = received === "" ? 0 : Number(received);
  const change = Math.round((got - total) * 100) / 100;
  const shown = MENU.filter((m) => category === "all" || m.category === category);

  const add = (item: MenuItem) => {
    if (item.stock === 0) {
      toast.show({ message: `${item.name}: agotado.`, tone: "warn" });
      return;
    }
    setLines((now) =>
      now.some((l) => l.item === item.id)
        ? now.map((l) => (l.item === item.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [
            ...now,
            {
              id: `${number}-${item.id}`,
              item: item.id,
              name: item.name,
              quantity: 1,
              price: item.price,
              discount: 0,
            },
          ],
    );
  };
  /* A scanner types the code and an Enter: the box empties for the next one at once. */
  const scanned = (code: string) => {
    const item = MENU.find((m) => codeOf(m) === code.trim());
    setScan("");
    if (item === undefined) {
      toast.show({ message: `Ningún producto con el código ${code}.`, tone: "warn" });
      return;
    }
    add(item);
  };
  const pay = (method: Method) => {
    const sold = { lines, number, total };
    const paidWith = method === "efectivo" && withChange ? got : total;
    const doc = invoice && taxId.trim() !== "" ? ` · factura a NIT ${taxId.trim()}` : "";
    const back =
      method === "efectivo" && withChange && change > 0 ? ` · vuelto ${bs(change)}` : "";
    setLines([]);
    setNumber(number + 1);
    setInvoice(false);
    setTaxId("");
    setWithChange(false);
    setReceived("");
    toast.show({
      message: `Ticket ${sold.number} cobrado · ${bs(paidWith > 0 ? sold.total : 0)} en ${method}${doc}${back}.`,
      tone: "good",
      action: {
        label: "Deshacer",
        onSelect: () => {
          setLines(sold.lines);
          setNumber(sold.number);
        },
      },
    });
  };
  const empty = lines.length === 0;
  const short = withChange && got < total;

  return (
    <Panes>
      <Pane label="Productos">
        <List<MenuItem> items={shown} keyOf={(m) => m.id} present="tiles" onChoose={add}>
          <List.Bar>
            <List.Identity title="Caja rápida" description="escaneá o tocá" />
            <List.Search>
              <SearchField
                value={scan}
                onChange={setScan}
                onSubmit={scanned}
                placeholder="Escaneá o escribí el código…"
              />
            </List.Search>
          </List.Bar>
          <List.Filters>
            <Tags
              size="lg"
              scroll
              label="Categorías"
              items={[{ id: "all", label: "Todo" }, ...CATEGORIES].map((c) => ({
                id: c.id,
                label: c.label,
                selected: category === c.id,
                onSelect: () => setCategory(c.id as MenuCategory | "all"),
              }))}
            />
          </List.Filters>
          <List.Tiles<MenuItem>
            size="sm"
            card={(m, ways) => {
              const taken = lines.find((l) => l.item === m.id)?.quantity ?? 0;
              return (
                <RecordCard
                  layout="tile"
                  title={m.name}
                  figure={bs(m.price)}
                  media={{ src: m.photo, alt: "" }}
                  {...(m.stock === 0 ? { meta: "Agotado" } : {})}
                  {...(taken === 0 ? {} : { badge: taken })}
                  disabled={m.stock === 0}
                  {...(ways.press === undefined ? {} : { onOpen: ways.press })}
                />
              );
            }}
          />
        </List>
      </Pane>
      <Pane size="narrow" label="Ticket">
        <Record
          identity={{
            icon: Zap,
            title: `Ticket ${number}`,
            subtitle: empty ? "Escaneá o tocá un producto" : `${lines.length} productos`,
            figure: { label: "total", value: bs(total) },
          }}
        >
          <Record.Rail>
            <Record.Dock
              label="Cobrar"
              visible={3}
              actions={[
                {
                  id: "cash",
                  label: withChange
                    ? `Cobrar con vuelto ${bs(change > 0 ? change : 0)}`
                    : `Efectivo exacto ${bs(total)}`,
                  icon: Banknote,
                  primary: true,
                  shortcut: "F9",
                  disabled: empty || short,
                  onSelect: () => pay("efectivo"),
                },
                {
                  id: "qr",
                  label: "QR",
                  icon: QrCode,
                  shortcut: "F10",
                  disabled: empty,
                  onSelect: () => pay("QR"),
                },
                {
                  id: "card",
                  label: "Tarjeta",
                  icon: CreditCard,
                  shortcut: "F11",
                  disabled: empty,
                  onSelect: () => pay("tarjeta"),
                },
              ]}
            />
          </Record.Rail>
          <Record.Paper>
            <LineItems<TicketLine>
              lines={lines}
              columns={COLUMNS}
              getLineId={(l) => l.id}
              lineLabel={(l) => l.name}
              onChange={(id, next) =>
                setLines((now) => now.map((l) => (l.id === id ? next : l)))
              }
              onRemove={(id) => setLines((now) => now.filter((l) => l.id !== id))}
              totals={[{ label: "Total", value: bs(total), total: true }]}
            />
            <Switch checked={invoice} onChange={setInvoice}>
              Con factura
            </Switch>
            {invoice ? (
              <Field label="NIT o CI" hint="La razón social sale del padrón">
                <TextInput value={taxId} onChange={setTaxId} placeholder="1028457021" />
              </Field>
            ) : null}
            <Switch checked={withChange} onChange={setWithChange}>
              Con vuelto (paga con otro billete)
            </Switch>
            {withChange ? (
              <>
                <Keypad
                  value={received}
                  onChange={setReceived}
                  decimals={2}
                  extra="double-zero"
                  size="md"
                  screen={{ label: "Recibido", value: received === "" ? "0" : bs(got) }}
                />
                <Totals
                  rows={[
                    { label: "A cobrar", value: bs(total) },
                    { label: "Vuelto", value: short ? "—" : bs(change), total: true },
                  ]}
                />
              </>
            ) : null}
            <Button role="ghost" icon={Receipt} disabled={empty} onClick={() => setLines([])}>
              Vaciar el ticket
            </Button>
          </Record.Paper>
        </Record>
      </Pane>
    </Panes>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "rapida",
    kind: "caja",
    title: () => "Caja rápida",
    icon: Zap,
    load: async () => Express,
  },
];
const start: ResourceRef = { domain: "rapida", kind: "caja" };

/** **Escanear, tocar y cobrar en un toque.** El código de un americano y Enter; dos salteñas
 *  tocadas; «Efectivo exacto». El ticket 232 ya está abierto. */
export const Cobrar: Story = {
  name: "Escanear, tocar y cobrar",
  render: () => <Workspace views={VIEWS} start={start} pointer="touch" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const products = within(await canvas.findByRole("region", { name: "Productos" }));
    /* The scanner: the code and an Enter. */
    await userEvent.type(products.getByRole("searchbox"), "7771001{Enter}");
    await userEvent.click(products.getByRole("button", { name: "Salteña de pollo" }));
    await userEvent.click(products.getByRole("button", { name: "Salteña de pollo" }));
    await userEvent.click(canvas.getByRole("button", { name: /^Efectivo exacto Bs 39,00/ }));
    await expect(
      await page.findByText(/Ticket 231 cobrado · Bs 39,00 en efectivo/),
    ).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Ticket 232" })).toBeVisible();
  },
};

/** **Con factura y con vuelto**, sin salir de la pantalla: el interruptor, el NIT, lo recibido
 *  en el teclado. */
export const FacturaYVuelto: Story = {
  name: "Con factura y vuelto",
  render: () => <Workspace views={VIEWS} start={start} pointer="touch" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const products = within(await canvas.findByRole("region", { name: "Productos" }));
    await userEvent.click(products.getByRole("button", { name: "Capuchino" }));
    await userEvent.click(canvas.getByRole("switch", { name: "Con factura" }));
    await userEvent.type(canvas.getByRole("textbox", { name: /NIT o CI/ }), "1028457021");
    await userEvent.click(canvas.getByRole("switch", { name: /Con vuelto/ }));
    await userEvent.click(canvas.getByRole("button", { name: "5" }));
    await userEvent.click(canvas.getByRole("button", { name: "0" }));
    await userEvent.click(
      canvas.getByRole("button", { name: /^Cobrar con vuelto Bs 30,00/ }),
    );
    await expect(
      await page.findByText(/factura a NIT 1028457021 · vuelto Bs 30,00/),
    ).toBeVisible();
  },
};
