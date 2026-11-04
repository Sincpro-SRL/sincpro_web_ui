import { type AttachmentFile, Attachments, ToastProvider } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

/**
 * Context: **los archivos de un registro** — el clip de Odoo. Por cada archivo, lo que se busca
 * en este orden: cuál es (el tipo y, si es una imagen, la imagen), cuánto pesa, quién lo subió
 * y cuándo, y qué se hace con él: abrirlo, bajarlo, sacarlo.
 *
 * web-ui lista; la aplicación sube y abre. `onAdd` le pasa los `File` y la aplicación contesta
 * poniéndolos en `files` con su estado —subiendo con su avance, falló con su frase—. Abrir es
 * `onOpen(file)`: el espacio de trabajo decide dónde (vista previa, al costado, otra pestaña),
 * como con un registro. Quitar no pregunta: se quita, y el aviso ofrece «Deshacer».
 */
const meta = {
  title: "3 · Componentes/Adjuntos · los archivos del registro",
  component: Attachments,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Los archivos de un registro: el tipo (o la miniatura de una imagen), el nombre, el peso, quién lo subió y cuándo. Abrir se le avisa a la aplicación (`onOpen`), que decide dónde; bajar es un enlace de verdad. Se agrega soltando, pegando o eligiendo; la subida y la falla son estados que pone la aplicación. Quitar no pregunta: el aviso ofrece «Deshacer». En lectura, sin agregar ni quitar.",
      },
    },
  },
} satisfies Meta<typeof Attachments>;

export default meta;
type Story = StoryObj<typeof meta>;

/* A photo of a signed delivery note, inline so the story renders offline. */
const REMITO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(40 40% 92%)"/><rect x="16" y="10" width="32" height="44" rx="2" fill="hsl(0 0% 100%)" stroke="hsl(40 20% 60%)"/><path d="M22 22h20M22 28h20M22 34h12" stroke="hsl(40 20% 60%)" stroke-width="2"/><path d="M22 46c4-6 8 2 12-3s6 2 8 0" stroke="hsl(220 60% 40%)" stroke-width="2" fill="none"/></svg>',
)}`;

/* A download that works offline: the browser saves this text with the file's name. */
const sample = (name: string) =>
  `data:text/plain;charset=utf-8,${encodeURIComponent(`Archivo de ejemplo: ${name}`)}`;

const NOW = new Date("2026-11-04T12:00:00-04:00");

/* The files of ONE purchase: OC/2026/0418, to Importadora y Exportadora del Oriente. */
const COMPRA: readonly AttachmentFile[] = [
  {
    id: "a1",
    name: "Factura proveedor 0418.pdf",
    size: 1_258_291,
    type: "application/pdf",
    url: sample("Factura proveedor 0418.pdf"),
    by: "Carla Rojas",
    at: "2026-11-04T10:12:00-04:00",
  },
  {
    id: "a2",
    name: "Remito firmado.jpg",
    size: 348_160,
    type: "image/jpeg",
    url: REMITO,
    by: "Josefa Muñoz",
    at: "2026-11-03T17:40:00-04:00",
  },
  {
    id: "a3",
    name: "Detalle de importación — partidas arancelarias octubre 2026 (versión revisada por aduana).xlsx",
    size: 86_528,
    url: sample("Detalle de importación.xlsx"),
    by: "Andrés Gutiérrez",
    at: "2026-10-21T09:05:00-04:00",
  },
  {
    id: "a4",
    name: "Contrato marco.docx",
    size: 52_224,
    url: sample("Contrato marco.docx"),
    by: "Carla Rojas",
    at: "2026-09-30T15:00:00-04:00",
  },
];

/** The application's side: it «uploads» what is dropped, and answers with the state. */
function useAttachments(initial: readonly AttachmentFile[]) {
  const [files, setFiles] = useState<readonly AttachmentFile[]>(initial);
  const [opened, setOpened] = useState<string | null>(null);

  /* Each upload advances a quarter every 300 ms; a file over 20 MB fails, as a server
     with that limit would answer. */
  const uploading = files.some((f) => f.status === "uploading");
  useEffect(() => {
    if (!uploading) return;
    const timer = setTimeout(() => {
      setFiles((all) =>
        all.map((f) => {
          if (f.status !== "uploading") return f;
          const progress = (f.progress ?? 0) + 25;
          if (progress < 100) return { ...f, progress };
          if ((f.size ?? 0) > 20 * 1024 * 1024) {
            return {
              ...f,
              status: "failed",
              error: "El archivo pesa más de 20 MB, el límite de esta empresa.",
            };
          }
          return { ...f, status: "ready", progress: undefined, at: new Date() };
        }),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [files, uploading]);

  return {
    files,
    opened,
    onAdd: (added: File[]) =>
      setFiles((all) => [
        ...all,
        ...added.map((file): AttachmentFile => ({
          id: `${file.name}-${file.lastModified}-${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          by: "Andrés Gutiérrez",
          status: "uploading",
          progress: 0,
        })),
      ]),
    onRemove: (file: AttachmentFile) =>
      setFiles((all) => all.filter((f) => f.id !== file.id)),
    onRestore: (file: AttachmentFile, index: number) =>
      setFiles((all) => [...all.slice(0, index), file, ...all.slice(index)]),
    onRetry: (file: AttachmentFile) =>
      setFiles((all) =>
        all.map((f) =>
          f.id === file.id ? { ...f, status: "uploading", progress: 0, size: 1024 } : f,
        ),
      ),
    onOpen: (file: AttachmentFile) => setOpened(file.name),
  };
}

function Card({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-ground p-8">
        <div className="mx-auto flex max-w-(--container-sheet) flex-col gap-4 rounded-box border border-line bg-surface p-6">
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}

/**
 * **Los adjuntos de una compra.** Tocá un nombre para abrirlo (acá la «aplicación» sólo
 * escribe cuál abrió; en el espacio de trabajo se abre donde decida composer). El ↓ lo baja.
 * La papelera lo quita al instante y el aviso ofrece «Deshacer»; el foco pasa a la papelera
 * del siguiente, así se limpian varios con el teclado. Soltá un archivo, pegalo o elegilo: sube
 * con su barra y queda en la lista.
 */
export const DeUnaCompra: Story = {
  args: { files: COMPRA },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);

    /* Open: the application hears which file, and decides where. */
    await userEvent.click(canvas.getByRole("button", { name: "Factura proveedor 0418.pdf" }));
    await expect(canvas.getByText("Se abrió «Factura proveedor 0418.pdf»")).toBeVisible();

    /* Remove: gone at once, the focus on the next trash, and the notice undoes it. */
    await userEvent.click(canvas.getAllByRole("button", { name: "Quitar el archivo" })[0]!);
    await waitFor(() =>
      expect(
        canvas.queryByRole("button", { name: "Factura proveedor 0418.pdf" }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        canvas.getAllByRole("button", { name: "Quitar el archivo" })[0],
      ),
    );
    await userEvent.click(await page.findByRole("button", { name: "Deshacer" }));
    await expect(
      await canvas.findByRole("button", { name: "Factura proveedor 0418.pdf" }),
    ).toBeVisible();

    /* Add: the chosen file reaches the application, which shows it uploading. */
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]');
    await expect(input).not.toBeNull();
    await userEvent.upload(
      input!,
      new File(["acta"], "Acta de entrega.pdf", { type: "application/pdf" }),
    );
    await expect(await canvas.findByText("Acta de entrega.pdf")).toBeVisible();
  },
  render: function Render() {
    const { opened, ...state } = useAttachments(COMPRA);
    return (
      <Card>
        <Attachments {...state} now={NOW} />
        <p className="text-meta text-muted" aria-live="polite">
          {opened === null ? "Todavía no se abrió ningún archivo." : `Se abrió «${opened}»`}
        </p>
      </Card>
    );
  },
};

/**
 * **Subiendo y con error.** Los estados los pone la aplicación, porque son lo que hace el
 * servidor: una subida con su barra (y una que todavía no sabe cuánto falta), y una que falló
 * con la frase del servidor y «Reintentar». Mientras sube no se baja ni se abre; sacarla
 * cancela, y no hay nada que deshacer.
 */
export const SubiendoYConError: Story = {
  args: { files: [] },
  render: function Render() {
    /* Still on purpose: no timer, so the bars stay where the story shows them. */
    const [files, setFiles] = useState<readonly AttachmentFile[]>([
      COMPRA[0]!,
      {
        id: "u1",
        name: "Extracto bancario octubre.xlsx",
        size: 412_000,
        status: "uploading",
        progress: 40,
        by: "Andrés Gutiérrez",
      },
      { id: "u2", name: "Escaneo de la póliza.pdf", status: "uploading" },
      {
        id: "f1",
        name: "Video de la descarga en almacén.mp4",
        size: 48 * 1024 * 1024,
        status: "failed",
        error: "El archivo pesa más de 20 MB, el límite de esta empresa.",
      },
    ]);
    return (
      <Card>
        <Attachments
          files={files}
          onRemove={(file) => setFiles((all) => all.filter((f) => f.id !== file.id))}
          onRestore={(file, index) =>
            setFiles((all) => [...all.slice(0, index), file, ...all.slice(index)])
          }
          onRetry={(file) =>
            setFiles((all) =>
              all.map((f) => (f.id === file.id ? { ...f, status: "uploading" } : f)),
            )
          }
          onOpen={() => {}}
          now={NOW}
        />
      </Card>
    );
  },
};

/**
 * **Una compra ya recibida.** En lectura (el formulario o `mode="read"`) los archivos se ven,
 * se abren y se bajan, pero no se agregan ni se quitan: no hay zona para soltar ni papelera.
 */
export const Lectura: Story = {
  args: { files: COMPRA, mode: "read", now: NOW, onOpen: () => {} },
  render: (args) => (
    <Card>
      <Attachments {...args} />
    </Card>
  ),
};

/**
 * **Sin archivos.** Para editar, la zona misma lo dice y ofrece el gesto; en lectura, una frase
 * — la del sistema, o la de la pantalla cuando sabe decir algo más cercano a lo suyo.
 */
export const SinArchivos: Story = {
  args: { files: [] },
  render: function Render() {
    const state = useAttachments([]);
    return (
      <Card>
        <Attachments files={state.files} onAdd={state.onAdd} onRemove={state.onRemove} />
        <Attachments
          files={[]}
          mode="read"
          empty="Esta compra todavía no tiene la factura del proveedor."
        />
      </Card>
    );
  },
};
