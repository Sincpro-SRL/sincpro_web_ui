import {
  at,
  CriteriaBuilder,
  type CriteriaPath,
  Dialog,
  filterCriteria,
  grainName,
  GroupingLevels,
  type GroupLevel,
  hasNamed,
  type ModelDefinition,
  SearchBar,
  type SearchCriteria,
  toggleNamed,
  useGroupingControl,
  whereOf,
  withLevels,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";

const FACETAS = [
  { id: "number", label: "número" },
  { id: "customer", label: "cliente" },
  { id: "salesperson", label: "vendedor" },
];

const FILTROS = [
  {
    options: [
      { id: "draft", label: "sólo borradores" },
      { id: "posted", label: "sólo publicadas", checked: true },
      { id: "overdue", label: "sólo vencidas" },
    ],
  },
  {
    options: [
      { id: "grande", label: "más de Bs. 10.000", checked: true },
      { id: "chico", label: "menos de Bs. 1.000" },
      { id: "sin", label: "sin pagos registrados" },
    ],
  },
];

/** Por qué se puede partir. `invoice_date` declara SUS granos: es una fecha, y
 *  una fecha sin grano parte por instante — un montón por fila, que es no
 *  agrupar. */
const AGRUPABLES = [
  { field: "state", label: "estado" },
  { field: "salesperson", label: "vendedor" },
  {
    field: "invoice_date",
    label: "Fecha de factura",
    grains: ["day", "week", "month", "quarter", "year"] as const,
  },
];

/** Las dos condiciones que los filtros declarados de esta historia usan. */
const ESTADO = (value: string) => ({ field: "state", operator: "=", value });
const TOTAL = (value: number) => ({ field: "amount_total", operator: ">", value });

/** Cómo se lee un nivel: el rótulo del campo y, si es fecha, su grano. El del
 *  campo lo sabe el dominio; el del grano, la copia — el mismo `grainName` que
 *  usa el resto, y no el nombre crudo del corte. */
function nombreDelNivel(level: GroupLevel): string {
  const campo = AGRUPABLES.find((one) => one.field === level.field)?.label ?? level.field;
  return level.grain === undefined
    ? campo
    : `${campo} · ${grainName(level.grain).toLocaleLowerCase()}`;
}

const FAVORITOS = [
  {
    options: [
      { id: "f1", label: "vencidas grandes", hint: "vencida · más de Bs. 10.000" },
      { id: "f2", label: "por cobrar de Carla", hint: "publicada · vendedor Carla Rojas" },
    ],
  },
  { options: [{ id: "nuevo", label: "Guardar la búsqueda actual…" }] },
];

const meta = {
  title: "3 · Componentes/Búsqueda · barra, filtros y agrupador",
  component: SearchBar,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Buscar es preguntar DÓNDE, no sólo qué. Todo lo puesto es una instancia y vive ADENTRO del campo: los niveles de agrupado a la izquierda, encadenados, y los recortes a la derecha con su anidado. Cómo se juntan se lee y se toca —«todas», «cualquiera», «ninguna»— y cada ficha se saca o se abre en el constructor. Odoo lo cuelga de un chevron; acá el disparador es un ícono de filtro con su contador.",
      },
    },
  },
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/* Sin envolver en una copia propia: el castellano del sistema lo instala el
   preview, una vez y para todas las historias. Envolver acá era una tercera
   tabla con las mismas palabras —y ya decía «T{n} {year}» donde el sistema dice
   «T{n} de {year}»—. */
function Caja({ children }: { children: React.ReactNode }) {
  return <div className="rounded-box border border-line bg-surface p-4">{children}</div>;
}

/** Apretá el ícono de filtro y marcá un recorte: aterriza como ficha. Dos
 *  recortes puestos se cruzan con «todas» —se ve, es la palabra del nodo— y quien
 *  quiera «cualquiera» la toca y la cambia ahí mismo. La cruz saca el recorte. */
export const Probar: Story = {
  args: { facets: FACETAS, criteria: [], onCriteriaChange: () => {} },
  render: () => {
    /* UNA SOLA LISTA. Los niveles, los filtros con nombre, los recortes de fecha
       y lo que se escriba a mano son todos instancias: por eso el panel no lleva
       un estado propio de qué está tildado —la marca sale de lo puesto— y la
       barra no lleva tres props distintas. */
    const [criteria, setCriteria] = useState<SearchCriteria[]>([
      filterCriteria(
        { field: "product_names", operator: "contains", value: "licencia" },
        "productos incluye licencia",
      ),
    ]);
    const [constructor, setConstructor] = useState(false);
    const grouping = useGroupingControl({
      levels: [{ field: "state" }, { field: "invoice_date", grain: "month" }],
      onLevelsChange: (levels) =>
        setCriteria((current) => withLevels(current, levels, nombreDelNivel)),
    });

    /* Los filtros que la lista declara, con su condición ya pensada: es lo único
       que los distingue de uno escrito a mano. */
    const DECLARADOS = [
      { id: "posted", label: "sólo publicadas", where: ESTADO("publicada") },
      { id: "overdue", label: "sólo vencidas", where: ESTADO("vencida") },
      { id: "grande", label: "más de Bs. 10.000", where: TOTAL(10000) },
    ];

    const filtros = [
      {
        options: DECLARADOS.map((one) => ({
          id: one.id,
          label: one.label,
          checked: hasNamed(criteria, one.id),
        })),
      },
    ];

    return (
      <Caja>
        <SearchBar
          facets={FACETAS}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          placeholder="buscar una factura, o # para elegir el campo…"
          filters={filtros}
          grouping={<GroupingLevels fields={AGRUPABLES} control={grouping} />}
          favorites={FAVORITOS}
          onOpenBuilder={() => setConstructor(true)}
          onFilterSelect={(id) => {
            const uno = DECLARADOS.find((each) => each.id === id);
            if (uno !== undefined) setCriteria(toggleNamed(criteria, uno));
          }}
        />
        {/* El constructor de criteria, que es donde una pregunta que nadie
            previó se escribe entera — con su árbol y su JSON al lado. Se abre
            desde el pie del panel y desde cualquier instancia puesta. */}
        {constructor ? (
          <Dialog
            open
            width="lg"
            title="Constructor de criteria"
            onClose={() => setConstructor(false)}
          >
            <CriteriaBuilder
              model={MODELO}
              initial={{
                ...(whereOf(criteria) === undefined ? {} : { where: whereOf(criteria)! }),
              }}
              onApply={() => setConstructor(false)}
              onCancel={() => setConstructor(false)}
            />
          </Dialog>
        ) : null}
        <p className="mt-4 max-w-prose text-meta text-muted">
          Todo lo puesto es una instancia: los niveles a la izquierda, los filtros a la
          derecha con su anidado. Escribí <code>#and</code> para abrir un grupo y meter
          adentro lo que sigue; tocá cualquier ficha para abrirla en el constructor.
        </p>
        <p className="mt-2 max-w-prose font-mono text-micro text-muted">
          lo que viaja:{" "}
          <span className="text-ink">{JSON.stringify(whereOf(criteria) ?? null)}</span>
        </p>
      </Caja>
    );
  },
};

/** Sin nada puesto: el disparador está apagado porque no hay nada escondido. */
export const Vacia: Story = {
  args: { facets: FACETAS, criteria: [], onCriteriaChange: () => {} },
  render: () => {
    const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
    const vacio = useGroupingControl();
    return (
      <Caja>
        <SearchBar
          facets={FACETAS}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          placeholder="buscar una factura…"
          filters={FILTROS}
          grouping={<GroupingLevels fields={AGRUPABLES} control={vacio} />}
          favorites={FAVORITOS}
        />
      </Caja>
    );
  },
};

/** En un panel angosto —o en un teléfono— las tres columnas se apilan solas y
 *  el panel queda como una hoja emergente. No hay un segundo componente para
 *  móvil: es el mismo, envuelto. */
export const Angosta: Story = {
  args: { facets: FACETAS, criteria: [], onCriteriaChange: () => {} },
  render: () => {
    const [criteria, setCriteria] = useState<SearchCriteria[]>([
      filterCriteria(
        { field: "customer_name", operator: "like", value: "andina" },
        "cliente: andina",
      ),
      filterCriteria(ESTADO("publicada"), "sólo publicadas"),
    ]);
    const angosto = useGroupingControl({ levels: [{ field: "state" }] });
    return (
      <div style={{ width: 380 }}>
        <Caja>
          <SearchBar
            facets={FACETAS}
            criteria={criteria}
            onCriteriaChange={setCriteria}
            placeholder="buscar…"
            filters={FILTROS}
            grouping={<GroupingLevels fields={AGRUPABLES} control={angosto} />}
            favorites={FAVORITOS}
          />
        </Caja>
      </div>
    );
  },
};

/* ================================================================== *
 *  CON EL MODELO PUESTO: la barra deja de buscar texto y PREGUNTA.
 * ================================================================== */

/** El modelo tal como lo publica el servidor bajo `model_meta_data`: por campo,
 *  de qué tipo es, qué comparaciones acepta, qué valores puede tomar y —si es
 *  relacional— por qué columna se lo identifica. */
const MODELO: ModelDefinition = {
  aggregate: "invoice",
  identity: "id",
  fields: {
    name: { type: "string", nullable: false, sortable: true, ops: ["=", "!=", "like"] },
    amount_total: {
      type: "decimal",
      nullable: false,
      sortable: true,
      ops: ["=", "!=", ">", ">=", "<", "<="],
    },
    invoice_date: {
      type: "date",
      nullable: false,
      sortable: true,
      ops: ["=", ">", ">=", "<", "<="],
    },
    state: {
      type: "string",
      nullable: false,
      sortable: true,
      ops: ["=", "!="],
      choices: ["borrador", "publicada", "pagada", "vencida", "anulada"],
    },
    customer_id: {
      type: "many2one",
      nullable: true,
      sortable: false,
      ops: [],
      kind: "relation",
      relation: "cliente",
      identifiedBy: "customer_name",
    },
    customer_name: { type: "string", nullable: true, sortable: true, ops: ["=", "like"] },
    /* Un valor-objeto no se compara: `ops` vacío, así que la barra no lo ofrece. */
    tax_totals: { type: "json", nullable: true, sortable: false, ops: [], kind: "embedded" },
  },
  translations: {
    name: { default: "Factura" },
    labels: {
      name: { default: "número" },
      amount_total: { default: "total" },
      invoice_date: { default: "fecha" },
      state: { default: "estado" },
      customer_id: { default: "cliente" },
    },
  },
};

/**
 * **Una pregunta son tres pasos, y se pueden escribir en uno.**
 *
 * Probá, en este orden:
 *
 * - `#` → elegir el ATRIBUTO. Lo que sigue es el nombre de un campo y no un
 *   valor: «número» se escribe igual de las dos maneras, y con el numeral no hay
 *   nada que adivinar. Después se elige la comparación, y recién después el
 *   valor.
 * - `andina` → se ofrecen los campos que tienen letras adentro. Los números no:
 *   preguntarle «total contiene andina» a una columna de montos da cero.
 * - `=` → **todos**. Cualquier cosa se compara contra sí misma, así que la
 *   igualdad no discrimina por tipo.
 * - `>` → sólo lo que tiene ORDEN: números y fechas, antes de escribir el primer
 *   dígito. «Mayor que» sobre un texto es una comparación alfabética que nadie
 *   pidió.
 * - `<= 100` → queda un solo campo, con la comparación ya puesta. Lo que se
 *   escribe se LEE: el operador viene adelante y el valor atrás.
 * - `FAC/2026/*` → es un molde y no un texto. Pide lo que EMPIEZA con
 *   `FAC/2026/`, y viaja como `%` porque es lo que entiende el motor.
 * - `númer` → el campo aparece arriba para SEGUIR por él: elegirlo ofrece sus
 *   comparaciones, y recién después el valor.
 * - `cliente` → se busca por la columna que lo nombra, con el rótulo de la
 *   relación. La ficha dice «cliente», no «customer_name».
 *
 * Y en el paso del valor, un `*` convierte la igualdad en «contiene»: «igual a
 * FAC/*» busca un número que termine en asterisco, que no existe.
 *
 * Una ficha hecha se toca por partes: el campo vuelve al paso 1, la comparación
 * al 2, el valor se edita en su lugar.
 */
export const ConModelo: Story = {
  args: { facets: FACETAS, criteria: [], onCriteriaChange: () => {} },
  render: () => {
    const [criteria, setCriteria] = useState<SearchCriteria[]>([
      filterCriteria(
        { field: "amount_total", operator: "<=", value: 1000 },
        "total como mucho 1000",
      ),
      filterCriteria(
        { field: "customer_name", operator: "like", value: "%andina%" },
        "cliente contiene andina",
      ),
    ]);
    /* `null` es cerrado; una ruta vacía es «abierto sin nada marcado». */
    const [abierto, setAbierto] = useState<CriteriaPath | null>(null);
    const puesto = at(criteria, abierto ?? []);
    return (
      <Caja>
        <SearchBar
          facets={FACETAS}
          model={MODELO}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          onOpenBuilder={(path) => setAbierto(path ?? [])}
          placeholder="preguntá algo, o # para elegir el campo…"
        />
        {/* TOCAR UNA INSTANCIA ABRE EL CONSTRUCTOR —el de verdad, con el árbol y
            el JSON al lado— parado sobre ella. Lo que se arma con fichas y lo
            que se escribe en el JSON son el mismo objeto. */}
        {abierto === null ? null : (
          <Dialog open width="lg" title="Editar el recorte" onClose={() => setAbierto(null)}>
            <CriteriaBuilder
              model={MODELO}
              {...(puesto?.kind === "filter" &&
              puesto.where !== undefined &&
              "field" in puesto.where
                ? { focus: puesto.where.field }
                : {})}
              {...(whereOf(criteria) === undefined
                ? {}
                : { initial: { where: whereOf(criteria)! } })}
              onApply={() => setAbierto(null)}
              onCancel={() => setAbierto(null)}
            />
          </Dialog>
        )}
        <p className="mt-4 max-w-prose text-meta text-muted">
          Nada de esto está escrito en la barra: los campos, sus comparaciones, sus valores
          posibles y la columna por la que se busca un relacional salen del modelo. Agregar un
          campo a la factura lo hace aparecer acá, con sus operadores, sin tocar una línea.
        </p>
      </Caja>
    );
  },
};

/* ================================================================== *
 *  LO QUE SI NO SE ABRE, NO SE VE.
 *
 *  El panel y el constructor viven detrás de un clic. Estas dos historias
 *  los dejan en la página: el panel ya abierto, el constructor ya dibujado.
 * ================================================================== */

/** El panel de filtros y agrupado, abierto. «mostrar sólo» cae en la columna
 *  del texto, no en la de la marca, y «agrupar por» arranca a la misma altura. */
export const PanelAbierto: Story = {
  args: { facets: FACETAS, criteria: [], onCriteriaChange: () => {} },
  render: () => {
    const box = useRef<HTMLDivElement>(null);
    const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
    const grouping = useGroupingControl({
      levels: [{ field: "state" }],
      onLevelsChange: (levels) =>
        setCriteria((current) => withLevels(current, levels, nombreDelNivel)),
    });

    useEffect(() => {
      const button = box.current?.querySelector<HTMLButtonElement>("button[aria-expanded]");
      if (button?.getAttribute("aria-expanded") === "false") button.click();
    }, []);

    return (
      <div ref={box} className="min-h-96 rounded-box border border-line bg-surface p-4">
        <SearchBar
          facets={FACETAS}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          placeholder="buscar una factura…"
          filters={[
            {
              label: "mostrar sólo",
              options: [
                { id: "draft", label: "borradores", hint: "todavía no se enviaron al SIN" },
                { id: "posted", label: "publicadas", hint: "emitidas, esperando el pago" },
                { id: "overdue", label: "vencidas", hint: "pasó la fecha y no se pagaron" },
              ],
            },
          ]}
          grouping={<GroupingLevels fields={AGRUPABLES} control={grouping} />}
          onFilterSelect={() => {}}
        />
      </div>
    );
  },
};

/** El constructor, en la página. Las secciones son cortes (palabra y línea),
 *  los controles miden como la barra, y el JSON está al lado. */
export const ElConstructor: Story = {
  args: { facets: FACETAS, criteria: [], onCriteriaChange: () => {} },
  render: () => (
    <div className="max-w-3xl rounded-box border border-line bg-surface">
      <CriteriaBuilder
        model={MODELO}
        initial={{
          where: { field: "state", operator: "=", value: "publicada" },
        }}
        onApply={() => {}}
        onCancel={() => {}}
      />
    </div>
  ),
};
