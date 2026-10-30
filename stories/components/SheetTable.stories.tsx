import { type SheetColumn, SheetTable, type Tone } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { BANK_BRANCHES, BANK_CHANNELS, pseudo, statementCell } from "../support/erp-lists";

/** The columns of the bank's file, as they came. The code does not choose them. */
const COLUMNS: SheetColumn[] = [
  { id: "referencia", header: "referencia", type: "identificador" },
  { id: "fecha", header: "fecha", type: "fecha", width: 130 },
  { id: "glosa", header: "glosa", type: "texto", width: 280 },
  { id: "agencia", header: "agencia", type: "categórica", width: 150 },
  { id: "canal", header: "canal", type: "categórica", width: 170 },
  { id: "debe", header: "debe", type: "decimal", numeric: true, width: 130 },
  { id: "haber", header: "haber", type: "decimal", numeric: true, width: 130 },
  { id: "moneda", header: "moneda", type: "categórica", width: 110 },
  { id: "conciliado", header: "conciliado", type: "booleano", width: 120 },
  { id: "nota", header: "nota", type: "texto libre", width: 280 },
];

const FILAS = 120_000;

function valor(row: number, c: SheetColumn, ci: number): string | number | null {
  switch (c.id) {
    case "moneda":
      return pseudo(row, ci) < 0.92 ? "BOB" : "USD";
    case "conciliado":
      return pseudo(row, ci) < 0.7 ? "sí" : "no";
    case "nota":
      return pseudo(row, ci) < 0.8 ? "" : "revisar con contabilidad antes de conciliar";
    default:
      return statementCell(row, c.id);
  }
}

/** Lo que hace que mirar los datos crudos valga la pena: qué celda marcó la
 *  importación y cuál está fuera del rango habitual de la cuenta. */
function tono(row: number, c: SheetColumn, ci: number): Tone | undefined {
  const r = pseudo(row, ci);
  if (c.id === "haber" && row % 37 === 0) return "warn";
  if (c.id === "haber" && r > 0.985) return "bad";
  if (c.id === "debe" && row % 2 === 1 && r > 0.985) return "bad";
  if (c.id === "canal" && r < 0.03) return "info";
  return undefined;
}

function noteFor(row: number, c: SheetColumn, ci: number): string | undefined {
  const t = tono(row, c, ci);
  if (t === "warn") return "faltante: el banco no informó el monto";
  if (t === "bad") return "monto fuera del rango habitual de esta cuenta";
  if (t === "info") return "canal deducido de la glosa al importar";
  return undefined;
}

const meta: Meta<typeof SheetTable> = {
  title: "3 · Componentes/Datos/Planilla · los datos crudos",
  component: SheetTable,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          'La tercera tabla del sistema, y no se parece a las otras dos: acá las columnas salen del archivo —un extracto bancario, una planilla importada— y el código no sabe cuáles son ni cuántas. Se virtualiza con `@tanstack/react-virtual` —de la misma familia que la tabla que ya usamos—, la primera columna se queda pegada y la celda tiene semántica: `null` es faltante y `\\"\\"` es vacía.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SheetTable>;

/**
 * **Un extracto bancario: 120.000 movimientos y diez columnas.** Scrolleá: se
 * dibujan los ~30 que se ven. Andá a la derecha y fijate que el número de fila se
 * queda — con cuarenta columnas, sin eso no hay forma de saber de qué fila es
 * cada número.
 *
 * Las celdas pintadas son las que la importación marcó o las que están fuera del
 * rango habitual de la cuenta; pasá el puntero para ver por qué. Sin color no
 * habría motivo para mirar los datos crudos: para leer diez filas alcanza una
 * tabla.
 */
export const Vistazo: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <SheetTable
        columns={COLUMNS}
        rows={FILAS}
        value={valor}
        tone={tono}
        note={noteFor}
        height={520}
        caption={
          <>
            <span className="font-mono tabular-nums text-ink">
              {FILAS.toLocaleString("es")}
            </span>{" "}
            movimientos ·{" "}
            <span className="font-mono tabular-nums text-ink">{COLUMNS.length}</span> columnas
            · las celdas pintadas las marcó la importación
          </>
        }
      />
    </div>
  ),
};

/** Sin color y sin tipos: el mismo vistazo cuando el extracto recién se subió y
 *  todavía nadie lo revisó. */
export const ReciénSubido: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <SheetTable
        columns={COLUMNS.slice(0, 6).map((c) => ({
          id: c.id,
          header: c.header,
          ...(c.numeric === undefined ? {} : { numeric: c.numeric }),
        }))}
        rows={400}
        value={valor}
        height={360}
        caption="400 movimientos · 6 columnas · sin revisar"
      />
    </div>
  ),
};

/**
 * **La planilla se corrige adentro.** Tocá una celda y escribí, o movete con
 * las flechas: `Enter` abre y confirma bajando, `Tab` confirma a la derecha,
 * `Escape` cancela, `Supr` vacía. Escribir con la celda activa empieza a editar
 * y se queda con la tecla — perder el primer carácter se siente como que la app
 * no responde.
 *
 * `referencia` no se edita: es la clave del movimiento. Lo que se corrige queda
 * en verde, que es la respuesta a «¿qué toqué?» sin tener que acordarse.
 *
 * Es el caso de *vi el monto faltante, lo arreglo acá*, que hasta ahora obligaba
 * a bajar el CSV del banco, editarlo afuera y volver a subirlo.
 */
export const Corregir: Story = {
  render: () => {
    const [tocadas, setTocadas] = useState<Map<string, string>>(new Map());
    const clave = (r: number, ci: number) => `${r}:${ci}`;

    return (
      <div className="flex flex-col gap-3 bg-ground p-8">
        <p className="font-mono text-micro text-muted">
          {tocadas.size === 0 ? "sin cambios" : `${tocadas.size} celda(s) corregida(s)`}
        </p>
        <SheetTable
          columns={COLUMNS.slice(0, 8)}
          rows={5000}
          height={460}
          value={(r, c, ci) => tocadas.get(clave(r, ci)) ?? valor(r, c, ci)}
          tone={(r, c, ci) => (tocadas.has(clave(r, ci)) ? "good" : tono(r, c, ci))}
          note={(r, c, ci) =>
            tocadas.has(clave(r, ci)) ? "corregido a mano, sin guardar" : noteFor(r, c, ci)
          }
          editable={(_r, c) => c.id !== "referencia"}
          onCommit={(r, _c, ci, next) =>
            setTocadas((prev) => new Map(prev).set(clave(r, ci), next))
          }
          caption="Tocá una celda y escribí. La referencia no se edita."
        />
      </div>
    );
  },
};

/**
 * **La planilla crece.** `Enter` en la última fila confirma y baja a una fila nueva, en la
 * misma columna — como cualquier planilla —, y «agregar una fila» abajo hace lo mismo desde
 * el mouse, parado en la primera celda que se puede escribir. La fila nueva es del dominio:
 * acá sólo sube la cuenta de filas, y la planilla espera a que llegue para pararse en ella.
 */
export const Crecer: Story = {
  render: function Render() {
    const BASE = 6;
    const [filas, setFilas] = useState(BASE);
    const [tocadas, setTocadas] = useState<Map<string, string>>(new Map());
    const clave = (r: number, ci: number) => `${r}:${ci}`;

    return (
      <div className="flex flex-col gap-3 bg-ground p-8">
        <SheetTable
          columns={COLUMNS.slice(0, 6)}
          rows={filas}
          height="auto"
          value={(r, c, ci) => tocadas.get(clave(r, ci)) ?? (r < BASE ? valor(r, c, ci) : "")}
          tone={(r, _c, ci) => (tocadas.has(clave(r, ci)) ? "good" : undefined)}
          editable={(r, c) => r >= BASE || c.id !== "referencia"}
          onCommit={(r, _c, ci, next) =>
            setTocadas((prev) => new Map(prev).set(clave(r, ci), next))
          }
          onAddRow={() => setFilas((n) => n + 1)}
          caption={`${filas} movimientos · los nuevos se escriben enteros`}
        />
      </div>
    );
  },
};

/* ==================================================================== *
 *  LAS TRES VARIANTES: plano · agrupado · anidado
 *
 *  Una planilla agrupada no deja de ser una planilla: sigue virtualizada, sigue
 *  teniendo la columna del número pegada, y las columnas siguen saliendo del
 *  archivo. **La banda es una fila más, de otra clase** — por eso agrupar no
 *  cuesta la virtualización, que es lo que la haría inservible con 120.000
 *  filas.
 *
 *  Acá el conjunto es chico a propósito: con 120.000 filas no se ve dónde
 *  termina un montón y empieza el otro, que es justamente lo que estas
 *  historias tienen que mostrar.
 * ==================================================================== */

const MUESTRA = 48;

type Nivel = "agencia" | "canal";

/** A qué montón va cada fila en cada nivel. Devuelve el valor ya legible. */
function monton(row: number, nivel: Nivel): string {
  return String(
    nivel === "agencia"
      ? (BANK_BRANCHES[row % BANK_BRANCHES.length] ?? "—")
      : (statementCell(row, "canal") ?? BANK_CHANNELS[0]),
  );
}

/** Lo que entró en una fila, para que las bandas puedan sumar algo de verdad. */
function haber(row: number): number {
  const value = statementCell(row, "haber");
  return typeof value === "number" ? value : 0;
}

const BS = (n: number): string =>
  `Bs. ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * La SECUENCIA que la planilla dibuja: cada índice es una fila o la cabecera del
 * montón que empieza ahí. Aplanar es recursivo porque el árbol lo es — la
 * planilla no puede recibir el árbol, está virtualizada por índice.
 */
function aplanar(niveles: readonly Nivel[]) {
  type Banda = {
    field: string;
    label: string;
    count: number;
    open: boolean;
    depth: number;
    total: (column: SheetColumn, columnIndex: number) => string | number | null;
  };
  const out: { band?: Banda; row?: number }[] = [];
  const filas = Array.from({ length: MUESTRA }, (_, i) => i);

  const partir = (dentro: number[], resto: readonly Nivel[], depth: number) => {
    const nivel = resto[0];
    if (nivel === undefined) {
      for (const row of dentro) out.push({ row });
      return;
    }
    const montones = new Map<string, number[]>();
    for (const row of dentro) {
      const key = monton(row, nivel);
      const aca = montones.get(key);
      if (aca === undefined) montones.set(key, [row]);
      else aca.push(row);
    }
    for (const [label, adentro] of [...montones].sort((a, b) => a[0].localeCompare(b[0]))) {
      out.push({
        band: {
          field: nivel,
          label,
          count: adentro.length,
          open: true,
          depth,
          /* Lo que el montón suma, EN LA COLUMNA que suma. Así no hay que
             buscar a qué corresponde el número: la cuadrícula ya lo dice. */
          total: (column: SheetColumn) =>
            column.id === "haber"
              ? BS(adentro.reduce((suma, row) => suma + haber(row), 0))
              : null,
        },
      });
      partir(adentro, resto.slice(1), depth + 1);
    }
  };

  partir(filas, niveles, 0);
  return out;
}

function Planilla({ niveles }: { niveles: readonly Nivel[] }) {
  const seq = aplanar(niveles);
  const filaDe = (index: number): number | undefined => seq[index]?.row;
  return (
    <div className="bg-ground p-8">
      <SheetTable
        columns={COLUMNS}
        rows={niveles.length === 0 ? MUESTRA : seq.length}
        value={(index, c, ci) => {
          const row = niveles.length === 0 ? index : filaDe(index);
          return row === undefined ? null : valor(row, c, ci);
        }}
        tone={(index, c, ci) => {
          const row = niveles.length === 0 ? index : filaDe(index);
          return row === undefined ? undefined : tono(row, c, ci);
        }}
        height={460}
        {...(niveles.length === 0
          ? {}
          : {
              band: (index: number) => seq[index]?.band,
              onBandToggle: () => {},
            })}
        caption={
          niveles.length === 0
            ? "plano: una fila por movimiento"
            : `agrupado por ${niveles.join(" › ")}`
        }
      />
    </div>
  );
}

/** **Plano.** Una fila por movimiento y nada más — el vistazo de siempre. */
export const Plano: Story = {
  render: () => <Planilla niveles={[]} />,
};

/** **Agrupado por un nivel.** Cada montón abre con una banda pegada a la
 *  izquierda que dice por qué campo se partió, su valor, cuántas filas tiene y
 *  **cuánto suma**. La banda se queda a la izquierda como el número de fila: con
 *  cuarenta columnas, un rótulo que se va con el scroll horizontal deja de decir
 *  en qué montón estás justo cuando más lejos estás de él. */
export const Agrupado: Story = {
  render: () => <Planilla niveles={["agencia"]} />,
};

/** **Anidado.** Dos niveles: agencia y adentro canal. La sangría de la banda
 *  dice la profundidad —la planilla no puede anidar el marcado, está
 *  virtualizada por índice— y cada nivel suma lo suyo, así que el total de un
 *  canal y el de su agencia cierran. */
export const Anidado: Story = {
  render: () => <Planilla niveles={["agencia", "canal"]} />,
};
