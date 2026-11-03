import {
  Button,
  createCopy,
  type DataColumn,
  DataTable,
  Field,
  flatten,
  FormModeProvider,
  pickAll,
  propsOf,
  slot,
  Tag,
  useFieldIds,
  useFormMode,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: what an APPLICATION writes on top of web-ui, written the way an application
 * would — importing only `@sincpro/web-ui` (`tests/templates.test.ts` checks it). Each recipe
 * is a test of openness: if what it uses stops being public, it stops compiling, and the day
 * the package closes a door is the day this file goes red. Unlike a template, a recipe may
 * style its own piece with the tokens' classes: that is the application's code.
 */
const meta: Meta = {
  title: "6 · Extender/Recetas",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/* ================================================================== *
 *  1 · A CONTROL OF YOUR OWN, inside a `Field`
 * ================================================================== */

const SWATCHES = ["#1d4ed8", "#15803d", "#b45309"] as const;
const SWATCH_NAMES = ["Azul", "Verde", "Ámbar"] as const;

/** An application's control: it speaks the contract in `foundations/form` — the ids its
 *  `Field` hands down, and whether the form is being read or written. */
function ColorChoice({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (next: number) => void;
  id?: string;
}) {
  const ids = useFieldIds({ id });
  const read = useFormMode() === "read";
  if (read) return <span className="text-meta text-ink">{SWATCH_NAMES[value]}</span>;
  return (
    <div
      role="radiogroup"
      id={ids.id}
      aria-labelledby={ids.labelledBy}
      aria-describedby={ids.describedBy}
      className="flex gap-2"
    >
      {SWATCH_NAMES.map((name, i) => (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={name}
          onClick={() => onChange(i)}
          className="size-(--size-control-sm) rounded-pill border border-line-strong aria-checked:outline-2 aria-checked:outline-offset-2 aria-checked:outline-primary"
          /* The colour IS the data here — a brand colour the person chose. */
          style={{ background: SWATCHES[i] }}
        />
      ))}
    </div>
  );
}

/** **Un control propio.** Se escribe adentro de un `Field` como cualquier otro: lee los ids
 *  con `useFieldIds` (la etiqueta lo nombra) y el modo con `useFormMode` (en lectura es texto). */
export const ControlPropio: Story = {
  render: function Render() {
    const [color, setColor] = useState(0);
    const [read, setRead] = useState(false);
    return (
      <div className="flex max-w-sm flex-col gap-4">
        <FormModeProvider value={read ? "read" : "edit"}>
          <Field label="Color de la marca" hint="Se usa en los documentos impresos.">
            <ColorChoice value={color} onChange={setColor} />
          </Field>
        </FormModeProvider>
        <Button role="ghost" size="sm" onClick={() => setRead(!read)}>
          {read ? "Editar" : "Ver"}
        </Button>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole("radiogroup", { name: "Color de la marca" });
    await expect(group).toHaveAccessibleDescription("Se usa en los documentos impresos.");
    await userEvent.click(within(group).getByRole("radio", { name: "Verde" }));
    await userEvent.click(canvas.getByRole("button", { name: "Ver" }));
    await expect(canvas.getByText("Verde")).toBeVisible();
  },
};

/* ================================================================== *
 *  2 · A CELL WITH ANYTHING INSIDE
 * ================================================================== */

type Stock = { id: string; product: string; onHand: number; min: number };
const STOCK: Stock[] = [
  { id: "p1", product: "Cemento 50 kg", onHand: 140, min: 40 },
  { id: "p2", product: "Fierro 12 mm", onHand: 12, min: 30 },
];

/** The application's piece, drawn in a cell: the system's `Tag` with its own rule. */
function Level({ item }: { item: Stock }) {
  return item.onHand < item.min ? (
    <Tag tone="bad">{`Faltan ${item.min - item.onHand}`}</Tag>
  ) : (
    <Tag tone="good">Suficiente</Tag>
  );
}

const STOCK_COLUMNS: DataColumn<Stock>[] = [
  { id: "product", header: "Producto", value: (s) => s.product },
  { id: "onHand", header: "Existencia", value: (s) => s.onHand, numeric: true },
  {
    id: "level",
    header: "Nivel",
    value: (s) => s.onHand - s.min,
    cell: (s) => <Level item={s} />,
    copy: false,
  },
];

/** **Una celda con lo que sea.** `cell` dibuja una pieza de la aplicación; `value` sigue siendo
 *  la clave por la que se ordena. Para mirar una lista de otra manera —un mapa, una galería—,
 *  `List.Present`: ver `4 · Vistas/Lista › Una presentación propia`. */
export const CeldaPropia: Story = {
  render: () => <DataTable data={STOCK} columns={STOCK_COLUMNS} getRowId={(s) => s.id} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Faltan 18")).toBeVisible();
  },
};

/* ================================================================== *
 *  3 · A COMPOUND PIECE, written as a tree
 * ================================================================== */

type StepProps = { title: string; done?: boolean };
const ChecklistStep = slot("step", (_props: StepProps): ReactNode => null);

/** The application's compound piece, written like `List` and `Record`: the steps are what
 *  is WRITTEN inside, in that order — there is no second list that could disagree. */
function Checklist({ title, children }: { title: string; children: ReactNode }) {
  const steps = pickAll(flatten(children), "step").map((node) => propsOf<StepProps>(node)!);
  const done = steps.filter((one) => one.done === true).length;
  return (
    <section aria-label={title} className="flex max-w-sm flex-col gap-2">
      <h3 className="text-meta font-semibold text-ink">{`${title} · ${done} de ${steps.length}`}</h3>
      <ol className="flex flex-col gap-1">
        {steps.map((one) => (
          <li key={one.title} className="flex items-center gap-2 text-meta text-ink">
            <Tag tone={one.done === true ? "good" : "neutral"}>
              {one.done === true ? "hecho" : "falta"}
            </Tag>
            {one.title}
          </li>
        ))}
      </ol>
    </section>
  );
}
Checklist.Step = ChecklistStep;

/** **Una pieza compuesta.** `slot()` marca las ranuras; `flatten`, `pickAll` y `propsOf` las
 *  leen. Si no está escrita, no está. */
export const PiezaCompuesta: Story = {
  render: () => (
    <Checklist title="Cierre del mes">
      <Checklist.Step title="Conciliar bancos" done />
      <Checklist.Step title="Revisar facturas sin pagar" />
      <Checklist.Step title="Emitir el balance" />
    </Checklist>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading")).toHaveTextContent("Cierre del mes · 1 de 3");
    await expect(canvas.getAllByRole("listitem")[2]).toHaveTextContent("Emitir el balance");
  },
};

/* ================================================================== *
 *  4 · THE APPLICATION'S OWN WORDS
 * ================================================================== */

/** The application's catalog: the same mechanism web-ui's words use, apart from them. */
const appCopy = createCopy({ invoice: { post: "Post", posted: "Posted on {date}" } });
appCopy.install({ invoice: { post: "Publicar", posted: "Publicada el {date}" } });

function PostButton() {
  const { invoice } = appCopy.useCopy();
  return (
    <button type="button" className="text-meta text-primary">
      {invoice.post}
    </button>
  );
}

/** **Textos propios.** `createCopy` da el catálogo de la aplicación con el mismo contrato que
 *  el de web-ui: `install` para el idioma de la sesión, `Provider` para un sector (sobre lo que
 *  lo rodea, sin tocar lo instalado), `useCopy` en el componente. */
export const TextosPropios: Story = {
  render: () => (
    <div className="flex gap-4">
      <PostButton />
      <appCopy.Provider copy={{ invoice: { post: "Confirmar" } }}>
        <PostButton />
      </appCopy.Provider>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Publicar" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Confirmar" })).toBeVisible();
  },
};
