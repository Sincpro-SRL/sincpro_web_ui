import {
  AppFrame,
  type DataColumn,
  DataTable,
  Metric,
  Metrics,
  NavigationTree,
  type NavItem,
  Sidebar,
  type SidebarAction,
  type Surface,
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
import { type ReactElement, useState } from "react";
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
          "`Sidebar` va en `AppFrame sidebar` sin `menu`: marca y usuario arriba, la navegación (`NavigationTree`) en el medio con su propio scroll, y las acciones de la cuenta abajo. `search` dibuja «Buscar…  ⌘K» bajo el usuario: la paleta de la aplicación, a la vista. En el teléfono `AppFrame` la abre como un cajón desde `narrowMenu` (una `TopBar` con el nombre del producto, que dibuja el botón primero).",
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

/* An inline crest: it paints with the tokens — the gold of the chrome and the ink around
   it — so it follows the theme and the surface, which an image with its colours baked in
   cannot. */
const ESCUDO: ReactElement = (
  <svg viewBox="0 0 32 32" fill="none" data-testid="escudo">
    <path
      d="M16 3 5 7.5V15c0 6.6 4.6 11.6 11 14 6.4-2.4 11-7.4 11-14V7.5Z"
      stroke="var(--color-chrome-accent)"
      strokeWidth="2"
    />
    <path
      d="M10 13.5h12M11.5 13.5v7M16 13.5v7M20.5 13.5v7M9.5 21.5h13"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

const NOMBRES: Record<string, string> = Object.fromEntries(
  SECCIONES.flatMap((s) => [
    [s.id, s.label],
    ...(s.children ?? []).map((c) => [c.id, c.label]),
  ]),
);

function Portal({
  start = "socios.cuotas",
  surface,
  logo,
}: {
  start?: string;
  surface?: Surface;
  logo?: ReactElement;
}) {
  const [actual, setActual] = useState(start);
  const [ultima, setUltima] = useState<string | null>(null);
  return (
    <AppFrame
      {...(surface === undefined ? {} : { sidebarSurface: surface })}
      sidebar={
        <Sidebar
          brand={logo === undefined ? MARCA : { ...MARCA, logo }}
          user={{ name: "Ana Gutiérrez", detail: "Tesorería" }}
          search={{ onSearch: () => setUltima("buscar") }}
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
          search={{ onSearch: () => setUltima("buscar") }}
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
 *  «Buscar…» con su atajo debajo — la paleta de la aplicación, a la vista —, las secciones con
 *  lo que espera en cada una, y la cuenta abajo, siempre a la vista aunque el mapa scrollee.
 *  Elegí «Teléfono» en la barra de tamaños para verla como cajón. */
export const ComoCromo: Story = {
  render: () => <Portal />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The runner's desk (1280 × 900): the sidebar is beside the view.
    await expect(window.innerWidth).toBe(1280);
    // Beside the view, with nothing on top of it: the phone's bar is not drawn.
    await expect(canvas.queryByRole("button", { name: "Abrir la navegación" })).toBeNull();
    /* The palette, made visible: it says its shortcut the way this keyboard writes it, and a
       press calls `onSearch`. It does not listen for the key itself — the palette does. */
    const buscar = canvas.getByRole("button", { name: "Buscar…" });
    await expect(buscar.getAttribute("aria-keyshortcuts")).toMatch(/^(Meta|Control)\+K$/);
    await expect(buscar.textContent).toMatch(/⌘K|Ctrl K/);
    await userEvent.click(buscar);
    await expect(canvasElement.textContent).toContain("buscar");
    await userEvent.click(canvas.getByRole("link", { name: /Comprobantes por revisar/ }));
    await expect(canvas.getByTestId("pantalla").textContent).toBe("Comprobantes por revisar");
    await userEvent.click(canvas.getByRole("button", { name: "Salir" }));
    await expect(canvasElement.textContent).toContain("salir");
  },
};

/** **En el teléfono, la misma columna es un cajón.** La barra de arriba tiene el nombre del
 *  producto y, primero, el botón que la abre; «Buscar…» queda en la lupa, a un toque. Elegir
 *  una pantalla cierra el cajón: ya fuiste a donde ibas. El velo, Escape y la × también. */
export const EnElTelefono: Story = {
  render: () => <Portal />,
  globals: { viewport: { value: "telefono", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await expect(window.innerWidth).toBe(390);
    /* The search folds to the magnifier: no shortcut drawn on a phone, the name stays. */
    const lupa = canvas.getByRole("button", { name: "Buscar…" });
    await expect(lupa.getBoundingClientRect().width).toBeLessThanOrEqual(44);
    await userEvent.click(lupa);
    await expect(canvasElement.textContent).toContain("buscar");
    await userEvent.click(canvas.getByRole("button", { name: "Abrir la navegación" }));
    const cajon = await page.findByRole("dialog", { name: "Navegación" });
    await userEvent.click(within(cajon).getByRole("link", { name: /Padrón/ }));
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Navegación" })).toBeNull(),
    );
    await expect(canvas.getByTestId("pantalla").textContent).toBe("Padrón");
  },
};

/** **En el color de la marca.** Sin barra arriba la columna ES el cromo, y un producto cuyo
 *  cromo es su azul la quiere así: `AppFrame sidebarSurface="chrome"`. El árbol, los
 *  contadores y el avatar la siguen sin que nadie se los diga. El escudo va en línea —un
 *  `<svg>` que pinta con los tokens—, así sigue al tema y a la superficie. */
export const EnElColorDeLaMarca: Story = {
  render: () => <Portal surface="chrome" logo={ESCUDO} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const aside = canvasElement.querySelector("aside")!;
    const chrome = getComputedStyle(canvasElement).getPropertyValue("--color-chrome").trim();
    const probe = document.createElement("div");
    probe.style.background = chrome;
    canvasElement.append(probe);
    const expected = getComputedStyle(probe).backgroundColor;
    probe.remove();
    // The column wears the brand's colour, and the logo is drawn inline, not as an image.
    await expect(getComputedStyle(aside).backgroundColor).toBe(expected);
    await expect(within(aside).getByTestId("escudo").tagName.toLowerCase()).toBe("svg");
    await expect(aside.querySelector("img")).toBeNull();
    // The tree on it is the same tree: it still navigates.
    await userEvent.click(canvas.getByRole("link", { name: /Padrón/ }));
    await expect(canvas.getByTestId("pantalla").textContent).toBe("Padrón");
  },
};

type Fila = { id: string; numero: string; cliente: string; total: string };

const FILAS: readonly Fila[] = Array.from({ length: 80 }, (_, i) => ({
  id: `F${i}`,
  numero: `FAC/2026/${String(i + 1).padStart(4, "0")}`,
  cliente: ["Ferretería El Progreso", "Clínica San Gabriel", "Panadería Doña Julia"][i % 3]!,
  total: `Bs. ${((i + 1) * 137.5).toLocaleString("es-BO", { minimumFractionDigits: 2 })}`,
}));

const COLUMNAS: DataColumn<Fila>[] = [
  { id: "numero", header: "Número", value: (f) => f.numero, width: 160 },
  { id: "cliente", header: "Cliente", value: (f) => f.cliente },
  { id: "total", header: "Total", value: (f) => f.total, numeric: true, width: 140 },
];

/** **Un espacio de trabajo con scroll propio.** Un workspace (el de composer) es tan alto
 *  como la ventana y scrollea DENTRO de sus cajas. Con `scroll="view"` el marco es la ventana,
 *  la vista recibe lo que dejan las barras, y lo pegajoso de adentro empieza de cero: el
 *  encabezado de la tabla queda arriba de SU caja, no a la altura de la barra de arriba
 *  encima de las primeras filas. */
export const EspacioDeTrabajo: Story = {
  render: () => (
    <AppFrame
      scroll="view"
      menu={<TopBar app={MARCA} />}
      sidebar={<NavigationTree items={SECCIONES} current="socios.cuotas" />}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-surface">
        <h1 className="shrink-0 px-6 pt-5 pb-3 text-title font-semibold text-ink">
          Facturas
        </h1>
        <div className="min-h-0 flex-1 overflow-auto" data-testid="caja">
          <DataTable data={FILAS} columns={COLUMNAS} getRowId={(f) => f.id} />
        </div>
      </div>
    </AppFrame>
  ),
  play: async ({ canvasElement }) => {
    const caja = within(canvasElement).getByTestId("caja");
    const encabezado = caja.querySelector("thead")!;
    const arriba = () =>
      Math.round(encabezado.getBoundingClientRect().top - caja.getBoundingClientRect().top);
    // At rest, the header is where the table starts: at the top of its box.
    await waitFor(() => expect(arriba()).toBe(0));
    // Scrolled, it stays at the top of the box — not pushed down by the bar's height.
    caja.scrollTop = 600;
    await waitFor(() => expect(caja.scrollTop).toBeGreaterThan(0));
    await waitFor(() => expect(arriba()).toBe(0));
    // The page itself does not scroll: the frame is the window.
    await expect(document.scrollingElement!.scrollHeight).toBeLessThanOrEqual(
      window.innerHeight + 1,
    );
  },
};
