import { RecordTimeline, type TimelineRow } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta: Meta = {
  title: "3 · Componentes/Línea de tiempo · registros agrupados",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "La vista Gantt de Odoo: registros agrupados en filas (por empleado, por sala, por máquina), N por fila, a lo largo del tiempo. La barra de arriba mueve el período, cambia la escala (día por horas, semana, mes, año), acerca y aleja, y ocupa la pantalla. Una barra se ARRASTRA (en el tiempo o a otra fila), su borde derecho la ESTIRA, un hueco se toca para crear; con el teclado, Alt + flechas.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

type Asistencia = { id: string; empleado: string; entrada: Date; salida: Date };

const EMPLEADOS: TimelineRow[] = [
  { id: "e1", label: "Alvaro Gutierrez Panoso", avatar: true, detail: "Desarrollo" },
  {
    id: "e2",
    label: "Ammy Shalem Aranibar Zambrana",
    avatar: true,
    detail: "Implementación",
  },
  { id: "e3", label: "Brad Diego Paco Porco", avatar: true, detail: "Soporte" },
  { id: "e4", label: "Diego Alejandro Lara Goytia", avatar: true, detail: "Desarrollo" },
  { id: "e5", label: "Luis David Condori Rivera", avatar: true, detail: "ISO" },
  { id: "e6", label: "Melina Vivian Laredo Arze", avatar: true, detail: "Comercial" },
  { id: "e7", label: "Silvia Mejia", avatar: true, detail: "Administración" },
];

const h = (hour: number, minute = 0) => new Date(2026, 9, 29, hour, minute);

const ASISTENCIAS: Asistencia[] = [
  { id: "a1", empleado: "e2", entrada: h(9, 12), salida: h(13, 13) },
  { id: "a2", empleado: "e3", entrada: h(10, 0), salida: h(13, 4) },
  { id: "a3", empleado: "e3", entrada: h(14, 18), salida: h(18, 59) },
  { id: "a4", empleado: "e4", entrada: h(9, 4), salida: h(18, 5) },
  { id: "a5", empleado: "e5", entrada: h(8, 59), salida: h(13, 3) },
  { id: "a6", empleado: "e5", entrada: h(12, 30), salida: h(14, 0) },
  { id: "a7", empleado: "e5", entrada: h(14, 18), salida: h(18, 5) },
  { id: "a8", empleado: "e6", entrada: h(9, 15), salida: h(13, 51) },
];

/** Asistencias de un día, por empleado y por hora — como el Gantt de Odoo. Dos entradas que se
 *  pisan van una debajo de la otra. Arrastrá una barra, estirala, o tocá un hueco para crear. */
export const Asistencias: Story = {
  render: function Render() {
    const [items, setItems] = useState(ASISTENCIAS);
    const [dicho, setDicho] = useState("nada todavía");
    return (
      <div className="flex flex-col gap-3">
        <RecordTimeline<Asistencia>
          items={items}
          keyOf={(a) => a.id}
          rowOf={(a) => a.empleado}
          rows={EMPLEADOS}
          rowHeader="Empleado"
          startOf={(a) => a.entrada}
          endOf={(a) => a.salida}
          toneOf={(a) => (+a.salida - +a.entrada > 7 * 3_600_000 ? "good" : "neutral")}
          defaultScale="day"
          defaultDate={h(0)}
          onMove={(a, entrada, salida, empleado) => {
            setItems((all) =>
              all.map((one) =>
                one.id === a.id ? { ...one, entrada, salida, empleado } : one,
              ),
            );
            setDicho(`movida: ${a.id}`);
          }}
          onCreate={(empleado, entrada) =>
            setDicho(`crear para ${empleado} a las ${entrada.getHours()}:00`)
          }
          onOpen={(a) => setDicho(`abrir: ${a.id}`)}
        />
        <p className="text-meta text-muted">
          último gesto: <span className="text-ink">{dicho}</span>
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const gesture = () => canvas.getByText(/^último gesto:/).parentElement!;
    /* Two overlapping entries of one person stack: three bars in Luis's row. */
    const bar = canvas.getByRole("button", { name: /\(09:12/ });
    await userEvent.click(bar);
    await expect(gesture()).toHaveTextContent("abrir: a1");
    /* The keyboard moves it a quarter of an hour later. */
    bar.focus();
    await userEvent.keyboard("{Alt>}{ArrowRight}{/Alt}");
    await waitFor(() => expect(gesture()).toHaveTextContent("movida: a1"));
    await expect(canvas.getByRole("button", { name: /\(09:27/ })).toBeVisible();
  },
};

/** La semana: cada día una columna, el fin de semana sombreado. Las flechas de la barra
 *  mueven la semana; «Hoy» vuelve. */
export const Semana: Story = {
  render: () => (
    <RecordTimeline<Asistencia>
      items={ASISTENCIAS}
      keyOf={(a) => a.id}
      rowOf={(a) => a.empleado}
      rows={EMPLEADOS}
      rowHeader="Empleado"
      startOf={(a) => a.entrada}
      endOf={(a) => a.salida}
      defaultScale="week"
      defaultDate={h(0)}
    />
  ),
};
