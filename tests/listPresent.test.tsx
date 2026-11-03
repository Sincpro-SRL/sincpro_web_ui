import assert from "node:assert/strict";

import { List, type ListSet } from "@sincpro/web-ui";
import { Map as MapIcon } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a presentation the application writes (`List.Present`) draws from the same set
 * the built-in ones do. The browser story drives the switcher, the sort and the selection;
 * what the markup can say here is that the grouping reaches it as piles with the list's
 * folding, that its press follows the list's rule, and that an id clashing with another
 * presentation fails loud instead of drawing two buttons for one thing.
 */

type Store = { id: string; name: string; city: string };

const STORES: Store[] = [
  { id: "s1", name: "Centro", city: "La Paz" },
  { id: "s2", name: "Equipetrol", city: "Santa Cruz" },
  { id: "s3", name: "Sopocachi", city: "La Paz" },
];

/** Draws what it received, so the markup shows what the list handed over. */
function Plain({ set }: { set: ListSet<Store> }) {
  if (set.piles === null)
    return (
      <ol>
        {set.items.map((s) => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ol>
    );
  return (
    <div>
      {set.piles.map((pile) => (
        <section key={pile.key} data-open={set.isOpen(pile)}>
          <h3>{pile.label}</h3>
          {pile.items.map((s) => s.name).join(", ")}
        </section>
      ))}
    </div>
  );
}

const draw = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

test("a presentation of its own draws the set the list hands it", () => {
  const out = draw(
    <List<Store> items={STORES} keyOf={(s) => s.id} present="map">
      <List.Present<Store> id="map" label="Mapa" icon={MapIcon}>
        {(set) => <Plain set={set} />}
      </List.Present>
    </List>,
  );
  assert.match(out, /<ol><li>Centro<\/li><li>Equipetrol<\/li><li>Sopocachi<\/li><\/ol>/);
});

test("grouped, it receives the piles and the list's folding", () => {
  const out = draw(
    <List<Store>
      items={STORES}
      keyOf={(s) => s.id}
      present="map"
      group={{ levels: [{ field: "city" }], of: (s) => s.city, collapsed: ["Santa Cruz"] }}
    >
      <List.Present<Store> id="map" label="Mapa" icon={MapIcon}>
        {(set) => <Plain set={set} />}
      </List.Present>
    </List>,
  );
  assert.match(out, /data-open="true"><h3>La Paz<\/h3>Centro, Sopocachi/);
  assert.match(out, /data-open="false"><h3>Santa Cruz<\/h3>/);
});

test("its press follows the list's rule: choosing wins, and the ways in are not offered", () => {
  let seen: ListSet<Store> | undefined;
  draw(
    <List<Store>
      items={STORES}
      keyOf={(s) => s.id}
      present="map"
      onOpen={() => {}}
      onPeek={() => {}}
      onChoose={() => {}}
    >
      <List.Present<Store> id="map" label="Mapa" icon={MapIcon}>
        {(set) => {
          seen = set;
          return null;
        }}
      </List.Present>
    </List>,
  );
  assert.equal(typeof seen?.press, "function");
  assert.equal(seen?.open, undefined);
  assert.equal(seen?.peek, undefined);
});

test("an id that is already a presentation of the list fails loud", () => {
  assert.throws(
    () =>
      draw(
        <List<Store> items={STORES} keyOf={(s) => s.id}>
          <List.Present<Store> id="table" label="Mi tabla" icon={MapIcon}>
            {() => null}
          </List.Present>
        </List>,
      ),
    /«table» is already a presentation/,
  );
});
