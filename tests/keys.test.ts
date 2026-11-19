import assert from "node:assert/strict";

import {
  keysAria,
  keysLabel,
  matchesKeys,
  needsModifier,
  parseKeys,
} from "@sincpro/web-ui/foundations/keys";
import { test } from "vitest";

/**
 * UNA COMBINACIÓN se escribe una vez —«Alt+D», «Mod+S»— y se aprieta, se dibuja y se anuncia
 * según el teclado de quien la usa.
 */

const press = (over: Partial<Parameters<typeof matchesKeys>[0]>) => ({
  key: "",
  code: "",
  altKey: false,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  ...over,
});

test("se lee: modificadores, y la tecla al final", () => {
  assert.deepEqual(parseKeys("Alt+Shift+P"), {
    alt: true,
    shift: true,
    ctrl: false,
    meta: false,
    mod: false,
    key: "P",
  });
  assert.equal(parseKeys("Mod+S").mod, true);
});

test("una letra se reconoce por su LUGAR: Alt+D en un Mac escribe «∂» y es Alt+D igual", () => {
  const altD = press({ key: "∂", code: "KeyD", altKey: true });
  assert.equal(matchesKeys(altD, "Alt+D", "apple"), true);
  assert.equal(matchesKeys(altD, "Alt+N", "apple"), false);
});

test("los modificadores son exactos: Alt+Shift+D no es Alt+D", () => {
  const altShiftD = press({ key: "D", code: "KeyD", altKey: true, shiftKey: true });
  assert.equal(matchesKeys(altShiftD, "Alt+D", "other"), false);
  assert.equal(matchesKeys(altShiftD, "Alt+Shift+D", "other"), true);
});

test("Mod es ⌘ en un Mac y Ctrl en el resto", () => {
  const cmdS = press({ key: "s", code: "KeyS", metaKey: true });
  const ctrlS = press({ key: "s", code: "KeyS", ctrlKey: true });
  assert.equal(matchesKeys(cmdS, "Mod+S", "apple"), true);
  assert.equal(matchesKeys(ctrlS, "Mod+S", "apple"), false);
  assert.equal(matchesKeys(ctrlS, "Mod+S", "other"), true);
  assert.equal(matchesKeys(cmdS, "Mod+S", "other"), false);
});

test("una tecla con nombre se reconoce por su nombre", () => {
  assert.equal(
    matchesKeys(press({ key: "Escape", code: "Escape" }), "Escape", "other"),
    true,
  );
  assert.equal(
    matchesKeys(
      press({ key: "ArrowLeft", code: "ArrowLeft", altKey: true }),
      "Alt+ArrowLeft",
      "other",
    ),
    true,
  );
});

test("se dibuja como lo dice el teclado, y se anuncia para un lector de pantalla", () => {
  assert.equal(keysLabel("Alt+D", "apple"), "⌥D");
  assert.equal(keysLabel("Alt+D", "other"), "Alt+D");
  assert.equal(keysLabel("Mod+S", "apple"), "⌘S");
  assert.equal(keysLabel("Mod+S", "other"), "Ctrl+S");
  assert.equal(keysLabel("Alt+ArrowLeft", "other"), "Alt+←");
  // Sin saber el teclado (servidor, hidratación) se dibuja como se escribió.
  assert.equal(keysLabel("Alt+D", null), "Alt+D");
  assert.equal(keysAria("Mod+S", "apple"), "Meta+S");
  assert.equal(keysAria("Mod+S", "other"), "Control+S");
  assert.equal(keysAria("Alt+D", "other"), "Alt+D");
});

test("sólo una combinación con modificador funciona mientras se escribe en un campo", () => {
  assert.equal(needsModifier("Alt+D"), true);
  assert.equal(needsModifier("Mod+S"), true);
  assert.equal(needsModifier("D"), false);
  assert.equal(needsModifier("Escape"), false);
});
