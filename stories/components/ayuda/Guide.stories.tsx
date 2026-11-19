import {
  AppFrame,
  Block,
  Button,
  Guide,
  GuideSpot,
  type GuideStep,
  Metric,
  Metrics,
  NavigationTree,
  type NavItem,
  Sidebar,
  TopBar,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookOpen, Compass, Landmark, LogOut, Users } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

/**
 * Context: **la pantalla dice qué es cada cosa, donde está.** Un recorrido: el resto se apaga,
 * lo que se explica queda recortado, y una tarjeta al lado lo nombra. Apunta a lo que el
 * sistema ya nombra — una parte (`{ part: "sidebar.search" }`), un ítem de ella
 * (`{ part: "navigation.item", key }`), lo que la aplicación marca con `GuideSpot` — así que
 * ningún componente necesita una prop para ser señalado.
 */
const meta: Meta = {
  title: "3 · Componentes/Ayuda/Guía · un recorrido por la pantalla",
  tags: ["screen"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "`Guide` recorre `steps`: cada uno con `target` (una parte de web-ui, un ítem con `key`, un `GuideSpot`, un selector o una función), `title`, `body` y `placement`. Sin `target` la tarjeta va centrada. Un ancla que no está se salta; en el teléfono, un paso dentro de la barra lateral abre el cajón. La aplicación decide cuándo abrirlo y recuerda, si quiere, quién ya lo vio (`onClose(reason, index)`).",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const SECCIONES: NavItem[] = [
  {
    id: "socios",
    label: "Socios",
    icon: Users,
    children: [
      { id: "socios.padron", label: "Padrón" },
      { id: "socios.cuotas", label: "Cuotas", count: 37 },
    ],
  },
  { id: "cursos", label: "Cursos", icon: BookOpen },
];

const MARCA = { label: "Colegio de Contadores", icon: Landmark };

const PASOS: GuideStep[] = [
  {
    id: "hola",
    title: "Bienvenida al portal",
    body: "Un minuto para ver dónde está cada cosa. Podés salir cuando quieras con Escape.",
  },
  {
    id: "buscar",
    target: { part: "sidebar.search" },
    placement: "right",
    title: "Buscar",
    body: "Cualquier socio, cuota o curso, desde cualquier pantalla. También con el teclado: ⌘K en una Mac, Ctrl K en lo demás.",
  },
  {
    id: "cuotas",
    target: { part: "navigation.item", key: "socios.cuotas" },
    placement: "right",
    title: "Cuotas",
    body: "Las cuotas del mes. El número dice cuántas esperan que alguien las revise.",
  },
  {
    id: "cifras",
    target: { spot: "cifras" },
    title: "Las cifras de hoy",
    body: "Cada cifra filtra la lista: tocá «cuotas vencidas» para ver solo esas.",
  },
  {
    id: "cuenta",
    target: { part: "sidebar.account" },
    placement: "right",
    title: "Tu cuenta",
    body: "Salir, y volver a ver este recorrido cuando quieras («Recorrido»).",
  },
];

function Portal({ steps = PASOS }: { steps?: GuideStep[] }) {
  const [abierto, setAbierto] = useState(false);
  const [cierre, setCierre] = useState("—");
  const [actual, setActual] = useState("socios.padron");
  return (
    <AppFrame
      sidebarSurface="chrome"
      sidebar={
        <Sidebar
          brand={MARCA}
          user={{ name: "Ana Gutiérrez", detail: "Tesorería" }}
          search={{ onSearch: () => {} }}
          actions={[
            { id: "recorrido", label: "Recorrido", icon: Compass },
            { id: "salir", label: "Salir", icon: LogOut },
          ]}
          onAction={(id) => {
            if (id === "recorrido") setAbierto(true);
          }}
        >
          <NavigationTree items={SECCIONES} current={actual} onNavigate={setActual} />
        </Sidebar>
      }
      narrowMenu={<TopBar app={MARCA} search={{ onSearch: () => {} }} />}
    >
      <div className="flex flex-col items-start gap-4 bg-surface p-4 sm:p-8">
        <h1 className="text-display font-semibold text-ink">Padrón</h1>
        <GuideSpot id="cifras">
          <Metrics>
            <Metric value={412} label="socios al día" />
            <Metric value={37} label="cuotas vencidas" tone="bad" onClick={() => {}} />
          </Metrics>
        </GuideSpot>
        <Button icon={Compass} onClick={() => setAbierto(true)}>
          Ver el recorrido
        </Button>
        <p className="font-mono text-micro text-muted" data-testid="cierre">
          {cierre}
        </p>
      </div>
      <Guide
        open={abierto}
        steps={steps}
        label="Recorrido del portal"
        onClose={(reason, index) => {
          setAbierto(false);
          setCierre(`${reason} · ${index + 1}`);
        }}
      />
    </AppFrame>
  );
}

const page = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body);

const rectOf = (selector: string) =>
  document.querySelector(selector)!.getBoundingClientRect();

/** The cut-out goes round the target: it contains it, with a little air. */
async function expectSpotAround(selector: string) {
  await waitFor(() => {
    const spot = rectOf('[data-ui="guide.spot"]');
    const target = rectOf(selector);
    expect(spot.left).toBeLessThanOrEqual(target.left);
    expect(spot.top).toBeLessThanOrEqual(target.top);
    expect(spot.right).toBeGreaterThanOrEqual(target.right);
    expect(spot.bottom).toBeGreaterThanOrEqual(target.bottom);
  });
}

/** The card is in the window and does not cover what it explains. */
async function expectCardBeside(selector: string) {
  await waitFor(() => {
    const card = rectOf('[data-ui="guide.card"]');
    const target = rectOf(selector);
    expect(card.left).toBeGreaterThanOrEqual(0);
    expect(card.right).toBeLessThanOrEqual(window.innerWidth);
    expect(card.top).toBeGreaterThanOrEqual(0);
    expect(card.bottom).toBeLessThanOrEqual(window.innerHeight);
    const overlaps =
      card.left < target.right &&
      card.right > target.left &&
      card.top < target.bottom &&
      card.bottom > target.top;
    expect(overlaps).toBe(false);
  });
}

/** **El recorrido.** Una bienvenida centrada, después cada cosa en su lugar: el buscador, una
 *  sección del menú, las cifras (marcadas con `GuideSpot`), la cuenta. Enter, → y ← lo
 *  caminan; Escape lo cierra y el foco vuelve a donde estaba. */
export const Recorrido: Story = {
  render: () => <Portal />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = page(canvasElement);
    const abrir = canvas.getByRole("button", { name: "Ver el recorrido" });
    await userEvent.click(abrir);

    const tarjeta = await body.findByRole("dialog", { name: "Recorrido del portal" });
    /* A welcome without a target: centred, over a whole veil. */
    await expect(within(tarjeta).getByText("1 de 5")).toBeVisible();
    await expect(tarjeta).toHaveAccessibleDescription(/Bienvenida al portal/);
    await expect(document.querySelector('[data-ui="guide.veil"]')).not.toBeNull();
    /* The focus waits on «Siguiente»: Enter walks the tour. */
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Siguiente"));
    await userEvent.keyboard("{Enter}");

    await body.findByText("2 de 5");
    await expectSpotAround('[data-ui="sidebar.search"]');
    await expectCardBeside('[data-ui="sidebar.search"]');
    await expect(document.querySelector('[data-ui="guide.card"]')).toHaveAttribute(
      "data-side",
      "right",
    );
    /* Each step is heard, not only seen. */
    await expect(body.getByText("2 de 5: Buscar")).toBeInTheDocument();

    await userEvent.keyboard("{ArrowRight}");
    await body.findByText("3 de 5");
    await expectSpotAround('[data-ui="navigation.item"][data-key="socios.cuotas"]');

    await userEvent.keyboard("{ArrowLeft}");
    await body.findByText("2 de 5");

    /* Escape leaves, and says how and where. The focus goes back to what opened it. */
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(body.queryByRole("dialog", { name: "Recorrido del portal" })).toBeNull(),
    );
    await expect(canvas.getByTestId("cierre")).toHaveTextContent("dismiss · 2");
    await waitFor(() => expect(abrir).toHaveFocus());

    /* Walked to the end, the last button finishes it. */
    await userEvent.click(abrir);
    for (const paso of ["1 de 5", "2 de 5", "3 de 5", "4 de 5"]) {
      await body.findByText(paso);
      await userEvent.click(body.getByRole("button", { name: "Siguiente" }));
    }
    await body.findByText("5 de 5");
    await expectSpotAround('[data-ui="sidebar.account"]');
    await expect(body.queryByRole("button", { name: "Saltar el recorrido" })).toBeNull();
    await userEvent.click(body.getByRole("button", { name: "Terminar" }));
    await waitFor(() => expect(canvas.getByTestId("cierre")).toHaveTextContent("finish · 5"));
  },
};

/** **En el teléfono.** La barra lateral es un cajón: un paso que apunta adentro lo abre, y el
 *  siguiente, que apunta a la vista, lo cierra. La tarjeta nunca toca un borde. */
export const EnElTelefono: Story = {
  render: () => <Portal />,
  globals: { viewport: { value: "telefono", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = page(canvasElement);
    await expect(window.innerWidth).toBe(390);
    const cajon = () => document.querySelector('[role="dialog"][aria-label="Navegación"]');

    await userEvent.click(canvas.getByRole("button", { name: "Ver el recorrido" }));
    await body.findByText("1 de 5");
    await expect(cajon()).toBeNull();
    await userEvent.click(body.getByRole("button", { name: "Siguiente" }));

    /* The search inside the sidebar: the drawer opened to show it. */
    await body.findByText("2 de 5");
    await waitFor(() => expect(cajon()).not.toBeNull());
    const enElCajon = '[role="dialog"][aria-label="Navegación"] [data-ui="sidebar.search"]';
    await expectSpotAround(enElCajon);
    await expectCardBeside(enElCajon);
    /* The card is above the drawer, and it is the one that takes the keys. */
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Siguiente"));

    await userEvent.click(body.getByRole("button", { name: "Siguiente" }));
    await body.findByText("3 de 5");
    await expect(cajon()).not.toBeNull();

    /* The figures are in the view: the drawer closes for them. */
    await userEvent.click(body.getByRole("button", { name: "Siguiente" }));
    await body.findByText("4 de 5");
    await waitFor(() => expect(cajon()).toBeNull());
    await expectSpotAround('[data-guide="cifras"] [data-ui="metric"]');

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(canvas.getByTestId("cierre")).toHaveTextContent("dismiss · 4"),
    );
  },
};

/** **Un ancla que no está.** La pantalla cambió y el recorrido no: el paso que apuntaba a algo
 *  que ya no existe se salta, en la dirección en que se iba. El recorrido pierde una parada;
 *  no deja a nadie atrapado. */
export const UnaParadaQueFalta: Story = {
  render: () => (
    <Portal
      steps={[
        PASOS[0]!,
        {
          id: "viejo",
          target: { spot: "un-panel-que-ya-no-existe" },
          title: "Un panel viejo",
          body: "Esto ya no está en la pantalla.",
        },
        PASOS[3]!,
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = page(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Ver el recorrido" }));
    await body.findByText("1 de 3");
    await userEvent.click(body.getByRole("button", { name: "Siguiente" }));
    /* Straight to the third: the second was waited for, and skipped. */
    await body.findByText("3 de 3", {}, { timeout: 4000 });
    await expect(body.queryByText("Un panel viejo")).toBeNull();
    /* Back skips it too, landing on the first. */
    await userEvent.click(body.getByRole("button", { name: "Atrás" }));
    await body.findByText("1 de 3", {}, { timeout: 4000 });
  },
};

/** **Un espacio de trabajo con scroll propio.** Lo que se explica está muy abajo, dentro de la
 *  caja que scrollea (`AppFrame scroll="view"`): el recorrido lo trae a la vista antes de
 *  recortarlo. */
export const EnUnEspacioDeTrabajo: Story = {
  render: function Render() {
    const [abierto, setAbierto] = useState(false);
    return (
      <AppFrame scroll="view" menu={<TopBar app={MARCA} />}>
        <div className="flex min-h-0 flex-1 flex-col bg-surface">
          <div className="flex shrink-0 items-center gap-3 px-6 pt-5 pb-3">
            <h1 className="text-title font-semibold text-ink">Cierre del mes</h1>
            <Button icon={Compass} onClick={() => setAbierto(true)}>
              Ver el recorrido
            </Button>
          </div>
          <div
            role="region"
            aria-label="Movimientos"
            tabIndex={0}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-6 pb-6"
          >
            {Array.from({ length: 30 }, (_, i) => (
              <p key={i} className="text-meta text-muted">
                Movimiento {i + 1} · conciliado
              </p>
            ))}
            <GuideSpot id="total">
              <Block title="Total del mes">Bs 48.210,00</Block>
            </GuideSpot>
          </div>
        </div>
        <Guide
          open={abierto}
          onClose={() => setAbierto(false)}
          steps={[
            {
              id: "total",
              target: { spot: "total" },
              placement: "top",
              title: "El total",
              body: "Lo que suma el mes, al final de la lista.",
            },
          ]}
        />
      </AppFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = page(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Ver el recorrido" }));
    await body.findByText("1 de 1");
    /* Scrolled into view, and cut out where it now is. */
    await waitFor(() => {
      const total = rectOf('[data-guide="total"] [data-ui="block"]');
      expect(total.top).toBeGreaterThanOrEqual(0);
      expect(total.bottom).toBeLessThanOrEqual(window.innerHeight);
    });
    await expectSpotAround('[data-guide="total"] [data-ui="block"]');
    await userEvent.click(body.getByRole("button", { name: "Terminar" }));
  },
};

/** **A la medida de la aplicación.** El recorrido abre su aspecto como el resto: tokens
 *  (`--ui-guide-radius`, `--ui-guide-bg`, `--ui-guide-scrim`) y partes (`guide.card`,
 *  `guide.title`, `guide.spot`…). Acá: tarjeta cuadrada sobre el fondo, velo en el azul de la
 *  marca. */
export const ALaMedida: Story = {
  render: () => (
    <>
      <style>{`
        :root {
          --ui-guide-radius: 0;
          --ui-guide-bg: var(--color-ground);
          --ui-guide-scrim: color-mix(in srgb, var(--color-primary) 55%, transparent);
        }
        [data-ui="guide.title"] { letter-spacing: 0.01em; }
      `}</style>
      <Portal />
    </>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = page(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Ver el recorrido" }));
    await body.findByText("1 de 5");
    const tarjeta = document.querySelector<HTMLElement>('[data-ui="guide.card"]')!;
    await expect(getComputedStyle(tarjeta).borderTopLeftRadius).toBe("0px");
    await userEvent.keyboard("{Escape}");
  },
};
