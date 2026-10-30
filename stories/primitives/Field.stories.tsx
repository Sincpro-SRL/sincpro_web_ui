import {
  Button,
  Checkbox,
  CheckList,
  DataField,
  DateValue,
  DensityProvider,
  DropZone,
  Field,
  FormActions,
  type FormMode,
  FormModeProvider,
  FormSection,
  IconButton,
  NumberInput,
  SegmentedControl,
  Select,
  Sheet,
  SheetGroup,
  SheetGroups,
  Suggest,
  Switch,
  Tag,
  TextArea,
  TextInput,
  UserChip,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  CASH_ACCOUNTS,
  CITIES,
  CURRENCIES,
  CUSTOMER_KINDS,
  PAYMENT_TERMS,
  PRODUCT_CATEGORIES,
  SALE_WAREHOUSES,
  UNITS,
  WAREHOUSES,
} from "../support/erp-forms";

/**
 * Context: **los controles con los que se escribe un formulario**, todos sobre React Aria.
 * Escritos directo dentro de `Field`, toman del campo su rótulo, la ayuda y el error; fuera
 * de un campo se nombran con `aria-label`. Cada uno sabe dibujarse como dato en modo
 * lectura, y los números se escriben y se leen en el idioma de la copia (`es-BO`:
 * «1.234,56»), no en el del navegador.
 */
const meta: Meta = {
  title: "2 · Primitivas/Controles de formulario",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Veinte controles crudos en seis archivos, ninguno con rótulo asociado ni `aria-describedby`, todos de 24 px. Un `label` sin `htmlFor` no agranda el área de clic, y una ayuda sin enlazar es una que un lector de pantalla nunca lee. Hoy son todos de React Aria y se cablean solos dentro de `Field`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function Card({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={`${wide ? "max-w-4xl" : "max-w-2xl"} rounded-box border border-line bg-surface p-4`}
    >
      {children}
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <figcaption className="text-micro font-medium text-muted">{children}</figcaption>;
}

/** El alta de un cliente: un control de cada clase, todos en un mismo formulario. */
function AltaDeCliente() {
  const [razonSocial, setRazonSocial] = useState(
    "Importadora y Exportadora del Oriente Ltda.",
  );
  const [nit, setNit] = useState("3214569870");
  const [tipo, setTipo] = useState("empresa");
  const [ciudad, setCiudad] = useState("Santa Cruz de la Sierra");
  const [plazo, setPlazo] = useState("30");
  const [limite, setLimite] = useState<number | "">(25000);
  const [notas, setNotas] = useState("");
  const [bloquear, setBloquear] = useState(true);

  return (
    <FormSection
      title="Nuevo cliente"
      hint="Cada control con su rótulo asociado y su ayuda enlazada."
    >
      <Field label="Razón social" hint="Tal como figura en el NIT." required>
        <TextInput value={razonSocial} onChange={setRazonSocial} />
      </Field>

      <Field label="NIT" hint="Sin guiones ni espacios." required>
        <TextInput value={nit} onChange={setNit} mono spellCheck={false} />
      </Field>

      <Field
        label="Tipo"
        hint="Dos opciones y con lugar: se muestran. Esconderlas obliga a abrir para saber qué se puede elegir."
      >
        <SegmentedControl value={tipo} onChange={setTipo} options={CUSTOMER_KINDS} />
      </Field>

      <Field label="Ciudad" hint="Elegí una o escribí otra.">
        <Suggest value={ciudad} onChange={setCiudad} suggestions={CITIES} />
      </Field>

      <Field label="Plazo de pago" hint="Lo propone cada factura nueva de este cliente.">
        <Select value={plazo} onChange={setPlazo} options={PAYMENT_TERMS} />
      </Field>

      <Field label="Límite de crédito" hint="Lo que puede deber entre todas sus facturas.">
        <NumberInput
          value={limite}
          onChange={setLimite}
          min={0}
          step={100}
          format={{ style: "currency", currency: "BOB" }}
        />
      </Field>

      <Field label="Notas" hint="Las ve quien atiende al cliente, no el cliente.">
        <TextArea
          value={notas}
          onChange={setNotas}
          placeholder="horario de entrega, a quién llamar…"
        />
      </Field>

      <Switch checked={bloquear} onChange={setBloquear}>
        Bloquear ventas nuevas si supera el límite
      </Switch>

      <FormActions
        aside="El cliente queda activo al guardar."
        secondary={<Button role="ghost">Cancelar</Button>}
        primary={<Button role="primary">Guardar cliente</Button>}
      />
    </FormSection>
  );
}

export const Todos_los_controles: Story = {
  render: () => (
    <Card>
      <AltaDeCliente />
    </Card>
  ),
};

/** **El control adentro, sin cableado.** Escrito directo dentro de `Field`, el control toma
 *  del campo su `id`, el rótulo que lo nombra, la ayuda y el error que lo describen, y si
 *  está en error. Es la forma de escribir un formulario: un campo es una línea, no tres de
 *  cableado que alguien se puede olvidar — y olvidarse de `describedBy` es un error que un
 *  lector de pantalla nunca lee.
 *
 *  La render prop `{(aria) => …}` sigue existiendo para un control que no es del sistema.
 *  Una prop explícita en el control siempre le gana al campo. */
export const Directo: Story = {
  render: function Render() {
    const [cliente, setCliente] = useState("");
    const [plazo, setPlazo] = useState<number | "">(30);
    const [moneda, setMoneda] = useState("BOB");
    return (
      <Card>
        <div className="flex flex-col gap-4">
          <Field
            label="Cliente"
            required
            error={cliente === "" ? "Escribí la razón social con la que factura." : undefined}
          >
            <TextInput value={cliente} onChange={setCliente} />
          </Field>
          <Field label="Plazo de pago" hint="En días desde la fecha de la factura.">
            <NumberInput value={plazo} min={0} onChange={setPlazo} unit="días" />
          </Field>
          <Field label="Moneda">
            <Select value={moneda} onChange={setMoneda} options={CURRENCIES} />
          </Field>
        </div>
      </Card>
    );
  },
};

/** El error dice QUÉ hacer, no que algo está mal — el que se equivocó ya sabe que se
 *  equivocó; lo que no sabe es qué poner. Y nunca es SÓLO color: lleva ícono y texto,
 *  porque un borde rojo es invisible para quien no distingue el rojo y también para quien
 *  está mirando otra parte de la pantalla. */
export const ConError: Story = {
  render: function Render() {
    const [monto, setMonto] = useState<number | "">(5000);
    const [banco, setBanco] = useState("");
    const saldo = 4520;
    return (
      <Card>
        <div className="flex flex-col gap-4">
          <Field
            label="Monto del pago"
            hint="Lo que entró a la cuenta, no lo que dice la factura."
            error={
              monto !== "" && monto > saldo
                ? "No puede superar el saldo de la factura FAC/2026/0118: Bs 4.520,00."
                : undefined
            }
            required
          >
            <NumberInput
              value={monto}
              onChange={setMonto}
              min={0}
              format={{ style: "currency", currency: "BOB" }}
            />
          </Field>
          <Field
            label="Banco"
            error={banco === "" ? "Elegí el banco donde entró el pago." : undefined}
            required
          >
            <Select
              value={banco}
              onChange={setBanco}
              placeholder="Elegí un banco…"
              options={[
                { value: "bmsc", label: "Banco Mercantil Santa Cruz" },
                { value: "bnb", label: "Banco Nacional de Bolivia" },
                { value: "union", label: "Banco Unión" },
              ]}
            />
          </Field>
        </div>
      </Card>
    );
  },
};

/** **Los números se escriben como se leen acá.** «1.234,56» es mil doscientos treinta y
 *  cuatro con cincuenta y seis en Bolivia; un `<input type="number">` no lo entendía. El
 *  campo escribe y lee en el idioma de la copia, `format` decide si es moneda, porcentaje o
 *  un número con unidad, y las flechas (del teclado o del campo) suben y bajan de a `step`.
 *  Al salir del campo el valor se ajusta a `min`/`max`. Abajo, el `number` que recibe la
 *  aplicación: nunca un texto. */
export const Numeros: Story = {
  render: function Render() {
    const [precio, setPrecio] = useState<number | "">(1234.56);
    const [descuento, setDescuento] = useState<number | "">(0.1);
    const [cantidad, setCantidad] = useState<number | "">(12);
    const [peso, setPeso] = useState<number | "">("");
    return (
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Precio unitario" required>
            <NumberInput
              value={precio}
              onChange={setPrecio}
              min={0}
              format={{ style: "currency", currency: "BOB" }}
            />
          </Field>
          <Field label="Descuento" hint="Sobre el precio de lista.">
            <NumberInput
              value={descuento}
              onChange={setDescuento}
              min={0}
              max={1}
              step={0.01}
              format={{ style: "percent" }}
            />
          </Field>
          <Field label="Cantidad">
            <NumberInput value={cantidad} onChange={setCantidad} min={1} step={1} unit="u." />
          </Field>
          <Field label="Peso bruto" hint="Vacío si el producto es un servicio.">
            <NumberInput
              value={peso}
              onChange={setPeso}
              min={0}
              unit="kg"
              placeholder="sin peso"
            />
          </Field>
        </div>
        <p className="mt-4 text-micro text-muted">
          lo que recibe la aplicación:{" "}
          <code data-testid="valores" className="font-mono text-ink">
            {JSON.stringify({ precio, descuento, cantidad, peso })}
          </code>
        </p>
      </Card>
    );
  },
};

/** El mismo formulario en las dos densidades. En compacta la ayuda pasa al `title` del
 *  rótulo — pero el error se sigue dibujando siempre. */
export const LasDosDensidades: Story = {
  render: () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-2">
        <h3 className="text-lead font-medium text-ink">cómoda</h3>
        <div className="rounded-box border border-line bg-surface p-4">
          <AltaDeCliente />
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-lead font-medium text-ink">compacta</h3>
        <div className="rounded-box border border-line bg-surface p-4">
          <DensityProvider value="compact">
            <AltaDeCliente />
          </DensityProvider>
        </div>
      </section>
    </div>
  ),
};

/**
 * **La misma ficha, mirada y editada.**
 *
 * Es el mismo árbol de componentes: lo único que cambia es el `FormModeProvider` de arriba.
 * En lectura los controles NO se apagan — se convierten en el dato. Un `<input disabled>`
 * sigue dibujando la caja y el borde de algo donde se escribe, y una ficha entera así son
 * doce cajas vacías de sentido.
 *
 * Apretá **Editar** y fijate que no se mueve nada de lugar: el rótulo está en la misma
 * vertical en los dos modos, que es lo que permite ir y volver sin que la pantalla se
 * reacomode.
 */
export const MirarYEditar: Story = {
  render: function Render() {
    const [modo, setModo] = useState<FormMode>("read");
    const [nombre, setNombre] = useState("Licencia de usuario adicional — Odoo Enterprise");
    const [codigo, setCodigo] = useState("LIC-ODOO-USR");
    const [unidad, setUnidad] = useState("licencia");
    const [categoria, setCategoria] = useState("licencias");
    const [precio, setPrecio] = useState<number | "">(350);
    const [costo, setCosto] = useState<number | "">(212.4);
    const [minimo, setMinimo] = useState<number | "">(0);
    const [almacen, setAlmacen] = useState("LPZ");
    const [vendible, setVendible] = useState(true);
    const [descripcion, setDescripcion] = useState(
      "Una licencia por usuario activo y por mes.\nSe factura junto con el soporte mensual.",
    );

    return (
      <div className="flex flex-col gap-5 bg-ground p-8">
        <div className="flex items-center gap-3">
          <Button
            role={modo === "read" ? "primary" : "secondary"}
            onClick={() => setModo(modo === "read" ? "edit" : "read")}
          >
            {modo === "read" ? "Editar" : "Dejar de editar"}
          </Button>
          <span className="text-micro text-muted">
            modo: {modo === "read" ? "lectura" : "edición"}
          </span>
        </div>

        <div className="max-w-4xl rounded-box border border-line bg-surface p-6">
          <FormModeProvider value={modo}>
            <div className="flex flex-col gap-6">
              <FormSection
                title="Producto"
                hint="Cómo se vende y cómo aparece en la factura."
                columns={2}
                actions={
                  modo === "edit" ? (
                    <IconButton
                      icon={Sparkles}
                      label="Sugerir la categoría por el nombre"
                      size="sm"
                      tone="action"
                    />
                  ) : undefined
                }
              >
                <Field label="Nombre" layout="inline" required>
                  <TextInput value={nombre} onChange={setNombre} />
                </Field>
                <Field label="Código interno" layout="inline" hint="El que se escanea.">
                  <TextInput value={codigo} onChange={setCodigo} mono spellCheck={false} />
                </Field>
                <Field label="Unidad" layout="inline">
                  <Suggest value={unidad} onChange={setUnidad} suggestions={UNITS} />
                </Field>
                <Field label="Categoría" layout="inline" required>
                  <Select
                    value={categoria}
                    onChange={setCategoria}
                    options={PRODUCT_CATEGORIES}
                  />
                </Field>
              </FormSection>

              <FormSection
                title="Precio y stock"
                hint="El precio incluye el IVA; el costo no."
                columns={2}
              >
                <Field label="Precio de venta" layout="inline" required>
                  <NumberInput
                    value={precio}
                    onChange={setPrecio}
                    min={0}
                    format={{ style: "currency", currency: "BOB" }}
                  />
                </Field>
                <Field label="Costo" layout="inline">
                  <NumberInput
                    value={costo}
                    onChange={setCosto}
                    min={0}
                    format={{ style: "currency", currency: "BOB" }}
                  />
                </Field>
                <Field label="Stock mínimo" layout="inline" hint="Debajo de esto avisa.">
                  <NumberInput value={minimo} onChange={setMinimo} min={0} unit="u." />
                </Field>
                <Field label="Almacén" layout="inline">
                  <Select value={almacen} onChange={setAlmacen} options={WAREHOUSES} />
                </Field>
                <Field label="Se puede vender" layout="inline">
                  <Switch checked={vendible} onChange={setVendible}>
                    aparece en cotizaciones y facturas
                  </Switch>
                </Field>
                <Field label="Descripción de venta" layout="inline">
                  <TextArea value={descripcion} onChange={setDescripcion} />
                </Field>
              </FormSection>

              {/* Los datos que NUNCA se editan van con `DataField` y no con un control
                  apagado: quién lo creó y cuándo no son campos. */}
              <FormSection title="Historia" columns={2}>
                <DataField
                  label="Creado por"
                  layout="inline"
                  value={<UserChip name="Josefa Muñoz" size="sm" />}
                />
                <DataField
                  label="Creado"
                  layout="inline"
                  value={<DateValue when="2026-03-02T14:21:00Z" format="exact" />}
                />
                <DataField label="Stock disponible" layout="inline" value="1.552 u." />
                <DataField
                  label="Estado"
                  layout="inline"
                  value={<Tag tone="good">activo</Tag>}
                />
                <DataField
                  label="Última compra"
                  layout="inline"
                  value={null}
                  hint="Es un servicio: no se compra."
                />
              </FormSection>

              {modo === "edit" ? (
                <FormActions
                  aside="El precio nuevo vale para las cotizaciones que se hagan desde ahora."
                  secondary={<Button onClick={() => setModo("read")}>Cancelar</Button>}
                  primary={
                    <Button role="primary" onClick={() => setModo("read")}>
                      Guardar producto
                    </Button>
                  }
                />
              ) : null}
            </div>
          </FormModeProvider>
        </div>
      </div>
    );
  },
};

/**
 * **Rótulo a la izquierda o arriba.** No es gusto: es ancho.
 *
 * En línea todos los valores arrancan en la misma vertical, así que el ojo baja por una
 * columna en vez de rebotar — y veinte campos entran en la mitad del alto. Necesita ancho:
 * en un cajón angosto el rótulo se come el campo, y ahí va apilado.
 *
 * Un botón puede colgar del campo (`action`) y otro de la sección (`actions`). Lo de abajo,
 * en cambio, cierra el formulario ENTERO — mezclarlos hace dudar de qué guarda qué.
 */
export const DosDisposiciones: Story = {
  render: function Render() {
    const [a, setA] = useState("Pago de factura FAC/2026/0118 — Distribuidora Andina");
    const [b, setB] = useState("Pago de factura FAC/2026/0118 — Distribuidora Andina");
    return (
      <div className="grid gap-6 bg-ground p-8 md:grid-cols-2">
        <figure className="flex flex-col gap-2">
          <Caption>apilado · el angosto</Caption>
          <div className="rounded-box border border-line bg-surface p-4">
            <Field label="Glosa del asiento" hint="La lee el contador en el libro diario.">
              <TextInput value={a} onChange={setA} />
            </Field>
          </div>
        </figure>
        <figure className="flex flex-col gap-2">
          <Caption>en línea · con ancho, y con un botón del campo</Caption>
          <div className="rounded-box border border-line bg-surface p-4">
            <Field
              label="Glosa del asiento"
              layout="inline"
              hint="La lee el contador en el libro diario."
              action={
                <IconButton
                  icon={Trash2}
                  label="Limpiar"
                  size="sm"
                  onClick={() => setB("")}
                />
              }
            >
              <TextInput value={b} onChange={setB} />
            </Field>
          </div>
        </figure>
      </div>
    );
  },
};

function EdicionEnLaHoja() {
  const [mode, setMode] = useState<FormMode>("read");
  const [plazo, setPlazo] = useState<number | "">(30);
  const [referencia, setReferencia] = useState("OC-2026-0457");
  const [moneda, setMoneda] = useState("BOB");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <p className="text-micro text-muted">los mismos grupos, mirar o escribir</p>
        <Button
          role="ghost"
          size="sm"
          onClick={() => setMode((m) => (m === "read" ? "edit" : "read"))}
        >
          {mode === "read" ? "editar" : "sólo lectura"}
        </Button>
      </div>
      <FormModeProvider value={mode}>
        <Sheet layout="horizontal">
          <SheetGroups columns={2}>
            <SheetGroup title="Condiciones" hint="Lo que se acordó con el cliente.">
              <Field label="Plazo" hint="Días desde la emisión.">
                <NumberInput value={plazo} onChange={setPlazo} min={0} unit="días" />
              </Field>
              <Field label="Moneda">
                <Select value={moneda} onChange={setMoneda} options={CURRENCIES} />
              </Field>
            </SheetGroup>
            <SheetGroup>
              <Field label="Orden de compra">
                <TextInput value={referencia} onChange={setReferencia} mono />
              </Field>
            </SheetGroup>
          </SheetGroups>
        </Sheet>
      </FormModeProvider>
    </div>
  );
}

/** La hoja del registro —la cabecera de una factura—: dos geometrías, y grupos en columnas. */
export const Hoja: Story = {
  render: () => (
    <div className="flex max-w-4xl flex-col gap-8">
      <figure className="flex flex-col gap-2">
        <Caption>stacked · el rótulo arriba</Caption>
        <div className="rounded-box border border-line bg-surface p-6">
          <Sheet
            columns={2}
            layout="stacked"
            fields={[
              {
                label: "Número",
                value: "FAC/2026/0118",
                mono: true,
                hint: "Lo asigna el sistema al publicar.",
              },
              {
                label: "Emitida",
                value: <DateValue when="2026-10-22T10:13:00" format="exact" />,
                hint: "Fecha y hora de la emisión fiscal.",
              },
              { label: "Total", value: "Bs 18.920,00", hint: "IVA incluido." },
              { label: "Estado", value: <Tag tone="bad">vencida</Tag> },
            ]}
          />
        </div>
      </figure>
      <figure className="flex flex-col gap-2">
        <Caption>horizontal · el rótulo a la izquierda</Caption>
        <div className="rounded-box border border-line bg-surface p-6">
          <Sheet
            columns={2}
            layout="horizontal"
            fields={[
              {
                label: "Número",
                value: "FAC/2026/0118",
                mono: true,
                hint: "Lo asigna el sistema al publicar.",
              },
              {
                label: "Emitida",
                value: <DateValue when="2026-10-22T10:13:00" format="exact" />,
                hint: "Fecha y hora de la emisión fiscal.",
              },
              { label: "Total", value: "Bs 18.920,00" },
              { label: "Estado", value: <Tag tone="bad">vencida</Tag> },
            ]}
          />
        </div>
      </figure>
      <figure className="flex flex-col gap-2">
        <Caption>grupos en la hoja · título opcional</Caption>
        <div className="flex flex-col gap-6 rounded-box border border-line bg-surface p-6">
          <div className="flex flex-col gap-2">
            <p className="text-micro text-muted">sin título — la raya es el grupo</p>
            <Sheet layout="horizontal">
              <SheetGroups columns={2}>
                <SheetGroup>
                  <DataField label="Cliente" value="Distribuidora Andina S.R.L." />
                  <DataField label="NIT" value="1028457021" mono />
                  <DataField label="Vendedor" value="Carla Rojas" />
                </SheetGroup>
                <SheetGroup>
                  <DataField label="Vence" value="21/11/2026" />
                </SheetGroup>
              </SheetGroups>
            </Sheet>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-micro text-muted">
              con título en una columna, sin título en la otra
            </p>
            <Sheet layout="horizontal">
              <SheetGroups columns={2}>
                <SheetGroup title="Cliente" hint="A quién se le factura.">
                  <DataField
                    label="Razón social"
                    value="Distribuidora Andina S.R.L."
                    hint="Tal como figura en el NIT."
                  />
                  <DataField label="NIT" value="1028457021" mono />
                  <DataField label="Ciudad" value="La Paz" />
                </SheetGroup>
                <SheetGroup>
                  <DataField label="Vence" value="21/11/2026" />
                </SheetGroup>
              </SheetGroups>
            </Sheet>
          </div>
          <EdicionEnLaHoja />
        </div>
      </figure>
    </div>
  ),
};

/** **Varias respuestas a la vista.** Un `Checkbox` es una respuesta que espera al guardar —
 *  no un `Switch`, que cambia algo ya—; a medias (`mixed`) es el padre de un grupo donde
 *  sólo algunos están prendidos, y apretarlo los prende TODOS. `CheckList` es lo que una
 *  pila de checks no puede: cada fila con su nombre y qué es, y un solo paso de Tab — las
 *  flechas se mueven, Espacio marca. El código de cuenta va en `mono` porque lo escribió la
 *  máquina; el nombre, no. */
export const Seleccion: Story = {
  render: function Render() {
    const [cuentas, setCuentas] = useState<string[]>(["1.1.1.01", "1.1.2.01"]);
    const [almacenes, setAlmacenes] = useState<string[]>(["LPZ"]);
    const [enviar, setEnviar] = useState(true);
    const todos = almacenes.length === SALE_WAREHOUSES.length;
    return (
      <div className="flex max-w-md flex-col gap-5">
        <Checkbox
          checked={enviar}
          onChange={setEnviar}
          label="Enviar la factura por correo al publicarla"
        />
        <div className="flex flex-col gap-2">
          <Checkbox
            checked={todos}
            mixed={!todos && almacenes.length > 0}
            onChange={(next) => setAlmacenes(next ? SALE_WAREHOUSES.map((w) => w.value) : [])}
            label="Vender desde todos los almacenes"
          />
          <div className="flex flex-col gap-2 pl-6">
            {SALE_WAREHOUSES.map((w) => (
              <Checkbox
                key={w.value}
                checked={almacenes.includes(w.value)}
                onChange={(next) =>
                  setAlmacenes(
                    next ? [...almacenes, w.value] : almacenes.filter((v) => v !== w.value),
                  )
                }
                label={w.label}
              />
            ))}
          </div>
        </div>
        <CheckList
          mono
          label="Cuentas que entran al flujo de caja"
          emptyLabel="ninguna"
          value={cuentas}
          onChange={setCuentas}
          items={CASH_ACCOUNTS}
        />
        <p className="text-micro text-muted">
          elegidas:{" "}
          <code data-testid="cuentas" className="font-mono text-ink">
            {cuentas.join(", ")}
          </code>
        </p>
      </div>
    );
  },
};

/** Arrastrar o elegir un archivo: el XML de la factura de un proveedor. Vive en un diálogo,
 *  no encima de la lista. */
export const ZonaDeArchivo: Story = {
  render: () => (
    <div className="max-w-md rounded-box border border-line bg-surface p-4">
      <DropZone accept=".xml,application/xml" onFile={() => {}} onCancel={() => {}} />
    </div>
  ),
};
