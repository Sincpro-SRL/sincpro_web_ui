import {
  Button,
  ComboBox,
  DatePicker,
  Dialog,
  Field,
  FormSection,
  NumberInput,
  RadioGroup,
  SegmentedControl,
  Select,
  Switch,
  TextArea,
  TextInput,
  Wizard,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { INVOICES, money, shortDate, subtotalOf } from "../support/erp";
import {
  CURRENCIES,
  INCOTERMS,
  PAYMENT_METHODS,
  PAYMENT_TERMS,
  PURCHASE_KIND_OPTIONS,
  SUPPLIERS,
  VOID_REASONS,
  WAREHOUSES,
} from "../support/erp-purchase";

/**
 * Context: **lo que hay que contestar antes de seguir.** El diálogo preserva el contexto de
 * quien lo llamó —sin eso el primer campo es siempre «¿sobre qué?», la pregunta que el
 * usuario ya contestó al abrirlo— y se agranda a panel cuando la cosa se pone larga. No se
 * apila: si hay que elegir algo, se elige adentro. El foco, Escape, la vuelta del foco y el
 * bloqueo del scroll los resuelve React Aria.
 */
const meta: Meta = {
  title: "2 · Primitivas/Dialog y Wizard",
  component: Dialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Preserva el contexto de quien lo llamó —sin eso el primer campo es siempre «¿sobre qué?», la pregunta que el usuario ya contestó al abrirlo— y se agranda a panel cuando la cosa se pone larga. No se apila: si hay que elegir algo, se elige adentro. Tab no se escapa, Escape cierra y el foco vuelve al botón que lo abrió.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** The overdue invoice with the longest customer name: the header has to survive it. */
const OVERDUE =
  INVOICES.filter((i) => i.state === "overdue").sort(
    (a, b) => b.customer.length - a.customer.length,
  )[0] ?? INVOICES[0]!;
const POSTED = INVOICES.find((i) => i.state === "posted") ?? INVOICES[0]!;

/** **Un formulario corto, con el contexto arriba.** «Registrar pago» se abre desde una
 *  factura y lo dice en la cabecera: número, cliente y saldo. El primer campo ya es el
 *  monto, no «¿de qué factura?». */
export const RegistrarPago: Story = {
  render: function Render() {
    const saldo = Math.round(subtotalOf(OVERDUE) * 100) / 100;
    const [open, setOpen] = useState(true);
    const [monto, setMonto] = useState<number | "">(saldo);
    const [fecha, setFecha] = useState<string | null>("2026-10-30");
    const [metodo, setMetodo] = useState("transfer");
    const [referencia, setReferencia] = useState("");
    const [recibo, setRecibo] = useState(true);

    return (
      <>
        <Button role="primary" onClick={() => setOpen(true)}>
          Registrar pago…
        </Button>
        <Dialog
          open={open}
          title="Registrar pago"
          subtitle="El pago se concilia con la factura y el saldo baja en el momento."
          context={{
            kind: "factura",
            label: OVERDUE.number,
            detail: `${OVERDUE.customer} · saldo ${money(saldo)}`,
          }}
          onClose={() => setOpen(false)}
          onExpand={() => setOpen(false)}
          footer={
            <>
              <span className="mr-auto text-micro text-muted">
                Vencida desde el {shortDate(OVERDUE.due)}.
              </span>
              <Button role="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button role="primary" onClick={() => setOpen(false)}>
                Registrar pago
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <FormSection title="el pago" columns={2}>
              <Field
                label="Monto"
                hint="Por omisión, el saldo entero. Un monto menor deja la factura con saldo."
                required
              >
                <NumberInput
                  value={monto}
                  onChange={setMonto}
                  unit="Bs."
                  min={0}
                  step={0.01}
                />
              </Field>
              <Field label="Fecha de pago" required>
                <DatePicker value={fecha} onChange={setFecha} />
              </Field>
            </FormSection>

            <FormSection title="cómo pagó">
              <Field label="Método">
                <SegmentedControl
                  value={metodo}
                  onChange={setMetodo}
                  options={PAYMENT_METHODS}
                />
              </Field>
              <Field
                label="Referencia"
                hint="El número de la transferencia, del QR o del cheque. Escribilo como figura en el extracto."
              >
                <TextInput
                  value={referencia}
                  onChange={setReferencia}
                  placeholder="p. ej. 0048213377"
                />
              </Field>
              <Switch checked={recibo} onChange={setRecibo}>
                Mandar el recibo por correo al cliente
              </Switch>
            </FormSection>
          </div>
        </Dialog>
      </>
    );
  },
};

/** **En el teléfono, el mismo diálogo es una hoja que sube desde abajo.** A todo el ancho,
 *  con las esquinas de arriba redondeadas y como mucho el 90 % del alto: el pie —donde está
 *  «Registrar pago»— queda bajo el pulgar, y la franja de velo de arriba sigue mostrando la
 *  factura y la sigue cerrando. El cuerpo scrollea adentro; el foco, Escape y el velo son
 *  los mismos. Elegí «Teléfono» en la barra de tamaños para verlo así. */
export const RegistrarPagoEnElTelefono: Story = {
  ...RegistrarPago,
  name: "Registrar pago · en el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
};

/** **El error dice QUÉ hacer, no que algo está mal.** Un descuento de 120 % no se
 *  «rechaza»: se explica el rango y se repite lo que se escribió. */
export const ConError: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    const [descuento, setDescuento] = useState<number | "">(120);
    const line = POSTED.lines[0]!;
    const fuera = descuento !== "" && (descuento < 0 || descuento > 100);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Aplicar descuento…</Button>
        <Dialog
          open={open}
          title="Aplicar descuento"
          context={{
            kind: "línea",
            label: line.product,
            detail: `${line.quantity} × ${money(line.unitPrice)}`,
          }}
          width="sm"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button role="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button role="primary" disabled={fuera} onClick={() => setOpen(false)}>
                Aplicar
              </Button>
            </>
          }
        >
          <Field
            label="Descuento"
            hint="Se aplica sobre el precio unitario de esta línea."
            error={fuera ? `Tiene que estar entre 0 y 100. Pusiste ${descuento}.` : undefined}
            required
          >
            <NumberInput value={descuento} onChange={setDescuento} unit="%" step={5} />
          </Field>
        </Dialog>
      </>
    );
  },
};

/** **Confirmar lo que no se deshace.** Anular una factura la anula ante Impuestos
 *  Nacionales. El botón que destruye es `danger` y el foco arranca en «Volver»: un Enter
 *  apurado nunca anula. Sin motivo no se puede confirmar, y el motivo es lo que pide el SIN.
 */
export const AnularFactura: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    const [motivo, setMotivo] = useState("");
    const [nota, setNota] = useState("");

    return (
      <>
        <Button role="danger" onClick={() => setOpen(true)}>
          Anular factura…
        </Button>
        <Dialog
          open={open}
          title={`Anular ${POSTED.number}`}
          subtitle="La factura queda anulada ante Impuestos Nacionales y no se puede volver a publicar. El saldo del cliente se ajusta solo."
          context={{
            kind: "factura",
            label: POSTED.customer,
            detail: `NIT ${POSTED.taxId} · ${money(subtotalOf(POSTED))}`,
          }}
          width="sm"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button role="ghost" autoFocus onClick={() => setOpen(false)}>
                Volver
              </Button>
              <Button role="danger" disabled={motivo === ""} onClick={() => setOpen(false)}>
                Anular factura
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Motivo de anulación" required>
              <Select
                value={motivo}
                onChange={setMotivo}
                options={VOID_REASONS}
                placeholder="elegí uno…"
              />
            </Field>
            <Field label="Nota interna" hint="Queda en el historial de la factura.">
              <TextArea value={nota} onChange={setNota} rows={2} />
            </Field>
          </div>
        </Dialog>
      </>
    );
  },
};

const STEP_IDS = ["proveedor", "condiciones", "revisar"] as const;
type StepId = (typeof STEP_IDS)[number];

/** **Un wizard, y sólo porque una respuesta cambia las preguntas siguientes.** Si la compra
 *  es local, el paso 2 pide el plazo de pago; si es una importación, pide moneda e
 *  incoterm. El paso 2 no se puede dibujar hasta contestar el 1. Los pasos hechos se
 *  pueden tocar para revisarlos; los que faltan, no. */
export const NuevaOrdenDeCompra: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    const [paso, setPaso] = useState<StepId>("proveedor");
    const [tipo, setTipo] = useState("local");
    const [proveedor, setProveedor] = useState<string | null>(null);
    const [plazo, setPlazo] = useState("");
    const [moneda, setMoneda] = useState("USD");
    const [incoterm, setIncoterm] = useState<string | null>(null);
    const [almacen, setAlmacen] = useState("EA");

    const opciones = SUPPLIERS.filter((s) => s.kind === tipo).map((s) => ({
      value: s.id,
      label: s.name,
      description: `${s.kind === "local" ? "NIT" : "Tax ID"} ${s.taxId} · ${s.city}`,
    }));
    const elegido = SUPPLIERS.find((s) => s.id === proveedor);
    const importa = tipo === "import";

    const PASOS = [
      {
        id: "proveedor",
        label: "Proveedor",
        blocked: elegido === undefined ? "Elegí un proveedor para poder seguir." : undefined,
      },
      {
        id: "condiciones",
        label: "Condiciones",
        blocked: importa
          ? incoterm === null
            ? "Elegí el incoterm: sin él no se sabe quién paga el flete."
            : undefined
          : plazo === ""
            ? "Elegí el plazo de pago."
            : undefined,
      },
      { id: "revisar", label: "Revisar" },
    ];
    const i = STEP_IDS.indexOf(paso);
    const ultimo = i === STEP_IDS.length - 1;

    return (
      <>
        <Button role="primary" onClick={() => setOpen(true)}>
          Nueva orden de compra…
        </Button>
        <Dialog
          open={open}
          title="Nueva orden de compra"
          context={{ kind: "compras", label: "Almacén central — El Alto" }}
          width="lg"
          onClose={() => setOpen(false)}
          onExpand={() => setOpen(false)}
        >
          <Wizard
            steps={PASOS}
            current={paso}
            onStepChange={(id) => setPaso(id as StepId)}
            onCancel={() => setOpen(false)}
            onBack={() => setPaso(STEP_IDS[Math.max(0, i - 1)]!)}
            onNext={() => (ultimo ? setOpen(false) : setPaso(STEP_IDS[i + 1]!))}
            nextLabel={ultimo ? "Crear orden de compra" : undefined}
          >
            {paso === "proveedor" ? (
              <FormSection>
                <Field
                  label="Tipo de compra"
                  hint="Esto decide qué condiciones vas a tener que llenar después."
                >
                  <SegmentedControl
                    value={tipo}
                    onChange={(next) => {
                      setTipo(next);
                      setProveedor(null);
                    }}
                    options={PURCHASE_KIND_OPTIONS}
                  />
                </Field>
                <Field label="Proveedor" required>
                  <ComboBox
                    value={proveedor}
                    onChange={setProveedor}
                    options={opciones}
                    placeholder="escribí el nombre o el NIT…"
                  />
                </Field>
              </FormSection>
            ) : paso === "condiciones" ? (
              <FormSection>
                {importa ? (
                  <>
                    <Field label="Moneda">
                      <SegmentedControl
                        value={moneda}
                        onChange={setMoneda}
                        options={CURRENCIES}
                      />
                    </Field>
                    <Field label="Incoterm" required>
                      <RadioGroup
                        value={incoterm}
                        onChange={setIncoterm}
                        options={INCOTERMS}
                      />
                    </Field>
                  </>
                ) : (
                  <Field label="Plazo de pago" required>
                    <Select
                      value={plazo}
                      onChange={setPlazo}
                      options={PAYMENT_TERMS}
                      placeholder="elegí uno…"
                    />
                  </Field>
                )}
                <Field label="Almacén de destino">
                  <Select value={almacen} onChange={setAlmacen} options={WAREHOUSES} />
                </Field>
              </FormSection>
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-meta">
                <dt className="text-muted">Proveedor</dt>
                <dd className="text-ink">{elegido?.name ?? "—"}</dd>
                <dt className="text-muted">Tipo</dt>
                <dd className="text-ink">{importa ? "Importación" : "Compra local"}</dd>
                {importa ? (
                  <>
                    <dt className="text-muted">Moneda · incoterm</dt>
                    <dd className="text-ink">
                      {moneda} · {incoterm ?? "—"}
                    </dd>
                  </>
                ) : (
                  <>
                    <dt className="text-muted">Plazo de pago</dt>
                    <dd className="text-ink">
                      {PAYMENT_TERMS.find((p) => p.value === plazo)?.label ?? "—"}
                    </dd>
                  </>
                )}
                <dt className="text-muted">Almacén</dt>
                <dd className="text-ink">
                  {WAREHOUSES.find((w) => w.value === almacen)?.label}
                </dd>
              </dl>
            )}
          </Wizard>
        </Dialog>
      </>
    );
  },
};
