import {
  Button,
  Field,
  Keypad,
  RadioGroup,
  SegmentedControl,
  Stepper,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Banknote, CreditCard, QrCode, ShoppingBag, Utensils, Wallet } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: **controles de mostrador** — lo que se toca en un POS, un kiosco o el checkout de
 * una tienda. El teclado numérico (`Keypad`) edita un valor como una calculadora, con su
 * pantalla arriba; lo que el número ES (cantidad, descuento, precio) lo dice la pantalla con un
 * `SegmentedControl` encima. `Stepper` es una cantidad que se aprieta, no se escribe: «−» y «+»
 * del tamaño de un control, y en el mínimo «−» quita la línea. `RadioGroup look="cards"` es la
 * misma elección de siempre dibujada como cajas que se tocan enteras.
 */
const meta: Meta = {
  title: "2 · Primitivas/Mostrador/Teclado, cantidad y opciones grandes",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-sm flex-col gap-3 rounded-box border border-line bg-surface p-4">
      {children}
    </div>
  );
}

/** **El teclado de una caja.** Cantidad, descuento o precio arriba; el número se escribe con
 *  el pulgar —o con el teclado físico, con el foco adentro—. La coma es la de Bolivia; el
 *  valor que viaja es «12.5». */
export const Teclado: Story = {
  render: function Render() {
    const [mode, setMode] = useState("qty");
    const [text, setText] = useState("");
    return (
      <Panel>
        <SegmentedControl
          aria-label="Qué se escribe"
          value={mode}
          onChange={setMode}
          options={[
            { value: "qty", label: "Cant." },
            { value: "disc", label: "% Desc." },
            { value: "price", label: "Precio" },
          ]}
        />
        <Keypad
          value={text}
          onChange={setText}
          decimals={mode === "qty" ? 0 : 2}
          screen={{
            label: {
              qty: "Capuchino · Cantidad",
              disc: "Capuchino · % Desc.",
              price: "Capuchino · Precio",
            }[mode],
            value: text === "" ? "0" : text.replace(".", ","),
          }}
        >
          <Button role="primary" size="lg" onClick={() => setText("")}>
            Aplicar
          </Button>
        </Keypad>
      </Panel>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "Precio" }));
    for (const key of ["1", "2"])
      await userEvent.click(canvas.getByRole("button", { name: key }));
    await userEvent.click(canvas.getByRole("button", { name: "Coma decimal" }));
    await userEvent.click(canvas.getByRole("button", { name: "5" }));
    await expect(canvas.getByText("12,5")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Borrar el último dígito" }));
    await expect(canvas.getByText("12,")).toBeVisible();
  },
};

/** **Dentro de un campo**, el campo lo nombra; para unidades no hay coma: la tecla junto al
 *  cero es «00». */
export const EnUnCampo: Story = {
  name: "En un campo, para unidades",
  render: function Render() {
    const [text, setText] = useState("3");
    return (
      <Panel>
        <Field label="Cantidad" hint={`Van ${text === "" ? 0 : text} unidades`}>
          <Keypad value={text} onChange={setText} decimals={0} size="md" />
        </Field>
      </Panel>
    );
  },
};

/** **El cobro.** Pocas opciones, elegidas con el dedo: cajas enteras con su ícono, no el punto
 *  de una lista. Sigue siendo un grupo de radio: las flechas mueven, una queda elegida. */
export const OpcionesGrandes: Story = {
  name: "Opciones grandes · el cobro",
  render: function Render() {
    const [method, setMethod] = useState<string | null>("qr");
    const [where, setWhere] = useState<string | null>(null);
    return (
      <div className="flex max-w-xl flex-col gap-5">
        <Field label="¿Dónde lo vas a comer?">
          <RadioGroup
            look="cards"
            value={where}
            onChange={setWhere}
            options={[
              { value: "here", label: "Comer aquí", icon: Utensils },
              { value: "away", label: "Para llevar", icon: ShoppingBag },
            ]}
          />
        </Field>
        <Field label="Método de pago">
          <RadioGroup
            look="cards"
            value={method}
            onChange={setMethod}
            options={[
              { value: "cash", label: "Efectivo", icon: Banknote, description: "Con vuelto" },
              {
                value: "qr",
                label: "QR",
                icon: QrCode,
                description: "Simple · cualquier banco",
              },
              {
                value: "card",
                label: "Tarjeta",
                icon: CreditCard,
                description: "Débito o crédito",
              },
              {
                value: "credit",
                label: "Crédito de la casa",
                icon: Wallet,
                description: "Requiere un cliente",
                disabled: true,
              },
            ]}
          />
        </Field>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Efectivo"));
    await expect(canvas.getByRole("radio", { name: /Efectivo/ })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: /Crédito de la casa/ })).toBeDisabled();
  },
};

/** **Una cantidad que se aprieta.** La línea de un pedido: en 1, «−» es un tacho y la quita. En
 *  el kiosco, grande. En lectura, la cifra. */
export const Cantidad: Story = {
  name: "Cantidad · Stepper",
  render: function Render() {
    const [coffee, setCoffee] = useState(2);
    const [cake, setCake] = useState<number | null>(1);
    const [people, setPeople] = useState(4);
    return (
      <div className="flex max-w-md flex-col gap-4 rounded-box border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-body text-ink">Capuchino</span>
          <Stepper
            value={coffee}
            onChange={setCoffee}
            min={1}
            max={20}
            unitLabel="Capuchino"
            onRemove={() => setCoffee(1)}
          />
        </div>
        {cake === null ? (
          <p className="text-meta text-muted">La torta se quitó del pedido.</p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-body text-ink">Torta de chocolate</span>
            <Stepper
              value={cake}
              onChange={setCake}
              min={1}
              unitLabel="Torta de chocolate"
              onRemove={() => setCake(null)}
            />
          </div>
        )}
        <Field label="Personas en la mesa">
          <Stepper value={people} onChange={setPeople} min={1} max={12} size="lg" />
        </Field>
        <Field label="En lectura">
          <Stepper value={people} onChange={setPeople} mode="read" />
        </Field>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Uno más: Capuchino" }));
    await expect(canvas.getAllByRole("spinbutton")[0]).toHaveAttribute("aria-valuenow", "3");
    /* At one, «−» is a bin: the line goes. */
    await userEvent.click(canvas.getByRole("button", { name: "Quitar: Torta de chocolate" }));
    await expect(canvas.getByText("La torta se quitó del pedido.")).toBeVisible();
    /* The spin button takes the arrows. */
    const people = canvas.getAllByRole("spinbutton")[1]!;
    people.focus();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    await expect(people).toHaveAttribute("aria-valuenow", "6");
  },
};
