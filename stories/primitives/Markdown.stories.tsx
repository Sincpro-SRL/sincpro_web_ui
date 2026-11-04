import { Markdown } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

/**
 * Context: **un documento escrito en texto**. Un mensaje, una nota o un README llegan en
 * markdown; se dibujan con streamdown, que lo parte en bloques y limpia el resultado: lo que
 * llega del texto no puede ejecutar nada en la página. Mientras el texto todavía llega
 * (`streaming`), lo que no se puede leer aún —una tabla sin cerrar, un bloque de código
 * abierto— se retiene en vez de mostrarse roto.
 */
const meta = {
  title: "2 · Primitivas/Markdown · un documento escrito en texto",
  component: Markdown,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Markdown dibujado como texto: títulos a la escala del producto, listas, enlaces, código. Se sanitiza siempre; `streaming` retiene lo que todavía no se puede leer. Sus clases vienen con `tokens.css`.",
      },
    },
  },
  args: { children: "" },
  render: (args) => <Markdown {...args} />,
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const NOTA = `# Conciliación de abril

La factura **0418** del proveedor coincide con la orden de compra. Quedan dos puntos:

- Falta el comprobante de retención.
- El monto en bolivianos usa el tipo de cambio del día 30.

## Próximos pasos

1. Pedir el comprobante al proveedor.
2. Confirmar el tipo de cambio con tesorería.

Más detalle en [el informe mensual](https://example.com/informe).`;

export const Documento: Story = {
  args: { children: NOTA, label: "Nota de conciliación" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("document", { name: "Nota de conciliación" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Conciliación de abril" }),
    ).toBeVisible();
  },
};

/** Un texto hostil: el script no llega a la página, el texto sí. */
export const Hostil: Story = {
  args: {
    children:
      'Pagado. <script>document.body.dataset.pwned = "1"</script> <img src=x onerror="document.body.dataset.pwned=1"> [clic](javascript:alert(1))',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("script")).toBeNull();
    await expect(canvasElement.querySelector("[onerror]")).toBeNull();
    await expect(document.body.dataset.pwned).toBeUndefined();
  },
};

/** Mientras llega: la tabla sin cerrar no se muestra rota. */
export const Llegando: Story = {
  args: {
    children:
      "Resumen del período:\n\n| Cuenta | Saldo |\n| --- | --- |\n| Caja | 1.200,00 |\n| Ban",
    streaming: true,
  },
};
