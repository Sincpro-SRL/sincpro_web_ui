import { type AppEntry, SystrayButton, TopBar, type TopMenu } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Bell,
  BookOpen,
  Boxes,
  ChartColumn,
  FileText,
  Landmark,
  LogOut,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

const MODULOS: AppEntry[] = [
  {
    id: "ventas",
    label: "Ventas",
    icon: ShoppingCart,
    hint: "Cotizaciones, pedidos y facturas a clientes",
  },
  { id: "compras", label: "Compras", icon: Truck, hint: "Órdenes y facturas de proveedores" },
  {
    id: "inventario",
    label: "Inventario",
    icon: Boxes,
    hint: "Existencias, recepciones y despachos",
  },
  {
    id: "contabilidad",
    label: "Contabilidad",
    icon: BookOpen,
    hint: "Asientos, conciliación bancaria y estados financieros",
  },
  {
    id: "cobranzas",
    label: "Cobranzas",
    icon: Wallet,
    hint: "Lo que te deben y cuándo vence",
  },
  {
    id: "empleados",
    label: "Empleados",
    icon: Users,
    hint: "Personal, contratos y planillas de sueldos",
  },
];

const MENUS: Record<string, TopMenu[]> = {
  ventas: [
    {
      id: "pedidos",
      label: "Pedidos",
      groups: [
        {
          options: [
            { id: "cotizaciones", label: "Cotizaciones", hint: "7 sin confirmar" },
            { id: "pedidos", label: "Pedidos de venta" },
            { id: "facturar", label: "Pedidos por facturar", hint: "3 listos" },
          ],
        },
      ],
    },
    {
      id: "clientes",
      label: "Clientes",
      groups: [
        {
          options: [
            { id: "todos", label: "Todos los clientes" },
            { id: "listas", label: "Listas de precios" },
          ],
        },
      ],
    },
    {
      id: "reportes",
      label: "Reportes",
      groups: [
        {
          options: [
            { id: "analisis", label: "Análisis de ventas" },
            { id: "comisiones", label: "Comisiones", badge: "maqueta" },
          ],
        },
      ],
    },
  ],
  inventario: [
    {
      id: "operaciones",
      label: "Operaciones",
      groups: [
        {
          options: [
            { id: "recepciones", label: "Recepciones", hint: "4 por recibir" },
            { id: "despachos", label: "Despachos", hint: "11 por despachar" },
            { id: "transferencias", label: "Transferencias entre almacenes" },
          ],
        },
      ],
    },
    {
      id: "productos",
      label: "Productos",
      groups: [
        {
          options: [
            { id: "productos", label: "Productos" },
            { id: "ajustes", label: "Ajustes de inventario" },
          ],
        },
      ],
    },
  ],
};

const CUENTA = [
  {
    options: [
      { id: "perfil", label: "Mi perfil", icon: UserCog },
      { id: "prefs", label: "Preferencias", icon: Settings },
    ],
  },
  { options: [{ id: "salir", label: "Cerrar sesión", icon: LogOut }] },
];

const meta: Meta<typeof TopBar> = {
  title: "3 · Componentes/Shell · la barra de la aplicación",
  component: TopBar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Lo que faltaba entre «una pantalla» y «un producto». Sin ella cada vista tiene que explicarse sola: de qué módulo es, qué más hay al lado, con qué usuario estoy mirando.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TopBar>;

/**
 * **Tocá el ⊞ de la izquierda** para ver el conmutador de módulos: una rejilla
 * y no una lista, porque son seis con ícono y se eligen por reconocimiento, no
 * por lectura.
 *
 * Los menús de arriba son los del módulo actual y **sólo de ése** — es lo que
 * hace que una aplicación de veinticinco pantallas se sienta de seis. Cambiá de
 * módulo y fijate que cambian.
 */
export const Barra: Story = {
  render: () => {
    const [modulo, setModulo] = useState("ventas");
    const [ultimo, setUltimo] = useState<string | null>(null);

    return (
      <div className="flex min-h-dvh flex-col bg-ground">
        <TopBar
          apps={MODULOS}
          currentApp={modulo}
          onAppSelect={setModulo}
          menus={MENUS[modulo] ?? []}
          onMenuSelect={(m, o) => setUltimo(`${m} → ${o}`)}
          systray={
            <>
              <SystrayButton icon={Truck} label="Entregas en camino" count={3} tone="info" />
              <SystrayButton icon={Bell} label="Avisos" count={1} tone="warn" />
            </>
          }
          user={{ name: "Andrés Gutiérrez", detail: "SINCPRO S.R.L." }}
          userGroups={CUENTA}
          onUserSelect={(id) => setUltimo(`cuenta → ${id}`)}
        />

        <main className="flex flex-1 flex-col gap-2 p-8">
          <h1 className="text-title font-semibold text-ink">
            {MODULOS.find((m) => m.id === modulo)?.label}
          </h1>
          <p className="max-w-prose text-body text-muted">
            {MODULOS.find((m) => m.id === modulo)?.hint}
          </p>
          <p className="mt-4 font-mono text-micro text-muted">{ultimo ?? "—"}</p>
        </main>
      </div>
    );
  },
};

/** Un solo módulo y sin menús: el mismo marco para un producto de una sola cosa
 *  —un punto de venta, un portal de clientes—.
 *  El conmutador no se dibuja vacío — prometería algo que no hay. */
export const Minima: Story = {
  render: () => (
    <div className="flex min-h-dvh flex-col bg-ground">
      <TopBar
        apps={[MODULOS[0]!]}
        currentApp="ventas"
        systray={<SystrayButton icon={Bell} label="Avisos" />}
        user={{ name: "Andrés Gutiérrez" }}
        userGroups={CUENTA}
      />
      <main className="p-8 text-body text-muted">Una sola cosa, el mismo marco.</main>
    </div>
  ),
};

/** **Lo que espera, sin abrir nada.** Un menú de la barra lleva su cuenta («Pedidos 5»): se ve
 *  sin abrirlo, y el cero no se dibuja. La insignia del systray corta en «99+» y el nombre del
 *  botón dice lo mismo que se ve. Las opciones de un menú cuentan igual (`badge` con un número). */
export const LoQueEspera: Story = {
  render: () => (
    <div className="flex min-h-dvh flex-col bg-ground">
      <TopBar
        app={{ label: "Tienda", icon: ShoppingCart }}
        menus={[
          {
            id: "pedidos",
            label: "Pedidos",
            count: 5,
            groups: [
              {
                options: [
                  { id: "nuevos", label: "Por confirmar", badge: 5 },
                  { id: "enviados", label: "Enviados", badge: 0 },
                ],
              },
            ],
          },
          {
            id: "productos",
            label: "Productos",
            count: 0,
            groups: [{ options: [{ id: "todos", label: "Todos" }] }],
          },
        ]}
        systray={<SystrayButton icon={Bell} label="Avisos" count={240} tone="bad" />}
        user={{ name: "Andrés Gutiérrez" }}
        userGroups={CUENTA}
      />
      <main className="p-8 text-body text-muted">
        Cinco pedidos esperan; los productos, nada.
      </main>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: /Pedidos/ }).textContent).toContain("5");
    await expect(canvas.getByRole("button", { name: /Productos/ }).textContent).toBe(
      "Productos",
    );
    await expect(canvas.getByRole("button", { name: "Avisos: 99+" })).toBeTruthy();
  },
};

/* An accounting module: the size of menu where sections, columns and submenus earn their
   place. «Operaciones» holds the screen on view. */
const CONTABILIDAD: TopMenu[] = [
  {
    id: "operaciones",
    label: "Operaciones",
    layout: "columns",
    groups: [
      {
        label: "Clientes",
        icon: Users,
        options: [
          { id: "facturas", label: "Facturas", hint: "12 por cobrar" },
          { id: "notas-credito", label: "Notas de crédito" },
          { id: "cobros", label: "Cobros" },
        ],
      },
      {
        label: "Proveedores",
        icon: Truck,
        options: [
          { id: "facturas-compra", label: "Facturas de compra", hint: "4 por pagar" },
          { id: "pagos", label: "Pagos" },
        ],
      },
      {
        label: "Bancos",
        icon: Landmark,
        options: [
          { id: "extractos", label: "Extractos" },
          { id: "conciliacion", label: "Conciliación", badge: 8 },
        ],
      },
    ],
  },
  {
    id: "informes",
    label: "Informes",
    groups: [
      {
        label: "Estados financieros",
        icon: ChartColumn,
        options: [
          {
            id: "estados",
            label: "Estados financieros",
            items: [
              { id: "balance", label: "Balance general" },
              { id: "resultados", label: "Estado de resultados" },
              { id: "flujo", label: "Flujo de caja" },
            ],
          },
          { id: "mayor", label: "Libro mayor", shortcut: "Ctrl+L" },
        ],
      },
      {
        label: "Impuestos",
        icon: Receipt,
        options: [
          {
            id: "impuestos",
            label: "Declaraciones",
            items: [
              { id: "iva", label: "IVA" },
              { id: "it", label: "IT" },
              { id: "rc-iva", label: "RC-IVA" },
            ],
          },
          { id: "libro-ventas", label: "Libro de ventas", icon: FileText },
        ],
      },
      {
        label: "Reportes financieros",
        icon: Landmark,
        collapsible: true,
        options: [
          { id: "antiguedad", label: "Antigüedad de saldos" },
          { id: "presupuesto", label: "Presupuesto contra real" },
          { id: "indicadores", label: "Indicadores financieros" },
          { id: "consolidado", label: "Consolidado de empresas" },
        ],
      },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    groups: [
      {
        options: [
          { id: "plan", label: "Plan de cuentas" },
          { id: "diarios", label: "Diarios" },
          { id: "impuestos-config", label: "Impuestos" },
        ],
      },
    ],
  },
];

/** **Los menús de un módulo grande.** El menú donde está la pantalla actual lleva una barra
 *  debajo de su nombre: se sabe dónde estás sin abrir ninguno. Las secciones tienen título e
 *  ícono, un menú grande se ve entero en columnas (`layout: "columns"`, apiladas en el
 *  teléfono), una opción con `items` abre su submenú al lado, y una sección `collapsible`
 *  («Reportes financieros» en Informes) es una fila que se despliega ahí mismo. */
export const MenusDeUnModulo: Story = {
  render: () => {
    const [ultimo, setUltimo] = useState<string | null>(null);
    return (
      <div className="flex min-h-dvh flex-col bg-ground">
        <TopBar
          app={{ label: "Contabilidad", icon: BookOpen }}
          menus={CONTABILIDAD}
          currentMenu="operaciones"
          onMenuSelect={(m, o) => setUltimo(`${m} → ${o}`)}
          user={{ name: "Andrés Gutiérrez", detail: "SINCPRO S.R.L." }}
          userGroups={CUENTA}
        />
        <main className="flex flex-col gap-2 p-8">
          <h1 className="text-title font-semibold text-ink">Facturas</h1>
          <p className="font-mono text-micro text-muted" data-testid="ultimo">
            {ultimo ?? "—"}
          </p>
        </main>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const marker = (name: string) =>
      getComputedStyle(canvas.getByRole("button", { name }), "::after").height;
    // «Here» is a bar under the menu that holds the screen; the others carry none.
    await expect(marker("Operaciones")).toBe("2px");
    await expect(marker("Informes")).not.toBe("2px");

    // A big menu in columns: its sections side by side.
    await userEvent.click(canvas.getByRole("button", { name: "Operaciones" }));
    const menu = await page.findByRole("menu", { name: "Operaciones" });
    const [clientes, proveedores] = within(menu).getAllByRole("group");
    await expect(proveedores!.getBoundingClientRect().left).toBeGreaterThan(
      clientes!.getBoundingClientRect().right - 1,
    );
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Conciliación/ }));
    await expect(canvas.getByTestId("ultimo").textContent).toBe("operaciones → conciliacion");

    // A submenu opens beside its row, and its option runs like any other.
    await userEvent.click(canvas.getByRole("button", { name: "Informes" }));
    const informes = await page.findByRole("menu", { name: "Informes" });
    await userEvent.click(
      within(informes).getByRole("menuitem", { name: /Estados financieros/ }),
    );
    const sub = await page.findByRole("menu", { name: "Estados financieros" });
    await userEvent.click(within(sub).getByRole("menuitem", { name: "Balance general" }));
    await waitFor(() =>
      expect(canvas.getByTestId("ultimo").textContent).toBe("informes → balance"),
    );

    // A folded section is one row: pressed, it unfolds in place and the menu stays open.
    await userEvent.click(canvas.getByRole("button", { name: "Informes" }));
    const otraVez = await page.findByRole("menu", { name: "Informes" });
    await expect(within(otraVez).queryByRole("menuitem", { name: /Antigüedad/ })).toBeNull();
    await userEvent.click(
      within(otraVez).getByRole("menuitem", { name: /Reportes financieros/ }),
    );
    await userEvent.click(
      await within(otraVez).findByRole("menuitem", { name: /Antigüedad/ }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId("ultimo").textContent).toBe("informes → antiguedad"),
    );
  },
};
