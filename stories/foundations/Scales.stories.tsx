import type { Meta, StoryObj } from "@storybook/react-vite";

import { Section, Swatch } from "../support/parts";

/* ==================================================================== *
 *  ESPACIO · RADIO · ELEVACIÓN · ICONOGRAFÍA
 *
 *  Las cuatro escalas que no son color ni letra, y que son las que de verdad
 *  hacen que una interfaz se vea intencional o improvisada. Todas comparten el
 *  mismo defecto de origin y la misma cura:
 *
 *      el defecto  un solo valor repetido en todos lados (`rounded-[2px]`), o
 *                  un valor distinto elegido a ojo en cada componente
 *      la cura     pocos peldaños, cada uno con SU trabajo declarado
 *
 *  Un peldaño sin trabajo declarado es un peldaño que alguien va a usar para
 *  otra cosa, y ahí se termina la escala.
 * ==================================================================== */

const ESPACIO = [
  { v: "2px", clase: "gap-0.5", uso: "entre un ícono y su número dentro de una cápsula" },
  {
    v: "4px",
    clase: "gap-1",
    uso: "entre dos cosas que son una sola: un punto y su palabra",
  },
  {
    v: "6px",
    clase: "gap-1.5",
    uso: "dentro de un control: el ícono y el rótulo de un botón",
  },
  { v: "8px", clase: "gap-2", uso: "entre controles hermanos de una barra de acciones" },
  {
    v: "12px",
    clase: "gap-3",
    uso: "el aire entre bloques de una vista — `--spacing-block`",
  },
  { v: "16px", clase: "gap-4", uso: "el relleno de una tarjeta o de un diálogo" },
  { v: "24px", clase: "gap-6", uso: "entre bloques HERMANOS: el doble del aire común" },
  { v: "32px", clase: "gap-8", uso: "entre secciones de una página de documentación" },
];

/* Context: esta tabla tiene que decir lo mismo que `tokens.css` y lo mismo que
   los componentes. `pill` NO es para un CTA: lo que se aprieta es una caja, y
   `Button.tsx` lo prohíbe. Una escala que contradice al componente enseña lo
   contrario de lo decidido. */
const RADIO = [
  {
    clase: "rounded-mark",
    v: "4px",
    uso: "una marca chica: la caja de un checkbox. A 8 px una caja de 16 px ya es un círculo",
  },
  {
    clase: "rounded-control",
    v: "8px",
    uso: "lo que se toca y lleva rótulo: un botón, un campo, un select",
  },
  { clase: "rounded-box", v: "12px", uso: "una caja de contenido, un panel, una banda" },
  { clase: "rounded-panel", v: "16px", uso: "una superficie flotante: menú, aviso, ventana" },
  {
    clase: "rounded-pill",
    v: "9999px",
    uso: "cápsula: un tag, un switch, un blanco de solo ícono. Un botón con rótulo sigue en control",
  },
];

const SOMBRA = [
  { clase: "shadow-raised", uso: "una fila activa: se despega apenas del fondo" },
  { clase: "shadow-float", uso: "un menú o un aviso: hay algo debajo y hay que creerlo" },
  { clase: "shadow-window", uso: "una ventana flotante del gestor de paneles" },
];

const ICON = [
  {
    px: 12,
    stroke: 2,
    name: "sm",
    uso: "dentro de una línea de texto: un chevron, una miga",
  },
  { px: 16, stroke: 1.75, name: "md", uso: "el tamaño por defecto: un botón, una fila" },
  { px: 18, stroke: 1.5, name: "lg", uso: "el ícono de identidad de un registro" },
];

const meta: Meta = {
  title: "1 · Fundamentos/Escalas",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Escalas: Story = {
  render: () => (
    <div className="flex flex-col gap-10 bg-ground px-10 py-9">
      <header className="flex flex-col gap-2.5">
        <span className="font-mono text-micro tracking-[0.14em] text-primary uppercase">
          sincpro :: erp
        </span>
        <h1 className="text-display font-semibold text-ink">Escalas</h1>
        <p className="max-w-[74ch] text-body text-muted">
          Espacio, radio, elevación e iconografía. Las cuatro comparten el mismo defecto de
          origin —un valor único repetido en todos lados, o uno distinto elegido a ojo en cada
          componente— y la misma cura: pocos peldaños,{" "}
          <strong className="font-medium text-ink">cada uno con su trabajo declarado</strong>.
          Un peldaño sin trabajo es uno que alguien va a usar para otra cosa.
        </p>
      </header>

      <Section
        id="espacio"
        title="Espacio · el aire dice el parentesco"
        rule="La distancia entre dos cosas declara si son la misma cosa o dos. Por eso se separa con espacio y no con líneas: una línea por cada cosa que se quiere separar es lo que convierte una pantalla en una planilla."
      >
        <div className="overflow-hidden rounded-box border border-line bg-surface">
          {ESPACIO.map((e) => (
            <div
              key={e.v}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-4 py-3 first:border-t-0"
            >
              <span className="w-[56px] shrink-0 font-mono text-micro tabular-nums text-ink">
                {e.v}
              </span>
              <span className="w-[84px] shrink-0 font-mono text-micro text-primary">
                {e.clase}
              </span>
              <span className="w-[200px] shrink-0" style={{ width: 200 }}>
                <span
                  className="block h-2.5 rounded-control bg-primary/25"
                  style={{ width: e.v }}
                />
              </span>
              <span className="min-w-0 text-micro text-muted">{e.uso}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="radio"
        title="Radio · el radio crece con la superficie"
        rule="Es la única regla que hace que una escala de radios se lea como intencional. Si un botón, una caja, una banda de aviso y un chip comparten la misma esquina, eso no es densidad: es la ausencia de una escala."
      >
        <div className="flex flex-wrap gap-4">
          {RADIO.map((r) => (
            <Swatch key={r.clase} name={`${r.clase} · ${r.v}`} note={r.uso} width={210}>
              <div
                className={`h-20 w-[210px] border border-line-strong bg-surface ${r.clase}`}
              />
            </Swatch>
          ))}
        </div>
      </Section>

      <Section
        id="elevacion"
        title="Elevación · el borde primero, la sombra acompaña"
        rule="La elevación primaria es un pelo de borde, no una sombra. Sobre #FAF9F7 una sombra negra se ve como suciedad y una caja sin borde con sombra no tiene filo: se ve borrosa. Por eso estas sombras son del color del TEXTO —cálidas— y muy abiertas."
      >
        <div className="flex flex-wrap gap-5 rounded-box bg-ground p-5">
          {SOMBRA.map((s) => (
            <Swatch key={s.clase} name={s.clase} note={s.uso} width={210}>
              <div
                className={`h-20 w-[210px] rounded-box border border-line bg-surface ${s.clase}`}
              />
            </Swatch>
          ))}
        </div>
      </Section>

      <Section
        id="icono"
        title="Iconografía · el tamaño crece y el grosor baja"
        rule="Trazo y no relleno, para que un ícono pueda acompañar un texto de 13 px sin gritar. Pero el trazo no escala con el tamaño: 2 px en un ícono de 12 px se empasta, y el mismo trazo en uno de 18 px se ve flaco. Lo que se mantiene constante es el peso óptico, no el número."
      >
        <div className="flex flex-wrap items-end gap-8 rounded-box border border-line bg-surface p-6">
          {ICON.map((i) => (
            <Swatch
              key={i.name}
              name={`${i.name} · ${i.px}px / ${String(i.stroke).replace(".", ",")}`}
              note={i.uso}
              width={230}
            >
              <span className="flex h-12 items-center gap-3 text-ink">
                {/* Los tres dibujados a mano con el mismo path, para que la
                    única variable a la vista sea el par tamaño/grosor. */}
                {[0, 1, 2].map((n) => (
                  <svg
                    key={n}
                    width={i.px}
                    height={i.px}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={i.stroke}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {n === 0 ? (
                      <>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M9 21V9" />
                      </>
                    ) : n === 1 ? (
                      <>
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
                        <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
                      </>
                    ) : (
                      <>
                        <path d="m9 18 6-6-6-6" />
                      </>
                    )}
                  </svg>
                ))}
              </span>
            </Swatch>
          ))}
        </div>
      </Section>
    </div>
  ),
};
