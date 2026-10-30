import {
  Block,
  Button,
  Empty,
  FullWidth,
  KeyValue,
  Numeric,
  Rule,
  SectionGrid,
  Table,
  Tag,
  Td,
  Th,
  THead,
  Tr,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  INVOICES,
  money,
  shortDate,
  STATE_LABEL,
  STATE_TONE,
  subtotalOf,
} from "../support/erp";

const meta = {
  title: "2 · Primitivas/Block · la estructura de una vista",
  component: Block,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "El diagnóstico no era falta de adornos: era que una vista era una pila de `div` sin jerarquía, donde el vistazo, las facturas y los contactos flotaban a la misma altura. El bloque tiene filo y su título vive EN el borde. La rejilla decide por DEPENDENCIA y no por espacio: dos secciones que no se gobiernan van lado a lado; dos que sí, apiladas.",
      },
    },
  },
} satisfies Meta<typeof Block>;

export default meta;
type Story = StoryObj<typeof meta>;

const STOCK = [
  {
    code: "CEM-IP30",
    name: "Cemento Portland IP-30 — bolsa 50 kg",
    onHand: 1240,
    reserved: 600,
  },
  { code: "CEM-IP40", name: "Cemento Portland IP-40 — bolsa 50 kg", onHand: 0, reserved: 0 },
  { code: "FIE-12", name: "Fierro corrugado 12 mm × 12 m", onHand: 3560, reserved: 1200 },
  { code: "LAD-6H", name: "Ladrillo 6 huecos 24 × 18 × 12", onHand: 48000, reserved: 15000 },
];

/** El estado va en el encabezado para que se vea qué falta **sin abrir ninguna sección**:
 *  plegado tiene que seguir contestando la pregunta. */
export const Estados: Story = {
  args: { children: null },
  render: () => (
    <div className="flex flex-col gap-(--spacing-block) bg-ground p-8">
      <Block title="datos fiscales" count={3} status={{ label: "completo", tone: "good" }}>
        <p className="text-body text-muted">
          NIT, razón social y actividad económica al día.
        </p>
      </Block>

      <Block
        title="condiciones de pago"
        status={{ label: "falta el límite de crédito", tone: "warn" }}
        actions={
          <Button role="secondary" size="sm">
            Definir
          </Button>
        }
      >
        <Empty sentence="Este cliente todavía no tiene un límite de crédito." align="start" />
      </Block>

      <Block
        title="cuenta contable"
        aside={<span className="text-meta text-muted">1.1.3.01 · Cuentas por cobrar</span>}
      >
        <p className="text-body text-muted">Dónde se registran sus facturas y sus pagos.</p>
      </Block>

      <Block>
        <p className="text-body text-muted">Sin título: agrupa sin nombrar.</p>
      </Block>

      <Rule label="después de los hechos" />

      <Block title="el vistazo" flush>
        <p className="px-3 py-2.5 text-body text-muted">
          Un corte nombrado entre regiones, no otro bloque.
        </p>
      </Block>
    </div>
  ),
};

/**
 * Una vista entera: la ficha de un cliente. **Redimensioná el panel**: la rejilla pregunta
 * por el ancho del CONTENEDOR y no por el de la ventana, porque con cuatro paneles abiertos
 * cada uno mide 380 px en una pantalla de 1.600.
 */
export const UnaVista: Story = {
  args: { children: null },
  render: () => {
    const facturas = INVOICES.filter(
      (i) => i.customer === "Distribuidora Andina S.R.L.",
    ).slice(0, 4);
    return (
      <div className="bg-ground p-8">
        <div className="@container mx-auto max-w-6xl resize-x overflow-auto rounded-box border border-dashed border-line-strong p-4">
          <div className="flex flex-col gap-(--spacing-block)">
            <Block title="el vistazo">
              <dl className="grid grid-cols-2 gap-5 @lg:grid-cols-4">
                <KeyValue label="facturas del año" value="38" />
                <KeyValue label="por cobrar" value={money(64320.5)} />
                <KeyValue label="vencido" value={money(18650)} />
                <KeyValue label="días promedio de pago" value="41" />
              </dl>
            </Block>

            <SectionGrid>
              <Block title="facturas" count={facturas.length} flush>
                <Table>
                  <THead>
                    <Th>número</Th>
                    <Th>vence</Th>
                    <Th>estado</Th>
                    <Th numeric>total Bs.</Th>
                  </THead>
                  <tbody>
                    {facturas.map((f) => (
                      <Tr key={f.id}>
                        <Td>
                          <span className="text-meta text-ink tabular-nums">{f.number}</span>
                        </Td>
                        <Td>
                          <span className="text-meta text-muted tabular-nums">
                            {shortDate(f.due)}
                          </span>
                        </Td>
                        <Td>
                          <Tag tone={STATE_TONE[f.state]}>{STATE_LABEL[f.state]}</Tag>
                        </Td>
                        <Td numeric>
                          <Numeric value={subtotalOf(f)} format="decimal" />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Block>

              <Block title="cobranza" status={{ label: "1 vencida", tone: "bad" }}>
                <p className="text-body text-muted">
                  Una factura vencida hace 12 días; las demás se pagan dentro del plazo de 30
                  días.
                </p>
              </Block>

              {/* Una tabla ancha no se parte: ocupa las dos columnas. */}
              <FullWidth>
                <Block title="stock de lo que compra" count={STOCK.length} flush>
                  <Table>
                    <THead>
                      <Th>código</Th>
                      <Th>producto</Th>
                      <Th numeric>en stock</Th>
                      <Th numeric>reservado</Th>
                    </THead>
                    <tbody>
                      {STOCK.map((p) => (
                        <Tr key={p.code}>
                          <Td>
                            <span className="text-meta text-muted">{p.code}</span>
                          </Td>
                          <Td>
                            <span className="text-meta text-ink">{p.name}</span>
                          </Td>
                          <Td numeric>
                            <Numeric value={p.onHand} />
                          </Td>
                          <Td numeric>
                            <Numeric value={p.reserved} />
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </Block>
              </FullWidth>
            </SectionGrid>
          </div>
        </div>
      </div>
    );
  },
};
