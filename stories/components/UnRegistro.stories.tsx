import {
  Block,
  Button,
  type OpenTarget,
  Peek,
  Record,
  RecordCard,
  RelationCard,
  RelationValue,
  Row,
  Tag,
  Tags,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { CUSTOMER_CARDS } from "../support/erp-people";

/**
 * Context: **un registro, en cada tamaño.** El mismo cliente se dibuja de siete maneras según
 * cuánto lugar hay y cuánto hay que saber de él — y cada una tiene su pieza, una sola:
 *
 *   enlace → etiqueta → fila → tarjeta → resumen → vista previa → página
 *
 * Lo que cambia de un tamaño al siguiente es CUÁNTO se dice, nunca CÓMO se abre: en todos el
 * nombre lleva al registro y «Abrir en…» ofrece los otros destinos (modal por defecto, vista
 * previa, al costado, página). Quién decide dónde se abre es el espacio de trabajo (composer);
 * acá cada pieza sólo AVISA el destino pedido. Ver «Nuestro estilo».
 */
const meta: Meta = {
  title: "3 · Componentes/Un registro, en cada tamaño",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "El mismo cliente como enlace (`RelationValue`), etiqueta (`Tags`), fila (`Row`), tarjeta (`RecordCard`), resumen (`RelationCard`), vista previa (`Peek`) y página (`Record`). Cambia cuánto se dice; no cambia cómo se abre.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const CUSTOMER = CUSTOMER_CARDS[1]!;
const FACTS = [
  { label: "Deuda", value: CUSTOMER.debt },
  { label: "Límite de crédito", value: CUSTOMER.credit },
  { label: "Ciudad", value: CUSTOMER.city },
  { label: "Teléfono", value: CUSTOMER.phone },
];
const STATE = <Tag tone={CUSTOMER.state.tone}>{CUSTOMER.state.label}</Tag>;

/** **La escalera.** Apretá el nombre en cualquier tamaño, o «Abrir en…»: abajo se lee qué
 *  destino pidió cada pieza. La vista previa se abre con el 👁 de la fila. */
export const Escalera: Story = {
  render: function Render() {
    const [asked, setAsked] = useState<string | null>(null);
    const [peek, setPeek] = useState(false);
    const say = (piece: string) => (to: OpenTarget) => setAsked(`${piece} → ${to}`);
    return (
      <div className="flex max-w-3xl flex-col gap-4">
        <p role="status" className="text-meta text-muted">
          {asked === null ? "Todavía no se pidió abrir nada." : `Pidió abrir: ${asked}`}
        </p>

        <Block title="1 · enlace — en un campo, en una celda">
          <RelationValue
            name={CUSTOMER.name}
            secondary={`NIT ${CUSTOMER.taxId}`}
            media={{ person: true }}
            summary={{ tag: CUSTOMER.state, facts: FACTS }}
            onOpenIn={say("enlace")}
          />
        </Block>

        <Block title="2 · etiqueta — uno entre varios (many2many)">
          <Tags
            label="Clientes"
            items={[
              {
                id: CUSTOMER.taxId,
                label: CUSTOMER.name,
                avatar: true,
                onSelect: () => say("etiqueta")("peek"),
                title: "Vista previa",
              },
            ]}
          />
        </Block>

        <Block title="3 · fila — en una lista" flush>
          <Row
            avatar={{ name: CUSTOMER.name }}
            name={CUSTOMER.name}
            meta={`NIT ${CUSTOMER.taxId} · ${CUSTOMER.city}`}
            tags={STATE}
            onOpen={() => say("fila")("page")}
            onPeek={() => setPeek(true)}
          />
        </Block>

        <Block title="4 · tarjeta — en un tablero">
          <RecordCard
            title={CUSTOMER.name}
            subtitle={`NIT ${CUSTOMER.taxId}`}
            tags={STATE}
            figure={CUSTOMER.debt}
            onOpen={() => say("tarjeta")("page")}
          />
        </Block>

        <Block title="5 · resumen — al pasar el mouse por el nombre, o suelto en un panel">
          <RelationCard
            name={CUSTOMER.name}
            secondary={`NIT ${CUSTOMER.taxId}`}
            media={{ person: true }}
            summary={{ tag: CUSTOMER.state, facts: FACTS }}
            contact={{ phone: CUSTOMER.phone }}
            onOpen={() => say("resumen")("modal")}
          />
        </Block>

        <Block title="6 · vista previa — el cajón, sin salir de la lista">
          <div className="relative h-80 overflow-clip rounded-box border border-line bg-ground">
            <p className="p-4 text-meta text-muted">
              La lista sigue acá; el 👁 de la fila abre el cajón encima.
            </p>
            <Peek
              open={peek}
              title={CUSTOMER.name}
              subtitle={`NIT ${CUSTOMER.taxId} · ${CUSTOMER.city}`}
              onClose={() => setPeek(false)}
              onPromote={() => say("vista previa")("page")}
            >
              <RelationCard
                name={CUSTOMER.name}
                summary={{ tag: CUSTOMER.state, facts: FACTS }}
              />
            </Peek>
          </div>
        </Block>

        <Block title="7 · página — el registro entero (o en un modal)" flush>
          <Record
            identity={{
              title: CUSTOMER.name,
              subtitle: `NIT ${CUSTOMER.taxId}`,
              tag: CUSTOMER.state,
            }}
          >
            <Record.Rail>
              <Record.Actions>
                <Button role="primary" size="sm">
                  Nueva cotización
                </Button>
              </Record.Actions>
            </Record.Rail>
            <Record.Paper layout="horizontal">
              <Record.Facts fields={FACTS} />
            </Record.Paper>
          </Record>
        </Block>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* The name of the link opens in a modal by default… */
    await userEvent.click(canvas.getByRole("link", { name: CUSTOMER.name }));
    await expect(canvas.getByRole("status")).toHaveTextContent("enlace → modal");
    /* …the row's 👁 opens the drawer, without leaving. */
    await userEvent.click(canvas.getByRole("button", { name: /Vista previa/ }));
    const drawer = await canvas.findByRole("complementary");
    await waitFor(() => expect(drawer).toBeVisible());
  },
};
