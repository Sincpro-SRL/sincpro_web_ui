import { Button, ButtonLink, IconButton, IconLink } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Download, FileText, MoreHorizontal, Trash2, X } from "lucide-react";

import { OnCanvas, OnChrome } from "../support/surface";

const meta = {
  title: "2 · Primitivas/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "HACER. Cuatro roles y ni uno más, porque una pantalla con tres primarios a la vez —`+ Nueva factura` azul, `Confirmar` dorado y `+ Importar extracto` azul— no tiene jerarquía. **Un solo dorado lleno por superficie** — el CTA del cromo y el del registro no compiten porque no comparten superficie.",
      },
    },
  },
  argTypes: {
    role: {
      control: "inline-radio",
      options: ["primary", "secondary", "ghost", "danger"],
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    surface: { control: "inline-radio", options: ["canvas", "chrome"] },
    children: { control: "text" },
  },
  args: { children: "Confirmar factura", role: "primary", size: "md", surface: "canvas" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Movele los controles. Es el punto de tener esto en Storybook y no en una
 *  captura: la jerarquía entre roles se juzga cambiándolos, no mirándolos. */
export const Jugar: Story = {};

/** Los cuatro roles juntos, que es como se los ve en una barra de acciones real
 *  y la única forma de saber si la jerarquía se sostiene. */
export const Roles: Story = {
  args: { children: "" },
  render: (args) => (
    <OnCanvas>
      <Button {...args} role="primary">
        Registrar pago
      </Button>
      <Button {...args} role="secondary">
        Enviar por correo
      </Button>
      <Button {...args} role="ghost">
        ver los asientos
      </Button>
      <Button {...args} role="danger">
        Anular factura
      </Button>
    </OnCanvas>
  ),
};

/** La misma barra sobre el cromo.
 *
 *  Acá se ve por qué `surface` existe: «fantasma» sobre el lienzo usa el azul
 *  de navegación (8,26:1) y sobre el cromo ese mismo azul da 1,4:1. No es un
 *  ajuste de tema — es otra decisión de contraste. */
export const SobreElCromo: Story = {
  args: { children: "", surface: "chrome" },
  render: (args) => (
    <OnChrome wash>
      <Button {...args} role="primary">
        + Nueva factura
      </Button>
      <Button {...args} role="secondary">
        importar extracto
      </Button>
      <Button {...args} role="ghost">
        buscar ⌘K
      </Button>
    </OnChrome>
  ),
};

/** Los dos tamaños. `sm` es el de una fila o la cabecera de un bloque; `md` el
 *  de la barra de acciones de un registro. Por debajo de ~26 px un botón deja
 *  de ser un objetivo cómodo — que era el defecto real detrás de «cosas muy
 *  flat que podrían ser botones». */
export const Tamanos: Story = {
  args: { children: "" },
  render: (args) => (
    <OnCanvas>
      <Button {...args} size="md" role="primary">
        Confirmar · md
      </Button>
      <Button {...args} size="sm" role="primary">
        Confirmar · sm
      </Button>
      <Button {...args} size="md" role="secondary">
        Imprimir · md
      </Button>
      <Button {...args} size="sm" role="secondary">
        Imprimir · sm
      </Button>
    </OnCanvas>
  ),
};

/**
 * `ButtonLink` es el mismo botón pero es un `<a>` de verdad, y eso importa:
 * un `<button>` que navega rompe el clic del medio, el «abrir en pestaña nueva»
 * y el «guardar como» — y descargar un archivo es exactamente eso.
 *
 * El aspecto se comparte entero. Dos siluetas distintas para «Descargar PDF» y
 * «Confirmar» en la misma barra es el problema que esta pieza evita.
 *
 * `IconLink` es lo mismo para un ícono: un `<a>` con la cara de `IconButton`, y su
 * tooltip con el rótulo.
 */
export const Enlaces: Story = {
  args: { children: "" },
  render: (args) => (
    <OnCanvas>
      <Button {...args} role="primary">
        Confirmar
      </Button>
      <ButtonLink href="#" download="FAC-2026-0118.pdf" role="secondary">
        Descargar PDF
      </ButtonLink>
      <ButtonLink href="#" role="ghost">
        Ver el asiento contable
      </ButtonLink>
      <IconLink
        href="#"
        download="libro-de-ventas-octubre-2026.xlsx"
        icon={Download}
        label="Descargar el libro de ventas"
      />
      <IconLink href="#" icon={FileText} label="Ver la factura en PDF" tone="normal" />
    </OnCanvas>
  ),
};

/** El botón que abre un desplegable tiene que decirlo. Sin `aria-expanded`, un
 *  lector de pantalla lo anuncia como un botón común y quien lo usa no sabe que
 *  hay algo abierto debajo. */
export const AbreUnMenu: Story = {
  args: { children: "" },
  render: (args) => (
    <OnCanvas>
      <Button {...args} role="secondary" expanded={false}>
        Imprimir
      </Button>
      <Button {...args} role="secondary" expanded>
        Imprimir
      </Button>
    </OnCanvas>
  ),
};

/**
 * `IconButton` — sólo un ícono, y por eso el rótulo es OBLIGATORIO aunque no se
 * dibuje: un ícono solo no dice qué hace, y el que lo sabe ya sabía qué apretar.
 * Pasá el mouse —o llegá con Tab— y el rótulo aparece en el `Tooltip` del sistema,
 * no en el `title` nativo del navegador.
 *
 * Context: no tenía historia y es, después de `Button`, la pieza con más
 * consumo real — la usan el cajón, las filas de una tabla y la barra de un registro.
 *
 * Es CUADRADO: su lado es el alto de su escalón. Uno más angosto que alto tiene
 * menos área de la que aparenta y falla al apuntar en los bordes.
 */
export const SóloÍcono: Story = {
  args: { children: "" },
  render: () => (
    <div className="flex flex-col gap-6">
      <OnCanvas>
        <IconButton icon={Download} label="Descargar la factura" />
        <IconButton icon={MoreHorizontal} label="Más acciones" />
        <IconButton icon={Trash2} label="Borrar la línea" tone="danger" />
        <IconButton icon={X} label="Cerrar" />
      </OnCanvas>

      <OnCanvas>
        <IconButton icon={Download} label="Descargar · sm" size="sm" />
        <IconButton icon={Download} label="Descargar · md" size="md" />
        <IconButton icon={Download} label="Descargar · lg" size="lg" />
        <IconButton icon={Download} label="Sin permiso" disabled />
      </OnCanvas>

      <OnChrome>
        <IconButton icon={Download} label="Descargar" surface="chrome" />
        <IconButton icon={MoreHorizontal} label="Más acciones" surface="chrome" />
        <IconButton icon={Trash2} label="Borrar" surface="chrome" tone="danger" />
      </OnChrome>
    </div>
  ),
};

/** Los tres tamaños del botón con texto. `lg` existía como prop y no se mostraba
 *  en ninguna historia: una variante invisible es una que nadie usa o que
 *  alguien usa mal. */
export const LosTresTamaños: Story = {
  args: { children: "" },
  render: (args) => (
    <OnCanvas>
      <Button {...args} size="sm" role="primary">
        Confirmar · sm
      </Button>
      <Button {...args} size="md" role="primary">
        Confirmar · md
      </Button>
      <Button {...args} size="lg" role="primary">
        Confirmar · lg
      </Button>
    </OnCanvas>
  ),
};
