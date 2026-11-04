import {
  Field,
  FormModeProvider,
  type ImageChange,
  ImageInput,
  SignatureInput,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta = {
  title: "2 · Primitivas/Imagen y firma",
  component: ImageInput,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Los dos controles que guardan una IMAGEN. `ImageInput` elige, suelta o pega una imagen, la muestra, la cambia y la quita; con `aspect` la recorta antes de tomarla —arrastrando o con las flechas, + y − para el zoom— y lo que entrega ya es el recorte. `SignatureInput` es una firma dibujada con el mouse, un lápiz o el dedo, y para quien no puede dibujar, «Escribir mi nombre» la escribe con la letra del sistema en cursiva. Los dos dan una imagen: en lectura, se dibuja la imagen.",
      },
    },
  },
} satisfies Meta<typeof ImageInput>;

export default meta;
type Story = StoryObj<typeof meta>;

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-box border border-line bg-surface p-4">
      {children}
    </div>
  );
}

/** Una imagen de prueba hecha en el momento: un PNG de verdad, con los colores del sistema. */
async function photo(name: string, width: number, height: number): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const tokens = getComputedStyle(document.documentElement);
  ctx.fillStyle = tokens.getPropertyValue("--color-primary").trim();
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = tokens.getPropertyValue("--color-accent").trim();
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, height / 3, 0, Math.PI * 2);
  ctx.fill();
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png"),
  );
  return new File([blob], name, { type: "image/png" });
}

const fileInput = (root: HTMLElement) =>
  root.querySelector<HTMLInputElement>('input[type="file"]')!;

/**
 * **La foto de un contacto.** La ficha de «Ana Gutiérrez Paredes» lleva su foto, redonda. Se
 * elige (o se suelta, o se pega) una imagen y se abre en un marco redondo: se mueve
 * arrastrando o con las flechas, + y − acercan y alejan, Enter aplica y Escape la deja como
 * estaba. Lo que se guarda ya es el recorte — un cuadrado de a lo sumo 512 px —, con su nombre
 * y su tipo, listo para subir.
 */
export const FotoDeContacto: Story = {
  args: { value: null, alt: "" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.upload(fileInput(canvasElement), await photo("ana.png", 600, 400));

    /* The frame takes the focus: the keys move the image straight away. */
    const marco = await canvas.findByRole("application", { name: "Recorte de la imagen" });
    await waitFor(() => expect(marco).toHaveFocus());
    await userEvent.keyboard("{ArrowRight}+");
    await expect(canvas.getByText("120 %")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Aplicar recorte" }));

    await expect(
      await canvas.findByRole("img", { name: "Foto de Ana Gutiérrez Paredes" }),
    ).toBeVisible();
    await expect(canvas.getByTestId("guardado")).toHaveTextContent("ana.png · image/png");
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Cambiar imagen" })).toHaveFocus(),
    );

    /* Quitar: no pregunta, vuelve a vacío y el foco queda en el botón de elegir. */
    await userEvent.click(canvas.getByRole("button", { name: "Quitar imagen" }));
    await expect(canvas.getByTestId("guardado")).toHaveTextContent("sin foto");
    await expect(canvas.getByRole("button", { name: "Elegir imagen" })).toBeVisible();
  },
  render: function Render() {
    const [foto, setFoto] = useState<ImageChange | null>(null);
    return (
      <Card>
        <Field
          label="Foto"
          hint="Una foto de la cara, de frente. Se guarda recortada."
          copy={false}
        >
          <ImageInput
            value={foto?.url ?? null}
            onChange={setFoto}
            alt="Foto de Ana Gutiérrez Paredes"
            shape="circle"
            maxSide={512}
          />
        </Field>
        <p data-testid="guardado" className="text-micro text-muted">
          {foto === null ? "sin foto" : `${foto.file.name} · ${foto.file.type}`}
        </p>
      </Card>
    );
  },
};

/**
 * **El logo de la empresa, tal cual.** Sin `aspect` la imagen se toma como viene, sin
 * recorte. Un archivo que no es una imagen —un PDF arrastrado por error— vuelve con la frase
 * de qué elegir en su lugar.
 */
export const LogoSinRecorte: Story = {
  args: { value: null, alt: "" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pdf = new File(["%PDF-1.7"], "factura.pdf", { type: "application/pdf" });
    await userEvent.upload(fileInput(canvasElement), pdf, { applyAccept: false });
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "El archivo no es una imagen",
    );

    await userEvent.upload(fileInput(canvasElement), await photo("logo.png", 320, 120));
    await expect(
      await canvas.findByRole("img", { name: "Logo de Distribuidora Andina S.R.L." }),
    ).toBeVisible();
    await expect(canvas.queryByRole("alert")).toBeNull();
    await expect(canvas.getByTestId("guardado")).toHaveTextContent("logo.png");
  },
  render: function Render() {
    const [logo, setLogo] = useState<ImageChange | null>(null);
    return (
      <Card>
        <Field label="Logo" copy={false}>
          <ImageInput
            value={logo?.url ?? null}
            onChange={setLogo}
            alt="Logo de Distribuidora Andina S.R.L."
          />
        </Field>
        <p data-testid="guardado" className="text-micro text-muted">
          {logo === null ? "sin logo" : logo.file.name}
        </p>
      </Card>
    );
  },
};

/**
 * **La firma de quien recibe.** El acta de entrega OC/2026/0418 la firma quien recibe la
 * mercadería: con el mouse, un lápiz o el dedo sobre la línea. Quien no puede dibujar —trabaja
 * con teclado o con lector de pantalla— toca «Escribir mi nombre» y su nombre se escribe como
 * firma, en la misma imagen. «Limpiar» empieza de nuevo.
 */
export const FirmaDeQuienRecibe: Story = {
  args: { value: null, alt: "" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: "Área de firma" })).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Escribir mi nombre" }));
    const nombre = canvas.getByLabelText("Nombre para la firma");
    await expect(nombre).toHaveFocus();
    await expect(nombre).toHaveValue("Juan Carlos Mamani");
    /* The name it already knew is written at once. */
    await expect(canvas.getByTestId("guardado")).toHaveTextContent("PNG");

    await userEvent.clear(nombre);
    await expect(canvas.getByTestId("guardado")).toHaveTextContent("sin firma");
    await userEvent.type(nombre, "J. C. Mamani Quispe");
    await expect(canvas.getByTestId("guardado")).toHaveTextContent("PNG");
    await expect(canvas.getByRole("img", { name: "Firma de quien recibe" })).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Limpiar" }));
    await expect(canvas.getByTestId("guardado")).toHaveTextContent("sin firma");
    await expect(nombre).toHaveValue("");

    /* Back to the pad. */
    await userEvent.click(canvas.getByRole("button", { name: "Dibujar la firma" }));
    await expect(canvas.getByRole("img", { name: "Área de firma" })).toBeVisible();
  },
  render: function Render() {
    const [firma, setFirma] = useState<string | null>(null);
    return (
      <Card>
        <Field label="Firma de quien recibe" required copy={false}>
          <SignatureInput
            value={firma}
            onChange={setFirma}
            name="Juan Carlos Mamani"
            alt="Firma de quien recibe"
          />
        </Field>
        <p data-testid="guardado" className="text-micro text-muted">
          {firma === null ? "sin firma" : `PNG · ${Math.round(firma.length / 1024)} kB`}
        </p>
      </Card>
    );
  },
};

/* A small signature drawn here, the way a saved one comes back from the server. */
function savedSignature(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue(
    "--color-ink",
  );
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(16, 56);
  ctx.bezierCurveTo(40, 8, 60, 70, 90, 40);
  ctx.bezierCurveTo(110, 20, 130, 64, 160, 36);
  ctx.quadraticCurveTo(190, 16, 220, 48);
  ctx.stroke();
  return canvas.toDataURL("image/png");
}

/**
 * **En lectura.** La foto con su texto alternativo, y la firma sobre su papel —claro también
 * en el tema oscuro, porque la tinta de una firma es oscura—. Lo que falta es «sin definir».
 */
export const Lectura: Story = {
  args: { value: null, alt: "" },
  render: function Render() {
    const [firma] = useState(savedSignature);
    const [foto, setFoto] = useState<string | null>(null);
    useEffect(() => {
      let url = "";
      void photo("ana.png", 200, 200).then((file) => {
        url = URL.createObjectURL(file);
        setFoto(url);
      });
      return () => URL.revokeObjectURL(url);
    }, []);
    return (
      <FormModeProvider value="read">
        <Card>
          <Field label="Foto" copy={false}>
            <ImageInput value={foto} alt="Foto de Ana Gutiérrez Paredes" shape="circle" />
          </Field>
          <Field label="Firma del cliente" copy={false}>
            <SignatureInput value={firma} alt="Firma de Ana Gutiérrez Paredes" />
          </Field>
          <Field label="Firma del transportista" copy={false}>
            <SignatureInput value={null} />
          </Field>
        </Card>
      </FormModeProvider>
    );
  },
};
