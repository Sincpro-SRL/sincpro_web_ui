import { Canvas, type CanvasProps } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useCallback, useState } from "react";
import { expect, within } from "storybook/test";

/**
 * Context: **un lienzo de nodos y conexiones** — un diagrama, el flujo de una aprobación, cómo
 * se relacionan dos registros. La aplicación guarda los nodos y las conexiones; el lienzo
 * informa lo que la persona hizo y la aplicación decide qué queda (deshacer, guardar, rechazar
 * una conexión). Solo lectura muestra el diagrama sin permitir moverlo ni conectarlo.
 */
const meta = {
  title: "3 · Componentes/Lienzo · nodos y conexiones",
  component: Canvas,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Un lienzo controlado sobre React Flow: arrastrar, conectar y zoom con los controles del sistema. `readOnly` para un diagrama que se muestra y no se edita. Colores, bordes y controles salen de los tokens.",
      },
    },
  },
} satisfies Meta<typeof Canvas>;

export default meta;
type Story = StoryObj<typeof meta>;

const NODOS: Node[] = [
  { id: "pedido", position: { x: 0, y: 40 }, data: { label: "Pedido de compra" } },
  { id: "aprob", position: { x: 220, y: 40 }, data: { label: "Aprobación · gerencia" } },
  { id: "orden", position: { x: 460, y: 40 }, data: { label: "Orden emitida" } },
  { id: "factura", position: { x: 460, y: 170 }, data: { label: "Factura del proveedor" } },
];

const CONEXIONES: Edge[] = [
  { id: "e1", source: "pedido", target: "aprob" },
  { id: "e2", source: "aprob", target: "orden" },
  { id: "e3", source: "orden", target: "factura" },
];

function Editable(props: Partial<CanvasProps>) {
  const [nodos, setNodos] = useState<Node[]>(NODOS);
  const [conexiones, setConexiones] = useState<Edge[]>(CONEXIONES);
  const alCambiarNodos = useCallback(
    (cambios: Parameters<NonNullable<CanvasProps["onNodesChange"]>>[0]) =>
      setNodos((n) => applyNodeChanges(cambios, n)),
    [],
  );
  const alCambiarConexiones = useCallback(
    (cambios: Parameters<NonNullable<CanvasProps["onEdgesChange"]>>[0]) =>
      setConexiones((e) => applyEdgeChanges(cambios, e)),
    [],
  );
  return (
    <Canvas
      {...props}
      nodes={nodos}
      edges={conexiones}
      onNodesChange={alCambiarNodos}
      onEdgesChange={alCambiarConexiones}
      onConnect={(c) => setConexiones((e) => addEdge(c, e))}
    />
  );
}

export const Flujo: Story = {
  args: { nodes: NODOS, edges: CONEXIONES, label: "Flujo de aprobación de compras" },
  render: (args) => <Editable {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("region", { name: "Flujo de aprobación de compras" }),
    ).toBeVisible();
    await expect(canvasElement.querySelectorAll(".react-flow__node").length).toBe(4);
  },
};

export const SoloLectura: Story = {
  args: { nodes: NODOS, edges: CONEXIONES, readOnly: true, label: "Diagrama del pedido" },
  render: (args) => <Editable {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Solo lectura")).toBeVisible();
  },
};
