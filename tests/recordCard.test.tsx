import assert from "node:assert/strict";

import { DensityProvider, List, RadioGroup, RecordCard } from "@sincpro/web-ui";
import { Banknote, Coffee, QrCode } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the board's card was one box of 16 px padding and 12 px corners inside a lane that
 * was another box, and the figure on the name's line cut the name. It now has three shapes
 * (card, compact, tile), N facts, a count on its corner, chosen and unavailable states, and a
 * stripe that says its state — and a list draws it as a grid of tiles for a till or a shop.
 */

test("the name wraps in two lines before a figure cuts it", () => {
  const html = renderToStaticMarkup(
    <RecordCard
      title="Certificación ISO 9001 — Constructora"
      figure="Bs. 45.500"
      onOpen={() => {}}
    />,
  );
  assert.match(html, /data-layout="card"/);
  assert.match(html, /data-ui="record-card.title" class="[^"]*line-clamp-2/);
  assert.match(html, /rounded-ui-record-card/);
});

test("N facts as a list of terms, label and value", () => {
  const html = renderToStaticMarkup(
    <RecordCard
      title="Portal de pedidos"
      fields={[
        { label: "Cierre", value: "30/11/2026" },
        { label: "Probabilidad", value: "60 %" },
        { label: "Fuente", value: "Referido" },
      ]}
    />,
  );
  assert.match(html, /<dl data-ui="record-card.fields"/);
  assert.equal(html.match(/<dt/g)?.length, 3);
  assert.match(html, /<dt[^>]*>Probabilidad<\/dt><dd[^>]*>60 %<\/dd>/);
});

test("the padding follows the density", () => {
  const roomy = renderToStaticMarkup(<RecordCard title="A" />);
  const tight = renderToStaticMarkup(
    <DensityProvider value="compact">
      <RecordCard title="A" />
    </DensityProvider>,
  );
  assert.match(roomy, /gap-1\.5 p-3/);
  assert.match(tight, /gap-1 p-2\.5/);
});

test("a tile: the picture first, the figure, a count on its corner", () => {
  const html = renderToStaticMarkup(
    <RecordCard
      layout="tile"
      title="Café americano"
      figure="Bs. 15"
      badge={2}
      media={{ icon: Coffee }}
      onOpen={() => {}}
    />,
  );
  assert.match(html, /data-layout="tile"/);
  assert.match(html, /data-ui="record-card.media"[^>]*class="[^"]*aspect-tile/);
  assert.match(html, /data-ui="record-card.badge"[^>]*>2<\/span>/);
  assert.match(html, /data-ui="record-card.figure"[^>]*>Bs\. 15<\/p>/);
  /* The media comes before the name in the reading order. */
  assert.ok(html.indexOf("record-card.media") < html.indexOf("Café americano"));
});

test("unavailable is shown but not pressed; chosen says so", () => {
  const off = renderToStaticMarkup(
    <RecordCard
      layout="tile"
      title="Medialuna"
      meta="Sin stock"
      disabled
      onOpen={() => {}}
    />,
  );
  assert.match(off, /data-disabled=""/);
  assert.doesNotMatch(off, /<button/);
  const on = renderToStaticMarkup(<RecordCard title="Mesa 4" selected onOpen={() => {}} />);
  assert.match(on, /data-selected=""/);
  assert.match(on, /aria-current="true"/);
});

test("a tone is a stripe on the edge", () => {
  const html = renderToStaticMarkup(<RecordCard title="Bloqueada" tone="bad" />);
  assert.match(html, /data-ui="record-card.stripe" data-tone="bad"[^>]*bg-bad/);
});

test("a list draws its records as tiles, as many per line as the width takes", () => {
  type Product = { id: string; name: string };
  const html = renderToStaticMarkup(
    <List<Product>
      items={[
        { id: "p1", name: "Café" },
        { id: "p2", name: "Té" },
      ]}
      keyOf={(p) => p.id}
      present="tiles"
    >
      <List.Rows<Product> row={(p) => ({ name: p.name, meta: "Bs. 15" })} />
      <List.Tiles<Product> size="lg" />
    </List>,
  );
  assert.match(html, /data-ui="list.tiles" class="[^"]*grid-cols-\(--grid-tiles-lg\)/);
  assert.equal(html.match(/data-layout="tile"/g)?.length, 2);
});

test("the quick filters go under the bar, and a counter that narrows is pressed", () => {
  const html = renderToStaticMarkup(
    <List<{ id: string }> items={[{ id: "1" }]} keyOf={(r) => r.id}>
      <List.Bar>
        <List.Identity
          title="Pedidos"
          counters={[
            { label: "por cobrar", value: 4, onClick: () => {}, active: true },
            { label: "entregados", value: 9 },
          ]}
        />
      </List.Bar>
      <List.Filters>
        <span>filtros-rápidos</span>
      </List.Filters>
      <List.Rows<{ id: string }> row={(r) => ({ name: r.id })} />
    </List>,
  );
  assert.match(html, /filtros-rápidos/);
  assert.match(html, /<button type="button" aria-pressed="true"[^>]*>.*?4.*?por cobrar/);
  /* A count that only informs is not a button. */
  assert.doesNotMatch(html, /<button[^>]*>[^<]*<span[^>]*>9<\/span>/);
});

test("a choice as cards: a box pressed whole, with its icon", () => {
  const html = renderToStaticMarkup(
    <RadioGroup
      look="cards"
      value="qr"
      options={[
        { value: "cash", label: "Efectivo", icon: Banknote },
        { value: "qr", label: "QR", icon: QrCode, description: "Simple / BNB" },
      ]}
    />,
  );
  assert.match(html, /data-look="cards"/);
  assert.equal(html.match(/data-ui="radio-group.card"/g)?.length, 2);
  assert.match(html, /Simple \/ BNB/);
  assert.match(
    html,
    /<input[^>]*value="qr"[^>]*checked=""|<input[^>]*checked=""[^>]*value="qr"/,
  );
});
