import {
  Calendar,
  DateField,
  DatePicker,
  DateRangePicker,
  type DateRangeValue,
  DateTimePicker,
  Field,
  FormModeProvider,
  TimeField,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

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
          "`DateField`, `DatePicker`, `DateRangePicker`, `TimeField`, `DateTimePicker` y `Calendar`, sobre React Aria. Escritos directo dentro de `Field`, toman del campo su rótulo, la ayuda y el error. El mes y el año del encabezado del calendario son listas: a una fecha de hace años se llega en dos clics.",
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

/** **Saltando de año.** Una fecha de nacimiento o un contrato de 2019 no se buscan a fuerza de
 *  «mes anterior»: el mes y el año del encabezado del calendario son listas. Abrí la del año
 *  y escribí «1987» — salta ahí. Con `max` en hoy, la lista termina hoy. */
export const SaltandoDeAnio: Story = {
  render: function Render() {
    const [nacimiento, setNacimiento] = useState<string | null>("1987-04-12");
    const [firma, setFirma] = useState<string | null>(null);
    return (
      <Box>
        <Field label="Fecha de nacimiento" hint="Abrí el calendario: el año es una lista.">
          <DatePicker value={nacimiento} onChange={setNacimiento} max="2026-10-30" />
        </Field>
        <Field label="Firma del contrato">
          <DatePicker value={firma} onChange={setFirma} />
        </Field>
        <p className="text-micro text-muted tabular-nums">
          valor: {JSON.stringify({ nacimiento, firma })}
        </p>
      </Box>
    );
  },
};

/** **La hora de una cita.** `TimeField` guarda `"HH:MM"` en 24 h, lo que guarda una columna de
 *  hora; lo que se VE sigue al idioma de la copia. CLDR escribe `es-BO` en 12 h («p. m.»): una
 *  empresa que trabaja en 24 h pasa `hourCycle={24}` y el valor no cambia. */
export const HoraDeUnaCita: Story = {
  render: function Render() {
    const [cita, setCita] = useState<string | null>("09:30");
    const [apertura, setApertura] = useState<string | null>("08:00");
    return (
      <Box>
        <Field label="Hora de la cita" hint="Entre las 08:00 y las 18:00.">
          <TimeField value={cita} onChange={setCita} min="08:00" max="18:00" />
        </Field>
        <Field label="Apertura del turno" hint="En 24 h, como se lee en planta.">
          <TimeField value={apertura} onChange={setApertura} hourCycle={24} />
        </Field>
        <p className="text-micro text-muted tabular-nums">
          valor: {JSON.stringify({ cita, apertura })}
        </p>
      </Box>
    );
  },
};

/** **Una entrega programada.** El día y la hora en un solo campo: el día se escribe o se elige en
 *  el calendario, la hora se escribe después. El valor es LOCAL y sin zona —
 *  `"2026-11-04T14:00"`—: «el 4 a las dos» es la hora del almacén, no un instante. */
export const EntregaProgramada: Story = {
  render: function Render() {
    const [entrega, setEntrega] = useState<string | null>("2026-11-04T14:00");
    return (
      <Box>
        <Field label="Entrega programada" hint="No antes de mañana a primera hora.">
          <DateTimePicker
            value={entrega}
            onChange={setEntrega}
            min="2026-10-31T08:00"
            hourCycle={24}
          />
        </Field>
        <p className="text-micro text-muted tabular-nums">
          valor: {JSON.stringify({ entrega })}
        </p>
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
        <Field label="Hora de la cita">
          <TimeField value="09:30" />
        </Field>
        <Field label="Entrega programada">
          <DateTimePicker value="2026-11-04T14:00" />
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

/**
 * **El hoy de la empresa.** `today` dice qué día es para el negocio: el calendario lo marca y
 * abre ahí. Sin `today`, el día del navegador — que es otro cuando la empresa está en otra zona
 * o ya pasó la medianoche en otro lado.
 */
export const ElHoyEsElDeLaEmpresa: Story = {
  render: () => (
    <div className="w-fit rounded-box border border-line bg-surface p-3">
      <Calendar aria-label="Agenda" today="2026-03-12" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const grid = await within(canvasElement).findByRole("grid");
    await expect(within(grid).getByText("12").className).toMatch(/underline/);
    await expect(within(grid).getByText("13").className).not.toMatch(/underline/);
  },
};

/**
 * **Una fecha guardada abre en su mes.** Con `today`, el calendario de un `DatePicker` vacío abre
 * en el hoy de la empresa; con un valor, en el mes de ese valor — nunca lo esconde detrás de hoy.
 */
export const UnaFechaGuardadaAbreEnSuMes: Story = {
  render: () => (
    <Box>
      <DatePicker aria-label="Vencimiento" value="2019-03-15" today="2026-11-06" />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole("dialog");
    // The month on screen is the value's: the grid is named after it (React Aria), and the
    // hidden list of years holds both 2019 and 2026 — never ask the text alone.
    await waitFor(() =>
      expect(within(dialog).getByRole("grid")).toHaveAccessibleName(/2019/),
    );
    await expect(within(dialog).getByRole("grid")).not.toHaveAccessibleName(/2026/);
  },
};
