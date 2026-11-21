import { Button, Field, Keypad, RadioGroup, SegmentedControl } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Banknote, CreditCard, QrCode, ShoppingBag, Utensils, Wallet } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: **controles de mostrador** — lo que se toca en un POS, un kiosco o el checkout de
 * una tienda. El teclado numérico (`Keypad`) edita un valor como una calculadora; lo que el
 * número ES (cantidad, descuento, precio) lo dice la pantalla con un `SegmentedControl`
 * encima. `RadioGroup look="cards"` es la misma elección de siempre dibujada como cajas que
 * se tocan enteras: el método de pago, «comer aquí / para llevar», el envío.
 */
const meta: Meta = {
  title: "2 · Primitivas/Campos/Mostrador · teclado y opciones grandes",
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
        <p
          className="text-right text-display font-semibold text-ink tabular-nums"
          aria-live="polite"
        >
          {text === "" ? "0" : text.replace(".", ",")}
        </p>
        <Keypad value={text} onChange={setText} decimals={mode === "qty" ? 0 : 2}>
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
