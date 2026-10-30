import { type AppEntry, SystrayButton, TopBar, type TopMenu } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Bell,
  BookOpen,
  Boxes,
  LogOut,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";

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
