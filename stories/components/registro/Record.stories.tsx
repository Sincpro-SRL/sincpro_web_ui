import {
  Breadcrumb,
  DensityProvider,
  Line,
  Pager,
  SmartButton,
  SmartButtons,
  type Stage,
  StatusBar,
  type StatusDisplay,
  type StatusLook,
  SurfaceProvider,
  Tabs,
  TabsPanel,
  TabsScope,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Circle,
  CircleCheck,
  CircleDot,
  FileText,
  History,
  Info,
  ListOrdered,
  Package,
  PackageCheck,
  Receipt,
  RotateCcw,
  Sparkles,
  Target,
  TriangleAlert,
  Trophy,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { ORDER_STAGES as STAGES } from "../../support/erp-lists";

/**
 * Context: acá van las PIEZAS del registro, cada una sola y con sus estados. El
 * registro armado vive en `4 · Vistas/Registro/Completo`, y en un solo lugar: dos
 * pantallas que muestran lo mismo son la garantía de que una se queda atrás.
 */

const CRUMBS = [
  { label: "Ventas", onClick: () => {} },
  { label: "Pedidos", onClick: () => {} },
  { label: "S00142" },
];

/** El caso que rompía la banda: tres tramos de cincuenta caracteres y dos
 *  intermedios que nadie necesita leer enteros. */
const RASTRO_LARGO = [
  { label: "Ventas", onClick: () => {} },
  {
    label: "Importadora y Exportadora del Oriente Boliviano Ltda.",
    onClick: () => {},
  },
  { label: "pedidos", onClick: () => {} },
  { label: "S00142 · Importadora y Exportadora del Oriente Boliviano Ltda." },
];

const ASPECTS = [
  { id: "lineas", label: "líneas", icon: ListOrdered },
  { id: "entregas", label: "entregas", icon: Truck, count: 2 },
  { id: "facturas", label: "facturas", icon: Receipt, count: 1 },
  { id: "otra", label: "otra información", icon: Info },
  { id: "devoluciones", label: "devoluciones", icon: RotateCcw, count: 0 },
];

/* Las mismas caras, con lo que PIDE atención. El contador y la notificación
   conviven porque contestan cosas distintas: «entregas 3 · 1» son tres entregas,
   una de ellas atrasada. */
const ASPECTS_CON_AVISOS = [
  { id: "lineas", label: "líneas", icon: ListOrdered },
  {
    id: "entregas",
    label: "entregas",
    icon: Truck,
    count: 3,
    notice: { label: "1 entrega atrasada", count: 1 },
  },
  {
    id: "facturas",
    label: "facturas",
    icon: Receipt,
    count: 0,
    notice: { label: "la factura no se pudo emitir" },
  },
  {
    id: "historial",
    label: "historial",
    icon: History,
    count: 8,
    notice: { label: "3 eventos nuevos", count: 3, tone: "accent" as const },
  },
];

const meta = {
  title: "3 · Componentes/Registro/Riel, estado y contadores",
  component: StatusBar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Las piezas que arman la cabecera de un registro, cada una sola. El registro entero está en `4 · Vistas/Registro/Completo`.",
      },
    },
  },
} satisfies Meta<typeof StatusBar>;

export default meta;
type Story = StoryObj<typeof meta>;

function Box({
  label,
  chrome = false,
  children,
}: {
  label: string;
  chrome?: boolean;
  children: React.ReactNode;
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="font-mono text-micro tracking-[0.1em] text-muted uppercase">
        {label}
      </figcaption>
      <div
        className={`rounded-box p-4 ${chrome ? "bg-chrome" : "border border-line bg-surface"}`}
      >
        {chrome ? <SurfaceProvider value="chrome">{children}</SurfaceProvider> : children}
      </div>
    </figure>
  );
}

/* An invoice's stages, for the forms side by side: the traditional style takes one of each,
   the modern another (`ViewStyleProvider`). */
const INVOICE_STAGES: Stage[] = [
  { id: "draft", label: "Borrador" },
  { id: "posted", label: "Publicada" },
  { id: "paid", label: "Pagada" },
];

const LOOKS: { look: StatusLook; name: string; note: string }[] = [
  { look: "track", name: "Pista", note: "la de Odoo — la del estilo tradicional" },
  {
    look: "segmented",
    name: "Segmentada",
    note: "la del estilo moderno: una píldora de píldoras",
  },
  { look: "progress", name: "Progreso", note: "cuánto falta, de un vistazo" },
  { look: "steps", name: "Pasos", note: "puntos unidos por una línea" },
  { look: "pill", name: "Ficha", note: "una sola, para donde no hay lugar" },
];

function Row({
  name,
  note,
  children,
}: {
  name: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line py-3">
      <div className="w-56 shrink-0">
        <p className="text-meta font-semibold text-ink">{name}</p>
        <p className="text-micro text-muted">{note}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * **Las dos preguntas del estado, y por eso son dos piezas.**
 *
 * `StatusBar` contesta *¿en qué va?* — las etapas como tramos de UN riel: lo hecho
 * en tinta y con su tilde, la etapa actual como el único tramo LLENO, lo que viene
 * apagado. `Timeline` contesta *¿qué pasó para llegar acá?*. Muchos registros sólo
 * tienen una: un producto no tiene etapas, y una cotización recién creada no
 * tiene historia.
 */
export const Estado: Story = {
  args: { stages: STAGES, current: "sale" },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Box label="¿en qué va? · sobre el lienzo">
        <StatusBar stages={STAGES} current="sale" />
      </Box>
      <Box label="sobre el chrome, que es donde vive" chrome>
        <StatusBar stages={STAGES} current="sale" surface="chrome" />
      </Box>
      <Box label="cuando falló, la etapa actual se pinta en peligro y lleva su marca">
        <StatusBar stages={STAGES} current="sale" failed />
      </Box>
      <Box label="fallada, sobre el chrome" chrome>
        <StatusBar stages={STAGES} current="sale" failed surface="chrome" />
      </Box>
    </div>
  ),
};

/** En angosto la barra se APILA, y se ven las cuatro etapas igual. No se pliega
 *  detrás de un chevron: un estado que hay que abrir para ver deja de contestar
 *  «¿en qué anda esto?», que es la única pregunta que tiene. Lo que cambia es la
 *  dirección —de izquierda a derecha, a de arriba hacia abajo—; las pinturas son
 *  las mismas que acostada. */
export const EstadoApilado: Story = {
  args: { stages: STAGES, current: "sale" },
  render: () => (
    <div className="flex flex-wrap items-start gap-6 bg-ground p-8">
      <Box label="apilada · en un cajón">
        <div className="max-w-[22rem]">
          <StatusBarCompacta />
        </div>
      </Box>
      <Box label="apilada · sobre el cromo" chrome>
        <div className="max-w-[22rem]">
          <StatusBar stages={STAGES} current="sale" surface="chrome" layout="stacked" />
        </div>
      </Box>
      <Box label="apilada · fallada">
        <div className="max-w-[22rem]">
          <StatusBar stages={STAGES} current="sale" failed layout="stacked" />
        </div>
      </Box>
    </div>
  ),
};

/** La densidad la declara la SUPERFICIE; acá se fuerza para poder mostrarla. */
function StatusBarCompacta() {
  return (
    <DensityProvider value="compact">
      <StatusBar stages={STAGES} current="sale" />
    </DensityProvider>
  );
}

/** Con `onSelect` las etapas son un grupo de radios: se elige UNA, y con las
 *  flechas se pasa de una a otra. No avanza nada —una etapa no se cambia
 *  apretándola—: es elegir de qué etapa se está hablando, que es lo que hace falta
 *  cuando la lista de al lado está agrupada por etapa.
 *
 *  La pintura del riel no cambia: la etapa actual sigue siendo el único tramo
 *  lleno. Lo que se suma es el realce al pasar por encima y un SUBRAYADO debajo de
 *  la etapa elegida — una marca de otra clase, que puede caer sobre cualquier
 *  etapa, la actual incluida, sin pelearse con el relleno. Elegí «pedido de
 *  venta» para verlo sobre la actual. */
export const EstadoElegible: Story = {
  args: { stages: STAGES, current: "sale" },
  render: () => {
    const [elegida, setElegida] = useState("sent");
    return (
      <div className="flex flex-col gap-6 bg-ground p-8">
        <Box label="acostada · elegible">
          <StatusBar
            stages={STAGES}
            current="sale"
            selected={elegida}
            onSelect={setElegida}
          />
        </Box>
        <Box label="acostada · elegible · sobre el cromo" chrome>
          <StatusBar
            stages={STAGES}
            current="sale"
            surface="chrome"
            selected={elegida}
            onSelect={setElegida}
          />
        </Box>
        <div className="flex flex-wrap items-start gap-6">
          <Box label="apilada · elegible">
            <div className="w-[16rem]">
              <StatusBar
                stages={STAGES}
                current="sale"
                layout="stacked"
                selected={elegida}
                onSelect={setElegida}
              />
            </div>
          </Box>
          <Box label="apilada · elegible · sobre el cromo" chrome>
            <div className="w-[16rem]">
              <StatusBar
                stages={STAGES}
                current="sale"
                layout="stacked"
                surface="chrome"
                selected={elegida}
                onSelect={setElegida}
              />
            </div>
          </Box>
        </div>
        <p className="max-w-prose text-meta text-muted">
          En qué anda el pedido es{" "}
          <strong className="font-medium text-ink">pedido de venta</strong>; de qué etapa
          estoy hablando es{" "}
          <strong className="font-medium text-ink">
            {STAGES.find((stage) => stage.id === elegida)?.label}
          </strong>
          . Son dos cosas y por eso son dos props.
        </p>
      </div>
    );
  },
};

/**
 * **La barra de estado, en sus cuatro formas** — la misma factura publicada, y la misma
 * anulada en el SIAT (`failed`). La de abajo de cada una se puede ELEGIR: no avanza la factura,
 * elige de qué etapa se habla.
 */
export const EstadoEnCuatroFormas: Story = {
  name: "Estado · las formas",
  args: { stages: STAGES, current: "sale" },
  render: function Render() {
    const [viewed, setViewed] = useState("posted");
    return (
      <div className="max-w-4xl bg-ground p-8">
        {LOOKS.map(({ look, name, note }) => (
          <Row key={look} name={name} note={note}>
            <StatusBar stages={INVOICE_STAGES} current="posted" look={look} layout="trail" />
            <StatusBar
              stages={INVOICE_STAGES}
              current="posted"
              look={look}
              layout="trail"
              failed
            />
            <StatusBar
              stages={INVOICE_STAGES}
              current="posted"
              look={look}
              layout="trail"
              selected={viewed}
              onSelect={setViewed}
            />
          </Row>
        ))}
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Every form says where the record is, to a screen reader too.
    await expect(canvas.getAllByRole("list", { name: "Estado" }).length).toBeGreaterThan(0);
    await expect(canvas.getAllByRole("status", { name: /Estado: Publicada/ }).length).toBe(2);
    // The chip that unfolds says what it shows: its name holds the stage and the position.
    await expect(
      canvas.getByRole("button", { name: "Estado: Publicada 2/3" }),
    ).toBeInTheDocument();
  },
};

/* La historia del registro ya NO vive en el riel: lo que le pasó a un registro
   se lee en la actividad, a la derecha o debajo (`3 · Componentes/Actividad`). Tenerla
   también acá arriba eran dos lugares para una cosa, y el de arriba obligaba a
   desplegar algo ENCIMA del registro para leerlo. */

/**
 * **La forma segmentada y lo que muestra cada etapa** — `( Borrador | Publicada | Pagada )`, la
 * forma de la píldora de acciones. Con `display` cada etapa muestra su ícono y su nombre
 * (`both`), sólo el nombre (`label`), sólo el ícono (`icon` — el nombre se dice al lector de
 * pantalla y al pasar el mouse) o los íconos y el nombre de la actual (`current`). `activeIcon`
 * es el ícono de la etapa cuando es la actual o la elegida (○ → ◉), y `renderStage` dibuja una
 * etapa a tu manera dentro del segmento del sistema, que sigue poniendo el orden, el color, el
 * foco y los nombres.
 */
export const EstadoSegmentado: Story = {
  name: "Estado · segmentado, íconos y lo que muestra",
  args: { stages: STAGES, current: "sale" },
  render: function Render() {
    const [viewed, setViewed] = useState("review");
    const flow: Stage[] = [
      { id: "draft", label: "Borrador", icon: Circle, activeIcon: CircleDot },
      { id: "review", label: "En revisión", icon: Circle, activeIcon: CircleDot },
      { id: "signed", label: "Firmado", icon: Circle, activeIcon: CircleCheck },
    ];
    const DISPLAYS: { display: StatusDisplay; name: string; note: string }[] = [
      {
        display: "auto",
        name: "Automático",
        note: 'display="auto" — en el teléfono, la actual',
      },
      { display: "both", name: "Ícono y nombre", note: 'display="both" — siempre' },
      { display: "label", name: "Sólo nombres", note: 'display="label"' },
      { display: "icon", name: "Sólo íconos", note: 'display="icon" — el nombre al pasar' },
      { display: "current", name: "El nombre de la actual", note: 'display="current"' },
    ];
    return (
      <div className="max-w-4xl bg-ground p-8">
        {DISPLAYS.map(({ display, name, note }) => (
          <Row key={display} name={name} note={note}>
            <StatusBar
              stages={flow}
              current="review"
              look="segmented"
              display={display}
              layout="trail"
            />
          </Row>
        ))}
        <Row name="Elegible" note="la elegida también usa su activeIcon">
          <StatusBar
            stages={flow}
            current="review"
            look="segmented"
            layout="trail"
            selected={viewed}
            onSelect={setViewed}
          />
        </Row>
        <Row name="A tu manera" note="renderStage: cuánto lleva en cada etapa">
          <StatusBar
            stages={flow}
            current="review"
            look="segmented"
            layout="trail"
            renderStage={(stage, { step }) => (
              <>
                <span>{stage.label}</span>
                {step === "current" ? (
                  <span className="rounded-pill bg-surface/20 px-1.5 text-micro">3 días</span>
                ) : null}
              </>
            )}
          />
        </Row>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const lists = canvas.getAllByRole("list", { name: "Estado" });
    // Only icons: the names are still SAID, one per stage.
    const icons = lists[3]!;
    await expect(within(icons).getByText("En revisión")).toHaveClass("sr-only");
    // The current one's name: seen on the current stage, said on the others.
    const current = lists[4]!;
    await expect(within(current).getByText("En revisión")).not.toHaveClass("sr-only");
    await expect(within(current).getByText("Borrador")).toHaveClass("sr-only");
    // Choosing keeps working in the pill.
    const chooser = canvas.getByRole("radiogroup", { name: "Estado" });
    await userEvent.click(within(chooser).getByRole("radio", { name: /Firmado/ }));
    await expect(within(chooser).getByRole("radio", { name: /Firmado/ })).toBeChecked();
  },
};

/**
 * **El estado en el teléfono** — `display="auto"`, el de siempre: donde hay lugar cada etapa
 * dice su nombre; en el teléfono, sólo la actual, y las otras su ícono o su número. Los nombres
 * se le siguen diciendo al lector de pantalla. Cuatro nombres no entran en el ancho de un
 * teléfono; cuatro marcas y un nombre, sí.
 */
export const EstadoEnElTelefono: Story = {
  name: "Estado · en el teléfono",
  args: { stages: STAGES, current: "sale" },
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => (
    <div className="flex flex-col gap-4 bg-ground p-4">
      <StatusBar
        stages={[
          { id: "draft", label: "Borrador" },
          { id: "posted", label: "Publicada" },
          { id: "sent", label: "Enviada al SIAT" },
          { id: "paid", label: "Pagada" },
        ]}
        current="posted"
        look="segmented"
        layout="trail"
      />
      <StatusBar
        stages={[
          { id: "ready", label: "Preparado", icon: Package },
          { id: "transit", label: "En camino", icon: Truck },
          { id: "delivered", label: "Entregado", icon: PackageCheck },
        ]}
        current="transit"
        layout="trail"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(window.innerWidth).toBe(390);
    const [numbers, icons] = canvas.getAllByRole("list", { name: "Estado" });
    // The current stage says its name; the others are said, not seen.
    await expect(within(numbers!).getByText("Publicada")).toBeVisible();
    await expect(getComputedStyle(within(numbers!).getByText("Borrador")).position).toBe(
      "absolute",
    );
    await expect(within(numbers!).getByText("4")).toBeVisible();
    await expect(getComputedStyle(within(icons!).getByText("Entregado")).position).toBe(
      "absolute",
    );
    // Everything fits the phone's width.
    await expect(numbers!.getBoundingClientRect().right).toBeLessThanOrEqual(390);
  },
};

/**
 * **Cada etapa con su ícono, su explicación y su cantidad** — la pista de Odoo, con lo que una
 * aplicación le quiera agregar: `icon` antes del nombre (en la que falló, la alerta toma su
 * lugar), `hint` al pasar el mouse, y `count` — en una lista agrupada por etapa, cuántos hay en
 * cada una. Los mismos datos los dibujan las cuatro formas.
 */
export const EstadoConIconos: Story = {
  name: "Estado · con íconos y cantidades",
  args: { stages: STAGES, current: "sale" },
  render: function Render() {
    const [viewed, setViewed] = useState("transit");
    const shipping: Stage[] = [
      {
        id: "ready",
        label: "Preparado",
        icon: Package,
        hint: "Embalado, esperando al camión",
      },
      { id: "transit", label: "En camino", icon: Truck, hint: "Salió del almacén" },
      {
        id: "delivered",
        label: "Entregado",
        icon: PackageCheck,
        hint: "Firmado por el cliente",
      },
    ];
    const pipeline: Stage[] = [
      { id: "new", label: "Nuevas", icon: Sparkles, count: 12 },
      { id: "qualified", label: "Calificadas", icon: Target, count: 7 },
      { id: "proposal", label: "Propuesta", icon: FileText, count: 3 },
      { id: "won", label: "Ganadas", icon: Trophy, count: 0 },
    ];
    return (
      <div className="max-w-4xl bg-ground p-8">
        <Row name="Un registro" note="el ícono de cada etapa">
          <StatusBar stages={shipping} current="transit" layout="trail" />
          <StatusBar stages={shipping} current="transit" layout="trail" failed />
        </Row>
        <Row name="Una lista agrupada" note="cuántos hay en cada etapa — elegible">
          <StatusBar
            stages={pipeline}
            current="new"
            layout="trail"
            selected={viewed}
            onSelect={setViewed}
          />
        </Row>
        <Row name="Las otras formas" note="los mismos datos">
          <StatusBar stages={shipping} current="transit" layout="trail" look="progress" />
          <StatusBar stages={shipping} current="transit" layout="trail" look="pill" />
        </Row>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The hint is said when the stage is pointed at.
    await expect(canvas.getAllByTitle("Salió del almacén").length).toBeGreaterThan(0);
    // The counts are part of what the stage says.
    const pipeline = canvas.getByRole("radiogroup", { name: "Estado" });
    await expect(
      within(pipeline).getByRole("radio", { name: /Calificadas\s*7/ }),
    ).toBeVisible();
    await userEvent.click(within(pipeline).getByRole("radio", { name: /Propuesta/ }));
    await expect(within(pipeline).getByRole("radio", { name: /Propuesta/ })).toBeChecked();
  },
};

/** Los contadores que LLEVAN a otro lado. Un cero se dibuja apagado y sin clic:
 *  decir que no hay ninguna es información; esconder el contador sería otra cosa.
 *
 *  Dos disposiciones: `apilado` para la hoja, donde hay alto; `linea` para el
 *  riel, donde una caja de dos renglones le impone su altura a toda la fila. */
export const Contadores: Story = {
  args: { stages: STAGES, current: "sale" },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Box label="apilado · en la hoja">
        <SmartButtons>
          <SmartButton icon={Truck} count={2} label="entregas" onClick={() => {}} />
          <SmartButton icon={Receipt} count={1} label="facturas" onClick={() => {}} />
          <SmartButton icon={TriangleAlert} count={2} label="avisos" onClick={() => {}} />
          <SmartButton icon={RotateCcw} count={0} label="devoluciones" />
        </SmartButtons>
      </Box>
      <Box label="línea · en el riel" chrome>
        <SmartButtons>
          <SmartButton
            icon={Truck}
            count={2}
            label="entregas"
            layout="inline"
            surface="chrome"
            onClick={() => {}}
          />
          <SmartButton
            icon={Receipt}
            count={1}
            label="facturas"
            layout="inline"
            surface="chrome"
            onClick={() => {}}
          />
          <SmartButton
            icon={RotateCcw}
            count={0}
            label="devoluciones"
            layout="inline"
            surface="chrome"
          />
        </SmartButtons>
      </Box>
    </div>
  ),
};

/** Dónde estoy y en cuál de ochenta voy. El paginador NO es una paginación: dice
 *  que puedo pasar al siguiente sin volver a la lista, y se apaga en los
 *  extremos en vez de desaparecer. */
export const DóndeEstoy: Story = {
  /* The same trail is drawn on purpose twice — once per surface — to compare them; on a real
     screen each trail names its own record and the landmarks differ. */
  parameters: { a11y: { config: { rules: [{ id: "landmark-unique", enabled: false }] } } },
  args: { stages: STAGES, current: "sale" },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Box label="migas y paginador, sobre el cromo" chrome>
        <Line
          start={<Breadcrumb crumbs={CRUMBS} surface="chrome" />}
          end={
            <Pager
              index={12}
              total={80}
              onPrev={() => {}}
              onNext={() => {}}
              surface="chrome"
            />
          }
        />
      </Box>
      {/* Cada miga pide `--container-crumb` y no más, así que un nombre de
          cincuenta caracteres se recorta adentro de su lugar en vez de comerse
          la banda. Y con más de tres tramos, los del medio se pliegan en un «…»
          que sigue siendo navegable: lo que nunca se pliega es la raíz —a donde
          se vuelve— ni dónde estoy. */}
      <Box label="un rastro largo: se recorta y se pliega" chrome>
        <Line
          start={<Breadcrumb crumbs={RASTRO_LARGO} surface="chrome" />}
          center={
            <SmartButtons>
              <SmartButton
                icon={Truck}
                count={3}
                label="entregas"
                layout="inline"
                surface="chrome"
                onClick={() => {}}
              />
              <SmartButton
                icon={Receipt}
                count={2}
                label="facturas"
                layout="inline"
                surface="chrome"
                onClick={() => {}}
              />
            </SmartButtons>
          }
          end={
            <Pager
              index={12}
              total={80}
              onPrev={() => {}}
              onNext={() => {}}
              surface="chrome"
            />
          }
        />
      </Box>
      {/* La jerarquía se lee en el TONO: lo de atrás apagado y apretable, dónde
          estoy en tinta. Igual en las dos superficies. */}
      <Box label="migas sobre el lienzo">
        <div className="flex flex-col gap-3">
          <Breadcrumb crumbs={CRUMBS} />
          <Breadcrumb crumbs={RASTRO_LARGO} />
        </div>
      </Box>
      <Box label="en los extremos">
        <div className="flex flex-wrap items-center gap-6">
          <Pager index={1} total={80} onNext={() => {}} />
          <Pager index={80} total={80} onPrev={() => {}} />
        </div>
      </Box>
    </div>
  ),
};

/**
 * **El paginador**: quieto (el tradicional) o como una píldora azul translúcida (el moderno),
 * que se lee como el par de las migas en la línea. Los dos responden a Alt+P y Alt+N.
 */
export const Paginador: Story = {
  args: { stages: STAGES, current: "sale" },
  render: function Render() {
    const [at, setAt] = useState(12);
    const move = { onPrev: () => setAt((n) => n - 1), onNext: () => setAt((n) => n + 1) };
    return (
      <div className="max-w-4xl bg-ground p-8">
        <Row name="Quieto" note="el tradicional">
          <Pager index={at} total={80} {...move} />
        </Row>
        <Row name="Píldora" note="el moderno — Alt+P / Alt+N">
          <Pager index={at} total={80} look="pill" keys={false} {...move} />
        </Row>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.keyboard("{Alt>}n{/Alt}");
    await expect(await canvas.findAllByText("13 / 80")).toHaveLength(2);
  },
};

/** Las caras del recurso: elegir una NAVEGA y no abre otra pestaña, porque no es
 *  un objeto nuevo. La actual es una pestaña de carpeta sobre la línea — no un
 *  subrayado: dice qué página está abierta.
 *
 *  Cada cara lleva su ícono —con cinco pestañas es lo que se reconoce sin leer—
 *  y su contador, donde el cero se dibuja apagado: «no hay ninguna» es una
 *  respuesta, y esconderla obliga a abrir la pestaña para averiguarla. */
export const Caras: Story = {
  args: { stages: STAGES, current: "sale" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const open = () => canvas.getByRole("tab", { selected: true });
    /* One tab stop, and each tab says which panel it opens. */
    await expect(open()).toHaveAttribute("tabindex", "0");
    await expect(canvas.getByRole("tabpanel")).toHaveAttribute(
      "id",
      open().getAttribute("aria-controls"),
    );
    /* ← / → move AND open, wrapping; Home and End go to the ends. */
    open().focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(open()).toHaveTextContent("entregas");
    await expect(open()).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    await expect(open()).toHaveTextContent("devoluciones");
    await userEvent.keyboard("{Home}");
    await expect(open()).toHaveTextContent("líneas");
    await expect(canvas.getByRole("tabpanel")).toHaveTextContent("página «lineas»");
  },
  render: () => {
    const [cara, setCara] = useState("lineas");
    return (
      <div className="bg-ground p-8">
        <div className="overflow-hidden rounded-box border border-line bg-surface">
          <div className="px-4 pt-3.5 pb-2 text-title font-semibold text-ink">
            S00142 · Importadora y Exportadora del Oriente Boliviano Ltda.
          </div>
          {/* The strip and its page in one notebook: each tab points at the panel it opens. */}
          <TabsScope>
            <div className="border-b border-line-strong px-4">
              <Tabs tabs={ASPECTS} current={cara} onSelect={setCara} />
            </div>
            <TabsPanel id={cara} className="px-4 py-4 text-meta text-muted">
              página «{cara}»
            </TabsPanel>
          </TabsScope>
        </div>
      </div>
    );
  },
};

/** **El contador y la notificación son dos cosas.** El contador dice cuántas
 *  cosas hay detrás y es neutro; la notificación dice que algo de ahí PIDE que
 *  lo mires, y por eso tiene color y por eso un cero no dibuja nada —«facturas 0»
 *  no tiene nada que pedir, pero la factura sí puede haber rebotado—.
 *
 *  Sin número es un punto, que es lo que se pone cuando llegó algo y contarlo no
 *  agrega nada. Y el punto nunca va solo: la palabra viaja en el `title` y en el
 *  nombre accesible de la pestaña, como en `StatusDot` — un color sin su palabra
 *  obliga a aprender una leyenda que no está escrita en ningún lado. */
export const CarasConAvisos: Story = {
  args: { stages: STAGES, current: "sale" },
  render: () => {
    const [cara, setCara] = useState("lineas");
    return (
      <div className="flex flex-col gap-4 bg-ground p-8">
        <div className="overflow-hidden rounded-box border border-line bg-surface">
          <div className="px-4 pt-3.5 pb-2 text-title font-semibold text-ink">
            S00142 · Importadora y Exportadora del Oriente Boliviano Ltda.
          </div>
          {/* The strip and its page in one notebook: each tab points at the panel it opens. */}
          <TabsScope>
            <div className="border-b border-line-strong px-4">
              <Tabs tabs={ASPECTS_CON_AVISOS} current={cara} onSelect={setCara} />
            </div>
            <TabsPanel id={cara} className="px-4 py-4 text-meta text-muted">
              página «{cara}»
            </TabsPanel>
          </TabsScope>
        </div>
        <p className="max-w-prose text-meta text-muted">
          «entregas 3 · 1» son tres entregas y una que pide algo. «facturas 0 ⬤» no tiene
          ninguna y aun así falló: la factura rebotó. «historial 8 · 3» tiene ocho eventos y
          tres nuevos — en otro tono, porque llegar no es fallar.
        </p>
      </div>
    );
  },
};
