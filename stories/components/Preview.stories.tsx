import { FilePreview, type PreviewFile, ToastProvider } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";

/**
 * Context: **la vista previa del archivo**, el paso que sigue a `Attachments`: la lista dice
 * dónde abrir, y la aplicación monta esto —en un peek, al costado o en un modal del
 * espacio de trabajo— para ver el archivo sin salir del registro. El renderizador lo elige el
 * tipo: imagen, PDF (pdf.js, cargado recién cuando se abre), markdown, texto, y para lo demás
 * no se finge una vista: se dice y queda la descarga.
 */
const meta = {
  title: "3 · Componentes/Vista previa · el archivo mismo",
  component: FilePreview,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "El archivo dibujado según su tipo: imagen con tamaño ajustado o real, PDF paginado, markdown y texto (hasta 1 MB), y para el resto, la descarga. La descarga está siempre: es un enlace real.",
      },
    },
  },
  render: (args) => <FilePreview {...args} />,
  decorators: [
    (Story) => (
      <ToastProvider>
        <div className="mx-auto flex h-[32rem] max-w-3xl flex-col">
          <Story />
        </div>
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof FilePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMAGEN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" fill="#e9e4da"/><rect x="60" y="60" width="520" height="300" rx="12" fill="#c9a24a" opacity="0.55"/><text x="320" y="220" font-family="sans-serif" font-size="34" text-anchor="middle" fill="#1a1714">Recibo escaneado</text></svg>',
  );

const PDF = new URL("../support/factura-muestra.pdf", import.meta.url).href;
const MARKDOWN = new URL("../support/nota-muestra.md", import.meta.url).href;
const TEXTO = new URL("../support/ejemplo-muestra.txt", import.meta.url).href;

const archivo = (
  over: Partial<PreviewFile> & Pick<PreviewFile, "name" | "url">,
): PreviewFile => ({
  size: 184_320,
  ...over,
});

export const Imagen: Story = {
  args: { file: archivo({ name: "recibo-0418.svg", url: IMAGEN, type: "image/svg+xml" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: "recibo-0418.svg" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Descargar" })).toHaveAttribute(
      "download",
      "recibo-0418.svg",
    );
  },
};

export const PDFPaginado: Story = {
  args: {
    file: archivo({
      name: "factura-0418.pdf",
      url: PDF,
      type: "application/pdf",
      size: 1024,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* pdf.js arrives as its own chunk the first time: the wait is for the chunk, not for a render bug. */
    await expect(
      await canvas.findByText(/Página 1 de 2/, {}, { timeout: 10000 }),
    ).toBeVisible();
    /* pdf.js paints the page after the count: wait for it, so no update outlives the story. */
    await waitFor(() => expect(canvasElement.querySelector("canvas")).not.toBeNull(), {
      timeout: 10000,
    });
  },
};

export const Markdown: Story = {
  args: { file: archivo({ name: "nota-conciliacion.md", url: MARKDOWN }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole(
        "document",
        { name: "nota-conciliacion.md" },
        { timeout: 10000 },
      ),
    ).toBeVisible();
  },
};

export const Texto: Story = {
  args: { file: archivo({ name: "sincronizacion.log", url: TEXTO, type: "text/plain" }) },
  play: async ({ canvasElement }) => {
    /* The text is fetched after the first paint: the story waits for it, so the update
       lands inside this story and not inside the next one. */
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(/Conectado al ERP/, {}, { timeout: 10000 }),
    ).toBeVisible();
  },
};

/** Un archivo que no tiene vista previa honesta: se dice, y queda la descarga. */
export const SinVistaPrevia: Story = {
  args: { file: archivo({ name: "planilla-costos.xlsx", url: TEXTO }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/no hay vista previa/i)).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Descargar" })).toBeVisible();
  },
};
