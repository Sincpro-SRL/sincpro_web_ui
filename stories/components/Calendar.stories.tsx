import { type CalendarView, RecordCalendar, type Tone } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta: Meta = {
  title: "3 · Componentes/Calendario · registros en el tiempo",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Los registros en un calendario: reuniones, llamadas, entregas. Mes, semana, día y agenda; un evento se ARRASTRA a otro momento o se ESTIRA, y se selecciona un tramo vacío para crear. Es controlado: el calendario avisa (`onMove`, `onCreate`) y la app guarda — nunca muestra una fecha que el servidor no aceptó. FullCalendar v7, vestido con los tokens.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

type Actividad = {
  id: string;
  titulo: string;
  inicio: Date;
  fin: Date;
  tono: Tone;
  todoElDia?: boolean;
  responsable?: string;
  cliente?: string;
};

const d = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);

const ACTIVIDADES: Actividad[] = [
  {
    id: "a1",
    titulo: "Demo Odoo",
    cliente: "Clínica San Gabriel S.A.",
    responsable: "Andrés Gutiérrez",
    inicio: d(3, 10),
    fin: d(3, 11, 30),
    tono: "info",
  },
  {
    id: "a2",
    titulo: "Llamada de cobranza",
    cliente: "Distribuidora Andina S.R.L.",
    responsable: "Carla Rojas",
    inicio: d(4, 9),
    fin: d(4, 9, 30),
    tono: "bad",
  },
  {
    id: "a3",
    titulo: "Firma de contrato",
    cliente: "Constructora Illimani",
    responsable: "Josefa Muñoz",
    inicio: d(5, 15),
    fin: d(5, 16),
    tono: "good",
  },
  {
    id: "a4",
    titulo: "Visita técnica",
    cliente: "Ferretería El Progreso",
    responsable: "Carla Rojas",
    inicio: d(6, 11),
    fin: d(6, 13),
    tono: "warn",
  },
  {
    id: "a5",
    titulo: "Auditoría ISO 9001",
    inicio: d(10, 0),
    fin: d(12, 0),
    tono: "neutral",
    todoElDia: true,
  },
  {
    id: "a6",
    titulo: "Capacitación usuarios POS",
    inicio: d(17, 14),
    fin: d(17, 18),
    tono: "info",
  },
];

function Agenda({ view }: { view: CalendarView }) {
  const [items, setItems] = useState(ACTIVIDADES);
  const [dicho, setDicho] = useState("nada todavía");
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-box border border-line bg-surface p-4">
        <RecordCalendar<Actividad>
          items={items}
          keyOf={(a) => a.id}
          titleOf={(a) => a.titulo}
          startOf={(a) => a.inicio}
          endOf={(a) => a.fin}
          allDayOf={(a) => a.todoElDia === true}
          toneOf={(a) => a.tono}
          avatarOf={(a) =>
            a.responsable === undefined ? undefined : { name: a.responsable }
          }
          metaOf={(a) => a.cliente}
          view={view}
          date={d(2, 9)}
          onMove={(a, inicio, fin) => {
            setItems((all) =>
              all.map((one) =>
                one.id === a.id ? { ...one, inicio, fin: fin ?? one.fin } : one,
              ),
            );
            setDicho(`movida: ${a.titulo}`);
          }}
          onCreate={(inicio) => setDicho(`crear el ${inicio.toLocaleString("es-BO")}`)}
          onOpen={(a) => setDicho(`abrir: ${a.titulo}`)}
        />
      </div>
      <p className="text-meta text-muted">
        último gesto: <span className="text-ink">{dicho}</span>
      </p>
    </div>
  );
}

/** El mes, con las actividades de un vendedor coloreadas por lo que significan: vencida en
 *  rojo, confirmada en verde. Arrastrá una a otro día; tocala para abrirla. */
export const Mes: Story = {
  render: () => <Agenda view="month" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText("Demo Odoo"));
    await waitFor(() =>
      expect(canvas.getByText(/^último gesto:/).parentElement).toHaveTextContent(
        "abrir: Demo Odoo",
      ),
    );
  },
};

/** La semana por horas: arrastrar mueve la hora, estirar el borde de abajo cambia la duración,
 *  y arrastrar sobre horas vacías propone crear ahí. */
export const Semana: Story = { render: () => <Agenda view="week" /> };

/** La agenda: lo que viene, en lista — para el teléfono y para leer. */
export const Agenda_: Story = { name: "Agenda", render: () => <Agenda view="agenda" /> };
