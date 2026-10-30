import {
  DatePicker,
  ENGLISH_COPY,
  Field,
  Pagination,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

/**
 * Context: **el idioma es un dato.** Ningún componente tiene texto escrito: todo sale de una
 * tabla de copia, y la tabla decide también el locale — el orden día/mes de una fecha, el
 * separador de miles, el primer día de la semana. `UiCopyProvider` la cambia para un árbol;
 * `installCopy` la instala para toda la app.
 */
const meta: Meta = {
  title: "1 · Fundamentos/Idioma",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

function Screen() {
  const [date, setDate] = useState<string | null>("2026-10-30");
  return (
    <div className="flex flex-col gap-3 rounded-box border border-line bg-surface p-4">
      <Field label="Fecha / Date">
        <DatePicker value={date} onChange={setDate} />
      </Field>
      <Pagination from={1} to={80} total={12480} pageSize={80} onNext={() => {}} />
    </div>
  );
}

/** **La misma pantalla en dos idiomas.** Mirá el orden de la fecha y el separador de miles. */
export const DosIdiomas: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-6 md:grid-cols-2">
      <section className="flex flex-col gap-2">
        <h2 className="text-micro font-medium text-muted">es-BO</h2>
        <UiCopyProvider copy={SPANISH_COPY}>
          <Screen />
        </UiCopyProvider>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-micro font-medium text-muted">en-US</h2>
        <UiCopyProvider copy={ENGLISH_COPY}>
          <Screen />
        </UiCopyProvider>
      </section>
    </div>
  ),
};
