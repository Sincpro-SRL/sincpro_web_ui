import { Button, filterCriteria, List, Record, SearchBar } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ORDER_COUNTERS as COUNTERS, orderName } from "../../support/erp-lists";
import type { Item } from "../lista/shared";
import { FACETAS, FILTROS_PUESTOS } from "../lista/shared";

const meta: Meta = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Compartido/Estados · cargando, vacío y error",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Los estados de una vista salen del MISMO lugar: cargando, vacío de verdad, vacío por un filtro, y el error.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** Los tres estados salen del MISMO lugar, y son tres situaciones distintas:
 *  cargando, vacío de verdad, y vacío porque hay un filtro puesto. Decirle «creá
 *  tu primera cotización» a quien tiene 180 pedidos y escribió mal el nombre de
 *  un cliente es contestarle otra pregunta. */
export const LosTresEstados: Story = {
  render: () => {
    const vacio = {
      sentence: "Todavía no cargaste ningún pedido. Una cotización alcanza para empezar.",
      action: (
        <Button role="primary" size="md">
          Nueva cotización
        </Button>
      ),
      whenFiltered: {
        sentence:
          "Ningún pedido coincide con lo que buscaste. Sacá una ficha o limpiá los filtros.",
        action: (
          <Button role="secondary" size="md">
            Limpiar los filtros
          </Button>
        ),
      },
    };

    return (
      <div className="flex flex-col gap-8 bg-ground p-8">
        {(
          [
            ["cargando", { loading: true }, false],
            ["vacío de verdad", {}, false],
            ["vacío por un filtro", {}, true],
            ["falló", { error: "No pudimos hablar con el servidor." }, false],
          ] as const
        ).map(([label, state, filtered]) => (
          <figure key={label} className="flex flex-col gap-2">
            <figcaption className="font-mono text-micro tracking-[0.1em] text-muted uppercase">
              {label}
            </figcaption>
            <List<Item>
              items={[]}
              keyOf={(d) => d.id}
              state={state}
              filtered={filtered}
              empty={vacio}
            >
              <List.Bar>
                <List.Identity title="Pedidos" counters={COUNTERS} />
                {/* El caso del filtro LLEVA su buscador: sin él se lee «no pasó
                    el filtro» sin poder ver ningún filtro puesto, que es pedirle
                    a alguien que confíe en una frase. Los otros tres no lo
                    necesitan —lo que muestran no depende de ningún recorte— y
                    ponérselo sería ruido repetido cuatro veces.

                    Y ahora la condición se escribe donde se ve: una ranura bajo
                    un `?` es la ausencia de esa pieza, sin un objeto de props
                    esparcido. */}
                {filtered ? (
                  <List.Search>
                    <SearchBar
                      facets={FACETAS}
                      criteria={[
                        filterCriteria(
                          { field: "customer", operator: "like", value: "ferreteria" },
                          "cliente contiene ferreteria",
                        ),
                      ]}
                      onCriteriaChange={() => {}}
                      filters={FILTROS_PUESTOS}
                    />
                  </List.Search>
                ) : null}
              </List.Bar>
              <List.Rows<Item> row={(d) => ({ name: orderName(d) })} />
            </List>
          </figure>
        ))}
      </div>
    );
  },
};

/** La ficha todavía no llegó. No es un vacío: el riel, el nombre, los hechos y
 *  las solapas ya ocupan su lugar. Un pedido que tarda en llegar no tiene por
 *  qué decir «no hay nada». */
export const Cargando: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <Record.Skeleton label="Cargando el pedido…" />
    </div>
  ),
};
