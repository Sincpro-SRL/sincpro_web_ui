import {
  Button,
  DensityProvider,
  Listing,
  ListingBar,
  Pagination,
  Row,
  SearchBar,
  type SearchCriteria,
  ViewSwitcher,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, LayoutGrid, List, Receipt, ShoppingCart, Table2 } from "lucide-react";
import { useState } from "react";

/**
 * Context: acá van las PIEZAS de una lista, cada una sola. La lista armada vive
 * en `4 · Vistas/Lista`, y en un solo lugar.
 */

const ITEMS = [
  {
    id: "1",
    n: "S00142 · Importadora y Exportadora del Oriente Boliviano Ltda.",
    m: "4 líneas · 28/10/2026 · Bs. 58.000,00",
    i: ShoppingCart,
  },
  {
    id: "2",
    n: "S00139 · Clínica San Gabriel S.A.",
    m: "3 líneas · 22/10/2026 · Bs. 25.620,00",
    i: Receipt,
  },
  {
    id: "3",
    n: "S00140 · Ferretería El Progreso",
    m: "1 línea · 26/10/2026 · Bs. 1.800,00",
    i: FileText,
  },
];

/** Dónde se puede buscar. La barra de esta historia es la de siempre: sin
 *  facetas buscaría donde decidió el que la programó. */
const FACETAS = [
  { id: "number", label: "número" },
  { id: "customer", label: "cliente" },
];

const meta = {
  title: "3 · Componentes/Datos/Widgets · el cromo que comparten todas",
  component: ListingBar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "El cromo que comparten LAS SEIS presentaciones: la barra, la paginación, el conmutador y el contenedor. No son de las filas ni de la tabla — son del CONJUNTO, y por eso cambiar de presentación no los mueve. Estaban metidos adentro de la historia de las filas, que es donde nadie los iba a buscar.",
      },
    },
  },
} satisfies Meta<typeof Row>;

function Caja({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="font-mono text-micro tracking-[0.1em] text-muted uppercase">
        {label}
      </figcaption>
      <div className="rounded-box border border-line bg-surface">{children}</div>
    </figure>
  );
}

export default meta;
type Story = StoryObj<typeof meta>;

/** La barra. **Elegir la cambia en el mismo lugar**: una barra que aparece corre
 *  las filas justo cuando alguien está tildando casillas. Y el buscador se va
 *  mientras hay selección — lo elegido es sobre lo ya filtrado. */
export const Barra: Story = {
  render: () => {
    const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
    const [elegidas, setElegidas] = useState(0);

    const buscador = (
      <SearchBar
        facets={FACETAS}
        criteria={criteria}
        onCriteriaChange={setCriteria}
        placeholder="buscar un pedido o un cliente…"
      />
    );

    return (
      <div className="flex flex-col gap-6 bg-ground p-8">
        <figure className="flex flex-col gap-2">
          <figcaption className="font-mono text-micro tracking-[0.1em] text-muted uppercase">
            sin selección
          </figcaption>
          <ListingBar
            actions={
              <Button role="primary" size="sm">
                + Nueva cotización
              </Button>
            }
            title="Pedidos"
            description="cotizaciones, pedidos confirmados y lo que ya se facturó"
            counters={[
              { label: "pedidos", value: 112 },
              { label: "facturados", value: 11 },
            ]}
            search={buscador}
            pagination={
              <Pagination
                from={1}
                to={80}
                total={187}
                pageSize={80}
                onPageSizeChange={() => {}}
                onNext={() => {}}
              />
            }
          />
        </figure>

        <figure className="flex flex-col gap-2">
          <figcaption className="font-mono text-micro tracking-[0.1em] text-muted uppercase">
            con {elegidas || 3} elegidas — el buscador cede su lugar
          </figcaption>
          <ListingBar
            actions={
              <Button role="primary" size="sm">
                + Nueva cotización
              </Button>
            }
            title="Pedidos"
            counters={[{ label: "pedidos", value: 112 }]}
            search={buscador}
            selection={{
              count: elegidas || 3,
              onClear: () => setElegidas(0),
              actions: (
                <Button role="secondary" size="sm">
                  Facturar juntos
                </Button>
              ),
            }}
            pagination={<Pagination from={1} to={12} total={187} />}
          />
        </figure>
      </div>
    );
  },
};

/** La paginación es UN control, no dos. El rango lleva subrayado punteado: al
 *  tocarlo se elige cuántos entran por página. Odoo lo esconde detrás de un
 *  doble clic que nadie encuentra. */
export const Paginación: Story = {
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Caja label="editable · tocá el rango">
        <div className="flex flex-wrap items-center gap-6 p-4">
          <Pagination
            from={1}
            to={80}
            total={187}
            pageSize={80}
            onPageSizeChange={() => {}}
            onNext={() => {}}
          />
          <Pagination
            from={176}
            to={187}
            total={187}
            pageSize={80}
            onPageSizeChange={() => {}}
            onPrev={() => {}}
          />
        </div>
      </Caja>
      <Caja label="compacta · sin selector de tamaño">
        <div className="p-4">
          <DensityProvider value="compact">
            <Pagination
              from={1}
              to={80}
              total={187}
              pageSize={80}
              onPageSizeChange={() => {}}
              onNext={() => {}}
            />
          </DensityProvider>
        </div>
      </Caja>
    </div>
  ),
};

/** Las tres presentaciones del mismo conjunto. Van pegadas —un grupo segmentado
 *  y no tres botones sueltos— porque son opciones EXCLUYENTES de una pregunta. */
export const Presentaciones: Story = {
  render: () => {
    const [cual, setCual] = useState("rows");
    return (
      <div className="bg-ground p-8">
        <Caja label="sobre el lienzo">
          <div className="p-4">
            <ViewSwitcher
              options={[
                { id: "rows", label: "Filas", icon: List },
                { id: "table", label: "Tabla", icon: Table2 },
                { id: "board", label: "Tablero", icon: LayoutGrid },
              ]}
              current={cual}
              onSelect={setCual}
            />
          </div>
        </Caja>
      </div>
    );
  },
};

/** La lista como contenedor: sólo aporta la caja y el aire. Lo que va adentro lo
 *  decide quien compone. */
export const Contenedor: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <Listing
        bar={<ListingBar title="Pedidos" counters={[{ label: "pedidos", value: 3 }]} />}
      >
        {ITEMS.map((d) => (
          <Row key={d.id} icon={d.i} name={d.n} meta={d.m} onPeek={() => {}} />
        ))}
      </Listing>
    </div>
  ),
};
