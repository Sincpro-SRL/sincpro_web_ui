import {
  ColorInput,
  type DataColumn,
  DataTable,
  DatePicker,
  DateTimePicker,
  DateValue,
  DurationInput,
  EmailInput,
  Field,
  FormModeProvider,
  NumberInput,
  PatternInput,
  PhoneInput,
  Picker,
  Priority,
  Select,
  Switch,
  Tag,
  TagsField,
  TextArea,
  TextInput,
  UrlInput,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, within } from "storybook/test";

const meta: Meta = {
  title: "3 · Componentes/Datos/Por tipo de dato",
  parameters: {
    docs: {
      description: {
        component:
          "**Qué control lleva cada tipo de dato**, y cómo se ve cuando se edita, cuando se lee y dentro de una tabla. Es el mapa para elegir: un monto es `NumberInput` con su moneda, una relación es `Picker`, varias etiquetas `TagsField`, un sí/no `Switch` (o `yesNo` en una columna). Cada control lee el modo del formulario (`FormModeProvider`): el mismo árbol se edita o se lee sin cambiar de componente.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const CUSTOMERS = [
  { id: "c1", name: "Clínica San Gabriel S.A.", meta: "NIT 1020304050" },
  { id: "c2", name: "Ferretería El Progreso", meta: "NIT 4587123018" },
];
const TERMS = [
  { value: "contado", label: "Contado" },
  { value: "30", label: "30 días" },
  { value: "60", label: "60 días" },
];
const LABELS = [
  { value: "urgente", label: "Urgente" },
  { value: "exportacion", label: "Exportación" },
  { value: "mayorista", label: "Mayorista" },
];

/** One data type: its name, the control it takes, and the control itself — drawn twice. */
type Kind = { type: string; control: string; draw: () => ReactNode };

function useKinds(): Kind[] {
  const [text, setText] = useState("Ferretería El Progreso");
  const [long, setLong] = useState(
    "Entregar por la puerta lateral.\nLlamar antes de llegar.",
  );
  const [nit, setNit] = useState("4587123018");
  const [qty, setQty] = useState<number | "">(12);
  const [money, setMoney] = useState<number | "">(1650);
  const [share, setShare] = useState<number | "">(0.13);
  const [hours, setHours] = useState<number | "">(2.5);
  const [day, setDay] = useState<string | null>("2026-11-19");
  const [when, setWhen] = useState<string | null>("2026-11-19T15:30");
  const [yes, setYes] = useState(true);
  const [term, setTerm] = useState("30");
  const [customer, setCustomer] = useState<string | undefined>("c2");
  const [labels, setLabels] = useState<string[]>(["urgente", "mayorista"]);
  const [stars, setStars] = useState(2);
  const [mail, setMail] = useState("compras@progreso.bo");
  const [phone, setPhone] = useState("+591 71234567");
  const [web, setWeb] = useState("progreso.bo");
  const [color, setColor] = useState("#1F6FEB");
  return [
    {
      type: "Texto corto",
      control: "TextInput",
      draw: () => <TextInput value={text} onChange={setText} />,
    },
    {
      type: "Texto largo",
      control: "TextArea",
      draw: () => <TextArea value={long} onChange={setLong} rows={2} />,
    },
    {
      type: "Identificador con formato",
      control: "PatternInput",
      draw: () => <PatternInput value={nit} onChange={setNit} pattern="##########" />,
    },
    {
      type: "Cantidad con unidad",
      control: "NumberInput unit",
      draw: () => <NumberInput value={qty} onChange={setQty} min={0} unit="u." />,
    },
    {
      type: "Monto",
      control: "NumberInput format currency",
      draw: () => (
        <NumberInput
          value={money}
          onChange={setMoney}
          min={0}
          format={{ style: "currency", currency: "BOB" }}
        />
      ),
    },
    {
      type: "Porcentaje",
      control: "NumberInput format percent",
      draw: () => (
        <NumberInput
          value={share}
          onChange={setShare}
          min={0}
          max={1}
          step={0.01}
          format={{ style: "percent" }}
        />
      ),
    },
    {
      type: "Duración",
      control: "DurationInput",
      draw: () => <DurationInput value={hours} onChange={setHours} />,
    },
    {
      type: "Fecha",
      control: "DatePicker",
      draw: () => <DatePicker value={day} onChange={setDay} />,
    },
    {
      type: "Fecha y hora",
      control: "DateTimePicker",
      draw: () => <DateTimePicker value={when} onChange={setWhen} />,
    },
    {
      type: "Sí / no",
      control: "Switch",
      draw: () => <Switch checked={yes} onChange={setYes} />,
    },
    {
      type: "Una opción de pocas",
      control: "Select",
      draw: () => <Select value={term} onChange={setTerm} options={TERMS} />,
    },
    {
      type: "Relación (many2one)",
      control: "Picker",
      draw: () => <Picker items={CUSTOMERS} value={customer} onChange={setCustomer} />,
    },
    {
      type: "Varias etiquetas (many2many)",
      control: "TagsField",
      draw: () => <TagsField value={labels} onChange={setLabels} options={LABELS} />,
    },
    {
      type: "Prioridad",
      control: "Priority",
      draw: () => <Priority value={stars} onChange={setStars} />,
    },
    {
      type: "Correo",
      control: "EmailInput",
      draw: () => <EmailInput value={mail} onChange={setMail} />,
    },
    {
      type: "Teléfono",
      control: "PhoneInput",
      draw: () => <PhoneInput value={phone} onChange={setPhone} whatsapp />,
    },
    {
      type: "Sitio web",
      control: "UrlInput",
      draw: () => <UrlInput value={web} onChange={setWeb} />,
    },
    {
      type: "Color",
      control: "ColorInput",
      draw: () => <ColorInput value={color} onChange={setColor} />,
    },
  ];
}

/**
 * **El mapa**: cada tipo de dato con su control, editándose a la izquierda y leyéndose a la
 * derecha — el mismo componente, con el modo del formulario. Lo que se edita en una columna se ve
 * leído en la otra.
 */
export const EditarYLeer: Story = {
  name: "Editar y leer",
  render: function Render() {
    const kinds = useKinds();
    return (
      <div className="bg-ground p-6">
        <table className="w-full max-w-5xl border-separate border-spacing-0 rounded-box border border-line bg-surface text-meta">
          <thead>
            <tr className="text-left text-micro text-muted">
              <th className="border-b border-line px-4 py-2 font-medium">tipo de dato</th>
              <th className="border-b border-line px-4 py-2 font-medium">control</th>
              <th className="border-b border-line px-4 py-2 font-medium">editando</th>
              <th className="border-b border-line px-4 py-2 font-medium">leyendo</th>
            </tr>
          </thead>
          <tbody>
            {kinds.map((kind) => (
              <tr key={kind.type} className="align-top">
                <th
                  scope="row"
                  className="border-b border-line px-4 py-3 text-left font-medium text-ink"
                >
                  {kind.type}
                </th>
                <td className="border-b border-line px-4 py-3 font-mono text-micro text-muted">
                  {kind.control}
                </td>
                <td className="w-80 border-b border-line px-4 py-3">
                  <FormModeProvider value="edit">
                    <Field label={kind.type}>{kind.draw()}</Field>
                  </FormModeProvider>
                </td>
                <td className="w-72 border-b border-line px-4 py-3">
                  <FormModeProvider value="read">
                    <Field label={kind.type}>{kind.draw()}</Field>
                  </FormModeProvider>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Every type is drawn twice: once to change it, once to read it.
    await expect(canvas.getAllByText("Monto", { selector: "th" })).toHaveLength(1);
    await expect(canvas.getAllByRole("switch", { name: "Sí / no" })).toHaveLength(1);
    await expect(canvas.getByRole("link", { name: "compras@progreso.bo" })).toBeVisible();
  },
};

type Line = {
  id: string;
  product: string;
  qty: number;
  amount: number;
  share: number;
  due: string;
  paid: boolean;
  state: "draft" | "posted";
  stars: number;
  mail: string;
};
const LINES: Line[] = [
  {
    id: "1",
    product: "Implementación Odoo",
    qty: 1,
    amount: 12500,
    share: 0.13,
    due: "2026-12-01",
    paid: true,
    state: "posted",
    stars: 3,
    mail: "compras@progreso.bo",
  },
  {
    id: "2",
    product: "Soporte mensual",
    qty: 2,
    amount: 3600,
    share: 0.13,
    due: "2026-11-25",
    paid: false,
    state: "draft",
    stars: 1,
    mail: "pagos@sangabriel.bo",
  },
];

/**
 * **Los mismos tipos en una tabla**: una cifra a la derecha con sus decimales (`numeric`,
 * `format`), una fecha como `DateValue`, un sí/no por su forma (`yesNo`), un estado como `Tag`,
 * la prioridad con sus estrellas.
 */
export const EnUnaTabla: Story = {
  name: "En una tabla",
  render: () => {
    const money = new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" });
    const columns: DataColumn<Line>[] = [
      { id: "product", header: "Producto", value: (l) => l.product },
      { id: "qty", header: "Cantidad", value: (l) => l.qty, numeric: true },
      {
        id: "amount",
        header: "Monto",
        value: (l) => l.amount,
        numeric: true,
        format: (n) => money.format(n),
      },
      {
        id: "share",
        header: "IVA",
        value: (l) => l.share,
        numeric: true,
        format: (n) => `${(n * 100).toLocaleString("es-BO")} %`,
      },
      {
        id: "due",
        header: "Vence",
        value: (l) => l.due,
        cell: (l) => <DateValue when={l.due} format="date" />,
      },
      { id: "paid", header: "Pagada", value: (l) => l.paid, yesNo: { look: "icon" } },
      {
        id: "state",
        header: "Estado",
        value: (l) => l.state,
        cell: (l) => (
          <Tag tone={l.state === "posted" ? "info" : "neutral"}>
            {l.state === "posted" ? "Publicada" : "Borrador"}
          </Tag>
        ),
      },
      {
        id: "stars",
        header: "Prioridad",
        value: (l) => l.stars,
        cell: (l) => <Priority value={l.stars} />,
      },
      { id: "mail", header: "Correo", value: (l) => l.mail },
    ];
    return (
      <div className="bg-ground p-6">
        <div className="rounded-box border border-line bg-surface">
          <DataTable<Line> data={LINES} columns={columns} getRowId={(l) => l.id} />
        </div>
      </div>
    );
  },
};
