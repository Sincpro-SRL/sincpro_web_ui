import {
  Button,
  Callout,
  Field,
  Meter,
  Tag,
  TextInput,
  type Theme,
  ThemeProvider,
  ThemeSwitcher,
  type Tone,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

/* ==================================================================== *
 *  THEME — the same tokens, two palettes.
 *
 *  Components never read the theme: `bg-surface`, `text-ink` and `border-line` resolve to
 *  another value under `data-theme="dark"` (or under `prefers-color-scheme: dark` when
 *  nothing forces light). These stories show that, with the real components, not swatches:
 *  a palette is judged with a gold button, a tag and a line of muted text on top of it.
 * ==================================================================== */
const meta: Meta = {
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
