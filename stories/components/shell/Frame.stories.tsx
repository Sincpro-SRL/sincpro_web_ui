import {
  type AppEntry,
  AppFrame,
  NavigationTree,
  type NavItem,
  Sidebar,
  TopBar,
  type TopMenu,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookOpen, FileText, ShoppingCart, Truck, Users } from "lucide-react";
import { useState } from "react";
import { expect, within } from "storybook/test";

/**
 * Context: **el marco, en sus tres formas** — lo que la carpeta Shell tiene suelto (la barra de
 * arriba, la barra lateral, el árbol) puesto junto, para elegir. `AppFrame` decide UNA vez cómo
 * se tocan las bandas; la aplicación elige qué le da:
 *
 * - **Arriba** (`menu`): la barra horizontal de Odoo — el conmutador de módulos, los menús del
 *   módulo actual, la cuenta. Para un ERP de muchos módulos.
 * - **Arriba y al costado** (`menu` + `sidebar`): la barra arriba, y el árbol del módulo a la
 *   izquierda, pegado debajo de ella. Para un módulo con muchas pantallas.
 * - **Al costado** (`sidebar` con un `Sidebar`, sin `menu`): la columna ES el cromo — el
 *   producto, la cuenta y las secciones. Para un back office o un portal.
 */
const meta: Meta = {
  title: "3 · Componentes/Shell/Marco · arriba, al costado o los dos",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

const MODULOS: AppEntry[] = [
  { id: "ventas", label: "Ventas", icon: ShoppingCart },
  { id: "compras", label: "Compras", icon: Truck },
  { id: "contabilidad", label: "Contabilidad", icon: BookOpen },
];

const MENUS: TopMenu[] = [
  {
    id: "pedidos",
    label: "Pedidos",
    groups: [
      {
        options: [
          { id: "cotizaciones", label: "Cotizaciones" },
          { id: "pedidos", label: "Pedidos de venta" },
        ],
      },
    ],
  },
  {
    id: "facturas",
    label: "Facturas",
    count: 12,
    groups: [{ options: [{ id: "facturas", label: "Facturas de cliente" }] }],
  },
  {
    id: "clientes",
    label: "Clientes",
    groups: [{ options: [{ id: "clientes", label: "Todos los clientes" }] }],
  },
];

const ARBOL: NavItem[] = [
  {
    id: "ventas",
    label: "Ventas",
    icon: ShoppingCart,
    children: [
      { id: "ventas.cotizaciones", label: "Cotizaciones", count: 7 },
      { id: "ventas.pedidos", label: "Pedidos", count: 3 },
      { id: "ventas.facturas", label: "Facturas", count: 12 },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    icon: Users,
    children: [
      { id: "clientes.todos", label: "Todos los clientes" },
      { id: "clientes.listas", label: "Listas de precios" },
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    icon: FileText,
    children: [{ id: "documentos.plantillas", label: "Plantillas" }],
  },
];

const NOMBRES: Record<string, string> = Object.fromEntries(
  ARBOL.flatMap((item) => (item.children ?? []).map((one) => [one.id, one.label])),
);

/* The view: what any screen puts in the frame. */
function Pantalla({ name }: { name: string }) {
  return (
    <div className="flex min-h-96 flex-col gap-2 bg-surface p-8">
      <h1 className="text-display font-semibold text-ink" data-testid="pantalla">
        {name}
      </h1>
      <p className="max-w-prose text-body text-muted">
        La vista no sabe en qué marco está: el mismo contenido en las tres formas.
      </p>
    </div>
  );
}

function Barra() {
  return (
    <TopBar
      apps={MODULOS}
      currentApp="ventas"
      menus={MENUS}
      currentMenu="facturas"
      user={{ name: "Ana Gutiérrez", detail: "Ventas" }}
    />
  );
}

/** **Arriba**: la barra horizontal sola — módulos, menús del módulo y la cuenta. */
export const Arriba: Story = {
  render: () => (
    <AppFrame menu={<Barra />}>
      <Pantalla name="Facturas" />
    </AppFrame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: /Facturas/ })).toBeInTheDocument();
    await expect(canvasElement.querySelector("aside")).toBeNull();
  },
};

/** **Arriba y al costado**: la barra arriba y el árbol del módulo pegado debajo de ella. */
export const ArribaYAlCostado: Story = {
  name: "Arriba y al costado",
  render: function Render() {
    const [actual, setActual] = useState("ventas.facturas");
    return (
      <AppFrame
        menu={<Barra />}
        sidebar={<NavigationTree items={ARBOL} current={actual} onNavigate={setActual} />}
      >
        <Pantalla name={NOMBRES[actual] ?? actual} />
      </AppFrame>
    );
  },
};

/** **Al costado**: sin barra arriba, la columna es el cromo — el producto, la cuenta y el mapa. */
export const AlCostado: Story = {
  name: "Al costado",
  render: function Render() {
    const [actual, setActual] = useState("ventas.facturas");
    return (
      <AppFrame
        sidebar={
          <Sidebar
            brand={{ label: "Sincpro ERP", icon: ShoppingCart }}
            user={{ name: "Ana Gutiérrez", detail: "Ventas" }}
          >
            <NavigationTree items={ARBOL} current={actual} onNavigate={setActual} />
          </Sidebar>
        }
      >
        <Pantalla name={NOMBRES[actual] ?? actual} />
      </AppFrame>
    );
  },
};
