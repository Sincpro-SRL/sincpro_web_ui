import { QrCode } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";

/**
 * Context: **un código QR** — el cobro por QR de una caja o de un portal, el enlace que verifica
 * una factura, un registro para abrir en el teléfono. Negro sobre blanco en los DOS temas: un
 * escáner lee oscuro sobre claro. El codificador se trae recién cuando se dibuja un código, y
 * mientras tanto un cuadrado callado guarda el lugar. Es una imagen: su nombre dice qué hace.
 */
const meta: Meta = {
  title: "2 · Primitivas/Valores/QR · cobrar, verificar, abrir",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** **Los tres tamaños**: el pie de una factura, la pantalla de la caja, la del cliente. */
export const Tamanos: Story = {
  name: "Tamaños",
  render: () => (
    <div className="flex flex-wrap items-end gap-8">
      <QrCode
        size="sm"
        value="https://siat.impuestos.gob.bo/consulta?nit=1020304050&cuf=ABC123&numero=47"
        label="QR para verificar la factura 0047"
        caption="Verificá la factura"
      />
      <QrCode
        value="sincpro-pay:caja1?monto=46.00&moneda=BOB"
        label="QR para pagar Bs 46,00"
        caption="Bs 46,00"
      />
      <QrCode
        size="lg"
        level="H"
        value="sincpro-pay:kiosco?pedido=118&monto=58.00&moneda=BOB"
        label="QR para pagar el pedido 118, Bs 58,00"
        caption="Pedido 118 · Bs 58,00"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("img", { name: "QR para pagar Bs 46,00" }),
    ).toBeInTheDocument();
    /* The encoder arrives, and every code is drawn. */
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('[data-ui="qr"] path')).toHaveLength(3),
    );
  },
};
