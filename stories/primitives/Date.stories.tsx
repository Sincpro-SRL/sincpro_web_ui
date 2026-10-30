import {
  Calendar,
  DateField,
  DatePicker,
  DateRangePicker,
  type DateRangeValue,
  Field,
  FormModeProvider,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

/**
 * Context: **las fechas de un ERP.** El valor es un ISO —`"2026-10-30"`—, lo que manda
 * cualquier backend; el campo se escribe por segmentos en el orden del idioma (día/mes/año en
 * `es-BO`) y una fecha imposible no se puede escribir. Teclado y lector de pantalla los
 * resuelve React Aria: flechas para cambiar un segmento, Alt+↓ para abrir el calendario.
 */
const meta: Meta = {
  title: "2 · Primitivas/Fechas",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`DateField`, `DatePicker`, `DateRangePicker` y `Calendar`, sobre React Aria. Escritos directo dentro de `Field`, toman del campo su rótulo, la ayuda y el error.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-box border border-line bg-surface p-4">
      {children}
    </div>
  );
}

/** **En un formulario.** Los tres controles dentro de `Field`, sin cableado. */
export const EnUnFormulario: Story = {
  render: function Render() {
    const [emision, setEmision] = useState<string | null>("2026-10-30");
    const [vence, setVence] = useState<string | null>(null);
    const [vigencia, setVigencia] = useState<DateRangeValue | null>({
      start: "2026-11-01",
      end: "2027-10-31",
    });
    return (
      <Box>
        <Field label="Fecha de emisión" required>
          <DatePicker value={emision} onChange={setEmision} />
        </Field>
        <Field
          label="Vence"
          hint="No puede ser antes de la emisión."
          error={
            vence !== null && emision !== null && vence < emision
              ? "Tiene que ser después de la emisión."
              : undefined
          }
        >
          <DatePicker value={vence} onChange={setVence} min={emision ?? undefined} />
        </Field>
        <Field label="Vigencia del contrato">
          <DateRangePicker value={vigencia} onChange={setVigencia} />
        </Field>
        <p className="text-micro text-muted tabular-nums">
          valor: {JSON.stringify({ emision, vence, vigencia })}
        </p>
      </Box>
    );
  },
};

/** **Sólo por segmentos.** Para una fecha que se sabe de memoria — nadie busca su fecha de
 *  nacimiento en un calendario. */
export const SoloSegmentos: Story = {
  render: function Render() {
    const [nacimiento, setNacimiento] = useState<string | null>(null);
    return (
      <Box>
        <Field label="Fecha de nacimiento">
          <DateField value={nacimiento} onChange={setNacimiento} max="2026-10-30" />
        </Field>
      </Box>
    );
  },
};

/** **En modo lectura.** En un registro que se está mirando, la fecha es un dato y no un
 *  control: se dibuja como texto, en el formato del idioma. */
export const Lectura: Story = {
  render: () => (
    <Box>
      <FormModeProvider value="read">
        <Field label="Fecha de emisión">
          <DatePicker value="2026-10-30" />
        </Field>
        <Field label="Vigencia del contrato">
          <DateRangePicker value={{ start: "2026-11-01", end: "2027-10-31" }} />
        </Field>
      </FormModeProvider>
    </Box>
  ),
};

/** **El calendario suelto.** Para una agenda, un panel de filtros, un tablero. */
export const CalendarioSuelto: Story = {
  render: () => (
    <div className="w-fit rounded-box border border-line bg-surface p-3">
      <Calendar aria-label="Agenda" />
    </div>
  ),
};
