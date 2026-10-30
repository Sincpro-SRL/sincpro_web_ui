import { Button } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Section } from "../support/parts";

/* ==================================================================== *
 *  MOVIMIENTO — tres duraciones, y ninguna decora.
 *
 *  Esta página es interactiva porque una duración no se puede documentar con
 *  un número: 160 ms y 240 ms se leen igual escritos y se sienten distinto. El
 *  botón «probar» existe para eso.
 * ==================================================================== */

const DURACIONES = [
  {
    token: "--duration-instant",
    ms: 90,
    name: "instant",
    que: "el control acusó recibo",
    donde: "hover, foco, cambio de color, un `Tag` que cambia de tono",
  },
  {
    token: "--duration-quick",
    ms: 160,
    name: "quick",
    que: "algo apareció donde no estaba",
    donde: "un menú que se despliega, un aviso, una fila que entra en la lista",
  },
  {
    token: "--duration-panel",
    ms: 240,
    name: "panel",
    que: "una superficie entera se movió",
    donde: "el cajón de vista previa entrando desde la derecha",
  },
];

function Prueba({ ms, ease }: { ms: number; ease: string }) {
  const [ido, setIdo] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {/* El botón del sistema y no uno dibujado a mano: `Button.tsx` dedica un
          bloque a prohibir la cápsula —«lo que se aprieta es una caja»— y esta
          página la estaba usando. Una documentación que contradice al componente
          enseña lo contrario de lo que el sistema decidió. */}
      <Button role="secondary" size="sm" onClick={() => setIdo((v) => !v)}>
        probar
      </Button>
      <div className="h-8 w-[260px] overflow-hidden rounded-control bg-ground">
        <div
          className="h-full w-8 rounded-control bg-primary"
          style={{
            transform: `translateX(${ido ? 228 : 0}px)`,
            transitionProperty: "transform",
            transitionDuration: `${ms}ms`,
            transitionTimingFunction: ease,
          }}
        />
      </div>
      <span className="font-mono text-micro tabular-nums text-muted">{ms}ms</span>
    </div>
  );
}

const meta: Meta = {
  title: "1 · Fundamentos/Movimiento",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Duraciones: Story = {
  render: () => (
    <div className="flex flex-col gap-10 bg-ground px-10 py-9">
      <header className="flex flex-col gap-2.5">
        <span className="font-mono text-micro tracking-[0.14em] text-primary uppercase">
          sincpro :: erp
        </span>
        <h1 className="text-display font-semibold text-ink">Movimiento</h1>
        <p className="max-w-[74ch] text-body text-muted">
          Una sola rule:{" "}
          <strong className="font-medium text-ink">
            una animación existe para explicar de dónde salió algo, nunca para adornar
          </strong>
          . Un panel que entra desde la derecha dice que vino de ahí y que ahí vuelve. Un
          color que cambia en 90 ms dice que el control respondió. Todo lo demás —un contador
          que sube, una tarjeta que rebota— es tiempo que alguien espera sin recibir
          información.
        </p>
        <p className="max-w-[74ch] text-body text-muted">
          El techo de 240 ms es deliberado: arriba de ~250 ms una interfaz de trabajo empieza
          a sentirse lenta, y esto se usa ocho horas seguidas.
        </p>
      </header>

      <Section
        id="duraciones"
        title="Tres duraciones"
        rule="Apretá «probar» en cada una. Escritas se leen igual; movidas no se parecen en nada — por eso la escala se decide acá y no en una tabla."
      >
        <div className="overflow-hidden rounded-box border border-line bg-surface">
          {DURACIONES.map((d) => (
            <div
              key={d.token}
              className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line px-4 py-4 first:border-t-0"
            >
              <div className="w-[260px] shrink-0">
                <div className="font-mono text-micro text-primary">{d.name}</div>
                <div className="text-meta text-ink">{d.que}</div>
                <div className="text-micro text-muted">{d.donde}</div>
              </div>
              <Prueba ms={d.ms} ease="cubic-bezier(0.16, 1, 0.3, 1)" />
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="curvas"
        title="Dos curvas, repartidas por dirección"
        rule="Lo que ENTRA desacelera: llega y se queda. Lo que se mueve entre dos estados que ya existían va simétrico. No hay una tercera."
      >
        <div className="flex flex-col gap-5 rounded-box border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="w-[260px] shrink-0">
              <div className="font-mono text-micro text-primary">--ease-out</div>
              <div className="text-micro text-muted">
                cubic-bezier(0.16, 1, 0.3, 1) — entra algo nuevo
              </div>
            </div>
            <Prueba ms={240} ease="cubic-bezier(0.16, 1, 0.3, 1)" />
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="w-[260px] shrink-0">
              <div className="font-mono text-micro text-primary">--ease-in-out</div>
              <div className="text-micro text-muted">
                cubic-bezier(0.4, 0, 0.2, 1) — se mueve entre dos estados
              </div>
            </div>
            <Prueba ms={240} ease="cubic-bezier(0.4, 0, 0.2, 1)" />
          </div>
        </div>
      </Section>

      <Section
        id="reducido"
        title="Movimiento reducido"
        rule="Declarado en `tokens.css` y no en cada componente: una regla de accesibilidad repartida en cuarenta archivos se cumple en treinta."
      >
        <div className="rounded-box border border-line-strong bg-surface p-4">
          <p className="max-w-[74ch] text-meta text-ink">
            Con <span className="font-mono text-micro">prefers-reduced-motion</span> activo
            todo baja a <strong className="font-medium">1 ms</strong>, no a cero. El
            milisegundo mantiene vivo el evento{" "}
            <span className="font-mono text-micro">transitionend</span>, del que cuelgan los
            componentes que desmontan algo al terminar la animación — a cero ese evento no
            dispara en algunos navegadores y el menú no se cierra nunca.
          </p>
        </div>
      </Section>
    </div>
  ),
};
