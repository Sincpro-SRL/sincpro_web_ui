import {
  Field,
  FormModeProvider,
  type MentionItem,
  RichTextInput,
  RichTextValue,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

/**
 * Context: **texto con formato** — la descripción de un producto, las notas de un pedido, el
 * cuerpo de un correo: un campo `html` de Odoo. Debajo está Tiptap (ProseMirror), que no trae
 * interfaz propia: la barra es la del sistema (`Toolbar` + `IconButton`, un solo Tab, flechas
 * adentro, cada botón dice si está activo) y el contenido usa el mismo estilo `rich-text` que
 * la lectura. El editor se descarga recién al editar.
 */
const meta: Meta = {
  title: "2 · Primitivas/Texto enriquecido",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const PERSONAS: MentionItem[] = [
  { id: "u1", label: "Ana Quispe" },
  { id: "u2", label: "Andrés Gutiérrez" },
  { id: "u3", label: "Josefa Muñoz" },
  { id: "u4", label: "Rodrigo Mamani" },
];

const NOTA_INICIAL =
  "<h2>Entrega de cemento</h2><p>Coordinar con <strong>almacén central</strong> antes del jueves.</p><ul><li>48 bolsas IP-30</li><li>Factura a nombre de la clínica</li></ul>";

/** **Editar.** Negrita, títulos, listas, cita, enlace (web, correo o teléfono — nunca un
 *  «javascript:»), tabla, deshacer. Con «@» se menciona a alguien: la aplicación contesta quién
 *  coincide con lo escrito. A la derecha, la MISMA nota leída: lo que se escribe es lo que se
 *  lee. */
export const Editar: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* The editor is its own chunk, fetched on editing: on a busy machine it takes longer than
       the default second to arrive. */
    const editor = await canvas.findByRole(
      "textbox",
      { name: "Notas del pedido" },
      { timeout: 8000 },
    );
    /* The caret at the end of the note, the way a click after the last line puts it. */
    editor.focus();
    const selection = window.getSelection();
    selection?.selectAllChildren(editor);
    selection?.collapseToEnd();
    await userEvent.keyboard("{Enter}");
    await userEvent.click(canvas.getByRole("button", { name: "Negrita" }));
    await userEvent.keyboard("Urgente");
    await waitFor(() =>
      expect(canvas.getByTestId("html")).toHaveTextContent("<strong>Urgente</strong>"),
    );
    await expect(canvas.getByRole("button", { name: "Negrita" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    /* «@» abre la lista de personas; Enter elige la marcada. */
    await userEvent.keyboard(" @ana");
    const lista = await within(document.body).findByRole(
      "listbox",
      { name: "Personas" },
      { timeout: 4000 },
    );
    await expect(within(lista).getByRole("option", { name: "Ana Quispe" })).toBeVisible();
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(canvas.getByTestId("html")).toHaveTextContent('data-type="mention"'),
    );
  },
  render: function Render() {
    const [nota, setNota] = useState(NOTA_INICIAL);
    return (
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <div className="rounded-box border border-line bg-surface p-4">
          <Field label="Notas del pedido" hint="Visible para el equipo de despacho.">
            <RichTextInput
              value={nota}
              onChange={setNota}
              placeholder="Escribí una nota…"
              mentions={(query) =>
                PERSONAS.filter((one) =>
                  one.label
                    .normalize("NFD")
                    .replace(/\p{Diacritic}/gu, "")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                ).slice(0, 5)
              }
            />
          </Field>
        </div>
        <div className="rounded-box border border-line bg-surface p-4">
          <FormModeProvider value="read">
            <Field label="La misma nota, leída">
              <RichTextInput value={nota} />
            </Field>
          </FormModeProvider>
          <p className="mt-4 text-micro text-muted">lo que recibe la aplicación:</p>
          <code
            data-testid="html"
            className="mt-1 block font-mono text-micro break-all text-ink"
          >
            {nota}
          </code>
        </div>
      </div>
    );
  },
};

/** **Comentario.** `toolbar="basic"`: negrita, cursiva, listas y enlace — lo que un comentario
 *  necesita, sin títulos ni tablas. */
export const Comentario: Story = {
  render: function Render() {
    const [texto, setTexto] = useState("");
    return (
      <div className="max-w-xl rounded-box border border-line bg-surface p-4">
        <Field label="Comentario">
          <RichTextInput
            value={texto}
            onChange={setTexto}
            toolbar="basic"
            placeholder="Escribí un comentario…"
          />
        </Field>
      </div>
    );
  },
};

/** **Lo que llega no se ejecuta.** El HTML de un correo pegado o de un campo del motor puede
 *  traer un script, un `onerror`, un enlace «javascript:». Se lee limpio: queda el texto y su
 *  forma, se cae todo lo que corre, y un enlace abre en otra pestaña sin darle nuestra ventana. */
export const HtmlHostil: Story = {
  play: async ({ canvasElement }) => {
    const leido = within(canvasElement).getByTestId("leido");
    await waitFor(() => expect(leido.querySelector("strong")).not.toBeNull());
    await expect(leido.querySelector("script")).toBeNull();
    await expect(leido.querySelector("[onerror]")).toBeNull();
    const enlaces = [...leido.querySelectorAll("a")];
    await expect(
      enlaces.some((a) => (a.getAttribute("href") ?? "").startsWith("javascript")),
    ).toBe(false);
    const web = enlaces.find((a) => a.textContent === "nuestra web");
    await expect(web).toHaveAttribute("target", "_blank");
    await expect(web).toHaveAttribute("rel", "noopener noreferrer");
  },
  render: () => (
    <div
      data-testid="leido"
      className="max-w-xl rounded-box border border-line bg-surface p-4"
    >
      <RichTextValue
        value={
          '<p>Estimados, <strong>adjunto</strong> la cotización.</p><img src="x" onerror="alert(1)"><script>alert(2)</script><p><a href="javascript:alert(3)">ver detalle</a> · <a href="https://sincpro.com.bo">nuestra web</a></p>'
        }
      />
    </div>
  ),
};
