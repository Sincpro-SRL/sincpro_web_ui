import {
  Avatar,
  DateValue,
  KeyValue,
  Numeric,
  ProgressBar,
  UserChip,
  UserStack,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "2 · Primitivas/Valores, métricas y progreso",
  component: KeyValue,
  parameters: {
    docs: {
      description: {
        component:
          "El rótulo es una palabra —«por cobrar», «vencido»— y el valor una cifra en dígitos tabulares, que es lo que hace que cuatro en fila tengan sus dígitos en columna. Y una barra de progreso de verdad, nunca un spinner: un spinner dice «esperá» y no dice cuánto.",
      },
    },
  },
} satisfies Meta<typeof KeyValue>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El vistazo de arriba de la ficha de un cliente. La alineación en columna de los dígitos
 *  es lo que hace que se puedan comparar sin leerlos. */
export const Vistazo: Story = {
  args: { label: "por cobrar", value: "Bs. 64.320,50" },
  render: () => (
    <div className="bg-ground p-8">
      <dl className="grid max-w-3xl grid-cols-2 gap-6 rounded-box border border-line bg-surface p-5 sm:grid-cols-4">
        <KeyValue label="facturas del año" value="38" />
        <KeyValue label="por cobrar" value="Bs. 64.320,50" />
        <KeyValue label="vencido" value="Bs. 18.650,00" />
        <KeyValue label="días promedio de pago" value="41" />
      </dl>
    </div>
  ),
};

/** Tres formatos y el que corresponde depende del número, no del gusto. Las cantidades son
 *  enteras, los importes llevan dos decimales, y un margen o una tasa que vive cerca de cero
 *  lleva cuatro: con dos, `0,0696` y `0,0149` se vuelven `0,07` y `0,01` — se pierde justo lo
 *  que los distingue. */
export const Numeros: Story = {
  args: { label: "", value: "" },
  render: () => (
    <div className="bg-ground p-8">
      <table className="w-full max-w-lg rounded-box border border-line bg-surface">
        <tbody>
          {(
            [
              ["bolsas de cemento en stock", 48000, "bolsas", "integer"],
              ["ticket promedio (Bs.)", 1284.37, undefined, "decimal"],
              ["diferencia de cambio — USD", 0.0696, undefined, "distance"],
              ["merma de inventario — octubre", 0.0149, undefined, "distance"],
            ] as const
          ).map(([label, valor, unidad, formato]) => (
            <tr key={label}>
              <td className="px-4 py-2 text-meta text-muted">{label}</td>
              <td className="px-4 py-2">
                <Numeric
                  value={valor}
                  {...(unidad === undefined ? {} : { unit: unidad })}
                  format={formato}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};

const AHORA = new Date("2026-10-30T14:00:00Z");

function Caja({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="font-mono text-micro tracking-[0.1em] text-muted uppercase">
        {label}
      </figcaption>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-box border border-line bg-surface p-4">
        {children}
      </div>
    </figure>
  );
}

/**
 * **Quién.** Un correo en una celda es un dato correcto e ilegible: doce filas
 * de correos se leen letra por letra. Una inicial en un círculo se reconoce sin
 * leer.
 *
 * El color sale de un hash del nombre, así que la misma persona tiene siempre el
 * mismo — y por eso el color llega a significar algo. Si lo eligiera el
 * consumidor, la misma persona sería verde en una lista y azul en otra.
 *
 * `UserStack` es el widget de una relación de muchos —los seguidores de una orden de
 * compra—: cinco avatares en fila son cinco cosas; cinco superpuestos con un «+3» son UNA
 * que tiene ocho adentro.
 */
export const Personas: Story = {
  args: { label: "facturas", value: 38 },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Caja label="tres tamaños">
        <Avatar name="Andrés Gutiérrez" size="sm" />
        <Avatar name="Andrés Gutiérrez" size="md" />
        <Avatar name="Andrés Gutiérrez" size="lg" />
      </Caja>
      <Caja label="con su nombre, y con un detalle">
        <UserChip name="Andrés Gutiérrez" />
        <UserChip name="Josefa Muñoz" detail="aprobó la compra" />
        <UserChip name="Sistema" detail="cierre automático" size="sm" />
      </Caja>
      <Caja label="una relación de muchos, y el caso vacío">
        <UserStack names={["Andrés Gutiérrez", "Josefa Muñoz", "Carla Rojas"]} />
        <UserStack
          names={[
            "Andrés Gutiérrez",
            "Josefa Muñoz",
            "Carla Rojas",
            "Lucía Vargas",
            "Marco Ríos",
            "Sofía Cruz",
          ]}
        />
        <UserStack names={[]} />
      </Caja>
    </div>
  ),
};

/**
 * **Cuándo.** Una fecha dice dos cosas y no se pueden decir las dos juntas:
 * *cuán reciente es* y *cuál es*. La relativa se dibuja, la exacta va en el
 * `title` — a un hover de distancia, sin ocupar ancho.
 *
 * Pasada la semana lo relativo deja de informar («hace 4 meses» no deja ordenar
 * dos cosas), así que desde ahí se dibuja la fecha.
 */
export const Fechas: Story = {
  args: { label: "facturas", value: 38 },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Caja label="relativo · lo que va en una lista">
        <DateValue when="2026-10-30T13:59:30Z" now={AHORA} />
        <DateValue when="2026-10-30T13:58:00Z" now={AHORA} />
        <DateValue when="2026-10-30T11:00:00Z" now={AHORA} />
        <DateValue when="2026-10-28T10:00:00Z" now={AHORA} />
        <DateValue when="2026-06-02T10:00:00Z" now={AHORA} />
      </Caja>
      <Caja label="exacta y fecha sola · cuando el dato se compara o se copia">
        <DateValue when="2026-10-29T18:21:00Z" format="exact" />
        <DateValue when="2026-10-29T18:21:00Z" format="date" />
        <DateValue when="no es una fecha" />
      </Caja>
    </div>
  ),
};

/**
 * **La barra dice cuánto Y qué tan bien va.** El relleno plano lleva tono:
 * `good` terminó, `warn` va lento, `bad` falló.
 *
 * El degradado azul→dorado (`marca`) se pide, y es para la barra LARGA de un
 * proceso vivo —el cierre del mes, una importación—: a 3 px y al 62 % un
 * degradado no se lee como una marca, se lee como una barra rota. Por eso también
 * engordó a 6 px — a 3 no es una barra, es una línea que no se distingue de un
 * separador.
 */
export const Progreso: Story = {
  args: { label: "facturas", value: 38 },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Caja label="con tono · el state está en el color">
        <ProgressBar value={100} label="conciliación: terminó" tone="good" />
        <ProgressBar value={62} label="importación: en curso" tone="info" />
        <ProgressBar value={31} label="inventario: va lento" tone="warn" />
        <ProgressBar value={12} label="envío a Impuestos: falló" tone="bad" />
      </Caja>
      <Caja label="marca · el proceso vivo, y ahí sí hay largo para el degradado">
        <ProgressBar value={62} label="cierre de octubre" width="w-80" />
      </Caja>
      <Caja label="sin la cifra, para una celda que ya tiene su columna">
        <ProgressBar value={62} label="cobrado" width="w-20" showValue={false} />
        <ProgressBar value={8} label="cobrado" width="w-20" showValue={false} tone="warn" />
      </Caja>
    </div>
  ),
};

/**
 * **Una tarea en curso: cuánto falta, o que todavía no se sabe.** La importación de 4.000
 * clientes dice por dónde va —en filas, no en un porcentaje que hay que traducir— con su
 * rótulo arriba, porque es la barra de la que trata la pantalla. El cierre de octubre recién
 * empezó y el servidor no contó los asientos todavía: la barra no inventa un número, BARRE.
 * Con «reducir movimiento» activado en el sistema operativo se queda quieta, la pista entera
 * tenue —«ocupado» sin moverse—.
 *
 * No es un `Meter`: el medidor es una cantidad que ESTÁ en un rango (el stock, el crédito
 * usado) y lleno suele ser la alarma; la barra de progreso es algo que está PASANDO, y llena
 * es la buena noticia.
 */
export const TareaEnCurso: Story = {
  args: { label: "importación", value: 1240 },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Caja label="determinada · la cifra en lo que se cuenta">
        <ProgressBar
          label="Importación de clientes"
          value={1240}
          maxValue={4000}
          valueLabel="1.240 de 4.000 filas"
          showLabel
          width="w-80"
        />
        <ProgressBar
          label="Conciliación bancaria de octubre"
          value={87}
          showLabel
          width="w-80"
        />
      </Caja>
      <Caja label="indeterminada · todavía no se sabe cuánto falta">
        <ProgressBar label="Cierre de octubre" showLabel width="w-80" />
        <ProgressBar
          label="Leyendo el extracto"
          valueLabel="leyendo el archivo…"
          showLabel
          tone="info"
          width="w-80"
        />
        <ProgressBar label="Envío a Impuestos" width="w-20" tone="info" />
      </Caja>
    </div>
  ),
};
