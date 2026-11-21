import type { ResourceRef, ViewProps, ViewSpec } from "@sincpro/web-composer";
import {
  Button,
  Field,
  KioskFrame,
  type LineItemColumn,
  LineItems,
  List,
  Outcome,
  RadioGroup,
  RecordCard,
  StepFlow,
  Stepper,
  Tags,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Coffee, CreditCard, HandCoins, QrCode, ShoppingBag, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { Workspace } from "../../support/composer";
import {
  bs,
  CATEGORIES,
  MENU,
  type MenuCategory,
  type MenuItem,
} from "../../support/erp-pos";

/**
 * Context: **el kiosco de autoservicio** — quien pide es el cliente, de pie, con el dedo, una
 * sola vez. Un flujo de pasos (`StepFlow`) con una pregunta por pantalla: dónde lo come
 * (opciones grandes, `RadioGroup look="cards"`), qué quiere (el menú en mosaicos con las
 * categorías grandes y cuántos lleva en cada uno), revisar (las líneas con su cantidad) y pagar.
 * Táctil por decisión de la aplicación (`data-pointer="touch"`): un kiosco puede reportar un
 * mouse. Terminar da el número de pedido y vuelve al principio para el siguiente.
 */
const meta: Meta = {
  tags: ["screen"],
  title: "5 · Plantillas/Mostrador/Kiosco · autoservicio",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Una pregunta por pantalla: dónde lo comés, qué querés, revisá y pagá. Terminar da el número de pedido y vuelve al principio.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

type Line = { id: string; name: string; price: number; quantity: number };

const LINE_COLUMNS: readonly LineItemColumn<Line>[] = [
  { id: "name", header: "Producto", value: (l) => l.name },
  {
    id: "quantity",
    header: "Cant.",
    numeric: true,
    value: (l) => l.quantity,
    edit: (l, set) => (
      <Stepper
        value={l.quantity}
        min={1}
        size="lg"
        unitLabel={l.name}
        onChange={(quantity) => set({ ...l, quantity })}
      />
    ),
  },
  {
    id: "amount",
    header: "Importe",
    numeric: true,
    value: (l) => l.price * l.quantity,
    cell: (l) => bs(l.price * l.quantity),
  },
];

function Kiosk({ api }: ViewProps) {
  const [waiting, setWaiting] = useState(true);
  const [done, setDone] = useState<number | null>(null);
  const [step, setStep] = useState("where");
  const [where, setWhere] = useState<string | null>(null);
  const [category, setCategory] = useState<MenuCategory>("cafe");
  const [lines, setLines] = useState<readonly Line[]>([]);
  const [payment, setPayment] = useState<string | null>(null);
  const [number, setNumber] = useState(118);
  useEffect(() => api.setTitle("Pedí aquí"), [api]);

  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const add = (m: MenuItem) =>
    setLines((now) =>
      now.some((l) => l.id === m.id)
        ? now.map((l) => (l.id === m.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...now, { id: m.id, name: m.name, price: m.price, quantity: 1 }],
    );
  /* Back to the start, for the next person: the order is forgotten. */
  const reset = () => {
    setLines([]);
    setWhere(null);
    setPayment(null);
    setStep("where");
    setDone(null);
  };
  const finish = () => {
    setDone(number);
    setNumber(number + 1);
  };

  return (
    <KioskFrame
      brand="Café Illimani"
      attract={{
        title: "Pedí aquí, sin filas",
        subtitle: "Café de los Yungas, salteñas del día y algo dulce.",
        call: "Tocá para pedir",
        icon: Coffee,
      }}
      idleAfter={60}
      onIdle={reset}
      waiting={waiting}
      onWaitingChange={setWaiting}
    >
      {done !== null ? (
        <Outcome
          title="¡Listo! Tu pedido está en cocina"
          figure={String(done)}
          figureLabel="Tu número"
          detail={
            payment === "counter"
              ? "Pagás en caja al retirar. Te llamamos en la pantalla."
              : "Te llamamos en la pantalla cuando esté listo."
          }
          action={
            <Button
              role="primary"
              size="lg"
              onClick={() => {
                reset();
                setWaiting(true);
              }}
            >
              Terminar
            </Button>
          }
        />
      ) : (
        <StepFlow current={step} onCurrentChange={setStep} onFinish={finish}>
          <StepFlow.Step
            id="where"
            title="¿Dónde lo vas a comer?"
            {...(where === null ? { blocked: "Elegí una opción" } : {})}
          >
            <Field label="Dónde">
              <RadioGroup
                look="cards"
                value={where}
                onChange={setWhere}
                options={[
                  {
                    value: "here",
                    label: "Comer aquí",
                    icon: Utensils,
                    description: "Te lo llevamos a la mesa",
                  },
                  {
                    value: "away",
                    label: "Para llevar",
                    icon: ShoppingBag,
                    description: "En bolsa, para el camino",
                  },
                ]}
              />
            </Field>
          </StepFlow.Step>
          <StepFlow.Step
            id="menu"
            title="¿Qué vas a pedir?"
            description={
              count === 0
                ? "Tocá un producto para sumarlo."
                : `Llevás ${count} · ${bs(total)}`
            }
            {...(count === 0 ? { blocked: "Sumá al menos un producto" } : {})}
            nextLabel={`Revisar pedido · ${bs(total)}`}
          >
            <List<MenuItem>
              items={MENU.filter((m) => m.category === category)}
              keyOf={(m) => m.id}
              present="tiles"
              onChoose={add}
              embedded
            >
              <List.Filters>
                <Tags
                  size="lg"
                  scroll
                  label="Categorías"
                  items={CATEGORIES.map((c) => ({
                    id: c.id,
                    label: c.label,
                    selected: category === c.id,
                    onSelect: () => setCategory(c.id),
                  }))}
                />
              </List.Filters>
              <List.Tiles<MenuItem>
                size="md"
                card={(m, ways) => {
                  const taken = lines.find((l) => l.id === m.id)?.quantity ?? 0;
                  return (
                    <RecordCard
                      layout="tile"
                      title={m.name}
                      figure={bs(m.price)}
                      media={{ src: m.photo, alt: "" }}
                      {...(m.stock === 0 ? { meta: "Se terminó" } : {})}
                      {...(taken === 0 ? {} : { badge: taken })}
                      selected={taken > 0}
                      disabled={m.stock === 0}
                      {...(ways.press === undefined ? {} : { onOpen: ways.press })}
                    />
                  );
                }}
              />
            </List>
          </StepFlow.Step>
          <StepFlow.Step id="review" title="Revisá tu pedido" nextLabel="Ir a pagar">
            <LineItems<Line>
              lines={lines}
              columns={LINE_COLUMNS}
              getLineId={(l) => l.id}
              lineLabel={(l) => l.name}
              onChange={(id, next) =>
                setLines((now) => now.map((l) => (l.id === id ? next : l)))
              }
              onRemove={(id) => setLines((now) => now.filter((l) => l.id !== id))}
              totals={[{ label: "Total", value: bs(total), total: true }]}
            />
          </StepFlow.Step>
          <StepFlow.Step
            id="pay"
            title="¿Cómo pagás?"
            {...(payment === null ? { blocked: "Elegí cómo pagar" } : {})}
            nextLabel={`Pagar ${bs(total)}`}
          >
            <Field label="Pago">
              <RadioGroup
                look="cards"
                value={payment}
                onChange={setPayment}
                options={[
                  {
                    value: "qr",
                    label: "QR",
                    icon: QrCode,
                    description: "Escaneá con tu banco",
                  },
                  {
                    value: "card",
                    label: "Tarjeta",
                    icon: CreditCard,
                    description: "Acercá o insertá",
                  },
                  {
                    value: "counter",
                    label: "En caja",
                    icon: HandCoins,
                    description: "Pagás al retirar",
                  },
                ]}
              />
            </Field>
          </StepFlow.Step>
        </StepFlow>
      )}
    </KioskFrame>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "kiosco",
    kind: "pedido",
    title: () => "Pedí aquí",
    icon: ShoppingBag,
    load: async () => Kiosk,
  },
];
const start: ResourceRef = { domain: "kiosco", kind: "pedido" };

/** **Pedir solo.** «Tocá para pedir», comer aquí, dos capuchinos, revisar y pagar con QR: el
 *  número de pedido, en grande, y «Terminar» vuelve a la pantalla de inicio. Sin tocar un
 *  minuto, el kiosco olvida el pedido. El botón de la esquina baja todo al alcance. */
export const Pedir: Story = {
  render: () => <Workspace views={VIEWS} start={start} pointer="touch" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /Tocá para pedir/ }));
    await userEvent.click(await canvas.findByText("Comer aquí"));
    await userEvent.click(canvas.getByRole("button", { name: "Siguiente" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Capuchino" }));
    await userEvent.click(canvas.getByRole("button", { name: "Capuchino" }));
    await userEvent.click(canvas.getByRole("button", { name: "Revisar pedido · Bs 40,00" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Ir a pagar" }));
    await userEvent.click(await canvas.findByText("QR"));
    await userEvent.click(canvas.getByRole("button", { name: "Pagar Bs 40,00" }));
    await expect(await page.findByRole("status")).toHaveTextContent(/Tu número\s*118/);
    await userEvent.click(canvas.getByRole("button", { name: "Terminar" }));
    await expect(
      await canvas.findByRole("button", { name: /Tocá para pedir/ }),
    ).toBeVisible();
  },
};
