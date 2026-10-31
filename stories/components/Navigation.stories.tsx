import { NavigationTree, type NavItem } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookOpen, Boxes, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";

/**
 * Context: **los menús de un módulo.** La barra de arriba dice en qué aplicación estás y
 * tiene un puñado de menús; un ERP de veinte pantallas por módulo no entra ahí. El árbol
 * lateral muestra el mapa entero y marca dónde estás sin abrir nada. El atajo de quien ya sabe
 * el nombre de lo que busca (⌘K) es la paleta del espacio de trabajo (composer), no de acá.
 *
 * El árbol es de React Aria: se recorre con las flechas (← y → cierran y abren un módulo, Tab
 * sale del árbol de una vez) y la fila actual dice `aria-current="page"`.
 */
const meta: Meta = {
  title: "3 · Componentes/Navegación",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "`NavigationTree` es la barra lateral de un módulo: módulos que se abren y se cierran, sus pantallas con ícono y lo que espera en cada una, y la pantalla actual marcada. En `AppFrame`, el árbol va en `sidebar`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/* ==================================================================== *
 *  THE MAP OF AN ERP
 * ==================================================================== */

const MODULOS: NavItem[] = [
  {
    id: "ventas",
    label: "Ventas",
    icon: ShoppingCart,
    children: [
      { id: "ventas.cotizaciones", label: "Cotizaciones", count: 7 },
      { id: "ventas.pedidos", label: "Pedidos", count: 3 },
      { id: "ventas.facturas", label: "Facturas", count: 12 },
      { id: "ventas.notas", label: "Notas de crédito" },
      {
        id: "ventas.clientes",
        label: "Clientes",
        children: [
          { id: "ventas.clientes.lista", label: "Todos los clientes" },
          { id: "ventas.clientes.listas", label: "Listas de precios" },
        ],
      },
    ],
  },
  {
    id: "compras",
    label: "Compras",
    icon: Truck,
    children: [
      { id: "compras.solicitudes", label: "Solicitudes", count: 5 },
      { id: "compras.ordenes", label: "Órdenes de compra", count: 2 },
      { id: "compras.facturas", label: "Facturas de proveedor", count: 9 },
      { id: "compras.proveedores", label: "Proveedores" },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: Boxes,
    children: [
      { id: "inventario.existencias", label: "Existencias" },
      { id: "inventario.recepciones", label: "Recepciones", count: 4 },
      { id: "inventario.despachos", label: "Despachos", count: 11 },
      { id: "inventario.ajustes", label: "Ajustes de inventario" },
      { id: "inventario.productos", label: "Productos" },
    ],
  },
  {
    id: "contabilidad",
    label: "Contabilidad",
    icon: BookOpen,
    children: [
      { id: "contabilidad.asientos", label: "Asientos contables" },
      { id: "contabilidad.conciliacion", label: "Conciliación bancaria", count: 23 },
      { id: "contabilidad.plan", label: "Plan de cuentas" },
      { id: "contabilidad.balance", label: "Balance general" },
      { id: "contabilidad.resultados", label: "Estado de resultados" },
    ],
  },
];

function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-ground">
      <aside className="w-(--container-sidebar) shrink-0 border-r border-line bg-surface">
        {children}
      </aside>
      <div className="flex-1 p-6" />
    </div>
  );
}

/* ==================================================================== *
 *  THE STORIES
 * ==================================================================== */

/**
 * **El árbol de un módulo.** Ventas está abierto porque ahí estás (Facturas); Compras abierto
 * porque se pidió con `defaultExpanded`. Elegí otra pantalla, o entrá con Tab y recorrelo con
 * las flechas: el foco cae en la fila actual.
 */
export const Arbol: Story = {
  name: "Árbol",
  render: function Render() {
    const [actual, setActual] = useState("ventas.facturas");
    return (
      <Sidebar>
        <NavigationTree
          items={MODULOS}
          current={actual}
          onNavigate={setActual}
          defaultExpanded={["compras"]}
        />
        <p className="border-t border-line px-4 py-3 text-micro text-muted">
          actual: <span className="font-mono text-ink">{actual}</span>
        </p>
      </Sidebar>
    );
  },
};

/** **Todo cerrado, salvo el camino a donde estás.** Sin `defaultExpanded`, sólo se abre el
 *  módulo —y el submódulo— de la pantalla actual: nunca carga escondiendo dónde estás. */
export const SoloElCamino: Story = {
  name: "Sólo el camino abierto",
  render: function Render() {
    const [actual, setActual] = useState("ventas.clientes.listas");
    return (
      <Sidebar>
        <NavigationTree items={MODULOS} current={actual} onNavigate={setActual} />
      </Sidebar>
    );
  },
};
