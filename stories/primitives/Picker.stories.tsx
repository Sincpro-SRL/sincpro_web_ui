import { Field, Picker, type PickerItem, Tag } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Building2, Package, PackageX, Truck, Warehouse, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { CUSTOMER_CARDS } from "../support/erp-people";

/* Products the way a sales line needs to see them: the name, what kind of thing it is, and
   the specs that decide — stock on hand, the price, the unit. The internal code and the
   barcode are searchable but not drawn (`haystack`). */
const PRODUCTOS: PickerItem[] = [
  {
    id: "P-1001",
    name: "Cemento Portland IP-30 — bolsa 50 kg",
    icon: Package,
    meta: "1.240 en stock · Bs. 62,00 / bolsa · Almacén Central",
    tags: <Tag>almacenable</Tag>,
    haystack: "CEM-IP30 7771234000017",
  },
  {
    id: "P-1002",
    name: "Cemento Portland IP-40 — bolsa 50 kg",
    icon: Package,
    meta: "0 en stock · Bs. 68,50 / bolsa · llegan 600 el 04/11",
    tags: <Tag tone="warn">sin stock</Tag>,
    haystack: "CEM-IP40 7771234000024",
  },
  {
    id: "P-1003",
    name: "Fierro corrugado 12 mm × 12 m",
    icon: Package,
    meta: "3.560 en stock · Bs. 74,20 / barra · Almacén El Alto",
    tags: <Tag>almacenable</Tag>,
    haystack: "FIE-12 7771234000031",
  },
  {
    id: "P-1004",
    name: "Fierro corrugado 10 mm × 12 m",
    icon: Package,
    meta: "128 en stock · Bs. 52,80 / barra · Almacén El Alto",
    tags: <Tag>almacenable</Tag>,
    haystack: "FIE-10 7771234000048",
  },
  {
    id: "P-1005",
    name: "Instalación de tablero eléctrico trifásico",
    icon: Wrench,
    meta: "Bs. 1.850,00 / servicio · 2 técnicos disponibles",
    tags: <Tag tone="info">servicio</Tag>,
    haystack: "SRV-TAB3",
  },
  {
    id: "P-1006",
    name: "Flete La Paz — Santa Cruz (camión 10 t)",
    icon: Truck,
    meta: "Bs. 4.200,00 / viaje",
    tags: <Tag tone="info">servicio</Tag>,
    haystack: "FLT-LPZ-SCZ",
  },
  {
    id: "P-1007",
    name: "Ladrillo 6 huecos 24 × 18 × 12",
    icon: Package,
    meta: "48.000 en stock · Bs. 1,15 / unidad · Almacén Central",
    tags: <Tag>almacenable</Tag>,
    haystack: "LAD-6H 7771234000055",
  },
  {
    id: "P-1008",
    name: "Pintura látex blanca — balde 18 L (importada)",
    icon: Package,
    meta: "36 en stock · Bs. 389,00 / balde · Almacén Central",
    tags: <Tag>importado</Tag>,
    haystack: "PIN-LTX-18 7891234000062",
  },
  {
    id: "P-1009",
    name: "Calamina galvanizada N.º 28 × 3,05 m",
    icon: Package,
    meta: "412 en stock · Bs. 96,40 / hoja · Almacén El Alto",
    tags: <Tag>almacenable</Tag>,
    haystack: "CAL-28 7771234000079",
  },
  {
    id: "P-1010",
    name: "Tubo PVC 4″ desagüe × 6 m",
    icon: Package,
    meta: "220 en stock · Bs. 118,00 / tubo · Almacén Central",
    tags: <Tag>almacenable</Tag>,
    haystack: "PVC-4D 7771234000086",
  },
  {
    id: "P-1011",
    name: "Arena fina (m³) — descontinuado",
    icon: PackageX,
    meta: "ya no se vende · último movimiento 12/03/2026",
    tags: <Tag tone="bad">archivado</Tag>,
    haystack: "ARE-FIN",
    disabled: true,
  },
];

const ALMACENES: PickerItem[] = [
  {
    id: "W-CEN",
    name: "Almacén Central — Av. Montes 1240, La Paz",
    icon: Warehouse,
    meta: "4.812 productos · Bs. 2.384.120,50 en inventario",
  },
  {
    id: "W-ALT",
    name: "Almacén El Alto — Zona Senkata",
    icon: Warehouse,
    meta: "1.206 productos · Bs. 918.400,00 en inventario",
  },
  {
    id: "W-SCZ",
    name: "Almacén Santa Cruz — Parque Industrial",
    icon: Warehouse,
    meta: "2.033 productos · Bs. 1.402.775,10 en inventario",
  },
  {
    id: "W-TRA",
    name: "Almacén Central — tránsito",
    icon: Truck,
    meta: "0 productos · sólo para mercadería en camino",
    tags: <Tag>virtual</Tag>,
  },
];

const meta = {
  title: "2 · Primitivas/Relacional a uno/Editar · Picker",
  component: Picker,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Many2one: se escribe en el campo y la lista flota debajo. Un `<option>` es una línea de texto: no admite dos renglones, ni etiquetas, ni un número alineado — así que elegir entre «Cemento IP-30» y «Cemento IP-40» se hacía a ciegas, y la diferencia entre los dos (uno tiene 1.240 bolsas y el otro cero) es justo lo que había que ver. El teclado es el de React Aria: flechas, Enter, Escape.",
      },
    },
  },
} satisfies Meta<typeof Picker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Customers the way an invoice needs to choose one: the face, where they are, what state
   their account is in, and the debt lined up on the right to compare. The NIT is searched,
   not drawn. */
const CLIENTES: PickerItem[] = CUSTOMER_CARDS.map((c) => ({
  id: c.taxId,
  name: c.name,
  avatar: true,
  meta: `${c.city} · ${c.phone}`,
  tags: <Tag tone={c.state.tone}>{c.state.label}</Tag>,
  aside: c.debt,
  haystack: c.taxId,
}));

/** **Personas, con sus widgets, y la búsqueda literal.** Cada cliente con su cara, su ciudad,
 *  el estado de su cuenta y la deuda alineada a la derecha. Lo escrito se MARCA en cada fila
 *  —sin importar tildes ni mayúsculas—, y si una fila está por su NIT (que no se dibuja) lo
 *  dice: «coincide 4587123018». Si nadie se llama así, «Crear «…»» lo crea con ese nombre y
 *  «Crear y editar…» abre su ficha. Elegido, el campo ofrece abrirlo: modal, y «Abrir en…». */
export const PersonasConWidgets: Story = {
  args: { items: CLIENTES },
  render: function Render() {
    const [clientes, setClientes] = useState(CLIENTES);
    const [cliente, setCliente] = useState<string>();
    const [dicho, setDicho] = useState<string | null>(null);
    return (
      <div className="max-w-xl rounded-box border border-line bg-surface p-4">
        <Field label="Cliente">
          <Picker
            items={clientes}
            {...(cliente === undefined ? {} : { value: cliente })}
            onChange={setCliente}
            onCreate={(name) => {
              const id = `nuevo-${clientes.length}`;
              setClientes((all) => [...all, { id, name, avatar: true, meta: "nuevo" }]);
              return id;
            }}
            onCreateAndEdit={(name) =>
              setDicho(`Se abriría la ficha de «${name}» en un modal`)
            }
            onBrowseAll={() => setDicho("Se abriría «Buscar más…»")}
            onOpen={(id, to) => setDicho(`Se abriría ${id} en: ${to}`)}
          />
        </Field>
        {dicho === null ? null : (
          <p role="status" className="mt-2 text-meta text-muted">
            {dicho}
          </p>
        )}
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const field = canvas.getByRole("combobox");
    await userEvent.click(field);
    /* Accents do not matter, and what was typed is marked in the row. */
    await userEvent.type(field, "ferreteria");
    const row = await page.findByRole("option", { name: /Ferretería El Progreso/ });
    await expect(row.querySelector("mark")).toHaveTextContent("Ferretería");
    /* Found by the NIT, which is not drawn: the row says so. */
    await userEvent.clear(field);
    await userEvent.type(field, "4587123");
    await expect(await page.findByText("4587123", { selector: "mark" })).toBeVisible();
    /* Nobody is called that: create it, and it is chosen. */
    await userEvent.clear(field);
    await userEvent.type(field, "Panadería Sucre");
    await userEvent.click(
      await page.findByRole("option", { name: "Crear «Panadería Sucre»" }),
    );
    await waitFor(() => expect(field).toHaveValue("Panadería Sucre"));
    await userEvent.click(canvas.getByRole("button", { name: "Abrir en un modal" }));
    await expect(canvas.getByText(/en: modal$/)).toBeVisible();
  },
};

/** Abierto, con el tope de 8 y el pie que dice cuántos quedan. El campo es el buscador: no
 *  hay una fila extra de «filtrar…». Escribí «7771» y aparece por el código de barras, que
 *  no se dibuja; escribí «ip40» o «cemento» y filtra por nombre. */
export const Probar: Story = {
  args: { items: PRODUCTOS },
  render: function Render() {
    const [producto, setProducto] = useState("P-1001");
    return (
      <div className="max-w-2xl rounded-box border border-line bg-surface p-4">
        <Field
          label="Producto"
          hint="La línea de la orden de venta. El stock y el precio están a la vista para elegir sin abrir la ficha."
          required
        >
          <Picker
            items={PRODUCTOS}
            value={producto}
            onChange={setProducto}
            onOpen={() => {}}
            onBrowseAll={() => {}}
          />
        </Field>
      </div>
    );
  },
};

/** Contra un `<select>` nativo con los mismos datos: la diferencia no es estética, es
 *  cuánta información hay para decidir. */
export const ContraElSelect: Story = {
  args: { items: PRODUCTOS },
  render: function Render() {
    const [producto, setProducto] = useState("P-1002");
    return (
      <div className="grid max-w-5xl gap-5 sm:grid-cols-2">
        <div className="rounded-box border border-line bg-surface p-4">
          <Field label="Con <select>" hint="Una línea por opción. Nada más entra.">
            {({ id }) => (
              <select
                id={id}
                className="h-(--size-control-md) w-full rounded-control border border-line-strong bg-surface px-2.5 text-meta text-ink"
                defaultValue="P-1002"
              >
                {PRODUCTOS.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className="rounded-box border border-line bg-surface p-4">
          <Field label="Con Picker" hint="Nombre, tipo, stock y precio. Se elige viendo.">
            <Picker
              items={PRODUCTOS}
              value={producto}
              onChange={setProducto}
              onBrowseAll={() => {}}
            />
          </Field>
        </div>
      </div>
    );
  },
};

/** Con pocas opciones el campo sigue siendo el filtro: no aparece un buscador aparte. Cuatro
 *  almacenes no justifican un segundo control — y el de tránsito, que tiene casi el mismo
 *  nombre, se distingue por lo que dice debajo. */
export const Pocas: Story = {
  args: { items: ALMACENES },
  render: function Render() {
    const [almacen, setAlmacen] = useState("");
    return (
      <div className="max-w-xl rounded-box border border-line bg-surface p-4">
        <Field label="Almacén de origen">
          <Picker items={ALMACENES} value={almacen} onChange={setAlmacen} />
        </Field>
      </div>
    );
  },
};

/** Mientras las opciones llegan, lo dice — un picker vacío mientras carga se lee como «no
 *  hay nada», que es otra respuesta. Y en modo lectura es el nombre, sin caja. */
export const CargandoYLectura: Story = {
  args: { items: [] },
  render: () => (
    <div className="grid max-w-3xl gap-5 rounded-box border border-line bg-surface p-4 sm:grid-cols-2">
      <Field label="Cliente">
        <Picker items={[]} loading />
      </Field>
      <Field label="Almacén de origen">
        <Picker items={ALMACENES} value="W-SCZ" mode="read" />
      </Field>
    </div>
  ),
};

/* Two thousand customers that live «on the server»: the story hands them out forty at a
   time, with a delay, the way a `search_read` with `limit` and `offset` would. */
const RAZONES = [
  "Ferretería",
  "Constructora",
  "Importadora",
  "Distribuidora",
  "Agroindustrias",
];
const LUGARES = [
  "Illimani",
  "Andina",
  "del Oriente",
  "Mamoré",
  "Sajama",
  "Titicaca",
  "Chiquitana",
];
const CIUDADES = ["La Paz", "El Alto", "Santa Cruz", "Cochabamba", "Sucre", "Tarija"];
const TOTAL = 2000;
const PAGINA = 40;
const cliente = (n: number): PickerItem => ({
  id: `C-${n}`,
  name: `${RAZONES[n % RAZONES.length]} ${LUGARES[n % LUGARES.length]} ${Math.floor(n / 35) + 1}`,
  icon: Building2,
  meta: `NIT ${(1020304000 + n * 7).toString()} · ${CIUDADES[n % CIUDADES.length]}`,
  haystack: `${1020304000 + n * 7}`,
});

/** Desde el servidor: dos mil clientes que no están en memoria. Con `onLoadMore` la lista no
 *  se corta en 8 ni ofrece «ver todos…»: crece mientras bajás, de a cuarenta, dentro de una
 *  altura fija, y una fila callada al final dice que viene la página siguiente. Escribí y
 *  filtra lo que ya llegó — si el filtro deja el final a la vista, pide más solo. */
export const DesdeElServidor: Story = {
  args: { items: [] },
  render: function Render() {
    const [clientes, setClientes] = useState<PickerItem[]>([]);
    const [cargando, setCargando] = useState(true);
    const [cargandoMas, setCargandoMas] = useState(false);
    const [elegido, setCliente] = useState("");
    const pidiendo = useRef(false);

    const pedir = (desde: number, alLlegar: () => void) => {
      if (pidiendo.current || desde >= TOTAL) return;
      pidiendo.current = true;
      window.setTimeout(() => {
        const hasta = Math.min(desde + PAGINA, TOTAL);
        setClientes((ya) => [
          ...ya,
          ...Array.from({ length: hasta - desde }, (_, i) => cliente(desde + i)),
        ]);
        pidiendo.current = false;
        alLlegar();
      }, 700);
    };

    useEffect(() => {
      pedir(0, () => setCargando(false));
    }, []);

    return (
      <div className="max-w-xl rounded-box border border-line bg-surface p-4">
        <Field
          label="Cliente"
          hint={`${clientes.length.toLocaleString("es-BO")} de ${TOTAL.toLocaleString("es-BO")} cargados`}
        >
          <Picker
            items={clientes}
            value={elegido}
            onChange={setCliente}
            loading={cargando}
            loadingMore={cargandoMas}
            onLoadMore={() => {
              if (clientes.length >= TOTAL) return;
              setCargandoMas(true);
              pedir(clientes.length, () => setCargandoMas(false));
            }}
          />
        </Field>
      </div>
    );
  },
};

/** Secciones: los clientes con los que trabajaste esta semana arriba, bajo «Recientes», y el
 *  resto bajo «Todos». El orden es el que viene en `items` — el picker agrupa las seguidas
 *  con la misma `section`, no reordena. */
export const Secciones: Story = {
  args: { items: [] },
  render: function Render() {
    const recientes = [3, 17, 42].map((n) => ({ ...cliente(n), section: "Recientes" }));
    const todos = Array.from({ length: 30 }, (_, n) => ({
      ...cliente(n + 100),
      section: "Todos",
    }));
    const [valor, setValor] = useState("C-17");
    return (
      <div className="max-w-xl rounded-box border border-line bg-surface p-4">
        <Field label="Cliente">
          <Picker
            items={[...recientes, ...todos]}
            value={valor}
            onChange={setValor}
            onBrowseAll={() => {}}
          />
        </Field>
      </div>
    );
  },
};
