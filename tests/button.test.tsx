import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Button,
  buttonClasses,
  ButtonLink,
  IconButton,
  IconLink,
  SurfaceProvider,
  Tooltip,
  TooltipTrigger,
} from "@sincpro/web-ui";
import { Download } from "lucide-react";
import { createRef, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: React Aria's triggers (tooltip, dialog, toolbar) talk to a control by handing it a
 * `ref` and native props. What is ours to test is that the system's buttons let both through
 * to the element without losing their own contract — the type, the popup they announce, the
 * label of an icon — and that an icon target shows ONE tooltip, never the native `title` too.
 */

type WithRef = { ref?: unknown; children?: unknown };

/** The element a button component returns, unwrapped from the icon's tooltip slot. The
 *  render runs without a DOM, so a ref is followed in the tree instead of being attached. */
function nativeElement(node: ReactNode): ReactElement<WithRef> {
  assert.ok(isValidElement<WithRef>(node));
  const { children } = node.props;
  if (typeof children === "function") return nativeElement((children as () => ReactNode)());
  return node;
}

/** Calls a button component inside a real render: they read the surface from context, and a
 *  hook only runs there. What it returns is the element tree, with the ref still on it. */
function rendered(make: () => ReactNode): ReactNode {
  let out: ReactNode = null;
  function Probe() {
    out = make();
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return out;
}

test("every system button hands its ref to the native element", () => {
  const button = createRef<HTMLButtonElement>();
  const link = createRef<HTMLAnchorElement>();
  const cases: [ReactNode, unknown, string][] = [
    [rendered(() => Button({ children: "Guardar", ref: button })), button, "button"],
    [rendered(() => ButtonLink({ children: "Descargar", href: "#", ref: link })), link, "a"],
    [
      rendered(() => IconButton({ icon: Download, label: "Descargar", ref: button })),
      button,
      "button",
    ],
    [
      rendered(() => IconLink({ icon: Download, label: "Descargar", href: "#", ref: link })),
      link,
      "a",
    ],
  ];
  for (const [node, ref, tag] of cases) {
    const element = nativeElement(node);
    assert.equal(element.type, tag);
    assert.equal(element.props.ref, ref);
  }
});

test("native attributes go through: data-*, aria-*, events, and type submit", () => {
  const html = renderToStaticMarkup(
    <form>
      <Button type="submit" data-testid="enviar" aria-describedby="nota" form="factura">
        Emitir
      </Button>
      <IconButton icon={Download} label="Descargar" data-row="7" name="exportar" />
      <ButtonLink href="/f.csv" data-kind="csv" target="_blank" rel="noreferrer">
        CSV
      </ButtonLink>
      <IconLink icon={Download} label="PDF" href="/f.pdf" data-kind="pdf" />
    </form>,
  );
  assert.match(html, /<button[^>]*type="submit"[^>]*>Emitir/);
  assert.match(html, /data-testid="enviar"/);
  assert.match(html, /aria-describedby="nota"/);
  assert.match(html, /form="factura"/);
  assert.match(html, /data-row="7"/);
  assert.match(html, /name="exportar"/);
  assert.match(
    html,
    /data-kind="csv"[^>]*target="_blank"|target="_blank"[^>]*data-kind="csv"/,
  );
  assert.match(html, /data-kind="pdf"/);
});

test("a button stays type=button by default, so it never submits a form by accident", () => {
  const html = renderToStaticMarkup(
    <>
      <Button>Agregar línea</Button>
      <IconButton icon={Download} label="Descargar" />
    </>,
  );
  assert.equal(html.match(/type="button"/g)?.length, 2);
});

test("`haspopup` says what opens; `menu` stays the default of `expanded`", () => {
  const menu = renderToStaticMarkup(<Button expanded={false}>Más</Button>);
  assert.match(menu, /aria-haspopup="menu"/);
  assert.match(menu, /aria-expanded="false"/);

  const dialog = renderToStaticMarkup(
    <IconButton icon={Download} label="Filtrar" expanded haspopup="dialog" />,
  );
  assert.match(dialog, /aria-haspopup="dialog"/);
  assert.match(dialog, /aria-expanded="true"/);

  const listbox = renderToStaticMarkup(<Button haspopup="listbox">Moneda</Button>);
  assert.match(listbox, /aria-haspopup="listbox"/);
  assert.doesNotMatch(listbox, /aria-expanded/);

  const plain = renderToStaticMarkup(<Button>Guardar</Button>);
  assert.doesNotMatch(plain, /aria-haspopup|aria-expanded/);
});

test("an icon target shows the system's tooltip, not the native title", () => {
  const html = renderToStaticMarkup(<IconButton icon={Download} label="Descargar" />);
  assert.match(html, /aria-label="Descargar"/);
  assert.doesNotMatch(html, /title=/);
  /* The tooltip's trigger reached the native element: `Focusable` put it in the tab order. */
  assert.match(html, /tabindex="0"/);

  const native = renderToStaticMarkup(
    <IconButton icon={Download} label="Descargar" tooltip={false} />,
  );
  assert.match(native, /title="Descargar"/);
  assert.doesNotMatch(native, /tabindex/);

  const link = renderToStaticMarkup(<IconLink icon={Download} label="PDF" href="#" />);
  assert.doesNotMatch(link, /title=/);
});

test("a hand-written TooltipTrigger takes a system button as it is, and only its tooltip shows", () => {
  const html = renderToStaticMarkup(
    <>
      <TooltipTrigger>
        <Button>Imprimir</Button>
        <Tooltip>Sale por la impresora del almacén</Tooltip>
      </TooltipTrigger>
      <TooltipTrigger>
        <IconButton icon={Download} label="Exportar" />
        <Tooltip>Exporta las líneas visibles</Tooltip>
      </TooltipTrigger>
    </>,
  );
  assert.equal(html.match(/tabindex="0"/g)?.length, 2);
  assert.doesNotMatch(html, /title=/);
  /* Closed until hovered or focused. */
  assert.doesNotMatch(html, /role="tooltip"/);
});

test("a button takes its surface from the band it sits on, and the prop still wins", () => {
  const onCanvas = renderToStaticMarkup(<Button role="ghost">Guardar</Button>);
  assert.ok(onCanvas.includes(buttonClasses("ghost", "md", "canvas")));

  const onChrome = renderToStaticMarkup(
    <SurfaceProvider value="chrome">
      <Button role="ghost">Guardar</Button>
      <IconButton icon={Download} label="Descargar" />
    </SurfaceProvider>,
  );
  assert.ok(onChrome.includes(buttonClasses("ghost", "md", "chrome")));
  assert.ok(!onChrome.includes(buttonClasses("ghost", "md", "canvas")));

  const forced = renderToStaticMarkup(
    <SurfaceProvider value="chrome">
      <Button role="ghost" surface="canvas">
        Guardar
      </Button>
    </SurfaceProvider>,
  );
  assert.ok(forced.includes(buttonClasses("ghost", "md", "canvas")));
});
