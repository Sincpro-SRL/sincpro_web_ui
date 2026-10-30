import {
  Button,
  Callout,
  Copyable,
  DataField,
  DatePicker,
  Field,
  FormActions,
  FormModeProvider,
  FormSection,
  NumberInput,
  Record,
  SegmentedControl,
  Select,
  Sheet,
  SheetGroup,
  SheetGroups,
  Step,
  Steps,
  Suggest,
  Switch,
  TextArea,
  TextInput,
  useSteps,
  Wizard,
  type WizardStep,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Building2 } from "lucide-react";
import { useState } from "react";

import { INVOICES } from "../support/erp";
import {
  BANKS,
  CITIES,
  CREDIT_NOTE_REASONS,
  PAYMENT_METHODS,
  PAYMENT_TERMS,
  UNITS,
} from "../support/erp-forms";

/**
 * Context: **los TIPOS de formulario**, que es lo que faltaba ver.
 *
 * Hasta acá el sistema mostraba los controles sueltos —`2 · Primitivas/Controles de formulario`— y
 * nada más. Un control suelto no dice cuándo un formulario tiene que ser una
 * hoja con pestañas, cuándo tres secciones seguidas y cuándo un asistente, y
 * ésa es exactamente la decisión que se toma mal: la consecuencia se ve en la
 * aplicación, donde el mismo producto tiene una vista con `FormSection`, otra
 * con una grilla escrita a mano y otra sin envoltorio ninguno.
 *
 * ── La regla para elegir ────────────────────────────────────────────
 *
 *     Hoja        el registro EXISTE y se mira tanto como se edita
 *     Por partes  se crea algo, de una, y todo cabe en una pantalla
 *     Páginas     hay más de lo que entra, y las partes son INDEPENDIENTES
 *     Pasos       el orden importa: lo de abajo depende de lo de arriba
 *     Asistente   hay que decidir varias cosas ANTES de que algo pase
 *     Rápido      dos campos y ya, sin perder de vista lo de atrás
 *
 * La pregunta que las separa no es cuántos campos hay: es **si el orden
 * importa** y **si el registro ya existe**. Un formulario de alta con doce
 * campos independientes es una hoja larga, no un asistente; y tres campos donde
 * el segundo depende del primero son pasos aunque entren en media pantalla.
 */
const meta: Meta = {
  title: "3 · Componentes/Formulario · los tipos",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Los seis tipos de formulario y la regla que decide cuál va. La pregunta que los separa no es cuántos campos hay, sino si el ORDEN importa y si el registro YA EXISTE.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** The invoices of the customer in the stories, newest first, for the credit-note steps. */
const FACTURAS = INVOICES.filter((one) => one.state !== "draft" && one.state !== "cancelled")
  .slice(0, 6)
  .map((one) => one.number);

/** El pie de un formulario que ya existe: un solo primario a la derecha,
 *  cancelar pegado a él, y borrar al otro extremo. Juntos, un click de más
 *  cae en lo que no se puede deshacer. */
export const ElPie: Story = {
  render: () => (
    <Marco>
      <div className="max-w-2xl rounded-box border border-line bg-surface p-4">
        <FormActions
          danger={<Button role="danger">Archivar cliente</Button>}
          aside="Sus facturas quedan; deja de aparecer al vender."
          secondary={<Button role="ghost">Cancelar</Button>}
          primary={<Button role="primary">Guardar</Button>}
        />
      </div>
    </Marco>
  ),
};

function Marco({ children }: { children: React.ReactNode }) {
  return <div className="bg-ground p-8">{children}</div>;
}

/* ==================================================================== *
 *  1 · LA HOJA
 * ==================================================================== */

/**
 * **La hoja: hechos arriba, cuaderno abajo.** Es la forma de un registro que ya
 * existe — la de Odoo, y la que más se usa en un ERP: la ficha de un cliente.
 *
 * Los hechos van ARRIBA del cuaderno y no adentro de una página porque describen
 * el registro **en todas las páginas**: meterlos en la primera obliga a volver a
 * ella para recordar de qué se está hablando. Lo que cambia de página es el
 * detalle, no la identidad.
 *
 * Mirá que los campos usan la disposición `horizontal` —etiqueta a la izquierda,
 * valores alineados en una vertical—: la decide la hoja y la heredan todos los
 * campos de adentro, así que una hoja no puede quedar medio alineada.
 */
export const Hoja: Story = {
  render: function Render() {
    const [page, setPage] = useState("datos");
    const [nombre, setNombre] = useState("Distribuidora Andina S.R.L.");
    const [ciudad, setCiudad] = useState("La Paz");
    const [plazo, setPlazo] = useState("30");
    const [notas, setNotas] = useState("");

    return (
      <Marco>
        <Record
          identity={{
            icon: Building2,
            title: nombre,
            tag: { label: "cliente", tone: "neutral" },
          }}
        >
          <Record.Rail>
            <Record.Crumbs
              crumbs={[{ label: "Clientes", onClick: () => {} }, { label: nombre }]}
            />
            <Record.Pager index={12} total={80} onPrev={() => {}} onNext={() => {}} />
            <Record.Actions>
              <Button role="primary" size="sm">
                Nueva factura
              </Button>
            </Record.Actions>
          </Record.Rail>

          <Record.Paper layout="horizontal">
            {/* Los hechos: arriba del cuaderno, en TODAS las páginas. */}
            <Record.Facts
              fields={[
                { label: "NIT", value: "1028457021", mono: true },
                { label: "Saldo", value: "Bs 18.920,00" },
                { label: "Vencido", value: "Bs 4.520,00" },
                { label: "Cliente desde", value: "03/2021" },
              ]}
            />

            <Record.Pages current={page} onChange={setPage}>
              <Record.Page id="datos" label="datos">
                <Field label="Razón social" required>
                  <TextInput value={nombre} onChange={setNombre} />
                </Field>
                <Field label="Ciudad">
                  <Suggest value={ciudad} onChange={setCiudad} suggestions={CITIES} />
                </Field>
                <Field label="Plazo de pago">
                  <Select value={plazo} onChange={setPlazo} options={PAYMENT_TERMS} />
                </Field>
                <Field label="Notas" hint="Para quien lo atienda dentro de seis meses.">
                  <TextArea value={notas} onChange={setNotas} rows={3} />
                </Field>
              </Record.Page>

              <Record.Page id="contactos" label="contactos" count={3}>
                <DataField label="Compras" value="Rodrigo Quispe · compras@andina.com.bo" />
                <DataField label="Pagos" value="María Fernández · tesoreria@andina.com.bo" />
              </Record.Page>

              <Record.Page id="facturacion" label="facturación">
                <DataField
                  label="Código de cliente"
                  value={<Copyable value="CLI-000412" mono />}
                />
              </Record.Page>
            </Record.Pages>
          </Record.Paper>
        </Record>
      </Marco>
    );
  },
};

/* ==================================================================== *
 *  2 · POR PARTES
 * ==================================================================== */

/**
 * **Por partes: secciones seguidas.** Lo que se crea de una y entra en una
 * pantalla — registrar un pago. Las secciones agrupan campos que se contestan
 * juntos, y **no son pasos**: se pueden llenar en cualquier orden.
 *
 * Es el arquetipo más común y el más fácil de arruinar — la tentación es
 * convertirlo en pasos porque «es largo». Largo no es la pregunta: si el tercer
 * campo no depende del primero, numerarlos miente sobre una dependencia que no
 * existe y obliga a avanzar para ver lo que falta.
 *
 * `FormActions` va al final y una sola vez. El estado de lo que falta vive en la
 * sección, no en un cartel arriba.
 */
export const PorPartes: Story = {
  render: function Render() {
    const [monto, setMonto] = useState<number | "">(4520);
    const [fecha, setFecha] = useState<string | null>("2026-10-30");
    const [metodo, setMetodo] = useState("transferencia");
    const [banco, setBanco] = useState("Banco Mercantil Santa Cruz");
    const [comprobante, setComprobante] = useState("");

    return (
      <Marco>
        <div className="mx-auto flex max-w-4xl flex-col gap-(--spacing-block) rounded-box border border-line bg-surface p-5">
          <FormSection
            title="El pago"
            hint="De la factura FAC/2026/0118 — saldo Bs 4.520,00."
            columns={2}
          >
            <Field label="Monto" required>
              <NumberInput
                value={monto}
                min={0}
                onChange={setMonto}
                format={{ style: "currency", currency: "BOB" }}
              />
            </Field>
            <Field label="Fecha del pago" required>
              <DatePicker value={fecha} onChange={setFecha} />
            </Field>
          </FormSection>

          <FormSection
            title="Cómo se pagó"
            status={
              comprobante === ""
                ? { label: "falta el comprobante", tone: "warn" }
                : { label: "completo", tone: "good" }
            }
            columns={2}
          >
            <Field label="Método">
              <SegmentedControl
                value={metodo}
                onChange={setMetodo}
                options={PAYMENT_METHODS}
              />
            </Field>
            <Field label="Banco" hint="Elegí uno o escribí otro.">
              <Suggest value={banco} onChange={setBanco} suggestions={BANKS} />
            </Field>
            <Field label="Nº de comprobante" hint="El que figura en el extracto.">
              <TextInput
                value={comprobante}
                onChange={setComprobante}
                mono
                spellCheck={false}
              />
            </Field>
          </FormSection>

          <FormActions
            aside="El asiento se genera al registrar."
            secondary={<Button role="ghost">Cancelar</Button>}
            primary={<Button role="primary">Registrar pago</Button>}
          />
        </div>
      </Marco>
    );
  },
};

/* ==================================================================== *
 *  3 · CON PÁGINAS
 * ==================================================================== */

/**
 * **Con páginas: el cuaderno sin hechos arriba.** Cuando hay más de lo que entra
 * y las partes son **independientes** — se puede trabajar en una sin haber
 * mirado las otras: el alta de un producto.
 *
 * La diferencia con «por partes» es qué pasa al no mirar una: en secciones, lo
 * que no mirás lo ves igual al scrollear; en páginas, no. Por eso las páginas
 * piden que cada una sea completa por sí misma, y por eso el contador en la
 * pestaña importa: es lo único que dice que hay algo ahí sin abrirla.
 */
export const ConPaginas: Story = {
  render: function Render() {
    const [page, setPage] = useState("general");
    const [nombre, setNombre] = useState("Soporte mensual (plan estándar)");
    const [vendible, setVendible] = useState(false);
    const [precio, setPrecio] = useState<number | "">(1800);

    return (
      <Marco>
        <Record identity={{ title: nombre, tag: { label: "borrador", tone: "warn" } }}>
          <Record.Paper>
            <Record.Pages current={page} onChange={setPage}>
              <Record.Page id="general" label="general">
                <Field label="Nombre" required>
                  <TextInput value={nombre} onChange={setNombre} />
                </Field>
                <Field label="Se puede vender">
                  <Switch checked={vendible} onChange={setVendible}>
                    aparece en cotizaciones y facturas
                  </Switch>
                </Field>
              </Record.Page>

              <Record.Page id="precios" label="precios" count={2}>
                <Field label="Precio de lista" hint="IVA incluido.">
                  <NumberInput
                    value={precio}
                    onChange={setPrecio}
                    min={0}
                    format={{ style: "currency", currency: "BOB" }}
                  />
                </Field>
              </Record.Page>

              <Record.Page id="contabilidad" label="contabilidad">
                <Callout tone="warn">
                  Lo de acá cambia a qué cuentas va cada venta. Las cuentas por omisión de la
                  categoría sirven para casi todos los productos.
                </Callout>
              </Record.Page>
            </Record.Pages>

            <FormActions primary={<Button role="primary">Guardar</Button>} />
          </Record.Paper>
        </Record>
      </Marco>
    );
  },
};

/* ==================================================================== *
 *  4 · POR PASOS
 * ==================================================================== */

/**
 * **Por pasos: cuando el orden importa.** Lo de abajo depende de lo de arriba —
 * no se puede elegir el motivo de una nota de crédito antes de saber a qué
 * factura corrige.
 *
 * La diferencia con las secciones es que un paso puede estar **trabado**, y
 * traba con su motivo: un paso apagado sin explicación es un callejón. Y a
 * diferencia del asistente, los pasos viven en la PÁGINA: se ve todo el
 * procedimiento de una, y volver atrás es scrollear y no navegar.
 */
export const PorPasos: Story = {
  render: function Render() {
    const [factura, setFactura] = useState("");
    const [motivo, setMotivo] = useState("");
    const steps = useSteps("factura");

    return (
      <Marco>
        <div className="mx-auto max-w-4xl">
          <Steps>
            <Step
              title="La factura"
              open={steps.isOpen("factura")}
              onToggle={() => steps.toggle("factura")}
              {...(factura === ""
                ? {}
                : { status: { label: "lista", tone: "good" as const } })}
            >
              <Field label="Factura a corregir" required>
                <Suggest
                  value={factura}
                  onChange={setFactura}
                  mono
                  placeholder="FAC/2026/…"
                  suggestions={FACTURAS}
                />
              </Field>
            </Step>

            <Step
              title="El motivo"
              open={steps.isOpen("motivo")}
              onToggle={() => steps.toggle("motivo")}
              /* Trabado CON SU MOTIVO. Un paso apagado sin explicación es un
                 callejón: no dice qué hacer para abrirlo. */
              {...(factura === "" ? { locked: "Elegí primero la factura." } : {})}
              {...(motivo === ""
                ? {}
                : { status: { label: "listo", tone: "good" as const } })}
            >
              <Field label="Motivo" hint="Sale impreso en la nota de crédito.">
                <Select
                  value={motivo}
                  onChange={setMotivo}
                  placeholder="Elegí uno…"
                  options={CREDIT_NOTE_REASONS}
                />
              </Field>
            </Step>

            <Step
              title="Emitir"
              open={steps.isOpen("emitir")}
              onToggle={() => steps.toggle("emitir")}
              {...(motivo === "" ? { locked: "Falta el motivo." } : {})}
            >
              <FormActions primary={<Button role="primary">Emitir nota de crédito</Button>} />
            </Step>
          </Steps>
        </div>
      </Marco>
    );
  },
};

/* ==================================================================== *
 *  5 · EL ASISTENTE
 * ==================================================================== */

const PASOS: WizardStep[] = [
  { id: "extracto", label: "El extracto" },
  { id: "revision", label: "La revisión" },
  { id: "conciliar", label: "Conciliar" },
];

/**
 * **El asistente: decisiones ANTES de que algo pase.** Vive en un diálogo y
 * bloquea a propósito — conciliar un extracto bancario cruza cientos de
 * movimientos, y hacerlo contra la cuenta equivocada se paga deshaciéndolo a
 * mano.
 *
 * La diferencia con «por pasos» no es la cantidad de pasos: es que acá **no hay
 * nada todavía**. Los pasos editan algo que ya existe y se ven todos juntos; el
 * asistente reúne lo necesario para crear algo y por eso puede permitirse tapar
 * la pantalla.
 *
 * En el último paso el botón deja de decir «siguiente» y **nombra lo que va a
 * pasar**: un «siguiente» en el último paso esconde que ahí se ejecuta algo.
 */
export const Asistente: Story = {
  render: function Render() {
    const [at, setAt] = useState("extracto");
    const [banco, setBanco] = useState("");
    const index = PASOS.findIndex((one) => one.id === at);

    const steps = PASOS.map((one) =>
      one.id === "revision" && banco === ""
        ? { ...one, blocked: "Elegí primero el banco." }
        : one,
    );

    return (
      <Marco>
        <div className="mx-auto max-w-2xl rounded-panel border border-line-strong bg-surface p-5 shadow-float">
          <Wizard
            steps={steps}
            current={at}
            onStepChange={setAt}
            onCancel={() => {}}
            {...(index > 0 ? { onBack: () => setAt(PASOS[index - 1]!.id) } : {})}
            {...(index < PASOS.length - 1
              ? { onNext: () => setAt(PASOS[index + 1]!.id) }
              : { onNext: () => {} })}
            nextLabel={index === PASOS.length - 1 ? "Conciliar 214 movimientos" : undefined}
          >
            {at === "extracto" ? (
              <Field label="Banco del extracto" required>
                <Suggest
                  value={banco}
                  onChange={setBanco}
                  placeholder="Elegí un banco…"
                  suggestions={BANKS}
                />
              </Field>
            ) : at === "revision" ? (
              <p className="text-body text-muted">
                214 movimientos de octubre en {banco}: 198 encontraron su factura, 16 quedan
                para revisar a mano.
              </p>
            ) : (
              <Callout tone="info">
                Se van a generar 198 asientos de cobro. Se pueden revertir desde el extracto.
              </Callout>
            )}
          </Wizard>
        </div>
      </Marco>
    );
  },
};

/* ==================================================================== *
 *  6 · MIRAR Y EDITAR
 * ==================================================================== */

/**
 * **El mismo formulario, mirando y editando.** No son dos pantallas: es el mismo
 * árbol con `FormModeProvider`.
 *
 * Tenerlo como dos vistas es cómo se separan — se agrega un campo a la de
 * edición y la de lectura sigue sin mostrarlo durante meses, porque nada falla.
 * En modo lectura cada control se dibuja como su valor, así que la alineación,
 * el orden y las secciones son exactamente los mismos.
 *
 * Y las hojas agrupadas: `SheetGroups` parte los hechos en columnas separadas
 * por un filete, para un registro con más hechos de los que entran en una.
 */
export const MirarYEditar: Story = {
  render: function Render() {
    const [editando, setEditando] = useState(false);
    const [nombre, setNombre] = useState("Capacitación presencial (por hora)");
    const [unidad, setUnidad] = useState("hora");
    const [precio, setPrecio] = useState<number | "">(420);

    return (
      <Marco>
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          <div className="flex justify-end">
            <Button role="secondary" size="sm" onClick={() => setEditando(!editando)}>
              {editando ? "Ver" : "Editar"}
            </Button>
          </div>

          <div className="rounded-box border border-line bg-surface p-5">
            <FormModeProvider value={editando ? "edit" : "read"}>
              <Sheet layout="horizontal">
                <SheetGroups columns={2}>
                  <SheetGroup title="Producto">
                    <Field label="Nombre" required>
                      <TextInput value={nombre} onChange={setNombre} />
                    </Field>
                    <Field label="Unidad">
                      <Suggest value={unidad} onChange={setUnidad} suggestions={UNITS} />
                    </Field>
                    <Field label="Precio">
                      <NumberInput
                        value={precio}
                        onChange={setPrecio}
                        min={0}
                        format={{ style: "currency", currency: "BOB" }}
                      />
                    </Field>
                  </SheetGroup>

                  <SheetGroup title="Lo que no se edita">
                    <DataField label="Vendidas este año" value="312 h" />
                    <DataField label="Creado" value="02/03/2026" />
                    <DataField
                      label="Código"
                      value={<Copyable value="SRV-CAP-HORA" mono />}
                    />
                  </SheetGroup>
                </SheetGroups>
              </Sheet>
            </FormModeProvider>
          </div>
        </div>
      </Marco>
    );
  },
};
