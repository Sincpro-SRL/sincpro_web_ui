import type { ResourceRef, ViewProps, ViewSpec } from "@sincpro/web-composer";
import { Button, List, RecordCard, Tag, Tags, useToast } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, ChefHat } from "lucide-react";
import { useEffect, useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { Workspace } from "../../support/composer";
import {
  CHANNEL_LABEL,
  KITCHEN,
  KITCHEN_STAGES,
  type KitchenOrder,
  type KitchenStage,
} from "../../support/erp-pos";

/**
 * Context: **la pantalla de la cocina** (KDS) — los pedidos que llegan de la caja, del kiosco y
 * del delivery, por etapa: Recibido → Preparando → Listo. Es un tablero (`List.Board` con
 * `stages`), no una pantalla nueva: cada ticket es una `RecordCard` con sus líneas como datos
 * (`fields`), el canal como etiqueta y CUÁNTO LLEVA ESPERANDO en vivo (`elapsed`): ámbar a los
 * 10 minutos, rojo a los 20, con la franja del borde en el mismo tono. Quien cocina busca el
 * rojo, no la hora. Un toque en «Siguiente» lo pasa de etapa (también se arrastra, o Alt + →).
 * Los canales son filtros rápidos a la vista; «atrasados» en la barra filtra también.
 */
const meta: Meta = {
  tags: ["screen"],
  title: "5 · Plantillas/Mostrador/Cocina · pedidos por etapa",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Los pedidos por etapa, cada uno con lo que lleva esperando: ámbar a los 10 minutos, rojo a los 20. «Siguiente» lo pasa de etapa; los canales filtran.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const WARN = 10;
const BAD = 20;

type Order = Omit<KitchenOrder, "minutesAgo"> & { since: number };

const NEXT: Record<KitchenStage, KitchenStage | null> = {
  recibido: "preparando",
  preparando: "listo",
  listo: null,
};

function Kitchen({ api }: ViewProps) {
  const toast = useToast();
  /* The orders' arrival as dates against now, once — then the clock ages them. */
  const [orders, setOrders] = useState<readonly Order[]>(() =>
    KITCHEN.map(({ minutesAgo, ...o }) => ({
      ...o,
      since: Date.now() - minutesAgo * 60_000,
    })),
  );
  const [channel, setChannel] = useState<KitchenOrder["channel"] | "all">("all");
  const [lateOnly, setLateOnly] = useState(false);
  useEffect(() => api.setTitle("Cocina"), [api]);

  const late = (o: Order) => Date.now() - o.since >= BAD * 60_000 && o.stage !== "listo";
  const shown = orders.filter(
    (o) => (channel === "all" || o.channel === channel) && (!lateOnly || late(o)),
  );
  const move = (order: Order, to: string) => {
    setOrders((now) =>
      now.map((o) => (o.id === order.id ? { ...o, stage: to as KitchenStage } : o)),
    );
  };
  const bump = (order: Order) => {
    const next = NEXT[order.stage];
    if (next === null) {
      setOrders((now) => now.filter((o) => o.id !== order.id));
      toast.show({
        message: `${order.id} entregado.`,
        tone: "good",
        action: { label: "Deshacer", onSelect: () => setOrders((now) => [...now, order]) },
      });
      return;
    }
    move(order, next);
  };

  return (
    <List<Order>
      items={shown}
      keyOf={(o) => o.id}
      present="board"
      filtered={channel !== "all" || lateOnly}
      empty={{ sentence: "No hay pedidos en cocina." }}
    >
      <List.Bar>
        <List.Identity
          title="Cocina"
          description="los pedidos de la caja, el kiosco y el delivery"
          counters={[
            { label: "en cocina", value: orders.length },
            {
              label: "atrasados",
              value: orders.filter(late).length,
              tone: "bad",
              onClick: () => setLateOnly((now) => !now),
              active: lateOnly,
            },
          ]}
        />
      </List.Bar>
      <List.Filters>
        <Tags
          size="md"
          scroll
          label="Canal"
          items={(["all", "mesa", "llevar", "kiosco", "delivery"] as const).map((id) => ({
            id,
            label: id === "all" ? "Todos" : CHANNEL_LABEL[id],
            count: orders.filter((o) => id === "all" || o.channel === id).length,
            selected: channel === id,
            onSelect: () => setChannel(id),
          }))}
        />
      </List.Filters>
      <List.Board<Order>
        stages={{
          of: (o) => o.stage,
          columns: KITCHEN_STAGES,
          onMove: move,
          nameOf: (o) => o.id,
        }}
        card={(o) => (
          <RecordCard
            title={o.where}
            subtitle={o.id}
            tags={<Tag>{CHANNEL_LABEL[o.channel]}</Tag>}
            elapsed={{ since: o.since, warnAfter: WARN, badAfter: BAD }}
            fields={o.lines.map((l) => ({ label: l.name, value: `× ${l.quantity}` }))}
            {...(o.lines.some((l) => l.note !== undefined)
              ? {
                  meta: o.lines
                    .filter((l) => l.note !== undefined)
                    .map((l) => `${l.name}: ${l.note}`)
                    .join(" · "),
                }
              : {})}
            footer={
              <Button
                role="secondary"
                size="sm"
                icon={ArrowRight}
                onClick={() => bump(o)}
                aria-label={
                  NEXT[o.stage] === null
                    ? `Entregar ${o.id}`
                    : `Siguiente: ${o.id} a ${KITCHEN_STAGES.find((s) => s.id === NEXT[o.stage])!.label}`
                }
              >
                {NEXT[o.stage] === null ? "Entregar" : "Siguiente"}
              </Button>
            }
          />
        )}
      />
    </List>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "cocina",
    kind: "pedidos",
    title: () => "Cocina",
    icon: ChefHat,
    load: async () => Kitchen,
  },
];
const start: ResourceRef = { domain: "cocina", kind: "pedidos" };

/** **La cocina en hora pico.** Mesa 9 lleva más de 20 minutos: rojo. «Siguiente» en Mesa 4 la
 *  pasa a Preparando; «atrasados» deja sólo lo rojo. */
export const EnHoraPico: Story = {
  name: "En hora pico",
  render: () => <Workspace views={VIEWS} start={start} pointer="touch" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const received = within(await canvas.findByRole("region", { name: "Recibido" }));
    await userEvent.click(
      received.getByRole("button", { name: "Siguiente: K-0412 a Preparando" }),
    );
    const preparing = within(canvas.getByRole("region", { name: "Preparando" }));
    await expect(preparing.getByText("Mesa 4")).toBeVisible();
    /* The late one is red — the stripe and the time say it, not only the colour. */
    const late = preparing.getByText("Mesa 9").closest("[data-ui='record-card']")!;
    await expect(late.querySelector("[data-ui='elapsed']")).toHaveAttribute(
      "data-tone",
      "bad",
    );
    await userEvent.click(canvas.getByRole("button", { name: /atrasados/ }));
    await expect(canvas.queryByText("Mesa 4")).toBeNull();
  },
};
