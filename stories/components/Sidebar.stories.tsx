import {
  AppFrame,
  Metric,
  Metrics,
  NavigationTree,
  type NavItem,
  Sidebar,
  type SidebarAction,
  SystrayButton,
  ThemeSwitcher,
  TopBar,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Bell,
  BookOpen,
  ExternalLink,
  Images,
  KeyRound,
  Landmark,
  LogOut,
  ShoppingBag,
  Users,
} from "lucide-react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

/**
 * Context: **un back office sin barra arriba.** El portal de un colegio profesional: toda su
 * navegación cabe en una columna, así que la columna ES el cromo — la marca y el usuario
 * arriba, las secciones con sus pantallas y lo que espera en cada una, y la cuenta abajo.
 * `AppFrame` la hace tan alta como la ventana; en el teléfono la esconde y la abre, la misma,
 * como un cajón desde la barra de arriba.
 */
const meta: Meta = {
  title: "3 · Componentes/Shell · la barra lateral",
  tags: ["screen"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "`Sidebar` va en `AppFrame sidebar` sin `menu`: marca y usuario arriba, la navegación (`NavigationTree`) en el medio con su propio scroll, y las acciones de la cuenta abajo. En el teléfono `AppFrame` la abre como un cajón desde `narrowMenu` (una `TopBar` con el nombre del producto, que dibuja el botón primero).",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const SECCIONES: NavItem[] = [
  {
    id: "socios",
    label: "Socios",
    icon: Users,
    children: [
      { id: "socios.padron", label: "Padrón" },
      { id: "socios.cuotas", label: "Cuotas", count: 37 },
      { id: "socios.comprobantes", label: "Comprobantes por revisar", count: 7 },
    ],
  },
  {
    id: "cursos",
    label: "Cursos",
    icon: BookOpen,
    children: [
      { id: "cursos.lista", label: "Cursos" },
      { id: "cursos.inscripciones", label: "Inscripciones", count: 12 },
    ],
  },
  {
    id: "tienda",
    label: "Tienda",
    icon: ShoppingBag,
    children: [
      { id: "tienda.productos", label: "Productos" },
      { id: "tienda.pedidos", label: "Pedidos", count: 3 },
    ],
  },
  { id: "galeria", label: "Galería", icon: Images },
];

const CUENTA: readonly SidebarAction[] = [
  { id: "clave", label: "Cambiar contraseña", icon: KeyRound },
  { id: "sitio", label: "Ver el sitio", icon: ExternalLink, href: "#sitio", external: true },
  { id: "salir", label: "Salir", icon: LogOut },
];

const MARCA = { label: "Colegio de Contadores", icon: Landmark };

const NOMBRES: Record<string, string> = Object.fromEntries(
  SECCIONES.flatMap((s) => [
    [s.id, s.label],
    ...(s.children ?? []).map((c) => [c.id, c.label]),
  ]),
);

function Portal({ start = "socios.cuotas" }: { start?: string }) {
  const [actual, setActual] = useState(start);
  const [ultima, setUltima] = useState<string | null>(null);
  return (
    <AppFrame
      sidebar={
        <Sidebar
          brand={MARCA}
          user={{ name: "Ana Gutiérrez", detail: "Tesorería" }}
          actions={CUENTA}
          onAction={setUltima}
          footer={<ThemeSwitcher />}
        >
          <NavigationTree items={SECCIONES} current={actual} onNavigate={setActual} />
        </Sidebar>
      }
      narrowMenu={
        <TopBar
          app={MARCA}
          systray={
            <SystrayButton
              icon={Bell}
              label="Comprobantes por revisar"
              count={7}
              tone="warn"
            />
          }
        />
      }
    >
      <div className="flex flex-col gap-4 bg-surface p-4 sm:p-8">
        <h1 className="text-display font-semibold text-ink" data-testid="pantalla">
          {NOMBRES[actual] ?? actual}
        </h1>
        <Metrics>
          <Metric value={412} label="socios al día" />
          <Metric value={37} label="cuotas vencidas" tone="bad" />
          <Metric label="inscripciones del mes" loading />
        </Metrics>
        <p className="font-mono text-micro text-muted">{ultima ?? "—"}</p>
      </div>
    </AppFrame>
  );
}

/** **La columna es el cromo.** Tan alta como la ventana: el producto arriba a la izquierda,
 *  las secciones con lo que espera en cada una, y la cuenta abajo, siempre a la vista aunque
 *  el mapa scrollee. Elegí «Teléfono» en la barra de tamaños para verla como cajón. */
export const ComoCromo: Story = {
  render: () => <Portal />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The runner's desk (1280 × 900): the sidebar is beside the view.
    await expect(window.innerWidth).toBe(1280);
    // Beside the view, with nothing on top of it: the phone's bar is not drawn.
    await expect(canvas.queryByRole("button", { name: "Abrir la navegación" })).toBeNull();
    await userEvent.click(canvas.getByRole("link", { name: /Comprobantes por revisar/ }));
    await expect(canvas.getByTestId("pantalla").textContent).toBe("Comprobantes por revisar");
    await userEvent.click(canvas.getByRole("button", { name: "Salir" }));
    await expect(canvasElement.textContent).toContain("salir");
  },
};

/** **En el teléfono, la misma columna es un cajón.** La barra de arriba tiene el nombre del
 *  producto y, primero, el botón que la abre. Elegir una pantalla la cierra: ya fuiste a
 *  donde ibas. El velo, Escape y la × también. */
export const EnElTelefono: Story = {
  render: () => <Portal />,
  globals: { viewport: { value: "telefono", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await expect(window.innerWidth).toBe(390);
    await userEvent.click(canvas.getByRole("button", { name: "Abrir la navegación" }));
    const cajon = await page.findByRole("dialog", { name: "Navegación" });
    await userEvent.click(within(cajon).getByRole("link", { name: /Padrón/ }));
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Navegación" })).toBeNull(),
    );
    await expect(canvas.getByTestId("pantalla").textContent).toBe("Padrón");
  },
};
