import {
  currentCopy,
  dateKey,
  type GroupGrain,
  type GroupLevel,
  installCopy,
  type Pile,
  pilesFrom,
  type UiCopyOverride,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

/* ==================================================================== *
 *  EL CALENDARIO — una fecha se CORTA y después se LEE.
 *
 *  Son dos cosas y por eso son dos funciones. `dateKey` corta: de una fecha
 *  sale «2026-09», que es lo que identifica al montón, lo que se compara con lo
 *  que contó el servidor y lo que queda plegado. `dateLabel` lee: de «2026-09»
 *  sale «Septiembre», que es lo único que cambia con el idioma.
 *
 *  Escribir un solo texto obliga a elegir cuál se pierde. Con la clave a la
 *  vista la interfaz habla en máquina; con el rótulo por identidad, dos
 *  septiembres de años distintos se funden en un montón que no existe y plegar
 *  un mes en español lo deja abierto en inglés.
 *
 *  ── El idioma no se traduce: se PIDE ────────────────────────────────
 *
 *  No hay acá ninguna tabla de doce meses ni de siete días. Los dice `Intl` con
 *  el `locale` que la copia tiene puesto, así que un tercer idioma no agrega una
 *  línea. Lo único escrito son la semana y el trimestre, porque «W38» no es una
 *  palabra en ningún calendario.
 * ==================================================================== */

/* Un martes de septiembre de 2026, que cae en la semana 38. */
const WHEN = new Date(2026, 8, 15);

const SPANISH: UiCopyOverride = {
  locale: "es-BO",
  calendar: {
    week: "Semana {n}",
    weekOfYear: "Semana {n} de {year}",
    quarter: "T{n}",
    quarterOfYear: "T{n} {year}",
  },
};

const ENGLISH: UiCopyOverride = { locale: "en-US" };

/* El árbol de calendario entero: los cuatro granos de un mismo campo, de grueso
   a fino. Es la dirección que pone el calendario y no una preferencia — un día
   entero vive adentro de un solo mes. */
const LEVELS: GroupLevel[] = (["year", "month", "week", "day"] as const).map((grain) => ({
  field: "registrado",
  grain,
}));

type Row = { id: string; registrado: Date };

const ROWS: Row[] = [
  { id: "a", registrado: new Date(2026, 8, 15) },
  { id: "b", registrado: new Date(2026, 8, 15) },
  { id: "c", registrado: new Date(2026, 8, 16) },
  { id: "d", registrado: new Date(2026, 8, 24) },
  { id: "e", registrado: new Date(2026, 7, 3) },
  { id: "f", registrado: new Date(2025, 11, 30) },
];

/**
 * Con una copia puesta un rato, y devuelta como estaba.
 *
 * Esta historia muestra DOS idiomas a la vez, así que tiene que instalar uno y
 * después el otro. La copia instalada es global —la lee todo el mundo, no sólo
 * lo que se dibuja— así que dejarla puesta le cambiaría el idioma a la historia
 * siguiente, que no pidió nada.
 */
function conCopia<T>(copy: UiCopyOverride, hacer: () => T): T {
  const antes = currentCopy();
  installCopy(copy);
  try {
    return hacer();
  } finally {
    installCopy(antes);
  }
}

/** El árbol, armado con la copia del idioma puesta. Se arma acá y no en el
 *  dibujo porque el rótulo se resuelve al armar: dos árboles en la misma página
 *  son dos idiomas, y el segundo no puede repintar al primero. */
function treeIn(copy: UiCopyOverride): readonly Pile<Row>[] {
  return conCopia(copy, () =>
    pilesFrom(ROWS, LEVELS, (row, level) => dateKey(row.registrado, level.grain!)),
  );
}

function Branch({ piles }: { piles: readonly Pile<Row>[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {piles.map((pile) => (
        <li key={pile.path.join(" ")} className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-body text-ink">{pile.label}</span>
            <span className="font-mono text-micro text-muted">{pile.key}</span>
            <span className="font-mono text-micro tabular-nums text-primary">
              {pile.count}
            </span>
          </div>
          {pile.piles.length === 0 ? null : (
            <div className="border-l border-line pl-4">
              <Branch piles={pile.piles} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const GRAINS: readonly GroupGrain[] = ["year", "quarter", "month", "week", "day"];

function Cut({ copy, name }: { copy: UiCopyOverride; name: string }) {
  const rows = conCopia(copy, () =>
    GRAINS.map((grain) => ({
      grain,
      key: dateKey(WHEN, grain),
      alone: pilesFrom([{ id: "x", registrado: WHEN }], [{ field: "f", grain }], (row) =>
        dateKey(row.registrado, grain),
      )[0]!.label,
    })),
  );
  return (
    <div className="flex min-w-0 flex-1 basis-80 flex-col gap-2">
      <span className="font-mono text-micro tracking-[0.14em] text-primary uppercase">
        {name}
      </span>
      <div className="overflow-hidden rounded-box border border-line bg-surface">
        {rows.map((row) => (
          <div
            key={row.grain}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 first:border-t-0"
          >
            <span className="w-[64px] shrink-0 font-mono text-micro text-muted">
              {row.grain}
            </span>
            <span className="w-[104px] shrink-0 font-mono text-micro text-ink">
              {row.key}
            </span>
            <span className="min-w-0 text-body text-ink">{row.alone}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tree({ copy, name }: { copy: UiCopyOverride; name: string }) {
  const piles = treeIn(copy);
  return (
    <div className="flex min-w-0 flex-1 basis-80 flex-col gap-2">
      <span className="font-mono text-micro tracking-[0.14em] text-primary uppercase">
        {name}
      </span>
      <div className="rounded-box border border-line bg-surface px-4 py-3">
        <Branch piles={piles} />
      </div>
    </div>
  );
}

function Section({
  title,
  rule,
  children,
}: {
  title: string;
  rule: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-title font-semibold text-ink">{title}</h2>
      <p className="max-w-[74ch] text-body text-muted">{rule}</p>
      <div className="flex flex-wrap gap-6">{children}</div>
    </section>
  );
}

const meta: Meta = {
  title: "1 · Fundamentos/Calendario",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Calendario: Story = {
  render: () => (
    <div className="flex flex-col gap-10 bg-ground px-10 py-9">
      <header className="flex flex-col gap-2.5">
        <span className="font-mono text-micro tracking-[0.14em] text-primary uppercase">
          sincpro :: erp
        </span>
        <h1 className="text-display font-semibold text-ink">Calendario</h1>
        <p className="max-w-[74ch] text-body text-muted">
          Una fecha se corta a una <strong className="font-medium text-ink">clave</strong> —el
          texto del motor, uno solo para todos los idiomas— y una clave se lee como un{" "}
          <strong className="font-medium text-ink">rótulo</strong>, que es lo único que cambia
          con el idioma. Los meses y los días de la semana los dice <code>Intl</code> con el{" "}
          <code>locale</code> de la copia: acá no hay ninguna tabla de doce meses, y un tercer
          idioma no agrega una línea.
        </p>
      </header>

      <Section
        title="Cada grano corta y se lee"
        rule="La clave es la misma en los dos idiomas: es lo que identifica al montón, lo que se compara con lo que contó el servidor y lo que queda plegado. El rótulo es lo que se dibuja. Sin nadie arriba, el rótulo se planta solo y dice la fecha entera — un «Martes» suelto no es ningún día."
      >
        <Cut copy={SPANISH} name="es-BO" />
        <Cut copy={ENGLISH} name="en-US" />
      </Section>

      <Section
        title="Un rótulo dice lo que el de arriba NO dijo"
        rule="Agrupar por año, mes, semana y día es un árbol que se lee de arriba hacia abajo. Repetir el año en cada mes y el mes en cada día llena la sangría con lo que está dos renglones más arriba, así que cada nivel dice sólo su parte — y adentro de una semana, un día es su nombre: son siete y ninguno se repite. La clave, al lado, no se mueve."
      >
        <Tree copy={SPANISH} name="es-BO" />
        <Tree copy={ENGLISH} name="en-US" />
      </Section>
    </div>
  ),
};
