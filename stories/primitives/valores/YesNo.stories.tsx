import { type DataColumn, DataTable, YesNo } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta: Meta = {
  title: "2 · Primitivas/Valores/Sí o no",
  parameters: {
    docs: {
      description: {
        component:
          "Un booleano tiene **formas**, elegidas por columna: `check` (✓ y nada — se buscan los sí), `icon` (✓ verde y ✕ gris — las dos respuestas importan), `word` (✓ Sí / No, la de siempre). Con `onToggle`, una columna lo **cambia desde la lista**: casilla o interruptor. Todas dicen «sí» o «no» a un lector de pantalla — también el «no» vacío de `check`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** Las tres formas de leerlo, para un sí y para un no. */
export const Formas: Story = {
  render: () => (
    <dl className="grid w-fit grid-cols-3 items-center gap-x-8 gap-y-3 p-6 text-meta">
      {(["check", "icon", "word"] as const).map((look) => (
        <div key={look} className="contents">
          <dt className="font-mono text-muted">{look}</dt>
          <dd>
            <YesNo value look={look} />
          </dd>
          <dd>
            <YesNo value={false} look={look} />
          </dd>
        </div>
      ))}
    </dl>
  ),
};

type Course = {
  id: string;
  title: string;
  published: boolean;
  open: boolean;
  certified: boolean;
};
const COURSES: Course[] = [
  {
    id: "1",
    title: "Congreso Departamental de Auditoría 2026",
    published: true,
    open: true,
    certified: true,
  },
  {
    id: "2",
    title: "Tributación boliviana: IVA, IT e IUE",
    published: true,
    open: false,
    certified: false,
  },
  {
    id: "3",
    title: "Ética profesional del auditor",
    published: false,
    open: false,
    certified: true,
  },
];

/**
 * **En una tabla**: «Publicado» se marca desde la lista con un interruptor, «Inscripciones
 * abiertas» con una casilla — sólo en los cursos publicados (`when`) —, y «Con certificado» se
 * lee con la forma `icon`. Marcar no abre el curso: la fila sigue abriéndose con un clic en
 * cualquier otro lado.
 */
export const EnUnaTabla: Story = {
  render: function Render() {
    const [courses, setCourses] = useState(COURSES);
    const [opened, setOpened] = useState("—");
    const set = (id: string, patch: Partial<Course>) =>
      setCourses((all) => all.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const columns: DataColumn<Course>[] = [
      { id: "title", header: "Título", value: (c) => c.title },
      {
        id: "published",
        header: "Publicado",
        value: (c) => c.published,
        yesNo: { look: "switch", onToggle: (c, next) => set(c.id, { published: next }) },
      },
      {
        id: "open",
        header: "Inscripciones abiertas",
        value: (c) => c.open,
        yesNo: {
          look: "checkbox",
          onToggle: (c, next) => set(c.id, { open: next }),
          when: (c) => c.published,
        },
      },
      {
        id: "certified",
        header: "Con certificado",
        value: (c) => c.certified,
        yesNo: { look: "icon" },
      },
    ];
    return (
      <div className="flex flex-col gap-3 p-6">
        <DataTable<Course>
          data={courses}
          columns={columns}
          getRowId={(c) => c.id}
          onRowClick={(c) => setOpened(c.title)}
        />
        <p className="text-meta text-muted">Abierto: {opened}</p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const switches = await canvas.findAllByRole("switch", { name: "Publicado" });
    await expect(switches[2]).not.toBeChecked();
    await userEvent.click(switches[2]!);
    await waitFor(() => expect(switches[2]).toBeChecked());
    // Ticking changed the value without opening the course.
    await expect(canvas.getByText("Abierto: —")).toBeVisible();
    // Published now, its enrolment can be opened from the list.
    await waitFor(() =>
      expect(
        canvas.getAllByRole("checkbox", { name: "Inscripciones abiertas" }),
      ).toHaveLength(3),
    );
  },
};
