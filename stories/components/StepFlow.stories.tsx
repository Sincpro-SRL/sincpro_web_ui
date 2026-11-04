import { Callout, Field, Select, StepFlow, TextInput } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { BANKS } from "../support/erp-forms";

/**
 * Context: **una operación en varios pasos, de una sentada.** Un paso a la vista, «Atrás» y
 * «Siguiente», y en el último el botón dice lo que va a pasar. Un paso que no puede seguir
 * dice por qué al lado del botón apagado; al moverse, el foco va al título del paso nuevo y
 * se anuncia «Paso 2 de 3». No dibuja ningún diálogo: adentro del espacio de trabajo el modal
 * es de composer (ver «5 · Plantillas/Importar»).
 *
 * No es `Steps`: ése es el trabajo de días, todas las etapas a la vista con su estado. Esto es
 * lo que se termina ahora.
 */
const meta: Meta = {
  title: "3 · Componentes/Pasos de una sentada",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** The frame a host gives it — a composer modal in the product; here, a card of its size. */
function Host({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-(--size-sheet) max-w-2xl flex-col overflow-clip rounded-box border border-line">
      {children}
    </div>
  );
}

const BANK_OPTIONS = BANKS.map((b) => ({ value: b, label: b }));

/** **Registrar una cuenta bancaria**, sin controlar: el flujo lleva solo el paso. El banco
 *  bloquea «Siguiente» hasta que se elige, y lo dice. */
export const TresPasos: Story = {
  name: "Tres pasos · bloqueado dice por qué",
  render: function Render() {
    const [bank, setBank] = useState("");
    const [number, setNumber] = useState("");
    const [outcome, setOutcome] = useState<"open" | "done" | "cancelled">("open");
    if (outcome === "done") {
      return (
        <Callout tone="good" title="Cuenta registrada">
          {`${bank} · ${number}`}
        </Callout>
      );
    }
    if (outcome === "cancelled") return <Callout>No se registró nada.</Callout>;
    return (
      <Host>
        <StepFlow
          onFinish={() => setOutcome("done")}
          onCancel={() => setOutcome("cancelled")}
        >
          <StepFlow.Step
            id="bank"
            title="Banco"
            description="El banco donde está la cuenta."
            {...(bank === "" ? { blocked: "Elegí el banco para seguir." } : {})}
          >
            <Field label="Banco">
              <Select value={bank} options={BANK_OPTIONS} onChange={setBank} />
            </Field>
          </StepFlow.Step>
          <StepFlow.Step
            id="number"
            title="Número de cuenta"
            {...(number.trim().length < 6
              ? { blocked: "El número tiene al menos 6 dígitos." }
              : {})}
          >
            <Field label="Número">
              <TextInput value={number} onChange={setNumber} mono spellCheck={false} />
            </Field>
          </StepFlow.Step>
          <StepFlow.Step id="review" title="Revisar" nextLabel="Registrar la cuenta">
            <Callout>{`${bank} · cuenta ${number}`}</Callout>
          </StepFlow.Step>
        </StepFlow>
      </Host>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    /* Where you are and what is left, in words. */
    await expect(canvas.getByText("Paso 1 de 3")).toBeVisible();
    const strip = within(canvas.getByRole("list", { name: "Pasos" }));
    await expect(strip.getByText("Banco").closest("[aria-current]")).toHaveAttribute(
      "aria-current",
      "step",
    );
    /* Blocked: off, and it says why — in sight and as the button's description. */
    const next = canvas.getByRole("button", { name: "Siguiente" });
    await expect(next).toBeDisabled();
    await expect(next).toHaveAccessibleDescription("Elegí el banco para seguir.");
    await expect(canvas.queryByRole("button", { name: "Atrás" })).toBeNull();

    /* The field's select, not the strip: both say «Banco». */
    await userEvent.click(
      canvas
        .getAllByRole("button", { name: /Banco/ })
        .find((one) => one.getAttribute("aria-haspopup") === "listbox")!,
    );
    await userEvent.click(await page.findByRole("option", { name: "Banco Unión" }));
    await userEvent.click(canvas.getByRole("button", { name: "Siguiente" }));

    /* Moved: the focus is on the new step's heading, and the move is announced. */
    const heading = await canvas.findByRole("heading", { name: "Número de cuenta" });
    await waitFor(() => expect(heading).toHaveFocus());
    await expect(canvas.getByText("Paso 2 de 3: Número de cuenta")).toBeInTheDocument();
    await userEvent.type(canvas.getByRole("textbox", { name: "Número" }), "1020304050");

    /* The keyboard alone: Tab on to «Siguiente» (past «Cancelar» and «Atrás»), Enter. */
    const forward = canvas.getByRole("button", { name: "Siguiente" });
    for (let i = 0; i < 6 && document.activeElement !== forward; i++) await userEvent.tab();
    await expect(forward).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    /* The last step names what happens; a done step goes back to review it. */
    await canvas.findByRole("heading", { name: "Revisar" });
    await userEvent.click(canvas.getByRole("button", { name: /^Banco/ }));
    await expect(await canvas.findByRole("heading", { name: "Banco" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Siguiente" }));
    await userEvent.click(canvas.getByRole("button", { name: "Siguiente" }));
    await userEvent.click(canvas.getByRole("button", { name: "Registrar la cuenta" }));
    await expect(await canvas.findByText("Cuenta registrada")).toBeVisible();
  },
};

/** **Terminando.** Mientras corre, el primario sigue en su lugar con el foco y no toma un
 *  segundo clic; «Atrás», «Cancelar» y los pasos hechos se apagan. */
export const Terminando: Story = {
  name: "Terminando · ocupado",
  render: () => (
    <Host>
      <StepFlow defaultCurrent="review" onFinish={() => {}} onCancel={() => {}} busy>
        <StepFlow.Step id="file" title="Subir el archivo">
          <span />
        </StepFlow.Step>
        <StepFlow.Step id="map" title="Mapear columnas">
          <span />
        </StepFlow.Step>
        <StepFlow.Step id="review" title="Revisar" nextLabel="Importar 6 contactos">
          <Callout tone="good">Se van a crear 6 contactos.</Callout>
        </StepFlow.Step>
      </StepFlow>
    </Host>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Importar 6 contactos" }),
    ).toHaveAttribute("aria-busy", "true");
    await expect(canvas.getByRole("button", { name: "Atrás" })).toBeDisabled();
    await expect(canvas.queryByRole("button", { name: /Subir el archivo/ })).toBeNull();
    await expect(canvas.getByText("Procesando…")).toBeInTheDocument();
  },
};
