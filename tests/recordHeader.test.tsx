import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Breadcrumb,
  type Crumb,
  Line,
  SmartButton,
  SmartButtons,
  type Stage,
  StatusBar,
  SurfaceProvider,
} from "@sincpro/web-ui";
import { Columns3, Database, Play } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Lo que la banda de un registro puede tener mal sin que el tipo se queje: que
 * un nombre de cincuenta caracteres se coma la línea, que una etapa quede
 * escondida detrás de un chevron, o que el centro deje de estar en el centro.
 *
 * Las tres se ven mirando —o contando elementos— y esto cuenta elementos.
 */

const LARGO = "ventas_marzo.csv-entrenamiento-y-ventas_marzo.csv-prueba-compuesto";

const RASTRO: Crumb[] = [
  { label: "Catálogo", onClick: () => {} },
  { label: LARGO, onClick: () => {} },
  { label: "corridas", onClick: () => {} },
  { label: "ventas_marzo-sintetico-2026-09-15" },
];

const STAGES: Stage[] = [
  { id: "borrador", label: "borrador" },
  { id: "planificado", label: "planificado" },
  { id: "generando", label: "generando" },
  { id: "evaluado", label: "evaluado" },
];

const html = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

/* ---------------------------------------------------------------- *
 *  El rastro
 * ---------------------------------------------------------------- */

/* Los del medio se pliegan; la raíz —a donde se vuelve— y dónde estoy, nunca. */
test("con más de tres tramos, los del medio se pliegan", () => {
  const out = html(<Breadcrumb crumbs={RASTRO} />);
  assert.ok(out.includes("Catálogo"));
  assert.ok(out.includes("ventas_marzo-sintetico-2026-09-15"));
  assert.ok(!out.includes("corridas"));
});

/* Plegado no es perdido: lo que se guardó sigue estando, en un menú. */
test("lo plegado sigue siendo navegable", () => {
  const out = html(<Breadcrumb crumbs={RASTRO} />);
  const menu = out.match(/role="menu"|aria-haspopup/);
  assert.ok(menu !== null, "el rastro plegado tiene que dejar un disparador");
});

test("tres tramos o menos se dibujan enteros", () => {
  const out = html(<Breadcrumb crumbs={RASTRO.slice(1)} />);
  assert.ok(out.includes("corridas"));
});

/* Recortar y plegar son dos cosas: un rastro de dos tramos no pliega nada —no
   hay medio— y aun así ninguno puede comerse la banda. */
test("cada tramo pide lo suyo y no más", () => {
  const out = html(<Breadcrumb crumbs={RASTRO.slice(0, 2)} />);
  const asks = out.split("max-w-(--container-crumb)").length - 1;
  assert.equal(asks, 2);
  assert.ok(out.includes(`title="${LARGO}"`), "el nombre entero queda en el title");
});

/* La jerarquía: los de atrás son enlaces y se leen apagados; dónde estoy es la
   página actual, en tinta, y no se aprieta. Lo dice React Aria por la POSICIÓN. */
test("la última miga es la página actual y no un enlace vivo", () => {
  const out = html(<Breadcrumb crumbs={RASTRO.slice(1)} />);
  assert.equal(out.split('aria-current="page"').length - 1, 1);
  const current = out.slice(out.indexOf('aria-current="page"') - 400);
  assert.ok(/aria-disabled="true"[^>]*aria-current="page"/.test(current));
  assert.ok(out.includes("<nav"), "el rastro es un landmark de navegación");
  assert.equal(out.split('role="link"').length - 1, 3, "cada tramo es un Link de React Aria");
});

test("los de atrás en tono apagado, dónde estoy en tinta", () => {
  const canvas = html(<Breadcrumb crumbs={RASTRO.slice(2)} />);
  assert.ok(canvas.includes("text-muted"));
  assert.ok(/font-medium[^"]*text-ink|text-ink[^"]*font-medium/.test(canvas));
  const chrome = html(<Breadcrumb crumbs={RASTRO.slice(2)} surface="chrome" />);
  assert.ok(chrome.includes("text-chrome-muted"));
  assert.ok(chrome.includes("text-chrome-ink"));
});

/* ---------------------------------------------------------------- *
 *  El estado
 * ---------------------------------------------------------------- */

/* Apilada se ven las CUATRO: un estado que hay que abrir para ver deja de
   contestar la única pregunta que tiene. */
test("apilada no esconde ninguna etapa", () => {
  const out = html(<StatusBar stages={STAGES} current="generando" layout="stacked" />);
  for (const stage of STAGES) assert.ok(out.includes(stage.label), stage.label);
  assert.ok(!out.includes("stage-arrow"), "apilada no dibuja flechas");
});

test("acostada es un solo riel, y también están las cuatro", () => {
  const out = html(<StatusBar stages={STAGES} current="generando" layout="trail" />);
  for (const stage of STAGES) assert.ok(out.includes(stage.label), stage.label);
  assert.ok(!out.includes("stage-arrow"), "recortar cada etapa la separa del riel");
  assert.equal(out.split("bg-primary").length - 1, 1, "la actual es el ÚNICO tramo lleno");
});

/* Un solo lenguaje: acostada y apilada pintan igual —lo hecho con su tilde, la
   actual llena, lo que viene apagado—. Lo que cambia es la dirección. */
test("acostada y apilada pintan las etapas con las mismas tres pinturas", () => {
  for (const layout of ["trail", "stacked"] as const) {
    const out = html(<StatusBar stages={STAGES} current="generando" layout={layout} />);
    assert.equal(out.split("bg-primary text-surface").length - 1, 1, layout);
    assert.equal(out.split("lucide-check").length - 1, 2, `${layout}: dos etapas hechas`);
    assert.equal(out.split("text-muted").length - 1, 1, `${layout}: una por venir`);
  }
});

test("sin onSelect es una lista y la actual dice que es el paso actual", () => {
  const out = html(<StatusBar stages={STAGES} current="generando" />);
  assert.ok(out.startsWith("<ol"));
  assert.ok(!out.includes('role="radiogroup"'));
  assert.ok(!out.includes("<button"));
  assert.equal(out.split('aria-current="step"').length - 1, 1);
  assert.ok(/<li aria-current="step"[^>]*>(?:(?!<\/li>).)*generando/.test(out));
});

/* Falló: la actual se pinta en peligro Y lleva una marca — el color solo no alcanza. */
test("fallada, la etapa actual se pinta en peligro y lleva su marca", () => {
  const canvas = html(<StatusBar stages={STAGES} current="generando" failed />);
  assert.ok(canvas.includes("bg-danger"));
  assert.ok(!canvas.includes("bg-primary"));
  assert.ok(canvas.includes('data-failed="true"'));
  assert.ok(canvas.includes("lucide-circle-alert"));
  const chrome = html(
    <StatusBar stages={STAGES} current="generando" failed surface="chrome" />,
  );
  assert.ok(chrome.includes("bg-chrome-bad"));
});

/* En qué anda el registro y de qué etapa estoy hablando son dos cosas: la actual
   sigue llena y con `aria-current`; la elegida es el radio marcado y un subrayado. */
test("con onSelect es un radiogroup, sin dejar de decir en cuál anda", () => {
  const out = html(
    <StatusBar
      stages={STAGES}
      current="generando"
      selected="planificado"
      onSelect={() => {}}
    />,
  );
  assert.ok(out.includes('role="radiogroup"'));
  assert.ok(out.includes('aria-orientation="horizontal"'));
  assert.equal(out.split('type="radio"').length - 1, STAGES.length);
  assert.equal(out.split("checked").length - 1, 1);
  assert.ok(/checked=""[^>]*value="planificado"/.test(out));
  assert.equal(out.split('aria-current="step"').length - 1, 1);
  assert.equal(out.split("bg-primary text-surface").length - 1, 1, "la elegida no se llena");
  assert.equal(out.split("decoration-primary").length - 1, 1, "la elegida se subraya");
});

test("apilada y elegible, las flechas van de arriba hacia abajo", () => {
  const out = html(
    <StatusBar
      stages={STAGES}
      current="generando"
      layout="stacked"
      selected="generando"
      onSelect={() => {}}
    />,
  );
  assert.ok(out.includes('aria-orientation="vertical"'));
  assert.ok(
    out.includes("decoration-current"),
    "sobre la actual, el subrayado es del color del texto",
  );
});

/* ---------------------------------------------------------------- *
 *  La línea
 * ---------------------------------------------------------------- */

/* Las tres zonas se dibujan siempre: una mitad que desaparece cuando no hay
   paginador mueve el centro, que es justo lo que esto resuelve. */
test("la línea reserva sus dos mitades aunque una esté vacía", () => {
  const out = html(<Line start={<span>migas</span>} center={<span>contadores</span>} />);
  const halves = out.split("flex-basis:var(--container-trail)").length - 1;
  assert.equal(halves, 2);
});

test("los dos lados piden lo MISMO, que es lo que centra el centro", () => {
  const out = html(
    <Line asks="10rem" start={<span>a</span>} center={<span>b</span>} end={<span>c</span>} />,
  );
  assert.equal(out.split("flex-basis:10rem").length - 1, 2);
});

/* En el cromo los tres contadores son un grupo: un borde, y el que no lleva a
   ningún lado no es un botón vivo. En la hoja siguen siendo fichas sueltas. */
test("en el cromo los contadores comparten una barra", () => {
  const out = html(
    <SurfaceProvider value="chrome">
      <SmartButtons>
        <SmartButton
          icon={Columns3}
          count={4}
          label="columns"
          layout="inline"
          onClick={() => {}}
        />
        <SmartButton icon={Database} count={400} label="rows" layout="inline" />
        <SmartButton icon={Play} count={0} label="runs" layout="inline" />
      </SmartButtons>
    </SurfaceProvider>,
  );
  assert.equal(out.split("rounded-control border").length - 1, 1);
  assert.equal(out.split('disabled=""').length - 1, 2);
  assert.ok(out.includes("text-chrome-muted"), "el cero se queda apagado");
});
