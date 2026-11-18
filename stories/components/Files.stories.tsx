import { type AttachmentFile, downloadFile, FileList } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

/**
 * Context: **archivos dentro de otra cosa** — el comprobante debajo de un mensaje del chatter,
 * los assets de una versión, el PDF que alguien mandó por el chat. No es la lista del registro
 * (`Adjuntos`: agregar, quitar, deshacer) ni la vista de un archivo entero (`Vista previa`): es
 * mostrar N archivos donde están, reconocerlos, abrirlos y bajarlos.
 *
 * Dos formas: `cards`, un archivo que alguien MANDÓ (una tarjeta por archivo, debajo del
 * mensaje), y `rows`, los archivos que PERTENECEN a algo (una lista con borde, con su título y
 * la cantidad, plegable). Bajar es un enlace de verdad cuando hay `url`; cuando la descarga
 * necesita código —un token, una URL firmada, el `/web/content` de Odoo— es `onDownload`, y el
 * botón queda ocupado mientras dura.
 */
const meta = {
  title: "3 · Componentes/Archivos · dentro de un mensaje, una tarjeta, una sección",
  component: FileList,
  parameters: {
    docs: {
      description: {
        component:
          "N archivos dentro de un contenedor, de sólo lectura. `cards` para lo que alguien mandó, `rows` para lo que pertenece a algo (con `title`, la cantidad y `collapsible`). Bajar: `url` → un `<a download>` real; `onDownload(file)` → la aplicación baja por código (ocupado mientras corre, y si falla lo dice); `onDownloadAll` → «Descargar todo»; `downloadFile(blob, nombre)` guarda lo que la aplicación trajo. Abrir es `onOpen(file)`: dónde se abre lo decide la aplicación.",
      },
    },
  },
} satisfies Meta<typeof FileList>;

export default meta;
type Story = StoryObj<typeof meta>;

/* A download that works offline: the browser saves this text with the file's name. */
const sample = (name: string) =>
  `data:text/plain;charset=utf-8,${encodeURIComponent(`Archivo de ejemplo: ${name}`)}`;

/* A photo of a signed receipt, inline so the story renders offline. */
const FOTO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(40 40% 92%)"/><rect x="16" y="10" width="32" height="44" rx="2" fill="hsl(0 0% 100%)" stroke="hsl(40 20% 60%)"/><path d="M22 22h20M22 28h20M22 34h12" stroke="hsl(40 20% 60%)" stroke-width="2"/></svg>',
)}`;

const NOW = new Date("2026-11-18T13:00:00-04:00");

/** A message, the way the chatter draws one: who, and what they said above what they sent. */
function Mensaje({
  autor,
  texto,
  children,
}: {
  autor: string;
  texto: string;
  children: ReactNode;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-1.5">
      <p className="text-meta font-medium text-ink">{autor}</p>
      <p className="w-fit rounded-box bg-ground px-2.5 py-1.5 text-body text-ink">{texto}</p>
      {children}
    </div>
  );
}

const COMPROBANTES: readonly AttachmentFile[] = [
  {
    id: "c1",
    name: "receipt_c0f86abf-e9b1-45f8-b46a-f9cc86e6c809.pdf",
    type: "application/pdf",
    size: 184_320,
    url: sample("receipt.pdf"),
  },
  {
    id: "c2",
    name: "Transferencia BNB.jpg",
    type: "image/jpeg",
    size: 412_000,
    url: FOTO,
  },
];

/**
 * **Debajo de un mensaje.** El comprobante que alguien adjuntó: una tarjeta por archivo, con su
 * tipo, su nombre, «PDF · 180 KB» y la flecha para bajarlo. Tocar el nombre lo abre donde la
 * aplicación decida (acá sólo escribe cuál).
 */
export const EnUnMensaje: Story = {
  name: "En un mensaje",
  args: { files: COMPROBANTES },
  render: function Render() {
    const [abierto, setAbierto] = useState<string | null>(null);
    return (
      <div className="flex flex-col gap-3">
        <Mensaje autor="Andrés Gutiérrez" texto="adjunto comprobante">
          <FileList files={COMPROBANTES} onOpen={(file) => setAbierto(file.name)} />
        </Mensaje>
        <p className="text-meta text-muted" aria-live="polite">
          {abierto === null ? "Todavía no se abrió ningún archivo." : `Se abrió «${abierto}»`}
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const lista = canvas.getByRole("list", { name: "Archivos" });
    await expect(within(lista).getAllByRole("listitem")).toHaveLength(2);
    /* The kind and the size, in words. */
    await expect(canvas.getByText("PDF")).toBeVisible();
    /* Open: the application hears which file. */
    await userEvent.click(canvas.getByRole("button", { name: "Transferencia BNB.jpg" }));
    await expect(canvas.getByText("Se abrió «Transferencia BNB.jpg»")).toBeVisible();
    /* Download: a real link that saves with the file's name. */
    const bajar = canvas.getAllByRole("link", { name: "Descargar" })[0]!;
    await expect(bajar).toHaveAttribute(
      "download",
      "receipt_c0f86abf-e9b1-45f8-b46a-f9cc86e6c809.pdf",
    );
  },
};

const ASSETS: readonly AttachmentFile[] = [
  {
    id: "zip",
    name: "sincpro_web_ui-2.5.0.zip",
    type: "application/zip",
    size: 1_934_000,
    url: sample("sincpro_web_ui-2.5.0.zip"),
    at: "2026-11-18T12:53:00-04:00",
  },
  {
    id: "tgz",
    name: "sincpro_web_ui-2.5.0.tar.gz",
    type: "application/gzip",
    size: 1_402_000,
    url: sample("sincpro_web_ui-2.5.0.tar.gz"),
    at: "2026-11-18T12:53:00-04:00",
  },
];

/**
 * **Los assets de una versión.** Los archivos que PERTENECEN a algo: una lista con borde, el
 * título con la cantidad, y se pliega. Sin `onOpen`, el nombre mismo es el enlace de descarga.
 */
export const AssetsDeUnaVersion: Story = {
  name: "Assets de una versión",
  args: { files: ASSETS, layout: "rows", title: "Assets", collapsible: true, now: NOW },
  render: (args) => (
    <div className="max-w-3xl">
      <FileList {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const lista = canvas.getByRole("list", { name: /Assets/ });
    await expect(
      within(lista).getByRole("link", { name: "sincpro_web_ui-2.5.0.zip" }),
    ).toHaveAttribute("download", "sincpro_web_ui-2.5.0.zip");
    await expect(within(lista).getAllByText("hace 7 minutos")).toHaveLength(2);
    /* It folds, and opens again. */
    const titulo = canvas.getByRole("button", { name: /Assets/ });
    await userEvent.click(titulo);
    await waitFor(() => expect(titulo).toHaveAttribute("aria-expanded", "false"));
    await userEvent.click(titulo);
    await waitFor(() => expect(canvas.getByRole("list", { name: /Assets/ })).toBeVisible());
  },
};

const CONTRATOS: readonly AttachmentFile[] = [
  { id: "k1", name: "Contrato marco firmado.pdf", type: "application/pdf", size: 2_610_000 },
  { id: "k2", name: "Anexo de precios 2027.xlsx", size: 88_000 },
  { id: "k3", name: "Poder notariado.pdf", type: "application/pdf", size: 640_000 },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * **Descarga por código.** Estos archivos no tienen `url`: el servidor pide un token. La
 * aplicación los baja en `onDownload` —acá espera un momento y guarda un texto con
 * `downloadFile`— y mientras tanto el botón queda ocupado, con el foco. Uno falla, y el archivo
 * lo dice donde se tocó. «Descargar todo» es `onDownloadAll`: un zip o un ciclo, a elección de
 * la aplicación.
 */
export const DescargaPorCodigo: Story = {
  name: "Descarga por código",
  args: { files: CONTRATOS },
  render: function Render() {
    const [hecho, setHecho] = useState<string>("nada todavía");
    return (
      <div className="flex max-w-2xl flex-col gap-3">
        <FileList
          files={CONTRATOS}
          title="Documentos del contrato"
          onDownload={async (file) => {
            await wait(400);
            if (file.id === "k2") throw new Error("403");
            downloadFile(
              new Blob([`Ejemplo: ${file.name}`], { type: "text/plain" }),
              file.name,
            );
            setHecho(`se bajó «${file.name}»`);
          }}
          onDownloadAll={async (files) => {
            await wait(400);
            setHecho(`se pidieron los ${files.length} archivos`);
          }}
        />
        <p className="text-meta text-muted" aria-live="polite">
          último: <span className="text-ink">{hecho}</span>
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [primero, segundo] = canvas.getAllByRole("button", { name: "Descargar" });
    /* Busy while it runs, with the focus kept; done, it says so. */
    await userEvent.click(primero!);
    await expect(primero).toHaveAttribute("aria-busy", "true");
    await expect(document.activeElement).toBe(primero);
    await expect(
      await canvas.findByText("se bajó «Contrato marco firmado.pdf»"),
    ).toBeVisible();
    await expect(primero).not.toHaveAttribute("aria-busy");
    /* A failure is said, in words, on the file. */
    await userEvent.click(segundo!);
    await expect(
      await canvas.findByText("No se pudo descargar «Anexo de precios 2027.xlsx»."),
    ).toBeVisible();
    /* Every file at once. */
    await userEvent.click(canvas.getByRole("button", { name: "Descargar todo" }));
    await expect(await canvas.findByText("se pidieron los 3 archivos")).toBeVisible();
  },
};
