import { Button } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ColorSwatch, Row, Section, Swatch, type TokenColor } from "../support/parts";

/* ==================================================================== *
 *  FOUNDATIONS — and why every number is out in the open.
 *
 *  Nothing on this page is written by hand: the value is READ from
 *  `tokens.css` with `getComputedStyle` and the contrast is COMPUTED with the
 *  WCAG formula. If tomorrow the gold changes hue, this page says so by itself.
 *
 *  A token without its number invites someone to use it where it cannot be
 *  read — which is exactly how the gold ended up being a brand color that could
 *  not say anything.
 * ==================================================================== */

const CANVAS = "--color-ground";
const CHROME = "--color-chrome";

const canvas: TokenColor[] = [
  { token: "--color-ground", note: "el fondo de todo" },
  { token: "--color-surface", note: "la superficie elevada" },
  { token: "--color-ink", note: "texto", against: CANVAS },
  { token: "--color-muted", note: "texto tenue: etiquetas, unidades", against: CANVAS },
  {
    token: "--color-line",
    note: "separador común — no es texto",
    against: CANVAS,
    usage: "decorative",
  },
  {
    token: "--color-line-strong",
    note: "borde de caja, cabecera de tabla",
    against: CANVAS,
    usage: "decorative",
  },
];

const chrome: TokenColor[] = [
  { token: "--color-chrome", note: "la base" },
  { token: "--color-chrome-raised", note: "pestaña activa, menú desplegado" },
  { token: "--color-chrome-ink", note: "texto", against: CHROME },
  { token: "--color-chrome-muted", note: "texto tenue", against: CHROME },
  { token: "--color-chrome-accent", note: "el dorado — acá SÍ es texto", against: CHROME },
  { token: "--color-chrome-link", note: "lo navegable sobre oscuro", against: CHROME },
];

const action: TokenColor[] = [
  {
    token: "--color-accent",
    note: "HACER · el CTA, con ink encima",
    asBackground: "--color-ink",
  },
  {
    token: "--color-accent-hover",
    note: "hover · con ink encima",
    asBackground: "--color-ink",
  },
  { token: "--color-primary", note: "IR · enlaces, nombres de fila, migas", against: CANVAS },
  { token: "--color-danger", note: "DESTRUIR · y no se deshace", against: CANVAS },
];

const state: TokenColor[] = [
  { token: "--color-good", note: "sobre el lienzo", against: CANVAS },
  { token: "--color-warn", note: "sobre el lienzo", against: CANVAS },
  { token: "--color-bad", note: "sobre el lienzo", against: CANVAS },
  { token: "--color-chrome-good", note: "el mismo, sobre el cromo", against: CHROME },
  { token: "--color-chrome-warn", note: "el mismo, sobre el cromo", against: CHROME },
  { token: "--color-chrome-bad", note: "el mismo, sobre el cromo", against: CHROME },
];

const data: TokenColor[] = [
  { token: "--color-data", note: "una barra, una serie, un eje", against: CANVAS },
  {
    token: "--color-data-soft",
    note: "la segunda serie — elemento gráfico",
    against: CANVAS,
    usage: "graphic",
  },
];

const meta: Meta = {
  title: "1 · Fundamentos/Color",
  // This page is judged on the canvas even though it shows chrome tokens:
  // the chrome shows up inside its own swatches.
  globals: { backgrounds: { value: "canvas" } },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Cromo oscuro, lienzo claro. Los valores se leen de `tokens.css` en vivo y los contrastes se calculan con WCAG 2.1 — nada está escrito a mano, así que esta página no puede desincronizarse del código.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Palette: Story = {
  render: () => (
    <div className="flex flex-col gap-10 bg-ground px-10 py-9">
      <header className="flex flex-col gap-2.5">
        <span className="font-mono text-micro tracking-[0.14em] text-primary uppercase">
          sincpro :: erp
        </span>
        <h1 className="text-display font-semibold text-ink">Color</h1>
        <p className="max-w-[72ch] text-body text-muted">
          Un número ordena la decisión entera: el dorado sobre el lienzo da{" "}
          <strong className="font-medium text-ink">2,43:1</strong> y sobre el cromo{" "}
          <strong className="font-medium text-ink">7,39:1</strong>. El dorado no es un color
          de aplicación clara — es un color de superficie oscura. Por eso la interfaz tiene
          dos superficies: el cromo es la marca y ahí el dorado es texto; el lienzo es donde
          viven los datos y ahí aparece sólo como fondo del CTA.
        </p>
      </header>

      <Section
        id="canvas"
        title="Lienzo · el espacio de trabajo"
        rule="Claro y cálido. Acá el dorado no puede aparecer como texto ni como borde: a 2,43:1 no alcanza ni para texto grande ni para un elemento gráfico que signifique algo."
      >
        <Row>
          {canvas.map((t) => (
            <ColorSwatch key={t.token} {...t} />
          ))}
        </Row>
      </Section>

      <Section
        id="chrome"
        title="Cromo · header, riel, pestañas, barra de actividad"
        rule="Oscuro. Es la marca, y separa la navegación del contenido de un vistazo — hoy el encabezado casi blanco y el área de trabajo casi blanca son la misma superficie, así que nada dice dónde termina una y empieza la otra."
      >
        <Row>
          {chrome.map((t) => (
            <ColorSwatch key={t.token} {...t} />
          ))}
        </Row>
      </Section>

      <Section
        id="action"
        title="Acción · hacer, ir, destruir"
        rule="Tres roles y ni uno más. Un solo dorado lleno por superficie. El azul deja de ser un CTA y pasa a significar «esto lleva a otro lado», que es lo que hace que el name de una fila se descubra solo sin explicar el gesto."
      >
        <Row>
          {action.map((t) => (
            <ColorSwatch key={t.token} {...t} />
          ))}
        </Row>
      </Section>

      <Section
        id="state"
        title="Estado"
        rule="Apagados a propósito: esto es una herramienta, no un tablero de alarmas. Los seis pasan AA como texto sobre su propia superficie — no son colores nuevos, es el mismo significado medido contra el otro fondo."
      >
        <Row>
          {state.map((t) => (
            <ColorSwatch key={t.token} {...t} />
          ))}
        </Row>
      </Section>

      <Section
        id="data"
        title="Item · una barra, una serie, un eje"
        rule="No es acción y no se toca. Que el dato y el botón compartieran color es lo que hacía que ninguno de los dos significara algo."
      >
        <Row>
          {data.map((t) => (
            <ColorSwatch key={t.token} {...t} />
          ))}
        </Row>
      </Section>

      <Section
        id="brand"
        title="Marca · el degradado azul → dorado, cuatro usos"
        rule="Y ni uno más: si se agrega un quinto, hay que sacar uno. Nunca detrás de un dato, nunca dentro de una tarjeta, nunca en un control de 28 px — ahí produce banding y contraste variable."
      >
        <div className="flex flex-col gap-5">
          <Swatch
            name="brand-wash"
            note="el lavado detrás de la barra de título. Sobre oscuro se lee como luz."
          >
            <div className="brand-wash flex h-14 items-center rounded-box bg-chrome px-5">
              <span className="font-mono text-micro tracking-[0.14em] text-chrome-accent uppercase">
                ◆ sincpro · erp
              </span>
            </div>
          </Swatch>
          <Swatch
            name="rule-brand"
            note="1 px bajo esa barra, transparente en las dos puntas: no es el borde de una caja."
          >
            <div className="rule-brand w-[560px]" />
          </Swatch>
          <Swatch
            name="btn-accent"
            note="apenas un brillo de metal. Un degradado fuerte convierte una herramienta en una landing page."
          >
            <Button role="primary">+ Crear</Button>
          </Swatch>
          <Swatch
            name="bar-brand"
            note="la barra de un cobro en curso. El dato va al lado, no adentro."
          >
            <div className="flex items-center gap-2.5">
              <div className="h-1.5 w-[280px] overflow-hidden rounded-pill bg-line">
                <div className="bar-brand h-full w-[66%] rounded-pill" />
              </div>
              <span className="font-mono text-micro tabular-nums text-muted">66%</span>
            </div>
          </Swatch>
        </div>
      </Section>
    </div>
  ),
};
