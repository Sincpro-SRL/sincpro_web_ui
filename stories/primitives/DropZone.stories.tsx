import { DropZone, Field } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

const meta = {
  title: "2 · Primitivas/DropZone",
  component: DropZone,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Soltá un archivo o elegilo. Arrastrar es un gesto de mouse, así que la zona nunca es la única entrada: el botón «elegir archivo» abre el diálogo del sistema desde el teclado, y la zona también acepta pegar un archivo copiado. El progreso es una barra de verdad y la falla es una frase. Dónde vive —un diálogo, un paso de un asistente— lo decide quien la usa.",
      },
    },
  },
} satisfies Meta<typeof DropZone>;

export default meta;
type Story = StoryObj<typeof meta>;

type Estado =
  | { kind: "idle" }
  | { kind: "uploading"; name: string; size: number; progress: number }
  | { kind: "done"; name: string; size: number }
  | { kind: "failed"; name: string };

function kb(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  return `${(bytes / 1024).toLocaleString("es-BO", { maximumFractionDigits: 1 })} kB`;
}

/**
 * **Adjuntar la factura del proveedor.** La compra a «Importadora y Exportadora del Oriente
 * Boliviano Ltda.» necesita su factura en PDF. Elegí un archivo con el botón (o soltalo):
 * un PDF sube con su barra; cualquier otra cosa vuelve con la frase de por qué no se pudo
 * leer, y con el gesto para probar otro.
 */
export const AdjuntarFactura: Story = {
  args: { onFile: () => {} },
  render: function Render() {
    const [estado, setEstado] = useState<Estado>({ kind: "idle" });

    useEffect(() => {
      if (estado.kind !== "uploading") return;
      const timer = setTimeout(() => {
        setEstado(
          estado.progress >= 100
            ? { kind: "done", name: estado.name, size: estado.size }
            : { ...estado, progress: Math.min(100, estado.progress + 20) },
        );
      }, 250);
      return () => clearTimeout(timer);
    }, [estado]);

    const onFile = (file: File) => {
      const pdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      setEstado(
        pdf
          ? { kind: "uploading", name: file.name, size: file.size, progress: 0 }
          : { kind: "failed", name: file.name },
      );
    };

    return (
      <div className="flex max-w-xl flex-col gap-3 rounded-box border border-line bg-surface p-4">
        <Field
          label="Factura del proveedor"
          hint="El PDF que mandó el proveedor, tal cual. Se adjunta a la compra OC/2026/0418."
        >
          <DropZone
            accept=".pdf,application/pdf"
            label="Soltá acá el PDF de la factura"
            busy={estado.kind === "uploading"}
            {...(estado.kind === "uploading"
              ? {
                  progress: estado.progress,
                  fileName: estado.name,
                  fileDetail: `${kb((estado.size * estado.progress) / 100)} de ${kb(estado.size)}`,
                }
              : {})}
            error={
              estado.kind === "failed"
                ? `«${estado.name}» no es un PDF. La factura del proveedor se adjunta en PDF, como la emitió.`
                : null
            }
            onFile={onFile}
            onRetry={() => setEstado({ kind: "idle" })}
          />
        </Field>
        {estado.kind === "done" ? (
          <p className="text-meta text-good" role="status">
            Se adjuntó «{estado.name}» ({kb(estado.size)}) a la compra OC/2026/0418.
          </p>
        ) : null}
      </div>
    );
  },
};

/** Los tres momentos quietos, lado a lado: esperando, subiendo —con la cifra de lo que va— y
 *  la falla con la frase del servidor entera. */
export const Estados: Story = {
  args: { onFile: () => {} },
  render: () => (
    <div className="grid max-w-5xl gap-5 lg:grid-cols-3">
      <div className="rounded-box border border-line bg-surface p-4">
        <DropZone
          accept=".pdf"
          label="Soltá acá el extracto del banco"
          onFile={() => {}}
          onCancel={() => {}}
        />
      </div>
      <div className="rounded-box border border-line bg-surface p-4">
        <DropZone
          busy
          progress={62}
          fileName="extracto_BNB_octubre_2026.pdf"
          fileDetail="1,2 MB de 1,9 MB"
          onFile={() => {}}
        />
      </div>
      <div className="rounded-box border border-line bg-surface p-4">
        <DropZone
          label="Soltá acá la planilla de inventario"
          error="La fila 418 tiene «12,5,0» en la columna «cantidad»: no es un número. Corregila y volvé a subir la planilla."
          onFile={() => {}}
          onRetry={() => {}}
        />
      </div>
    </div>
  ),
};
