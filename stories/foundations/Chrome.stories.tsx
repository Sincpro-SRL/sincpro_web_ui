import { Button } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { contrast, ratioLabel } from "../support/contrast";

/* ==================================================================== *
 *  THE CHROME — choosing the base.
 *
 *  «it doesn't look good, or it's too black». The diagnosis is not the
 *  brightness: it is the TEMPERATURE. `#121016` is a cold black —violet tint—
 *  and the canvas is `#FAF9F7`, a warm white. Two surfaces of opposite
 *  temperatures stuck together do not read as one product: they read as two
 *  products.
 *
 *  All six candidates pass AA for the gold, the text, the muted text and the
 *  link, so **contrast does not decide here**. The eye decides, and that is why
 *  these are not swatches: it is the real bar, six times, with the same things
 *  inside. A chrome color is not judged in a 200 px square — it is judged with
 *  a gold, an active tab and a muted text on top of it.
 * ==================================================================== */

interface Candidate {
  id: string;
  name: string;
  /** The background of the bar. */
  base: string;
  /** One step up: active tab, open menu. */
  raised: string;
  /** What it wins and what it loses. Without this the choice is «the one I
   *  like», and a month from now nobody knows why this one stayed. */
  note: string;
  /** The one that stayed. The whole comparison is kept and not just the winner:
   *  the day someone proposes going back to black, the answer is here with its
   *  reason. */
  selected?: boolean;
}

const CANDIDATES: Candidate[] = [
  {
    id: "A",
    name: "Negro frío · #121016",
    base: "#121016",
    raised: "#1C1922",
    note: "El actual. Tinte violeta contra un lienzo cálido — es el choque de temperatura que se siente como dureza.",
  },
  {
    id: "B",
    name: "Carbón cálido · #1C1A17",
    base: "#1C1A17",
    raised: "#262320",
    note: "La misma familia que el texto (#1A1714) y que el lienzo. El dorado se apoya sin pelearse. Es el cambio mínimo que arregla el diagnóstico.",
  },
  {
    id: "C",
    name: "Carbón suave · #232019",
    base: "#232019",
    raised: "#2D2922",
    note: "Un peldaño más claro. Deja de leerse como negro: lee como tinta. Más aire, menos peso.",
  },
  {
    id: "D",
    name: "Marino profundo · #141B2E  ← ELEGIDO",
    base: "#141B2E",
    raised: "#1E2740",
    selected: true,
    note: "El azul de marca oscurecido. Es el otro extremo del degradado azul→dorado, así que el wash NACE del propio fondo en vez de pintarse encima — por eso acá el lavado se lee como luz y sobre el negro se leía como mancha. Obligó a un ajuste: el enlace pasó de #6FA0EA a #7FD1E8, no por contraste (6,44:1 pasaba AA) sino por MATIZ — el azul estaba a 8° del fondo, o sea azul sobre azul.",
  },
  {
    id: "E",
    name: "Marino vivo · #1B2A4A",
    base: "#1B2A4A",
    raised: "#26375C",
    note: "El `--color-data` tal cual, sin oscurecer. Se ve azul de verdad. Riesgo: compite con el azul de navegación del lienzo.",
  },
  {
    id: "F",
    name: "Pizarra · #262B33",
    base: "#262B33",
    raised: "#333945",
    note: "Gris azulado, nada de negro. El más neutro y el más «herramienta». El dorado luce menos porque el fondo ya tiene luz.",
  },
];

const GOLD = "#C89B3C";
const INK = "#E8E4DE";
const MUTED = "#A39B90";
const LINK = "#6FA0EA";
/* The chosen one shows its final link color: a pale periwinkle of the navy's own family,
   separated by luminance (9,46:1). The rest keep the old darker blue on purpose, so you
   can see why it had to change — at 6,44:1 it sinks into the navy. */
const LINK_SELECTED = "#A9C1F2";

/** The real bar, with everything that actually lives in the chrome: the brand
 *  in gold, two tabs (one active), the search box, and the CTA. */
function ChromeBar({ c }: { c: Candidate }) {
  return (
    <div className="overflow-hidden rounded-box" style={{ background: c.base }}>
      {/* The brand wash, which can only be judged over its own background. */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          backgroundImage:
            "linear-gradient(104deg, rgba(27,42,74,0.55) 0%, rgba(27,42,74,0.20) 40%, rgba(200,155,60,0.14) 76%, transparent 100%)",
        }}
      >
        <span
          className="font-mono text-micro tracking-[0.2em] uppercase"
          style={{ color: INK }}
        >
          <span style={{ color: GOLD }}>◆</span> Sincpro
          <span style={{ color: MUTED }}> · </span>Ventas
        </span>

        <span className="ml-auto flex items-center gap-2">
          <span className="text-micro" style={{ color: c.selected ? LINK_SELECTED : LINK }}>
            ⌕ explorar datos
          </span>
          <span
            className="rounded-control px-1.5 py-0.5 font-mono text-micro"
            style={{ background: "rgba(232,228,222,0.10)", color: MUTED }}
          >
            ⌘K
          </span>
          <Button role="primary" size="sm" surface="chrome">
            + Crear
          </Button>
        </span>
      </div>

      <div className="rule-brand" />

      {/* The row of tabs: it is where `raised` has to stand apart from the
          background without turning into another surface. */}
      <div className="flex items-stretch gap-0.5 px-1.5 pt-1.5">
        <span
          className="rounded-t-control px-2.5 py-1 text-micro"
          style={{ background: c.raised, color: INK }}
        >
          labs.csv
        </span>
        <span className="px-2.5 py-1 text-micro" style={{ color: MUTED }}>
          FAC/2026/0118
        </span>
        <span className="px-2.5 py-1 text-micro" style={{ color: MUTED }}>
          Catálogo
        </span>
      </div>
    </div>
  );
}

function Card({ c }: { c: Candidate }) {
  const gold = contrast(GOLD, c.base);
  const ink = contrast(INK, c.base);
  const canvas = contrast(c.base, "#FAF9F7");

  return (
    <section
      className={`flex flex-col gap-2.5 ${
        c.selected ? "rounded-box bg-accent/8 p-4 -m-4" : ""
      }`}
    >
      <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-mono text-micro text-primary">{c.id}</span>
        <h3 className={`text-lead text-ink ${c.selected ? "font-semibold" : "font-medium"}`}>
          {c.name}
        </h3>
        <span className="ml-auto flex items-center gap-3 font-mono text-micro tabular-nums text-muted">
          <span>dorado {ratioLabel(gold)}</span>
          <span>texto {ratioLabel(ink)}</span>
          <span>vs lienzo {ratioLabel(canvas)}</span>
        </span>
      </header>

      <ChromeBar c={c} />

      {/* The seam: the chrome ends and the canvas begins. It is the edge you see
          all day long and where the temperature clash shows or does not. */}
      <div className="flex items-center gap-3 rounded-b-box bg-ground px-3 py-2.5">
        <span className="text-meta text-ink">FAC/2026/0118</span>
        <span className="rounded-pill bg-ink/6 px-2 py-0.5 text-micro text-muted">
          derivado
        </span>
        <span className="font-mono text-micro tabular-nums text-muted">
          3 líneas · Bs. 24.090,00
        </span>
      </div>

      <p className="max-w-[78ch] text-meta text-muted">{c.note}</p>
    </section>
  );
}

const meta: Meta = {
  title: "1 · Fundamentos/Cromo",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Seis candidatos para la base del cromo. Los seis pasan AA para el dorado, el texto, el tenue y el enlace — el contraste no decide, decide el ojo. Por eso se muestran como la barra real y no como swatches.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Candidates: Story = {
  render: () => (
    <div className="flex flex-col gap-9 bg-ground px-10 py-9">
      <header className="flex flex-col gap-2.5">
        <span className="font-mono text-micro tracking-[0.14em] text-primary uppercase">
          sincpro :: erp
        </span>
        <h1 className="text-display font-semibold text-ink">Cromo · elegir la base</h1>
        <p className="max-w-[74ch] text-body text-muted">
          El problema del <strong className="font-medium text-ink">#121016</strong> no es que
          sea oscuro: es que es un negro <em>frío</em> —tinte violeta— pegado a un lienzo
          cálido. Dos superficies de temperaturas opuestas no se leen como un producto, se
          leen como dos. Mirá la costura de abajo de cada barra, que es donde se nota todo el
          día.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {CANDIDATES.map((c) => (
          <Card key={c.id} c={c} />
        ))}
      </div>
    </div>
  ),
};
