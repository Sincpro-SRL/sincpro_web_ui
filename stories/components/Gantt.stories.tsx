import { type GanttLink, RecordGantt } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, within } from "storybook/test";

const meta: Meta = {
  title: "3 · Componentes/Gantt · registros en una línea de tiempo",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Proyectos, tareas, órdenes de producción en una línea de tiempo. Una barra se ARRASTRA para moverla, se ESTIRA para cambiar su duración, y su progreso se tira con el mango; las dependencias se dibujan como flechas. Avisa cada cambio terminado (`onMove`, `onProgress`) y la app guarda. SVAR React Gantt, vestido con los tokens.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

type Tarea = {
  id: string;
  nombre: string;
  inicio: Date;
  fin: Date;
  avance: number;
  padre?: string;
  hito?: boolean;
};

const d = (day: number) => new Date(2026, 10, day);

const TAREAS: Tarea[] = [
  {
    id: "p",
    nombre: "Implementación Odoo · Clínica San Gabriel",
    inicio: d(2),
    fin: d(28),
    avance: 35,
  },
  {
    id: "t1",
    nombre: "Relevamiento de procesos",
    inicio: d(2),
    fin: d(6),
    avance: 100,
    padre: "p",
  },
  {
    id: "t2",
    nombre: "Configuración de ventas y POS",
    inicio: d(9),
    fin: d(16),
    avance: 40,
    padre: "p",
  },
  {
    id: "t3",
    nombre: "Migración de clientes y productos",
    inicio: d(12),
    fin: d(19),
    avance: 10,
    padre: "p",
  },
  {
    id: "t4",
    nombre: "Capacitación de usuarios",
    inicio: d(20),
    fin: d(25),
    avance: 0,
    padre: "p",
  },
  {
    id: "m1",
    nombre: "Puesta en marcha",
    inicio: d(27),
    fin: d(27),
    avance: 0,
    padre: "p",
    hito: true,
  },
];

const DEPENDENCIAS: GanttLink[] = [
  { id: "l1", source: "t1", target: "t2" },
  { id: "l2", source: "t2", target: "t4" },
  { id: "l3", source: "t3", target: "t4" },
  { id: "l4", source: "t4", target: "m1" },
];

/** Una implementación con sus fases, dependencias y la puesta en marcha como hito. */
export const Implementacion: Story = {
  render: function Render() {
    const [tareas, setTareas] = useState(TAREAS);
    const [dicho, setDicho] = useState("nada todavía");
    return (
      <div className="flex flex-col gap-3">
        <RecordGantt<Tarea>
          items={tareas}
          keyOf={(t) => t.id}
          titleOf={(t) => t.nombre}
          startOf={(t) => t.inicio}
          endOf={(t) => t.fin}
          progressOf={(t) => t.avance}
          parentOf={(t) => t.padre}
          milestoneOf={(t) => t.hito === true}
          links={DEPENDENCIAS}
          nameHeader="Tarea"
          onMove={(t, inicio, fin) => {
            setTareas((all) =>
              all.map((one) => (one.id === t.id ? { ...one, inicio, fin } : one)),
            );
            setDicho(`movida: ${t.nombre}`);
          }}
          onProgress={(t, avance) => setDicho(`${t.nombre}: ${avance} %`)}
          onOpen={(t) => setDicho(`abrir: ${t.nombre}`)}
        />
        <p className="text-meta text-muted">
          último gesto: <span className="text-ink">{dicho}</span>
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findAllByText("Configuración de ventas y POS"),
    ).not.toHaveLength(0);
  },
};

/** Solo lectura y por semanas: sin `onMove` ni `onProgress` nada se arrastra. */
export const SoloLectura: Story = {
  render: () => (
    <RecordGantt<Tarea>
      items={TAREAS}
      keyOf={(t) => t.id}
      titleOf={(t) => t.nombre}
      startOf={(t) => t.inicio}
      endOf={(t) => t.fin}
      progressOf={(t) => t.avance}
      parentOf={(t) => t.padre}
      milestoneOf={(t) => t.hito === true}
      links={DEPENDENCIAS}
      zoom="week"
      nameHeader="Tarea"
    />
  ),
};
