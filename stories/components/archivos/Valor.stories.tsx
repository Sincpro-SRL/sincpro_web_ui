import { type AttachmentFile, downloadFile, FileValue, List } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

/**
 * Context: **un archivo como el valor de algo** — la columna «Foto» de una tabla, el campo
 * «Comprobante» de un registro. No es una lista de archivos (`En un mensaje…`), ni la de un
 * registro (`Adjuntos`), ni el archivo entero (`Vista previa`): es UN archivo donde va un valor,
 * reconocible —la foto misma, o el ícono de su tipo— y con su nombre de verdad, no la clave con
 * la que se guardó. El nombre lo baja.
 */
const meta = {
  title: "3 · Componentes/Archivos/Un archivo como valor",
  component: FileValue,
  parameters: {
    docs: {
      description: {
        component:
          "UN archivo como valor. `sm` (por defecto) para la línea de una tabla: la foto chica o el ícono de su tipo, y el nombre. `md` para el campo de un registro: la miniatura, el nombre y debajo su tipo y tamaño. Bajar: `url` → un `<a download>` real; `onDownload(file)` → la aplicación baja por código, ocupado mientras corre. Sin archivo, nada. Dentro de una fila el nombre es un control propio: seguirlo no abre la fila.",
      },
    },
  },
} satisfies Meta<typeof FileValue>;

export default meta;
type Story = StoryObj<typeof meta>;

/* A group photo, inline so the story renders offline. */
const FOTO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(225 45% 25%)"/><circle cx="20" cy="40" r="8" fill="hsl(40 40% 85%)"/><circle cx="32" cy="36" r="9" fill="hsl(40 30% 75%)"/><circle cx="44" cy="40" r="8" fill="hsl(40 40% 85%)"/><rect x="8" y="48" width="48" height="16" fill="hsl(225 30% 40%)"/></svg>',
)}`;

type Organo = {
  id: string;
  nombre: string;
  foto: AttachmentFile | null;
  reglamento: AttachmentFile | null;
};

const ORGANOS: readonly Organo[] = [
  {
    id: "o1",
    nombre: "Directorio",
    foto: {
      id: "f1",
      name: "Directorio 2026–2028.jpg",
      type: "image/jpeg",
      size: 412_000,
      url: FOTO,
    },
    reglamento: {
      id: "r1",
      name: "Reglamento del Directorio.pdf",
      type: "application/pdf",
      size: 184_320,
    },
  },
  {
    id: "o2",
    nombre: "Tribunal de Honor y Ética Profesional",
    foto: { id: "f2", name: "Tribunal de Honor.jpg", type: "image/jpeg", url: FOTO },
    reglamento: null,
  },
  { id: "o3", nombre: "Consejo Técnico", foto: null, reglamento: null },
];

/**
 * **En una tabla.** La foto de cada órgano chica junto a su nombre de verdad, y el reglamento
 * con el ícono del PDF; donde no hay, nada. Tocar el nombre del archivo lo baja —acá por
 * código, para verlo— y no abre la fila; tocar la fila sí.
 */
export const EnUnaTabla: Story = {
  name: "En una tabla",
  args: { file: null },
  render: function Render() {
    const [hecho, setHecho] = useState("nada todavía");
    return (
      <div className="flex flex-col gap-3">
        <List<Organo>
          items={ORGANOS}
          keyOf={(o) => o.id}
          onOpen={(o) => setHecho(`se abrió «${o.nombre}»`)}
        >
          <List.Table<Organo>
            columns={[
              { id: "nombre", header: "Órgano", value: (o) => o.nombre },
              {
                id: "foto",
                header: "Foto general",
                value: (o) => o.foto?.name ?? "",
                cell: (o) => <FileValue file={o.foto} />,
              },
              {
                id: "reglamento",
                header: "Reglamento",
                value: (o) => o.reglamento?.name ?? "",
                cell: (o) => (
                  <FileValue
                    file={o.reglamento}
                    onDownload={(file) => {
                      downloadFile(new Blob([`Ejemplo: ${file.name}`]), file.name);
                      setHecho(`se bajó «${file.name}»`);
                    }}
                  />
                ),
              },
            ]}
          />
        </List>
        <p className="px-5 text-meta text-muted" aria-live="polite">
          último: <span className="text-ink">{hecho}</span>
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* The photo is its real name, a download that keeps it — never the storage's key. */
    const foto = await canvas.findByRole("link", { name: "Directorio 2026–2028.jpg" });
    await expect(foto).toHaveAttribute("download", "Directorio 2026–2028.jpg");
    await expect(foto).toHaveAttribute("href", FOTO);
    /* A file by code: its name downloads it, and the row stays where it is. */
    await userEvent.click(
      canvas.getByRole("button", { name: "Reglamento del Directorio.pdf" }),
    );
    await expect(
      await canvas.findByText("se bajó «Reglamento del Directorio.pdf»"),
    ).toBeVisible();
    /* The row still opens from anywhere else. */
    await userEvent.click(canvas.getByText("Consejo Técnico"));
    await waitFor(() => expect(canvas.getByText("se abrió «Consejo Técnico»")).toBeVisible());
  },
};

/**
 * **En un registro.** El campo de un registro: la miniatura, el nombre y debajo su tipo y
 * tamaño —«JPG · 402 KB»—, lo que distingue la foto del escaneo antes de abrirlo. Sin `url` ni
 * `onDownload`, el nombre se lee y no se baja.
 */
export const EnUnRegistro: Story = {
  name: "En un registro",
  args: { file: null },
  render: () => (
    <dl className="grid max-w-xl grid-cols-[auto_1fr] items-center gap-x-6 gap-y-4 text-body">
      <dt className="text-muted">Foto general</dt>
      <dd>
        <FileValue file={ORGANOS[0]!.foto} size="md" />
      </dd>
      <dt className="text-muted">Reglamento</dt>
      <dd>
        <FileValue file={ORGANOS[0]!.reglamento} size="md" />
      </dd>
      <dt className="text-muted">Acta</dt>
      <dd>
        <FileValue file={null} size="md" />
      </dd>
    </dl>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("link", { name: "Directorio 2026–2028.jpg" }),
    ).toBeVisible();
    await expect(canvas.getByText("JPG")).toBeVisible();
    /* Neither a url nor a way to download: read only. */
    await expect(canvas.getByText("Reglamento del Directorio.pdf").tagName).toBe("SPAN");
    await expect(canvas.queryAllByRole("link")).toHaveLength(1);
  },
};
