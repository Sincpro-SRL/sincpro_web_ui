import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { readVar } from "../support/contrast";
import { Section } from "../support/parts";

/* ==================================================================== *
 *  TIPOGRAFÍA — seis peldaños y una regla de familia.
 *
 *  El state del que salió esta escala está medido: DIECISÉIS tamaños
 *  distinct entre 0,55rem y 1rem, trece de ellos escritos literales en el
 *  lugar de uso (`text-[0.68rem]`, `text-[0.72rem]`, `text-[0.66rem]`…). Eso no
 *  es densidad: es cada tamaño elegido a ojo en el momento de escribir el
 *  componente. El resultado son dos cosas que significan lo mismo viéndose
 *  distinto, y dos que significan cosas distintas viéndose igual.
 *
 *  Y la regla de familia estaba escrita y NO se cumplía: 242 usos de
 *  `font-mono` y CERO de `font-sans`. La monoespaciada no era la identidad de
 *  nada — era la única fuente, y por eso `ds_01a0999f…` y «buscar por name…»
 *  se veían exactamente igual.
 * ==================================================================== */

/** El tamaño real que el navegador resolvió, en px. Leído, no escrito: si la
 *  escala cambia, esta página cambia sola. */
function usePx(token: string): string {
  const [px, setPx] = useState("");
  useEffect(() => {
    const rem = readVar(token);
    if (rem === "") return;
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;font-size:${rem}`;
    document.body.appendChild(probe);
    setPx(`${Math.round(parseFloat(getComputedStyle(probe).fontSize) * 100) / 100}px`);
    probe.remove();
  }, [token]);
  return px;
}

const ESCALA = [
  {
    clase: "text-display",
    token: "--text-display",
    uso: "El título del espacio de trabajo, y nada más.",
    muestra: "Sincpro · Ventas",
    peso: "font-semibold",
  },
  {
    clase: "text-title",
    token: "--text-title",
    uso: "El título de un panel o de un registro.",
    muestra: "Importadora y Exportadora del Oriente Boliviano Ltda.",
    peso: "font-semibold",
  },
  {
    clase: "text-lead",
    token: "--text-lead",
    uso: "El name de una fila; el rótulo que encabeza.",
    muestra: "El vistazo",
    peso: "font-medium",
  },
  {
    clase: "text-body",
    token: "--text-body",
    uso: "El tamaño de lectura por defecto de la herramienta.",
    muestra: "Genera un sintético con el plan automático y lo registra en el catálogo.",
    peso: "",
  },
  {
    clase: "text-meta",
    token: "--text-meta",
    uso: "El subtítulo de una fila, la unidad, el dato secundario.",
    muestra: "3 líneas · Bs. 24.090,00 · vence 21 nov 2026",
    peso: "",
  },
  {
    clase: "text-micro",
    token: "--text-micro",
    uso: "La etiqueta de una cápsula, el índice de una nota.",
    muestra: "derivado",
    peso: "font-medium",
  },
];

function FilaEscala({ e }: { e: (typeof ESCALA)[number] }) {
  const px = usePx(e.token);
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-line px-4 py-3.5 first:border-t-0">
      <span className="w-[104px] shrink-0 font-mono text-micro text-primary">
        {e.clase.replace("text-", "")}
      </span>
      <span className="w-[64px] shrink-0 font-mono text-micro tabular-nums text-muted">
        {px || "—"}
      </span>
      <span className="w-[280px] shrink-0 text-micro text-muted">{e.uso}</span>
      <span className={`min-w-0 text-ink ${e.clase} ${e.peso}`}>{e.muestra}</span>
    </div>
  );
}

const meta: Meta = {
  title: "1 · Fundamentos/Tipografia",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Escala: Story = {
  render: () => (
    <div className="flex flex-col gap-10 bg-ground px-10 py-9">
      <header className="flex flex-col gap-2.5">
        <span className="font-mono text-micro tracking-[0.14em] text-primary uppercase">
          sincpro :: erp
        </span>
        <h1 className="text-display font-semibold text-ink">Tipografía</h1>
        <p className="max-w-[74ch] text-body text-muted">
          Seis peldaños, base <strong className="font-medium text-ink">13 px</strong>, razón
          ~1,15. La escala <em>subió</em> respecto de lo que había y es deliberado: el cuerpo
          estaba en 12 px y el metadato bajaba a 10 px, todo en monoespaciada. Eso no es una
          herramienta densa, es una herramienta que cuesta leer.{" "}
          <strong className="font-medium text-ink">
            La densidad que vale la pena se gana con aire y jerarquía
          </strong>{" "}
          —menos cosas gritando a la vez—, no achicando la letra hasta que entre.
        </p>
      </header>

      <Section
        id="escala"
        title="La escala · seis peldaños"
        rule="Cada peldaño trae su interlineado, que es la mitad del trabajo: 11 px a interlineado 1,5 flota, y 17 px a 1,5 se despega de su propio bloque."
      >
        <div className="overflow-hidden rounded-box border border-line bg-surface">
          {ESCALA.map((e) => (
            <FilaEscala key={e.clase} e={e} />
          ))}
        </div>
      </Section>

      <Section
        id="familias"
        title="Las dos familias · la regla que decide cuál va"
        rule="La monoespaciada significa algo sólo mientras sea la excepción: usada en todo no dice nada, se lee peor y hace que un reporte parezca una terminal. Va sólo en CÓDIGOS — lo que se copia y se compara carácter por carácter. Las cifras van en proporcional con cifras tabulares (`tabular-nums`): se alinean igual y se leen como un reporte."
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-2.5 rounded-box border border-line bg-surface p-4">
            <span className="font-mono text-micro tracking-[0.14em] text-ink uppercase">
              mono
            </span>
            <p className="text-meta text-muted">
              Los <strong className="font-medium text-ink">códigos</strong>: lo que se copia y
              se compara carácter por carácter — identificadores, huellas, claves, nombres de
              archivo, fragmentos de código. Se pide a mano (`mono`), nunca es el default.
            </p>
            <div className="flex flex-col gap-1 rounded-control bg-ground p-2.5 font-mono text-meta text-ink">
              <span>ds_01a0999fc1ae7525a9cba0278b5ae734</span>
              <span>sha256:9f2b7c1d8e4a6053</span>
              <span>FAC/2026/0118 · SKU-00412</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 rounded-box border border-line bg-surface p-4">
            <span className="font-mono text-micro tracking-[0.14em] text-ink uppercase">
              sans
            </span>
            <p className="text-meta text-muted">
              Lo que una <strong className="font-medium text-ink">persona</strong> escribió
              para ser leído — frases, ayudas, rótulos, títulos, menús — y{" "}
              <strong className="font-medium text-ink">todas las cifras</strong>, con cifras
              tabulares para que se alineen en columna.
            </p>
            <div className="flex flex-col gap-1 rounded-control bg-ground p-2.5 text-meta text-ink">
              <span>Registrá el pago para cerrar la factura</span>
              <span>Distribuidora Andina S.R.L.</span>
              <span className="tabular-nums">Bs. 199.244,00 · 2.688.991 filas</span>
            </div>
          </div>
        </div>

        <div className="mt-3.5 rounded-box border border-line-strong bg-surface p-4">
          <p className="text-meta text-ink">
            <strong className="font-medium">Ante la duda, una sola pregunta:</strong> si esto
            se desalinea con la línea de abajo, ¿se pierde algo? Si la respuesta es no, va en
            proporcional.
          </p>
        </div>
      </Section>

      <Section
        id="voz"
        title="La voz de marca · mono en versalitas"
        rule="El rótulo de sección en monoespaciada, versalitas y tracking 0,14em. Es literalmente el `SYS :: LANZAMIENTO` de la identidad, y ya estaba aplicado en el producto — es lo único de la tipografía actual que no había que tocar."
      >
        <div className="flex flex-col gap-3 rounded-box border border-line bg-surface p-5">
          <span className="font-mono text-micro tracking-[0.14em] text-ink uppercase">
            el vistazo
          </span>
          <span className="font-mono text-micro tracking-[0.14em] text-ink uppercase">
            líneas — 3
          </span>
          <span className="font-mono text-micro tracking-[0.14em] text-ink uppercase">
            procedencia
          </span>
        </div>
      </Section>
    </div>
  ),
};
