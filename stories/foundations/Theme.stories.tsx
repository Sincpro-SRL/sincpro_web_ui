import {
  Block,
  Button,
  Callout,
  Field,
  Meter,
  SegmentedControl,
  Tag,
  TextInput,
  type Theme,
  ThemeProvider,
  ThemeSwitcher,
  type Tone,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

/* ==================================================================== *
 *  THEME — the same tokens, two palettes.
 *
 *  Components never read the theme: `bg-surface`, `text-ink` and `border-line` resolve to
 *  another value under `data-theme="dark"` (or under `prefers-color-scheme: dark` when
 *  nothing forces light). These stories show that, with the real components, not swatches:
 *  a palette is judged with a gold button, a tag and a line of muted text on top of it.
 * ==================================================================== */
const meta: Meta = {
  /* Also run in dark by the `storybook-dark` test project. */
  tags: ["theme"],
  title: "1 · Fundamentos/Tema",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`ThemeProvider` escribe `data-theme` en `<html>` (o en un elemento); `useTheme()` lo lee y lo cambia; `ThemeSwitcher` es el control mínimo. Las paletas viven en `tokens.css`. Sin provider, la hoja sigue `prefers-color-scheme`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const TONES: readonly Tone[] = ["neutral", "info", "good", "warn", "bad", "accent"];

/** The same screen fragment on both surfaces: raised box, chrome strip, fields, tones. */
function Sample() {
  const [name, setName] = useState("Distribuidora Andina S.R.L.");
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-box border border-line bg-ground p-4 text-ink">
      <div className="flex items-center gap-2 rounded-control border-b border-chrome-edge bg-chrome px-3 py-2 text-meta text-chrome-ink">
        <span className="text-chrome-accent">Sincpro</span>
        <span className="text-chrome-muted">Facturas / FAC/2026/0118</span>
      </div>
      <div className="flex flex-col gap-3 rounded-box border border-line bg-surface p-4 shadow-raised">
        <div className="flex flex-wrap gap-2">
          <Button role="primary" size="sm">
            Registrar pago
          </Button>
          <Button role="secondary" size="sm">
            Duplicar
          </Button>
          <Button role="ghost" size="sm">
            Ver cliente
          </Button>
          <Button role="danger" size="sm">
            Anular
          </Button>
        </div>
        <Field label="Cliente" hint="Como figura en el NIT.">
          <TextInput value={name} onChange={setName} />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map((t) => (
            <Tag key={t} tone={t}>
              {t}
            </Tag>
          ))}
        </div>
        <Meter width="w-full" label="Crédito usado" value={42} maxValue={100} />
        <Meter width="w-full" label="Stock" value={96} maxValue={100} />
        <Callout tone="warn">Esta factura vence en 3 días.</Callout>
        <p className="text-meta text-muted">Texto tenue sobre la superficie elevada.</p>
      </div>
    </div>
  );
}

/** Un interruptor que cambia el tema de un SUBÁRBOL (`element`), no el de la página: así la
 *  historia no pelea con la barra de herramientas de Storybook. */
function Scoped() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  return (
    <ThemeProvider value={theme} onChange={setTheme} element={element}>
      <div ref={setElement} className="flex flex-col gap-3 rounded-panel bg-ground p-4">
        <ThemeSwitcher />
        <Sample />
      </div>
    </ThemeProvider>
  );
}

export const Interruptor: Story = { render: () => <Scoped /> };

/** El claro y el oscuro forzados a la vez, uno al lado del otro, sin importar el tema de la
 *  página: `data-theme` en un ancestro re-apunta los tokens de TODO lo que tiene debajo. */
export const LadoALado: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div data-theme="light" className="min-w-0 rounded-panel bg-ground p-3">
        <Sample />
      </div>
      <div data-theme="dark" className="min-w-0 rounded-panel bg-ground p-3">
        <Sample />
      </div>
    </div>
  ),
};

/** Abierta desde la barra de herramientas o con `&globals=theme:dark` en la URL. */
export const Oscuro: Story = {
  globals: { theme: "dark" },
  render: () => <Sample />,
};

/* A teal brand, far enough from the system's navy and gold to see that EVERY palette took it. */
const MARCA = {
  "--brand-primary": "#0f5c4d",
  "--brand-primary-hover": "#0a4539",
  "--brand-accent": "#e2a93b",
  "--brand-accent-hover": "#cf9629",
  "--brand-chrome": "#0d2b26",
  "--brand-chrome-raised": "#163c35",
  "--brand-chrome-edge": "#0d2b26",
  "--brand-chrome-link": "#9fd6c6",
  "--brand-ground": "#f4f7f6",
  "--brand-dark-ground": "#111816",
  "--brand-dark-primary": "#7fcbb6",
  "--brand-dark-primary-hover": "#a3dccb",
  "--brand-dark-accent": "#e2a93b",
  "--brand-dark-accent-hover": "#ecbd5c",
  "--brand-dark-chrome": "#061a17",
  "--brand-dark-chrome-raised": "#0f2a25",
  "--brand-dark-chrome-link": "#9fd6c6",
} as CSSProperties;

/** **La marca se pone una vez.** Las variables `--brand-*` (las del claro) y `--brand-dark-*`
 *  (las del oscuro) van en `:root` — acá, en el ancestro de los dos lados — y TODAS las
 *  copias de la paleta las toman: el claro, el oscuro, y un claro anidado dentro de un
 *  oscuro. Antes había que repetir cada color en cada bloque de tema. */
export const Marca: Story = {
  render: () => (
    <div style={MARCA} className="grid gap-4 md:grid-cols-2">
      <div
        data-theme="light"
        data-testid="claro"
        className="min-w-0 rounded-panel bg-ground p-3"
      >
        <Sample />
      </div>
      <div
        data-theme="dark"
        data-testid="oscuro"
        className="min-w-0 rounded-panel bg-ground p-3"
      >
        <Sample />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const token = (testId: string, name: string) => {
      const side = canvasElement.querySelector(`[data-testid="${testId}"]`);
      if (side === null) throw new Error(`no ${testId} side`);
      return getComputedStyle(side).getPropertyValue(name).trim();
    };
    await expect(token("claro", "--color-primary")).toBe("#0f5c4d");
    await expect(token("oscuro", "--color-primary")).toBe("#7fcbb6");
    await expect(token("claro", "--color-chrome")).toBe("#0d2b26");
    // The paper is the brand's too: a cooler white, a deeper night.
    await expect(token("claro", "--color-ground")).toBe("#f4f7f6");
    await expect(token("oscuro", "--color-ground")).toBe("#111816");
    // What a brand leaves unset keeps the system's value.
    await expect(token("claro", "--color-on-accent")).toBe("#1a1714");
  },
};

const ESQUINAS = [
  { value: "0", label: "Recto" },
  { value: "1", label: "Sistema" },
  { value: "1.5", label: "Redondo" },
];

/** The knob goes on `:root`, as a brand would put it; leaving the story gives it back. */
function Esquinas() {
  const [radius, setRadius] = useState("1");
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-radius", radius);
    return () => {
      root.style.removeProperty("--brand-radius");
    };
  }, [radius]);
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        aria-label="Esquinas"
        value={radius}
        onChange={setRadius}
        options={ESQUINAS}
      />
      <Sample />
    </div>
  );
}

/** **Las esquinas, con una sola perilla.** `--brand-radius` en `:root` multiplica toda la
 *  escala: `0` es todo recto (las cápsulas también), `1` es la del sistema, `1.5` más redonda.
 *  Los pasos guardan su proporción, así un menú sigue concéntrico con sus filas. Un paso
 *  suelto también se puede fijar (`--brand-radius-control: 6px`). */
export const EsquinasDeLaMarca: Story = {
  name: "Esquinas",
  render: () => <Esquinas />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const corner = () =>
      getComputedStyle(canvas.getByRole("button", { name: "Duplicar" })).borderTopLeftRadius;
    await expect(corner()).toBe("8px");
    await userEvent.click(canvas.getByRole("radio", { name: "Recto" }));
    await waitFor(() => expect(corner()).toBe("0px"));
    await userEvent.click(canvas.getByRole("radio", { name: "Redondo" }));
    await waitFor(() => expect(corner()).toBe("12px"));
    await userEvent.click(canvas.getByRole("radio", { name: "Sistema" }));
    await waitFor(() => expect(corner()).toBe("8px"));
  },
};

/* A zone that turns four components — and a part rule an application would write. */
const A_MEDIDA = {
  "--ui-button-radius": "0px",
  "--ui-control-radius": "0px",
  "--ui-tag-radius": "var(--radius-mark)",
  "--ui-card-bg": "var(--color-ground)",
  "--ui-card-border": "var(--color-line-strong)",
} as CSSProperties;

const PARTE = `[data-zone="a-medida"] [data-ui="button"][data-emphasis="primary"] {
  text-transform: uppercase;
}`;

function Muestra({ zone }: { zone: string }) {
  return (
    <Block title="Cobro">
      <div className="flex flex-col gap-3" data-zone={zone}>
        <div className="flex flex-wrap gap-2">
          <Button role="primary" size="sm">
            Cobrar
          </Button>
          <Button role="secondary" size="sm">
            Duplicar
          </Button>
          <Tag tone="good">Pagada</Tag>
        </div>
        <Field label="Cliente">
          <TextInput value="Distribuidora Andina" onChange={() => {}} />
        </Field>
      </div>
    </Block>
  );
}

/** **Un componente a medida.** Sin copiar ningún componente: la zona de la derecha pone
 *  `--ui-button-radius`, `--ui-control-radius`, `--ui-tag-radius` y `--ui-card-*`, y una regla
 *  sobre una parte (`[data-ui="button"][data-emphasis="primary"]`). La de la izquierda no pone
 *  nada y se ve como siempre. En el tema oscuro, los fondos siguen al tema. */
export const UnComponenteAMedida: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2">
      <style>{PARTE}</style>
      <div data-testid="sistema">
        <Muestra zone="sistema" />
      </div>
      <div data-testid="a-medida" style={A_MEDIDA} data-zone="a-medida">
        <Muestra zone="a-medida" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const side = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    const style = (id: string, selector: string) =>
      getComputedStyle(side(id).querySelector(selector)!);
    /* A colour token resolved where it is used, to compare with what was painted. */
    const painted = (id: string, token: string) => {
      const probe = document.createElement("div");
      probe.style.background = `var(${token})`;
      side(id).append(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    };

    // Setting nothing changes nothing.
    await expect(style("sistema", '[data-ui="button"]').borderTopLeftRadius).toBe("8px");
    await expect(style("sistema", "input").borderTopLeftRadius).toBe("8px");
    await expect(style("sistema", '[data-ui="block"]').backgroundColor).toBe(
      painted("sistema", "--color-surface"),
    );
    await expect(style("sistema", '[data-ui="button"]').textTransform).toBe("none");

    // The zone turns each piece it names, and only those.
    await expect(style("a-medida", '[data-ui="button"]').borderTopLeftRadius).toBe("0px");
    await expect(style("a-medida", "input").borderTopLeftRadius).toBe("0px");
    await expect(style("a-medida", '[data-ui="tag"]').borderTopLeftRadius).toBe("4px");
    await expect(style("a-medida", '[data-ui="block"]').backgroundColor).toBe(
      painted("a-medida", "--color-ground"),
    );
    // A part rule reaches the variant it names.
    await expect(
      style("a-medida", '[data-ui="button"][data-emphasis="primary"]').textTransform,
    ).toBe("uppercase");
    await expect(
      style("a-medida", '[data-ui="button"][data-emphasis="secondary"]').textTransform,
    ).toBe("none");
  },
};
