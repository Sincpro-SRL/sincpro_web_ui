import {
  Block,
  Button,
  Cell,
  DensityProvider,
  Dialog,
  KeyValue,
  List,
  Pagination,
  Peek,
  Record,
  SearchBar,
  type SearchCriteria,
  Table,
  Tag,
  Td,
  Th,
  THead,
  Tr,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, Receipt, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";

import {
  ORDER_COUNTERS,
  ORDER_STAGES,
  orderMeta,
  orderName,
  PRICE_LIST,
  PRICE_LIST_COLUMNS,
  SALES_ORDERS,
  type SalesOrder,
  STAGE_ICON,
  STAGE_LABEL,
  STAGE_TONE,
} from "../support/erp-lists";

/**
 * Context: el sistema afirma que **una vista es indiferente a su superficie** —
 * el mismo árbol se dibuja en las cinco y lo único que cambia es el marco. Esta
 * página es donde esa afirmación se puede comprobar de un vistazo, porque hasta
 * ahora sólo estaba escrita.
 *
 * La densidad la declara la SUPERFICIE, nunca la vista: `Peek` y el panel
 * angosto ponen `compact`, y a partir de ahí el título de la lista se va, el
 * riel del registro se va, y el selector de tamaño de página desaparece — sin
 * que la vista sepa nada.
 */
const meta: Meta = {
  title: "1 · Fundamentos/Superficies · la misma vista en cinco",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "La MISMA vista en las cinco superficies: panel width, panel angosto (que es lo que hay en un teléfono), cajón de vista previa, diálogo, y pantalla completa. Ningún componente cambia — cambia quién lo envuelve, y la densidad la declara la superficie.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const FACETAS = [
  { id: "number", label: "en el número" },
  { id: "customer", label: "en el cliente" },
];

const FILTROS = [
  {
    label: "mostrar sólo",
    options: [
      { id: "quotation", label: "cotizaciones" },
      { id: "order", label: "pedidos" },
      { id: "invoiced", label: "facturados" },
    ],
  },
];

/** Context: la densidad la declara la SUPERFICIE. Un panel angosto es lo mismo
 *  que un teléfono, así que pide `compact` — y a partir de ahí el riel del
 *  registro y el título de la lista se van solos, sin que la vista se entere. */
function Marco({
  label,
  width,
  height = "28rem",
  compact = false,
  children,
}: {
  label: string;
  width: string;
  height?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="font-mono text-micro tracking-[0.1em] text-muted uppercase">
        {label}
      </figcaption>
      <div
        style={{ width: width, height: height }}
        className="relative min-w-0 overflow-auto rounded-box border border-line-strong bg-surface"
      >
        <DensityProvider value={compact ? "compact" : "comfortable"}>
          {children}
        </DensityProvider>
      </div>
    </figure>
  );
}

/* ---------------------------------------------------------------- *
 *  La lista, en las cinco
 * ---------------------------------------------------------------- */

function LaLista({ pocas = false }: { pocas?: boolean }) {
  const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
  return (
    <List<SalesOrder>
      items={pocas ? SALES_ORDERS.slice(0, 5) : SALES_ORDERS}
      keyOf={(d) => d.id}
      onOpen={() => {}}
      onPeek={() => {}}
      empty={{ sentence: "Nada acá." }}
    >
      <List.Bar>
        <List.Identity
          title="Pedidos de venta"
          description="lo que cada cliente encargó y en qué anda"
          counters={ORDER_COUNTERS}
        />
        <List.Search>
          <SearchBar
            facets={FACETAS}
            criteria={criteria}
            onCriteriaChange={setCriteria}
            placeholder="buscar un pedido…"
            filters={FILTROS}
          />
        </List.Search>
        <List.Actions>
          <Button role="primary" size="md">
            + Subir datos
          </Button>
        </List.Actions>
        <List.Pagination>
          <Pagination
            from={1}
            to={pocas ? 5 : 12}
            total={187}
            pageSize={80}
            onPageSizeChange={() => {}}
            onNext={() => {}}
          />
        </List.Pagination>
      </List.Bar>
      <List.Rows<SalesOrder>
        row={(d) => ({
          icon: STAGE_ICON[d.stage],
          name: orderName(d),
          tags: <Tag tone={STAGE_TONE[d.stage]}>{STAGE_LABEL[d.stage]}</Tag>,
          meta: orderMeta(d),
        })}
      />
    </List>
  );
}

/**
 * La lista en las cinco. Mirá qué se va en las angostas: el título —la cabecera
 * de la superficie ya lo dice— y el selector de `25/pág.`, que es la decisión
 * menos frecuente y la que más ancho ocupa. **Paginar y ver cuántas hay, quedan.**
 */
export const UnaLista: Story = {
  render: () => {
    const [dialogo, setDialogo] = useState(false);
    const [cajon, setCajon] = useState(true);

    return (
      <div className="flex flex-col gap-8 bg-ground p-8">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-display font-semibold text-ink">
            Una lista, cinco superficies
          </h1>
          <p className="max-w-prose text-body text-muted">
            Ningún componente cambia. Lo que cambia es quién lo envuelve, y la densidad la
            declara la superficie — la vista no la pide ni la sabe.
          </p>
        </header>

        <div className="flex flex-wrap items-start gap-8">
          <Marco label="panel ancho · cómoda" width="min(52rem, 100%)" height="32rem">
            <div className="p-4">
              <LaLista />
            </div>
          </Marco>

          <Marco
            label="panel angosto · lo mismo que un teléfono"
            width="22rem"
            height="32rem"
            compact
          >
            <div className="p-3">
              <LaLista pocas />
            </div>
          </Marco>
        </div>

        <div className="flex flex-wrap items-start gap-8">
          <Marco label="cajón de vista previa" width="min(34rem, 100%)" height="30rem">
            <div className="relative h-full bg-ground">
              <Peek
                open={cajon}
                title="Pedidos de venta"
                subtitle="187 datos · 8 sintéticos"
                onClose={() => setCajon(false)}
                onPromote={() => {}}
              >
                <LaLista pocas />
              </Peek>
              {cajon ? null : (
                <div className="flex h-full items-center justify-center">
                  <Button role="secondary" size="sm" onClick={() => setCajon(true)}>
                    volver a abrir el cajón
                  </Button>
                </div>
              )}
            </div>
          </Marco>

          <Marco
            label="diálogo · elegir sin perder el contexto"
            width="min(34rem, 100%)"
            height="30rem"
          >
            <div className="relative h-full">
              <div className="flex h-full items-center justify-center">
                <Button role="primary" size="md" onClick={() => setDialogo(true)}>
                  Elegir un dato
                </Button>
              </div>
              <Dialog
                open={dialogo}
                title="Elegir un dato"
                subtitle="El diálogo bloquea porque hay algo que contestar antes de seguir."
                width="lg"
                onClose={() => setDialogo(false)}
                footer={
                  <>
                    <Button role="ghost" onClick={() => setDialogo(false)}>
                      cancelar
                    </Button>
                    <Button role="primary" onClick={() => setDialogo(false)}>
                      Usar éste
                    </Button>
                  </>
                }
              >
                <LaLista pocas />
              </Dialog>
            </div>
          </Marco>
        </div>

        <Marco
          label="pantalla completa · sin marco, el contenido manda"
          width="100%"
          height="34rem"
        >
          <div className="p-6">
            <LaLista />
          </div>
        </Marco>
      </div>
    );
  },
};

/* ---------------------------------------------------------------- *
 *  El registro, en las cinco
 * ---------------------------------------------------------------- */

const IDENTIDAD = {
  icon: ShoppingCart,
  title: "S00142 · Importadora y Exportadora del Oriente Boliviano Ltda.",
  tag: { label: "pedido de venta" as const, tone: "info" as const },
};

const ASPECTS = [
  { id: "lineas", label: "líneas", count: 4 },
  { id: "entregas", label: "entregas", count: 2 },
  { id: "otros", label: "otra información" },
];

const ENCABEZADOS = PRICE_LIST_COLUMNS;

/** `sinRiel` es para el DIÁLOGO y sólo para él: un diálogo es width, así que la
 *  densidad sigue siendo cómoda, pero las migas no tienen sentido adentro de uno
 *  —no se navega desde ahí— y eso lo decide la vista con `api.surface`. */
function ElRegistro({ sinRiel = false }: { sinRiel?: boolean }) {
  const [cara, setCara] = useState("lineas");
  return (
    <Record identity={IDENTIDAD}>
      <Record.Rail>
        {sinRiel ? null : (
          <>
            <Record.Crumbs
              crumbs={[{ label: "Pedidos de venta", onClick: () => {} }, { label: "S00142" }]}
            />
            <Record.Pager index={12} total={80} onPrev={() => {}} onNext={() => {}} />
          </>
        )}
        <Record.Smart
          links={[
            { icon: Truck, count: 2, label: "entregas", onClick: () => {} },
            { icon: Receipt, count: 1, label: "facturas" },
            { icon: FileText, count: 0, label: "devoluciones" },
          ]}
        />
        {sinRiel ? null : (
          <Record.Actions>
            <Button role="primary" size="sm" surface="chrome">
              Crear factura
            </Button>
            <Button role="secondary" size="sm" surface="chrome">
              Descargar
            </Button>
          </Record.Actions>
        )}
        <Record.Status stages={ORDER_STAGES} current="sale" />
      </Record.Rail>

      <Record.Paper>
        <Record.Pages current={cara} onChange={setCara}>
          {ASPECTS.map((aspecto) => (
            <Record.Page
              key={aspecto.id}
              id={aspecto.id}
              label={aspecto.label}
              {...(aspecto.count === undefined ? {} : { count: aspecto.count })}
            >
              {/* El vistazo viaja CON la página: es el resumen del registro y
                  no una sección más debajo del cuaderno. */}
              <dl className="grid grid-cols-2 gap-5 @lg:grid-cols-4">
                <KeyValue
                  label="cliente"
                  value="Importadora y Exportadora del Oriente Boliviano Ltda."
                />
                <KeyValue label="total" value="Bs. 58.000,00" />
                <KeyValue label="vendedor" value="Josefa Muñoz" />
                <KeyValue label="entrega" value="12/11/2026" />
              </dl>
              <Block title="el vistazo" flush>
                <Table height={200}>
                  <THead>
                    {ENCABEZADOS.map((h, i) => (
                      <Th key={h} numeric={i >= 3}>
                        {h}
                      </Th>
                    ))}
                  </THead>
                  <tbody>
                    {PRICE_LIST.slice(0, 8).map((fila, i) => (
                      <Tr key={i}>
                        {fila.map((v, j) => (
                          <Td key={j} numeric={j >= 3}>
                            <Cell value={v} />
                          </Td>
                        ))}
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Block>
            </Record.Page>
          ))}
        </Record.Pages>
      </Record.Paper>
    </Record>
  );
}

/**
 * El registro en las cinco. En las angostas **el riel se va entero** y no es por
 * falta de espacio: las migas y el paginador pertenecen a la superficie que lo
 * abrió —la lista de atrás sigue ahí— y las acciones ya están en la cabecera del
 * cajón. Un riel adentro de otro riel son dos barras diciendo dónde estoy.
 *
 * Lo que **no** se va: el tag, el state, los smart buttons y las caras. Son lo
 * que la cabecera del cajón no dice.
 */
export const UnRegistro: Story = {
  render: () => {
    const [dialogo, setDialogo] = useState(false);
    const [cajon, setCajon] = useState(true);

    return (
      <div className="flex flex-col gap-8 bg-ground p-8">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-display font-semibold text-ink">
            Un registro, cinco superficies
          </h1>
          <p className="max-w-prose text-body text-muted">
            El riel es lo único que desaparece, y siempre por el mismo motivo: dice{" "}
            <em>dónde estoy parado</em>, y en una superficie chica eso ya lo dice el marco.
          </p>
        </header>

        <div className="flex flex-wrap items-start gap-8">
          <Marco label="panel ancho · con riel" width="min(52rem, 100%)" height="34rem">
            <ElRegistro />
          </Marco>

          {/* Sin `conRiel={false}`: la densidad compact ya lo saca. */}
          <Marco
            label="panel angosto · lo mismo que un teléfono"
            width="22rem"
            height="34rem"
            compact
          >
            <ElRegistro />
          </Marco>
        </div>

        <div className="flex flex-wrap items-start gap-8">
          <Marco label="cajón de vista previa" width="min(34rem, 100%)" height="32rem">
            <div className="relative h-full bg-ground">
              <Peek
                open={cajon}
                title="S00142"
                subtitle="4 líneas · Bs. 58.000,00 · entrega 12/11/2026"
                onClose={() => setCajon(false)}
                onPromote={() => {}}
                actions={
                  <Button role="primary" size="sm">
                    Crear factura
                  </Button>
                }
              >
                <ElRegistro />
              </Peek>
              {cajon ? null : (
                <div className="flex h-full items-center justify-center">
                  <Button role="secondary" size="sm" onClick={() => setCajon(true)}>
                    volver a abrir el cajón
                  </Button>
                </div>
              )}
            </div>
          </Marco>

          <Marco
            label="diálogo · confirmar antes de seguir"
            width="min(34rem, 100%)"
            height="32rem"
          >
            <div className="relative h-full">
              <div className="flex h-full items-center justify-center">
                <Button role="primary" size="md" onClick={() => setDialogo(true)}>
                  Ver el dato antes de componer
                </Button>
              </div>
              <Dialog
                open={dialogo}
                title="S00142"
                subtitle="Confirmá que es éste antes de apilarlo."
                context={{ kind: "componer", label: "2 tablas" }}
                width="lg"
                onClose={() => setDialogo(false)}
                footer={
                  <>
                    <Button role="ghost" onClick={() => setDialogo(false)}>
                      cancelar
                    </Button>
                    <Button role="primary" onClick={() => setDialogo(false)}>
                      Componer
                    </Button>
                  </>
                }
              >
                <ElRegistro sinRiel />
              </Dialog>
            </div>
          </Marco>
        </div>

        <Marco label="pantalla completa" width="100%" height="36rem">
          <ElRegistro />
        </Marco>
      </div>
    );
  },
};
