"use client";

import "@sincpro/web-ui/components/canvas/canvas.css";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import {
  Background,
  type Connection,
  Controls,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  ReactFlow,
} from "@xyflow/react";

/* ==================================================================== *
 *  THE CANVAS — nodes and the connections between them: a diagram, a flow,
 *  the steps of a process, a map of how records relate.
 *
 *  Context: React Flow (@xyflow/react, MIT, maintained through 2026) does the
 *  hard part — panning, zooming, dragging, connecting, keyboard moves — and is
 *  the same engine behind most node editors. What this component adds is the
 *  product's frame around it: the paper and ink of the tokens, a labelled
 *  region, the zoom controls drawn with the design system's own buttons, and a
 *  READ-ONLY mode for a diagram that is shown but not edited.
 *
 *  ── Controlled, always ──────────────────────────────────────────────
 *
 *  The nodes and edges belong to the application. The canvas reports what the
 *  person did (`onNodesChange`, `onEdgesChange`, `onConnect`) and the
 *  application decides what to keep. That is the only way an undo, a save or a
 *  refusal («esa conexión no se puede») can exist.
 *
 *  ── The stylesheet comes with the component ─────────────────────────
 *
 *  React Flow styles its handles and edges from its own stylesheet, which is
 *  imported here, and `canvas.css` maps its variables to the tokens. A bundler
 *  that handles CSS imports from a dependency (Vite, webpack) needs nothing
 *  else.
 * ==================================================================== */

export type CanvasProps<N extends Node = Node, E extends Edge = Edge> = {
  nodes: N[];
  edges: E[];
  onNodesChange?: (changes: NodeChange<N>[]) => void;
  onEdgesChange?: (changes: EdgeChange<E>[]) => void;
  onConnect?: (connection: Connection) => void;
  /** Shown, not edited: no dragging, no connecting, no selecting what is not there. */
  readOnly?: boolean;
  /** The accessible name of the region. «Lienzo» by default. */
  label?: string;
};

export function Canvas<N extends Node = Node, E extends Edge = Edge>({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  readOnly = false,
  label,
}: CanvasProps<N, E>) {
  const copy = useUiCopy();
  return (
    <div
      role="region"
      aria-label={label ?? copy.canvas.label}
      className="relative h-96 min-h-0 w-full overflow-hidden rounded-control border border-line bg-ground"
    >
      <ReactFlow<N, E>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        fitView
        aria-label={label ?? copy.canvas.label}
      >
        <Background />
        <Controls showInteractive={!readOnly} />
      </ReactFlow>
      {readOnly ? (
        <span className="pointer-events-none absolute top-3 left-3 rounded-control border border-line bg-surface px-2 py-0.5 text-micro font-medium text-muted">
          {copy.canvas.readOnly}
        </span>
      ) : null}
    </div>
  );
}
