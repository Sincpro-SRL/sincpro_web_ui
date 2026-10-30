import {
  type ChoiceOption,
  ComboBox,
  Field,
  FormModeProvider,
  RadioGroup,
  SearchField,
  SegmentedControl,
  Slider,
  Switch,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarDays, CalendarRange, Clock } from "lucide-react";
import { useState } from "react";

/**
 * Context: **elegir, en un ERP.** Uno entre muchos escribiendo (`ComboBox`: el cliente, el
 * producto), uno entre pocos a la vista (`RadioGroup`, `SegmentedControl`), prender o apagar
 * algo que tiene efecto ya (`Switch`) y un número en un rango (`Slider`). El valor es siempre
 * un dato plano —un `string`, un `number`, un `boolean`—, lo que guarda el backend.
 */
const meta: Meta = {
  title: "2 · Primitivas/Elecciones",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`ComboBox`, `RadioGroup`, `Switch`, `Slider`, `SegmentedControl` y `SearchField`, sobre React Aria. Escritos directo dentro de `Field`, toman del campo su rótulo, la ayuda y el error.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-box border border-line bg-surface p-4">
      {children}
    </div>
  );
}

const CLIENTES: readonly ChoiceOption[] = [
  {
    value: "c-101",
    label: "Distribuidora Andina S.R.L.",
    description: "NIT 1023456028 · La Paz",
  },
  {
    value: "c-102",
    label: "Ferretería El Álamo",
    description: "NIT 4567891013 · Cochabamba",
  },
  { value: "c-103", label: "José Mamani Quispe", description: "CI 6012345 · El Alto" },
  {
    value: "c-104",
    label: "Importadora Oriente S.A.",
    description: "NIT 3012456017 · Santa Cruz",
  },
  { value: "c-105", label: "Librería Nuestra Señora", description: "NIT 2034567011 · Sucre" },
  {
    value: "c-106",
    label: "Constructora Illimani (bloqueado)",
    description: "Tiene facturas vencidas",
    disabled: true,
  },
];

const MONEDAS: readonly ChoiceOption[] = [
  { value: "BOB", label: "Boliviano (Bs)" },
  { value: "USD", label: "Dólar estadounidense (US$)" },
  { value: "EUR", label: "Euro (€)" },
];

const PAGOS: readonly ChoiceOption[] = [
  { value: "efectivo", label: "Efectivo", description: "Se registra en la caja del día." },
  {
    value: "transferencia",
    label: "Transferencia bancaria",
    description: "Queda pendiente hasta conciliar el extracto.",
  },
  { value: "qr", label: "QR", description: "Se confirma solo cuando el banco avisa." },
  {
    value: "credito",
    label: "Crédito a 30 días",
    description: "Requiere límite de crédito aprobado.",
    disabled: true,
  },
];

const PERIODOS = [
  { value: "dia", label: "Día", icon: Clock },
  { value: "semana", label: "Semana", icon: CalendarDays },
  { value: "mes", label: "Mes", icon: CalendarRange },
] as const;

/** **En un formulario.** Una venta: cada control dentro de su `Field`, sin cableado. */
export const EnUnFormulario: Story = {
  render: function Render() {
    const [cliente, setCliente] = useState<string | null>("c-103");
    const [moneda, setMoneda] = useState<string | null>("BOB");
    const [pago, setPago] = useState<string | null>("efectivo");
    const [descuento, setDescuento] = useState(0.05);
    const [enviar, setEnviar] = useState(true);
    return (
      <Box>
        <Field label="Cliente" required hint="Escribí parte del nombre o del NIT.">
          <ComboBox
            value={cliente}
            onChange={setCliente}
            options={CLIENTES}
            placeholder="Elegí un cliente"
          />
        </Field>
        <Field
          label="Moneda"
          error={moneda === null ? "Elegí la moneda de la factura." : undefined}
        >
          <ComboBox value={moneda} onChange={setMoneda} options={MONEDAS} />
        </Field>
        <Field label="Método de pago">
          <RadioGroup value={pago} onChange={setPago} options={PAGOS} />
        </Field>
        <Field label="Descuento" hint="Hasta 20 %, de a medio punto.">
          <Slider
            value={descuento}
            onChange={setDescuento}
            min={0}
            max={0.2}
            step={0.005}
            format={{ style: "percent", maximumFractionDigits: 1 }}
          />
        </Field>
        <Field label="Notificación">
          <Switch checked={enviar} onChange={setEnviar}>
            Enviar la factura por correo al confirmar
          </Switch>
        </Field>
        <p className="text-micro text-muted tabular-nums">
          valor: {JSON.stringify({ cliente, moneda, pago, descuento, enviar })}
        </p>
      </Box>
    );
  },
};

/** **En modo lectura.** En una venta que se está mirando, cada elección es un dato: se
 *  dibuja el nombre de la opción, no su clave. */
export const Lectura: Story = {
  render: () => (
    <Box>
      <FormModeProvider value="read">
        <Field label="Cliente">
          <ComboBox value="c-101" options={CLIENTES} />
        </Field>
        <Field label="Moneda">
          <ComboBox value={null} options={MONEDAS} />
        </Field>
        <Field label="Método de pago">
          <RadioGroup value="qr" options={PAGOS} />
        </Field>
        <Field label="Descuento">
          <Slider
            value={0.125}
            min={0}
            max={0.2}
            format={{ style: "percent", maximumFractionDigits: 1 }}
          />
        </Field>
        <Field label="Notificación">
          <Switch checked={false}>Enviar la factura por correo al confirmar</Switch>
        </Field>
        <Field label="Tipo de contacto">
          <SegmentedControl
            value="empresa"
            options={[
              { value: "persona", label: "Persona" },
              { value: "empresa", label: "Empresa" },
            ]}
          />
        </Field>
      </FormModeProvider>
    </Box>
  ),
};

/** **Cambiar de período.** `SegmentedControl` dibuja lo mismo que el selector de vista de la
 *  lista. Fuera de un `Field` es un control de VISTA: no pasa a texto en modo lectura. */
export const Periodo: Story = {
  render: function Render() {
    const [periodo, setPeriodo] = useState("semana");
    const [vista, setVista] = useState("mes");
    return (
      <Box>
        <div className="flex items-center justify-between gap-3">
          <span className="text-body font-medium text-ink">Ventas por período</span>
          <SegmentedControl
            aria-label="Período"
            size="sm"
            value={periodo}
            onChange={setPeriodo}
            options={PERIODOS}
          />
        </div>
        <SegmentedControl
          aria-label="Agrupar por"
          value={vista}
          onChange={setVista}
          options={[
            { value: "dia", label: "Día" },
            { value: "semana", label: "Semana" },
            { value: "mes", label: "Mes" },
            { value: "trimestre", label: "Trimestre" },
          ]}
        />
        <p className="text-micro text-muted">
          período: {periodo} · agrupar por: {vista}
        </p>
      </Box>
    );
  },
};

/** **Pocas y en fila.** Con opciones de una palabra y ancho de sobra, el `RadioGroup` va
 *  horizontal. */
export const RadiosEnFila: Story = {
  render: function Render() {
    const [moneda, setMoneda] = useState<string | null>("BOB");
    return (
      <Box>
        <Field label="Moneda de la cotización">
          <RadioGroup
            orientation="horizontal"
            value={moneda}
            onChange={setMoneda}
            options={[
              { value: "BOB", label: "Bs" },
              { value: "USD", label: "US$" },
              { value: "EUR", label: "€" },
            ]}
          />
        </Field>
      </Box>
    );
  },
};

/** **Ajustes que tienen efecto ya.** Un `Switch` por línea, cada uno con la frase que dice
 *  qué pasa al prenderlo; uno deshabilitado. */
export const Ajustes: Story = {
  render: function Render() {
    const [archivados, setArchivados] = useState(false);
    const [totales, setTotales] = useState(true);
    return (
      <Box>
        <Switch checked={archivados} onChange={setArchivados}>
          Mostrar clientes archivados
        </Switch>
        <Switch checked={totales} onChange={setTotales}>
          Mostrar totales al pie de la lista
        </Switch>
        <Switch checked disabled>
          Numeración automática de facturas (la define el administrador)
        </Switch>
      </Box>
    );
  },
};

/** **Buscar.** El campo simple: un texto, la cruz para borrarlo y Enter para buscar. Para
 *  armar criterios sobre una lista está `SearchBar`. */
export const Buscar: Story = {
  render: function Render() {
    const [texto, setTexto] = useState("factura");
    const [buscado, setBuscado] = useState<string | null>(null);
    return (
      <Box>
        <Field label="Buscar en los ajustes">
          <SearchField
            value={texto}
            onChange={setTexto}
            onSubmit={setBuscado}
            placeholder="Escribí y apretá Enter"
          />
        </Field>
        <p className="text-micro text-muted">
          buscado: {buscado === null ? "—" : `«${buscado}»`}
        </p>
      </Box>
    );
  },
};
